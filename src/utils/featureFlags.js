/**
 * Per-franchise feature flags.
 *
 * A card on the franchise dashboard is enabled only when BOTH layers agree:
 *   1. the global kill-switch in `central_settings` (Central Settings page), AND
 *   2. the per-franchise column on `profiles` (Franchise Profiles page).
 *
 * The two layers deliberately have DIFFERENT null semantics — see below.
 * Keep every comparison in this file; inlining `=== true` / `!== false` at call
 * sites is how the "pill says ON but the card says Coming Soon" bug happens.
 */

export const FEATURES = {
  order_stock: {
    label: "Order Stock",
    column: "order_stock_enabled",
    globalKey: "online_payments",
    route: "/stock-orders",
  },
  stock_request: {
    label: "Stock Request",
    column: "stock_request_enabled",
    globalKey: "stock_requests",
    route: "/franchise/requestportal",
  },
};

/** Columns the franchise-profiles page reads for the per-row pills. */
export const FEATURE_COLUMNS = Object.values(FEATURES).map((f) => f.column);

/**
 * Per-franchise flag. NULL/undefined means "never explicitly set" => enabled,
 * matching the `is_active` convention already used across the profiles page and
 * the `DEFAULT true` on the columns. Only an explicit `false` disables.
 */
export const isOn = (value) => value !== false;

/**
 * Global kill-switch. An absent `central_settings` row means the feature was
 * never switched on, so it stays OFF. This preserves the existing behaviour of
 * `useState(false)` in franchise_dashboard.jsx — do NOT relax it to `!== false`
 * or a missing settings row would silently enable the feature network-wide.
 */
export const isGloballyOn = (value) => value === true;

/**
 * @param {object|null} profile        row from `profiles` (needs the flag column)
 * @param {object|null} globalSettings map of central_settings key -> enabled
 * @param {keyof FEATURES} feature
 */
export const isFeatureEnabled = (profile, globalSettings, feature) => {
  const def = FEATURES[feature];
  if (!def) return false;
  return (
    isGloballyOn(globalSettings?.[def.globalKey]) && isOn(profile?.[def.column])
  );
};

/** Turns the `central_settings` rows into the map `isFeatureEnabled` expects. */
export const toSettingsMap = (rows) =>
  (rows || []).reduce((acc, row) => {
    acc[row.key] = row.enabled;
    return acc;
  }, {});
