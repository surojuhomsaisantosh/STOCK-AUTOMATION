import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/login/login";
import RegisterUser from "./pages/register/Registeruser";

import StockManagerDashboard from "./pages/dashboards/stockmanager";
import CentralDashboard from "./pages/dashboards/central";
import FranchiseOwnerDashboard from "./pages/dashboards/franchiseowner";

import StockUpdate from "./pages/stock/StockUpdate";
import Settings from "./pages/stock/settings";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ================= PUBLIC ROUTES ================= */}
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

          {/* ================= FRANCHISE OWNER ================= */}
          <Route
            path="/dashboard/franchiseowner"
            element={
              <ProtectedRoute allowedRoles={["franchise"]}>
                <FranchiseOwnerDashboard />
              </ProtectedRoute>
            }
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
