import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "./frontend_supabase/supabaseClient";

/* AUTH */
const StaticPage = lazy(() => import("./pages/login/static_page"));
const Login = lazy(() => import("./pages/login/Login"));
const RegisterUser = lazy(() => import("./pages/register/Registeruser"));

/* STORE */
const Store = lazy(() => import("./pages/store/store_new_bills"));
const BillingHistory = lazy(() => import("./pages/store/store_billing_history"));

/* DASHBOARDS */
const StockManagerDashboard = lazy(() => import("./pages/dashboards/stock_dashboard"));
const CentralDashboard = lazy(() => import("./pages/dashboards/central_dashboard"));
const FranchiseOwnerDashboard = lazy(() => import("./pages/dashboards/franchise_dashboard"));

/* STOCK */
const StockUpdate = lazy(() => import("./pages/stock/stock_update"));
const StockOrders = lazy(() => import("./pages/stock/stock_orders"));
const InvoicesBilling = lazy(() => import("./pages/stock/stock_invoices"));
const Settings = lazy(() => import("./pages/stock/stock_settings"));

/* FRANCHISE */
const StockOrder = lazy(() => import("./pages/franchise/central_franchise_stock_order"));
const FranchiseInvoices = lazy(() => import("./pages/franchise/franchise_invoices"));
const FranchiseAnalytics = lazy(() => import("./pages/franchise/franchise_reports"));
const RequestPortal = lazy(() => import("./pages/franchise/franchise_stock_requests"));
const FranchiseMenu = lazy(() => import("./pages/franchise/franchise_menus"));
const FranchiseSettingsCard = lazy(() => import("./pages/franchise/franchise_settings"));
const FranchiseProfiles = lazy(() => import("./pages/franchise/franchise_staff_profiles"));
const LoginTimings = lazy(() => import("./pages/franchise/franchise_staff_login_timings"));

/* CENTRAL */
const CentralInvoices = lazy(() => import("./pages/central/central_invoices"));
const CentralSettings = lazy(() => import("./pages/central/central_settings"));
const CentralProfiles = lazy(() => import("./pages/central/central_franchise_profiles"));
const CentralStaffProfiles = lazy(() => import("./pages/central/central_staff_profiles"));
const CentralStaffLogins = lazy(() => import("./pages/central/central_staff_logins"));
const CentralVendors = lazy(() => import("./pages/central/central_vendors"));
const PosManagement = lazy(() => import("./pages/central/central_master_menu"));
const Reports = lazy(() => import("./pages/central/central_reports"));
const FranchiseReplies = lazy(() => import("./pages/central/central_franchise_replies"));
const CentralStockMaster = lazy(() => import("./pages/central/central_stock_master"));
const InvoiceDesign = lazy(() => import("./pages/central/central_register_company"));
const PackageBills = lazy(() => import("./pages/central/central_new_franchise_bills"));
const OldQuotations = lazy(() => import("./pages/central/central_quotation_bills"));
const OldTokenBills = lazy(() => import('./pages/central/central_token_bills'));
const CentralVoucher = lazy(() => import('./pages/central/central_voucher'));

/* CONTEXTS & COMPONENTS */
import { AuthProvider } from "./context/AuthContext";
import { PrinterProvider } from "./pages/printer/BluetoothPrinter";
import ProtectedRoute from "./routes/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

/**
 * Helper component to handle navigation logic for Settings.
 * This must be used inside BrowserRouter.
 */
function SettingsWrapper() {
  const navigate = useNavigate();
  return (
    <FranchiseSettingsCard onBack={() => navigate("/dashboard/franchiseowner")} />
  );
}

function App() {
  // UseEffect to update the Favicon dynamically from Supabase Storage
  useEffect(() => {
    const updateFavicon = async () => {
      try {
        // Query the JKSH logo specifically from your companies table
        const { data } = await supabase
          .from('companies')
          .select('logo_url')
          .ilike('company_name', '%JKSH%')
          .maybeSingle();

        const faviconUrl = data?.logo_url;

        if (faviconUrl) {
          let link = document.querySelector("link[rel~='icon']");
          if (link) {
            link.href = faviconUrl;
          } else {
            // Create link tag if it doesn't exist
            link = document.createElement('link');
            link.rel = 'icon';
            link.href = faviconUrl;
            document.getElementsByTagName('head')[0].appendChild(link);
          }
        }
      } catch (err) {
        console.error("Failed to update favicon dynamically:", err);
      }
    };

    updateFavicon();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <PrinterProvider>
          <BrowserRouter>
            <Suspense fallback={
              <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-[rgb(0,100,55)] animate-spin mb-4"></div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading JKSH...</div>
                </div>
              </div>
            }>
              <Routes>

              {/* ================= PUBLIC ================= */}
              <Route path="/" element={<StaticPage />} />
              <Route path="/login" element={<Login />} />

              {/* ================= STORE MODE ================= */}
              <Route
                path="/store"
                element={
                  <ProtectedRoute storeOnly={true}>
                    <Store />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/history"
                element={
                  <ProtectedRoute storeOnly={true}>
                    <BillingHistory />
                  </ProtectedRoute>
                }
              />

              {/* ================= CENTRAL ADMIN ================= */}
              <Route
                path="/register"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <RegisterUser />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/central"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <CentralDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/internal-order"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <StockOrder />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/vendors"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <CentralVendors />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/invoices"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <CentralInvoices />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/package-bills"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <PackageBills />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/quotations"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <OldQuotations />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/central_settings"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <CentralSettings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/token-bills"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <OldTokenBills />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/central_voucher"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <CentralVoucher />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/central_register_company"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <InvoiceDesign />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/central_franchise_profiles"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <CentralProfiles />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/central_staff_profiles"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <CentralStaffProfiles />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/central_staff_logins"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <CentralStaffLogins />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/timings"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <CentralStaffLogins />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/central_reports"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <Reports />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/stock"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <CentralStockMaster />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/central_master_menu"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <PosManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/central_franchise_replies"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <FranchiseReplies />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/replies"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <FranchiseReplies />
                  </ProtectedRoute>
                }
              />

              {/* ================= FRANCHISE ADMIN ================= */}
              <Route
                path="/dashboard/franchiseowner"
                element={
                  <ProtectedRoute allowedRoles={["franchise"]}>
                    <FranchiseOwnerDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/stock-orders"
                element={
                  <ProtectedRoute allowedRoles={["franchise"]}>
                    <StockOrder />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/franchise/invoices"
                element={
                  <ProtectedRoute allowedRoles={["franchise"]}>
                    <FranchiseInvoices />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/franchise/analytics"
                element={
                  <ProtectedRoute allowedRoles={["franchise"]}>
                    <FranchiseAnalytics />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/franchise/requestportal"
                element={
                  <ProtectedRoute allowedRoles={["franchise"]}>
                    <RequestPortal />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/franchise/menu"
                element={
                  <ProtectedRoute allowedRoles={["franchise"]}>
                    <FranchiseMenu />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/franchise/staff"
                element={
                  <ProtectedRoute allowedRoles={["franchise"]}>
                    <FranchiseProfiles />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/franchise/timings"
                element={
                  <ProtectedRoute allowedRoles={["franchise"]}>
                    <LoginTimings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/franchise/settings"
                element={
                  <ProtectedRoute allowedRoles={["franchise"]}>
                    <SettingsWrapper />
                  </ProtectedRoute>
                }
              />

              {/* ================= STOCK ADMIN ================= */}
              <Route
                path="/dashboard/stockmanager"
                element={
                  <ProtectedRoute allowedRoles={["stock"]}>
                    <StockManagerDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/stock"
                element={
                  <ProtectedRoute allowedRoles={["stock"]}>
                    <StockUpdate />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/stock/orders"
                element={
                  <ProtectedRoute allowedRoles={["stock"]}>
                    <StockOrders />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/stock/bills"
                element={
                  <ProtectedRoute allowedRoles={["stock", "franchise"]}>
                    <InvoicesBilling />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/stock/settings"
                element={
                  <ProtectedRoute allowedRoles={["stock"]}>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              </Routes>
            </Suspense>
          </BrowserRouter>
        </PrinterProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;