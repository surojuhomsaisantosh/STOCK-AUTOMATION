# Implementation Plan — Per-Franchise Feature Toggles

**Goal:** On `/central/central_franchise_profiles`, add two toggles next to the existing Edit action, so Central can enable/disable the **Order Stock** and **Stock Request** KPI cards on `/dashboard/franchiseowner` for *one specific franchise*. Combined with the existing account activation toggle, each franchise row ends up with **three** toggles.

---

## 1. How it works today (verified in code)

### The gate is global-only and lives in exactly one place

`src/pages/dashboards/franchise_dashboard.jsx:63-77` reads two rows from `central_settings`:

```js
.from("central_settings").select("key, enabled").in("key", ["online_payments", "stock_requests"])
```

and at line 122-129 turns them into a `comingSoon` flag on two nav cards:

| Card | Path | Gated by |
| --- | --- | --- |
| Order Stock | `/stock-orders` | `central_settings.online_payments` |
| Stock Request | `/franchise/requestportal` | `central_settings.stock_requests` |

`comingSoon: true` → card gets `nav-card-disabled`, the `onClick` no-ops, and a "Coming Soon" badge renders.

Central flips those two global rows from `src/pages/central/central_settings.jsx:79-91` (`upsert` on `key`). **Both are all-or-nothing for the whole network.**

### The activation toggle already exists on the profiles page

`central_franchise_profiles.jsx` already has a working third toggle — `profiles.is_active`:
- `confirmToggle()` at :300 (guards: can't disable self, can't disable `role === 'stock'`)
- `handleToggleStatus()` at :314 (optimistic state update + `profiles.update({is_active})`)
- Confirmation modal at :934
- Desktop button at :679, mobile button at :594
- Enforced at login (`Login.jsx:143,161`) and on every hydrate (`AuthContext.jsx:72` → force sign-out)

**So toggle #3 in your request is already built.** The work is toggles #1 and #2, plus making all three read as one consistent group.

### Existing precedent for a per-profile boolean

`profiles.refund_enabled` is already a per-franchise column, toggled by the owner in `franchise_settings.jsx:170-184` and read by `store_billing_history.jsx:208`. Reuse this exact naming/pattern.

---

## 2. Design decisions

### 2a. Where the flag lives → two new boolean columns on `profiles`

Not a new table, not JSON. Reasons: the row is already fetched everywhere (`select("*")`), it matches `refund_enabled`, and it needs no join.

```
profiles.order_stock_enabled    boolean
profiles.stock_request_enabled  boolean
```

### 2b. Global × per-franchise → AND logic

```
cardEnabled = central_settings[key].enabled  AND  profile[column]
```

The global switch in Central Settings stays as the network-wide kill switch; the per-franchise column is the per-outlet switch. Global OFF still wins for everyone — that preserves today's behaviour exactly and gives you one lever to shut the feature off in an incident.

The Central Settings page copy must change from *"…for all franchise outlets"* to *"Master switch — individual outlets are controlled in Franchise Profiles."*

### 2c. Default value → `DEFAULT true`, and **backfill existing rows to true**

**Confirmed semantics:** ON = that franchise can order / can raise stock requests. OFF = they can't. Identical for both features.

`DEFAULT true` means zero regression on deploy: every franchise that can order today still can, and Central turns OFF the exceptions. Because Step 3.9 adds **Enable all / Disable all**, this default is no longer a one-way door — if you'd rather start from a clean slate, deploy with `true`, then hit "Disable all" once and switch on the outlets you want. One click, same outcome as `DEFAULT false`, without the window where the DB and the UI disagree.

### 2d. Null semantics → treat NULL as enabled (`!== false`)

This is the single biggest bug source in this feature: Central shows the pill as ON while the franchise's card stays greyed out, because one file checks `=== true` and another checks `!== false`.

**Rule, applied identically in every file:** `value !== false` means enabled. This matches how `is_active` is already read at `:556`, `:660`, `:679`. Put it in one shared helper (see step 3.2) and never inline the comparison.

---

## 3. Implementation steps

### Step 1 — Migration (Supabase SQL editor; there is no local migrations dir)

```sql
alter table public.profiles
  add column if not exists order_stock_enabled   boolean not null default true,
  add column if not exists stock_request_enabled boolean not null default true;

update public.profiles
  set order_stock_enabled = true, stock_request_enabled = true
  where order_stock_enabled is null or stock_request_enabled is null;
```

**RLS — do not skip this.** `franchise_settings.jsx` proves franchise owners already hold UPDATE on their own `profiles` row. If that policy is a bare `using (auth.uid() = id)`, a franchise owner can re-enable their own cards with one API call and the whole feature is cosmetic. Add a column-level guard:

```sql
-- Option A (simplest): revoke column-level UPDATE from the authenticated role
revoke update (order_stock_enabled, stock_request_enabled, is_active)
  on public.profiles from authenticated;
grant  update (order_stock_enabled, stock_request_enabled, is_active)
  on public.profiles to service_role;
```

Because Central Admin also authenticates as `authenticated`, Option A blocks Central too. So either:
- **Option B (recommended):** a `before update` trigger that raises unless the caller's own profile row has `role = 'central'`; or
- **Option C:** route the three toggle writes through a `security definer` RPC (`set_franchise_feature(target_id uuid, feature text, enabled boolean)`) that checks the caller is `central`, and revoke direct column UPDATE per Option A.

Option C is the cleanest and also fixes the same latent hole on `is_active`. Pick one and verify by attempting the update while logged in as a franchise owner.

### Step 2 — Shared helper

New file `src/utils/featureFlags.js`:

```js
export const FEATURE_KEYS = {
  order_stock:   { column: "order_stock_enabled",   globalKey: "online_payments" },
  stock_request: { column: "stock_request_enabled", globalKey: "stock_requests" },
};

// NULL / undefined => enabled. Only an explicit false disables.
export const isOn = (v) => v !== false;

export const isFeatureEnabled = (profile, globalSettings, feature) => {
  const { column, globalKey } = FEATURE_KEYS[feature];
  return isOn(globalSettings?.[globalKey]) && isOn(profile?.[column]);
};
```

Both the central page and the franchise dashboard import this. One definition, no drift.

### Step 3 — `central_franchise_profiles.jsx`

**3.1 Generalise the toggle state.** `togglingId` is currently a single id (`:67`). With three toggles per row, `togglingId === p.id` would grey out all three while one is saving. Change to a compound key:

```js
const [togglingKey, setTogglingKey] = useState(null); // `${profileId}:${field}`
```

**3.2 Generalise the handler.** Refactor `handleToggleStatus` into one function taking the column name:

```js
const applyToggle = async (profile, field) => {
  const key = `${profile.id}:${field}`;
  setTogglingKey(key);
  const next = profile[field] === false;                 // NULL/true -> false, false -> true
  const prev = profile[field];
  setProfiles(ps => ps.map(p => p.id === profile.id ? { ...p, [field]: next } : p)); // optimistic
  const { error } = await supabase.from("profiles").update({ [field]: next }).eq("id", profile.id);
  if (error) {
    setProfiles(ps => ps.map(p => p.id === profile.id ? { ...p, [field]: prev } : p)); // rollback
    alert("Failed to update: " + error.message);
  }
  setTogglingKey(null);
};
```

Note the rollback — the current `handleToggleStatus` never reverts optimistic state on failure, so a rejected write leaves the UI lying. Fix it here for all three.

**3.3 Generalise the confirmation modal.** `showToggleModal` / `profileToToggle` and the modal body at `:934-975` are hardcoded to activation copy. Replace `profileToToggle` with `{ profile, field }` and drive the title/body from a small map:

```js
const TOGGLE_COPY = {
  is_active:             { on: "Disable Account",  off: "Enable Account",  ... },
  order_stock_enabled:   { on: "Disable Order Stock",   off: "Enable Order Stock",   ... },
  stock_request_enabled: { on: "Disable Stock Request", off: "Enable Stock Request", ... },
};
```

Keep the confirm step for `is_active` (it force-logs the user out). For the two feature toggles a confirm dialog is optional — I'd skip it and toggle inline, since it's low-stakes and reversible. Your call.

**3.4 Visibility rules.** The two new toggles apply only to franchise outlets. Render them **only when `p.role === 'franchise'`** (add `'owner'` if you use that role — `sql_schemas.md` lists it in the enum but no code path sets it; check your live data). Central and stock rows show only Edit / Delete / Activation, exactly as today.

**3.5 Desktop table** (`:672-682`). The ACTION cell currently holds 3 controls in a flex row. Adding two more pills at ~70px each will blow out the last column. Recommended layout: **add one new `FEATURES` column before ACTION** holding the two pills stacked or side by side, and leave ACTION as Edit / Delete / Activation. This also needs a matching `<th>` (header row is at `:610-648`; there are currently 8 columns).

Icon suggestion, consistent with the franchise dashboard: `ShoppingBag` for Order Stock, `SendHorizontal` for Stock Request (both already used in `franchise_dashboard.jsx:5,9`).

**3.6 Mobile card** (`:586-597`). `cardActions` already has `flexWrap: 'wrap'`. Five buttons will wrap to three lines and read badly. Recommended: put the two feature pills in their own labelled row above the action row — mirror the transport-charge strip at `:573-580`.

**3.7 Fix `saveChanges` clobbering the toggles.** At `:291`:

```js
await supabase.from("profiles").update(editForm).eq("id", selectedProfile.id);
```

`editForm` is `{...profile}` snapshotted when the modal opened (`:202`). It carries **every** column, including `id`, `created_at`, `is_active`, and now the two new flags. Saving an unrelated address edit writes stale toggle values back — and if another admin toggled in the meantime, that change is silently reverted.

Fix: whitelist the fields the modal actually edits.

```js
const EDITABLE = ["name","email","phone","role","company","franchise_id","branch_location",
                  "nearest_bus_stop","city","state","country","pincode","address",
                  "transportation_charge"];
const payload = Object.fromEntries(EDITABLE.map(k => [k, editForm[k]]));
await supabase.from("profiles").update(payload).eq("id", selectedProfile.id);
```

This is a pre-existing bug that this feature would make visible — worth fixing regardless.

**3.8 Excel export** (`:392-407`). Add three columns so the export reflects reality:

```js
"Account Status":  p.is_active === false ? "Disabled" : "Active",
"Order Stock":     p.order_stock_enabled === false ? "OFF" : "ON",
"Stock Request":   p.stock_request_enabled === false ? "OFF" : "ON",
```

**3.9 Bulk Enable all / Disable all.**

**Scope — the most important call here.** "All" must mean **the rows currently visible after search + company filter**, not every row in the table. Reasons: it makes "enable Order Stock for every T Vanamm outlet" possible with the existing company filter, and when no filter is applied the visible set *is* everything, so plain "all" still works. The alternative — always hitting every franchise regardless of what's on screen — is a mis-click waiting to happen, because the admin is looking at 4 filtered rows while the button silently rewrites 90.

The target set is `sortedAndFilteredProfiles` narrowed to `role === 'franchise'` (same visibility rule as 3.4 — never bulk-write Central or Stock rows).

**Do not offer bulk for `is_active`.** Mass-disabling accounts force-logs-out every owner on their next hydrate ([AuthContext.jsx:72](../src/context/AuthContext.jsx#L72)) and is unrecoverable in one action. Bulk applies to the two feature flags only. Activation stays strictly per-row.

**Placement.** The controls row at `:515` already holds Export Excel and Register New User. Add a "Bulk Actions" dropdown there — four items (Order Stock: Enable all / Disable all; Stock Request: Enable all / Disable all). A dropdown rather than four loose buttons, since on mobile that row is already `flexDirection: column` and four more full-width buttons would push the table off screen.

**The write — one query, not a loop:**

```js
const applyBulk = async (field, value) => {
  const targets = sortedAndFilteredProfiles.filter(p => p.role === 'franchise');
  const ids = targets.map(p => p.id);
  if (!ids.length) return;

  const prev = new Map(targets.map(p => [p.id, p[field]]));   // snapshot per-row for rollback
  setBulkBusy(true);
  setProfiles(ps => ps.map(p => prev.has(p.id) ? { ...p, [field]: value } : p));

  // chunk: PostgREST puts `in.(...)` in the URL, so a long id list can blow the URL limit
  const CHUNK = 200;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { error } = await supabase
      .from("profiles").update({ [field]: value }).in("id", ids.slice(i, i + CHUNK));
    if (error) {
      await fetchProfiles();     // partial failure -> resync from server, don't guess
      alert("Bulk update failed: " + error.message);
      setBulkBusy(false);
      return;
    }
  }
  setBulkBusy(false);
};
```

Scope with `.in("id", ids)` — **never** `.eq("role", "franchise")` alone. That would ignore the on-screen filter and, if the RLS from Step 1 is looser than intended, quietly rewrite rows the admin never saw.

On partial failure (chunk 2 fails after chunk 1 committed) the optimistic state is half-wrong and a blanket rollback would be a lie — refetch instead. That's why `prev` exists only for the single-row path in 3.2; bulk resyncs.

**Confirmation modal is mandatory here** (unlike the per-row feature toggles in 3.3, which can be inline). It must name the count, the feature, the direction, and the active filter, so the admin can see the blast radius before committing:

> Enable **Order Stock** for **12 franchises**?
> Filter: Company = *T Vanamm*, Search = *"hyd"*
> They will be able to place online stock orders immediately.

**Interlock with the per-row toggles.** Disable the bulk menu while `togglingKey !== null`, and disable the per-row pills while `bulkBusy` — otherwise a per-row write can land between two chunks and get overwritten by the bulk that started first.

**If you take the RPC route in Step 1**, the function needs to accept an array so bulk stays one authorised call per chunk rather than N:

```sql
set_franchise_feature(target_ids uuid[], feature text, enabled boolean)
```

The single-row path then just passes a one-element array, and there's exactly one place enforcing "caller must be central".

### Step 4 — `franchise_dashboard.jsx`

**4.1 Fetch the profile flags.** `fetchProfileAndNotifications` at `:85-89` selects only `name, franchise_id`. Extend it:

```js
.select('name, franchise_id, order_stock_enabled, stock_request_enabled')
```

and store them in state alongside `franchiseName`.

**4.2 Combine both layers.** Replace the two booleans with the helper:

```js
comingSoon: !isFeatureEnabled(profileFlags, globalSettings, "order_stock")
```

**4.3 Watch the render race.** There are two independent `useEffect`s (`:36` profile, `:62` settings) and `navItems` is rebuilt on every render. On first paint both are at their initial `false`, so both cards flash "Coming Soon" before settling. Today that's already true; with a third async input it gets worse. Add a `settingsLoaded` flag and render the grid's disabled state only once both resolve (or show a skeleton) — otherwise a franchise owner sees the card flicker disabled → enabled on every load and will report it as a bug.

**4.4 Optional: live updates.** The dashboard already holds a realtime channel on `stock_requests` (`:43-56`). If you want Central's toggle to land without a refresh, add a channel on `profiles` filtered to `id=eq.<user.id>`, or just accept refresh-on-reload. Not required for correctness.

### Step 5 — Close the deep-link bypass (important)

**Today, the gate is cosmetic.** `/stock-orders` and `/franchise/requestportal` are protected only by `allowedRoles={["franchise"]}` (`App.jsx:328-338, 365-372`). Neither `central_franchise_stock_order.jsx` nor `franchise_stock_requests.jsx` checks any setting. Any franchise owner who bookmarked the URL keeps full access with the card greyed out.

Fix — add a `requiredFeature` prop to `ProtectedRoute`:

```jsx
<ProtectedRoute allowedRoles={["franchise"]} requiredFeature="order_stock">
  <StockOrder />
</ProtectedRoute>
```

Inside `ProtectedRoute`, when `requiredFeature` is set: read the flag off `profile` (already in `AuthContext`) plus the global setting, and `<Navigate to="/dashboard/franchiseowner" replace />` when disabled.

Two constraints:
- **`AuthContext` does not currently load `central_settings`.** Either fetch the two global rows once in `AuthProvider` and expose them on the context (cleanest — the dashboard can then drop its own fetch), or have `ProtectedRoute` fetch on demand and render the spinner while pending.
- **`/central/internal-order` renders the same `StockOrder` component** (`App.jsx:169-176`). Do **not** put `requiredFeature` on that route — Central's internal ordering must never be gated by a franchise flag.

### Step 6 — Registration flow

Check `src/pages/register/Registeruser.jsx` and `supabase/functions/register-user/index.ts`. If either builds an explicit column list when inserting into `profiles`, new franchises get whatever the DB default is — fine with `DEFAULT true`. If you go with `DEFAULT false`, add both fields to the registration form/insert so Central sets them at creation time instead of having to revisit the profiles page.

---

## 4. Bug-prevention checklist

| Risk | Guard |
| --- | --- |
| Pill shows ON, card shows Coming Soon | Single `isOn()` helper; never inline `=== true` vs `!== false` |
| Toggling one flag greys out the other two | Compound `togglingKey` = `${id}:${field}`, not bare `id` |
| Failed write leaves UI showing the wrong state | Roll back optimistic state in the `error` branch (also fixes existing `is_active`) |
| Editing an address silently resets the toggles | Whitelist the update payload in `saveChanges` (step 3.7) |
| Franchise owner re-enables their own cards via API | Column-level RLS / trigger / RPC (step 1) |
| Bookmark bypasses the disabled card | `requiredFeature` on `ProtectedRoute` (step 5) |
| Central's internal order breaks | No `requiredFeature` on `/central/internal-order` |
| Cards flash "Coming Soon" on every load | Gate the grid on both async loads resolving (step 4.3) |
| Existing franchises lose access on deploy day | `DEFAULT true` + explicit backfill UPDATE (step 2c) |
| Toggles appear on Central/Stock rows | Render only when `p.role === 'franchise'` |
| Central Settings copy now lies | Reword both cards to "Master switch" |
| Bulk rewrites rows the admin can't see | Target `sortedAndFilteredProfiles`, scope by `.in("id", ids)`, show filter + count in the confirm |
| Bulk hits Central/Stock accounts | Filter to `role === 'franchise'` before building `ids` |
| One mis-click logs out every owner | No bulk option for `is_active` — per-row only |
| Bulk half-applies and UI shows a lie | Chunk at 200, and `fetchProfiles()` on any chunk error instead of rolling back |
| Per-row write lost inside a bulk run | Interlock: bulk disabled while `togglingKey`, rows disabled while `bulkBusy` |
| Long id list breaks the request URL | Chunk at 200 (PostgREST puts `in.(...)` in the URL) |

## 5. Test matrix

Per feature (Order Stock, Stock Request), as a franchise owner:

1. global ON + franchise ON → card clickable, page loads
2. global ON + franchise OFF → card greyed + badge, **direct URL redirects to dashboard**
3. global OFF + franchise ON → card greyed, direct URL redirects
4. global OFF + franchise OFF → card greyed, direct URL redirects
5. Franchise A OFF does not affect Franchise B
6. Franchise owner `POST /rest/v1/profiles?id=eq.<self>` with `{order_stock_enabled:true}` → rejected
7. Central: toggle OFF → reload page → still OFF (persisted)
8. Central: open Edit on that franchise, change the phone number, save → toggle still OFF
9. Central: Export Excel → new columns match on-screen pills
10. Mobile viewport (`< 1024px`) → all five controls legible, no overflow
11. `is_active` OFF still force-logs-out on next hydrate (regression check)
12. Central's `/central/internal-order` unaffected by any franchise flag

Bulk actions:

13. No filter → "Disable all" → every franchise row flips OFF; Central + Stock rows untouched
14. Company filter = *T Vanamm* → "Enable all" → only those rows flip; a franchise from another company stays as it was
15. Search box narrows to 1 row → "Disable all" → exactly 1 row changes, confirm modal said "1 franchise"
16. Confirm modal shows the correct count and the active filter before committing
17. Bulk → reload the page → state persisted (catches optimistic-only writes)
18. Bulk OFF → franchise owner's dashboard shows both cards greyed and the direct URL redirects
19. Bulk while a per-row toggle is mid-flight → one is blocked by the interlock, no lost write
20. Force an error mid-bulk (offline after the first chunk) → table resyncs from server, no half-truth left on screen

---

## 6. Files touched

| File | Change |
| --- | --- |
| Supabase SQL (dashboard) | 2 columns + backfill + RLS guard (+ array-arg RPC if taking Option C) |
| `src/utils/featureFlags.js` | **new** — keys + `isOn` + `isFeatureEnabled` |
| `src/pages/central/central_franchise_profiles.jsx` | 2 toggles, generalised handler/modal, new column, mobile row, export cols, `saveChanges` whitelist, bulk menu + bulk confirm modal |
| `src/pages/dashboards/franchise_dashboard.jsx` | fetch flags, AND with global, fix load flicker |
| `src/routes/ProtectedRoute.jsx` | `requiredFeature` prop |
| `src/App.jsx` | `requiredFeature` on the 2 franchise routes only |
| `src/context/AuthContext.jsx` | expose `centralSettings` (if going the context route) |
| `src/pages/central/central_settings.jsx` | copy change to "Master switch" |
| `src/pages/register/Registeruser.jsx` | only if defaulting to `false` |
