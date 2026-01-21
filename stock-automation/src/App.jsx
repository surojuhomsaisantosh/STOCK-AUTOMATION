import { BrowserRouter, Routes, Route } from "react-router-dom";

/* AUTH */
import Login from "./pages/login/Login";
import RegisterUser from "./pages/register/Registeruser";

/* STORE */
import Store from "./pages/store/store";

/* DASHBOARDS */
import StockManagerDashboard from "./pages/dashboards/stockmanager";
import CentralDashboard from "./pages/dashboards/central";
import FranchiseOwnerDashboard from "./pages/dashboards/franchiseowner";

/* STOCK */
import StockUpdate from "./pages/stock/StockUpdate";
import StockOrders from "./pages/stock/stockorders";
import InvoicesBilling from "./pages/stock/invoices_billing";
import Settings from "./pages/stock/settings";

/* FRANCHISE */
import StockOrder from "./pages/franchise/stockorder";
import FranchiseInvoices from "./pages/franchise/franchiseinvoices";
import FranchiseAnalytics from "./pages/franchise/franchiseanalytics"; 
import RequestPortal from "./pages/franchise/RequestPortal"; 
import FranchiseMenu from "./pages/franchise/FranchiseMenu";
import FranchiseSettingsCard from "./pages/franchise/FranchiseSettingsCard"; // Added Settings Import

/* CENTRAL */
import CentralInvoices from "./pages/central/centralinvoices";
import CentralSettings from "./pages/central/centralsettings";
import CentralProfiles from "./pages/central/centralprofiles";
import Accounts from "./pages/central/accounts";
import PosManagement from "./pages/central/posmanagement";
import Reports from "./pages/central/reports";
import FranchiseReplies from "./pages/central/FranchiseReplies";

/* AUTH CONTEXT */
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
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
            path="/central/invoices"
            element={
              <ProtectedRoute allowedRoles={["central"]}>
                <CentralInvoices />
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
            path="/central/profiles"
            element={
              <ProtectedRoute allowedRoles={["central"]}>
                <CentralProfiles />
              </ProtectedRoute>
            }
          />

          <Route
            path="/central/accounts"
            element={
              <ProtectedRoute allowedRoles={["central"]}>
                <Accounts />
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
            path="/central/posmanagement"
            element={
              <ProtectedRoute allowedRoles={["central"]}>
                <PosManagement />
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

          {/* Franchise Menu Route */}
          <Route
            path="/franchise/menu"
            element={
              <ProtectedRoute allowedRoles={["franchise"]}>
                <FranchiseMenu />
              </ProtectedRoute>
            }
          />

          {/* NEW: Franchise Settings Route */}
          <Route
            path="/franchise/settings"
            element={
              <ProtectedRoute allowedRoles={["franchise"]}>
                <FranchiseSettingsCard onBack={() => window.history.back()} />
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
    </AuthProvider>
  );
}

export default App;