import { BrowserRouter, Routes, Route } from "react-router-dom";

/* AUTH */
import Login from "./pages/login/login";
import RegisterUser from "./pages/register/Registeruser";

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

/* CENTRAL PAGES */
import CentralInvoices from "./pages/central/centralinvoices";
import CentralSettings from "./pages/central/centralsettings";
import CentralProfiles from "./pages/central/centralprofiles";
import Accounts from "./pages/central/accounts"; // ✅ NEW IMPORT

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
          <Route path="/register" element={<RegisterUser />} />

          {/* ================= STOCK MANAGER ================= */}
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

          {/* ================= CENTRAL ================= */}
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

          {/* ✅ CENTRAL ACCOUNTS ROUTE */}
          <Route
            path="/central/accounts"
            element={
              <ProtectedRoute allowedRoles={["central"]}>
                <Accounts />
              </ProtectedRoute>
            }
          />

          {/* ================= FRANCHISE ================= */}
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

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
