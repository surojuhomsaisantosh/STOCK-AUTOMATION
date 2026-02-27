import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "./supabase/supabaseClient";

/* AUTH */
import Login from "./pages/login/Login";
import RegisterUser from "./pages/register/Registeruser";

/* STORE */
import Store from "./pages/store/store";
import BillingHistory from "./pages/store/BillingHistory";

/* DASHBOARDS */
import StockManagerDashboard from "./pages/dashboards/stockmanager";
import CentralDashboard from "./pages/dashboards/central";
import FranchiseOwnerDashboard from "./pages/dashboards/franchiseowner";

/* STOCK */
import StockUpdate from "./pages/stock/StockUpdate";
import StockOrders from "./pages/stock/StockOrders";
import InvoicesBilling from "./pages/stock/invoices_billing";
import Settings from "./pages/stock/settings";

/* FRANCHISE */
import StockOrder from "./pages/franchise/stockorder";
import FranchiseInvoices from "./pages/franchise/franchiseinvoices";
import FranchiseAnalytics from "./pages/franchise/FranchiseAnalytics";
import RequestPortal from "./pages/franchise/RequestPortal";
import FranchiseMenu from "./pages/franchise/FranchiseMenu";
import FranchiseSettingsCard from "./pages/franchise/FranchiseSettingsCard";
import FranchiseProfiles from "./pages/franchise/FranchiseProfiles";
import LoginTimings from "./pages/franchise/LoginTimings";

/* CENTRAL */
import CentralInvoices from "./pages/central/centralinvoices";
import CentralSettings from "./pages/central/centralsettings";
import CentralProfiles from "./pages/central/centralprofiles";
import CentralStaffProfiles from "./pages/central/CentralStaffProfiles";
import CentralStaffLogins from "./pages/central/CentralStaffLogins";
import CentralVendors from "./pages/central/CentralVendors";
import PosManagement from "./pages/central/posmanagement";
import Reports from "./pages/central/reports";
import FranchiseReplies from "./pages/central/FranchiseReplies";
import CentralStockMaster from "./pages/central/CentralStockMaster";
import InvoiceDesign from "./pages/central/InvoiceDesign";
import PackageBills from "./pages/central/PackageBills";

/* CONTEXTS */
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
          const link = document.querySelector("link[rel~='icon']");
          if (link) {
            link.href = faviconUrl;
          } else {
            // Create link tag if it doesn't exist
            const newLink = document.createElement('link');
            newLink.rel = 'icon';
            newLink.href = faviconUrl;
            document.getElementsByTagName('head')[0].appendChild(newLink);
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
            <Routes>

              {/* ================= PUBLIC ================= */}
              <Route path="/" element={<Login />} />

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
                path="/central/settings"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <CentralSettings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/invoice-design"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <InvoiceDesign />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/profiles"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <CentralProfiles />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/staff-profiles"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <CentralStaffProfiles />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/staff-logins"
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
                path="/central/reports"
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
                path="/central/posmanagement"
                element={
                  <ProtectedRoute allowedRoles={["central"]}>
                    <PosManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/central/support"
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
          </BrowserRouter>
        </PrinterProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;