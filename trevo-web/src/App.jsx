import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import PublicShopProfile from "./pages/PublicShopProfile";
import CollectionManager from "./pages/CollectionManager";
import ShopDashboard from "./pages/ShopDashboard";
import CreateShop from "./pages/CreateShop";
import ProductForm from "./pages/ProductForm";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Checkout from "./pages/Checkout";
import Unauthorized from "./pages/Unauthorized";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";
import { ROLES } from "./lib/roles";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/shops/:shopId" element={<PublicShopProfile />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route element={<RoleRoute allowedRoles={[ROLES.BUYER]} />}>
        <Route path="/checkout" element={<Checkout />} />
      </Route>

      <Route element={<RoleRoute allowedRoles={[ROLES.SHOP_OWNER]} />}>
        <Route path="/shops/new" element={<CreateShop />} />
      </Route>

      <Route element={<RoleRoute allowedRoles={[ROLES.SHOP_OWNER]} />}>
        <Route path="/shop/dashboard" element={<ShopDashboard />} />
      </Route>

      <Route element={<RoleRoute allowedRoles={[ROLES.SHOP_OWNER]} />}>
        <Route path="/shops/:shopId/collections" element={<CollectionManager />} />
      </Route>

      <Route element={<RoleRoute allowedRoles={[ROLES.SHOP_OWNER]} />}>
        <Route path="/products/new" element={<ProductForm mode="create" />} />
        <Route path="/products/:productId/edit" element={<ProductForm mode="edit" />} />
      </Route>

      <Route element={<RoleRoute allowedRoles={[ROLES.ADMIN]} />}>
        <Route path="/admin" element={<Admin />} />
      </Route>
    </Routes>
  );
}
