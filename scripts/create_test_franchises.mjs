/**
 * Creates disposable franchise accounts for manual order testing.
 *
 * WHY THE RESEND WEBHOOK CANNOT DELETE THESE
 * ------------------------------------------
 * supabase/functions/resend-webhook only acts on `email.bounced` events. A
 * bounce event can only exist if an email was actually SENT to the address.
 *
 * The normal signup path (supabase/functions/register-user) sends a Resend
 * welcome email, so a dead address bounces and the webhook deletes the user.
 * This script never calls that edge function — it creates users directly
 * through the GoTrue admin API with `email_confirm: true`, so:
 *
 *   - no Resend email is sent  -> no bounce event -> webhook never fires
 *   - no Supabase confirmation email is sent either
 *
 * Bonus: sampleN@gmail.com are plausibly REAL mailboxes owned by real people.
 * The welcome email embeds the plaintext password, so not sending is also the
 * right call for them.
 *
 * Usage:
 *   node scripts/create_test_franchises.mjs          # create
 *   node scripts/create_test_franchises.mjs --verify # report state only
 *   node scripts/create_test_franchises.mjs --delete # remove them again
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env"), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL / SERVICE_ROLE_KEY in .env");

// service_role bypasses RLS and is explicitly allowed by the
// guard_franchise_feature_columns trigger.
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "Admin@123";
const COMPANY = "T VANAMM";        // only company used by existing franchises
const CENTRAL_MENU_SOURCE = "TV-1"; // same source the Register page clones from

/**
 * Mirrors the conventions already in `profiles`: city UPPERCASE, state in title
 * case, country "India". Transport charge follows the real pattern in the data —
 * out-of-state Andhra Pradesh outlets pay 300, local Telangana outlets pay 0
 * (27 of the 31 live franchises are on 0, three are on 300).
 */
const ACCOUNTS = [
  {
    email: "sample1@gmail.com", franchise_id: "TEST-1",
    name: "Ravi Teja Kolli", phone: "9848213476",
    branch_location: "T Vanamm Benz Circle",
    address: "12-4-87, Benz Circle Main Road, Labbipet",
    city: "VIJAYAWADA", state: "Andhra Pradesh", pincode: "520010",
    nearest_bus_stop: "Benz Circle Bus Stop", transportation_charge: 300,
  },
  {
    email: "sample2@gmail.com", franchise_id: "TEST-2",
    name: "Sai Priya Nallamothu", phone: "9885417290",
    branch_location: "T Vanamm MVP Colony",
    address: "50-84-21, MVP Colony, Sector 4",
    city: "VISAKHAPATNAM", state: "Andhra Pradesh", pincode: "530017",
    nearest_bus_stop: "MVP Sector 4 Bus Stop", transportation_charge: 300,
  },
  {
    email: "sample3@gmail.com", franchise_id: "TEST-3",
    name: "Venkat Rao Mandava", phone: "9700368145",
    branch_location: "T Vanamm Brodipet",
    address: "5-38-19, Brodipet 4th Line",
    city: "GUNTUR", state: "Andhra Pradesh", pincode: "522002",
    nearest_bus_stop: "Guntur Bus Station", transportation_charge: 300,
  },
  {
    email: "sample4@gmail.com", franchise_id: "TEST-4",
    name: "Anusha Reddy Vemula", phone: "9502734861",
    branch_location: "T Vanamm Kondapur",
    address: "Plot 214, Kondapur Main Road, Silpa Layout",
    city: "HYDERABAD", state: "Telangana", pincode: "500084",
    nearest_bus_stop: "Kothaguda X Roads", transportation_charge: 0,
  },
  {
    email: "sample5@gmail.com", franchise_id: "TEST-5",
    name: "Kiran Kumar Bandari", phone: "9963158204",
    branch_location: "T Vanamm Hanamkonda",
    address: "1-8-45, Hanamkonda Main Road, Subedari",
    city: "WARANGAL", state: "Telangana", pincode: "506001",
    nearest_bus_stop: "Hanamkonda Chowrastha", transportation_charge: 0,
  },
].map((a) => ({ ...a, country: "India" }));

const mode = process.argv.includes("--delete")
  ? "delete"
  : process.argv.includes("--verify")
    ? "verify"
    : "create";

async function findUserByEmail(email) {
  // listUsers is paginated; walk until found or exhausted.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function create() {
  for (const acct of ACCOUNTS) {
    process.stdout.write(`\n[${acct.email}] (${acct.franchise_id})\n`);

    let user = await findUserByEmail(acct.email);
    if (user) {
      console.log("  · auth user already exists, reusing");
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: acct.email,
        password: PASSWORD,
        email_confirm: true, // no confirmation email; account is usable at once
        user_metadata: { ...acct, role: "franchise" },
      });
      if (error) { console.error("  ✗ createUser:", error.message); continue; }
      user = data.user;
      console.log("  ✓ auth user created (NO email sent)");
    }

    // The on_auth_user_created* triggers build the profile from user_metadata,
    // but upsert explicitly so re-runs converge and every column is right.
    const { error: pErr } = await admin.from("profiles").upsert({
      id: user.id,
      email: acct.email,
      name: acct.name,
      phone: acct.phone,
      role: "franchise",
      company: COMPANY,
      franchise_id: acct.franchise_id,
      branch_location: acct.branch_location,
      address: acct.address,
      city: acct.city,
      state: acct.state,
      country: acct.country,
      pincode: acct.pincode,
      nearest_bus_stop: acct.nearest_bus_stop,
      transportation_charge: acct.transportation_charge,
      is_active: true,
      order_stock_enabled: true,
      stock_request_enabled: true,
    }, { onConflict: "id" });
    if (pErr) { console.error("  ✗ profile:", pErr.message); continue; }
    console.log("  ✓ profile upserted (both feature toggles ON)");

    const { count: existing } = await admin
      .from("menus").select("id", { count: "exact", head: true })
      .eq("franchise_id", acct.franchise_id);

    if (existing > 0) {
      console.log(`  · menu already present (${existing} items), skipping clone`);
    } else {
      const { error: mErr } = await admin.rpc("clone_franchise_menu", {
        target_id: acct.franchise_id,
        central_id: CENTRAL_MENU_SOURCE,
      });
      if (mErr) { console.error("  ✗ menu sync:", mErr.message); continue; }
      const { count } = await admin
        .from("menus").select("id", { count: "exact", head: true })
        .eq("franchise_id", acct.franchise_id);
      console.log(`  ✓ menu synced from ${CENTRAL_MENU_SOURCE} (${count} items)`);
    }
  }
}

const pad = (v, n) => String(v ?? "").padEnd(n);

async function verify() {
  const cols = [
    ["EMAIL", 20], ["PASSWORD", 10], ["ROLE", 10], ["FRANCHISE ID", 13],
    ["OWNER NAME", 22], ["PHONE", 12], ["COMPANY", 10], ["BRANCH", 22],
    ["CITY", 15], ["STATE", 16], ["PIN", 7], ["TRANSPORT", 10],
    ["ACTIVE", 7], ["ORDER", 6], ["REQUEST", 8], ["MENU", 5],
  ];
  console.log("\n" + cols.map(([h, w]) => pad(h, w)).join(""));
  console.log("-".repeat(cols.reduce((s, [, w]) => s + w, 0)));

  for (const acct of ACCOUNTS) {
    const { data: p } = await admin.from("profiles").select("*")
      .eq("email", acct.email).maybeSingle();
    if (!p) { console.log(pad(acct.email, 20) + "MISSING"); continue; }
    const { count } = await admin.from("menus")
      .select("id", { count: "exact", head: true })
      .eq("franchise_id", acct.franchise_id);

    console.log(
      pad(p.email, 20) + pad(PASSWORD, 10) + pad(p.role, 10) + pad(p.franchise_id, 13) +
      pad(p.name, 22) + pad(p.phone, 12) + pad(p.company, 10) + pad(p.branch_location, 22) +
      pad(p.city, 15) + pad(p.state, 16) + pad(p.pincode, 7) +
      pad(`Rs.${Number(p.transportation_charge ?? 0)}`, 10) +
      pad(p.is_active, 7) + pad(p.order_stock_enabled, 6) +
      pad(p.stock_request_enabled, 8) + pad(count ?? 0, 5)
    );
  }

  console.log("\nFULL ADDRESSES");
  for (const acct of ACCOUNTS) {
    const { data: p } = await admin.from("profiles")
      .select("franchise_id, address, city, state, pincode, country, nearest_bus_stop")
      .eq("email", acct.email).maybeSingle();
    if (!p) continue;
    console.log(`  ${pad(p.franchise_id, 8)} ${p.address}, ${p.city}, ${p.state} - ${p.pincode}, ${p.country}`);
    console.log(`  ${" ".repeat(8)} nearest bus stop: ${p.nearest_bus_stop}`);
  }

  const { data: gs } = await admin.from("central_settings").select("key, enabled");
  console.log("\nglobal switches:", Object.fromEntries((gs || []).map((r) => [r.key, r.enabled])));
}

async function remove() {
  for (const acct of ACCOUNTS) {
    process.stdout.write(`\n[${acct.email}]\n`);
    await admin.from("menus").delete().eq("franchise_id", acct.franchise_id);
    console.log("  ✓ menus removed");
    const user = await findUserByEmail(acct.email);
    if (!user) { console.log("  · no auth user"); continue; }
    await admin.from("profiles").delete().eq("id", user.id);
    const { error } = await admin.auth.admin.deleteUser(user.id);
    console.log(error ? `  ✗ deleteUser: ${error.message}` : "  ✓ auth user + profile deleted");
  }
}

const run = { create, verify, delete: remove }[mode];
await run();
if (mode === "create") await verify();
console.log(`\nDone (${mode}).`);
