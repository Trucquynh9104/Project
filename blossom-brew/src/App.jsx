import WebTools from "./components/WebTools";
import RouteBoundary, { Guard } from "./components/RouteBoundary";
import RuntimeStatus from "./components/RuntimeStatus";
import AdminOperationsPage from "./pages/admin/AdminOperationsPage";
import CustomerSupportPage from "./pages/customer/CustomerSupportPage";
import GuestNoticesPage from "./pages/guest/GuestNoticesPage";
import { Navigate, Route, Routes } from "react-router-dom";
import GuestMenu from "./pages/guest/GuestMenu";
import LoginPage from "./pages/guest/LoginPage";
import ForgotPasswordPage from "./pages/guest/ForgotPasswordPage";
import RegisterPage from "./pages/guest/RegisterPage";
import CustomerHome from "./pages/customer/CustomerHome";
import CustomerPointsPage from "./pages/customer/CustomerPointsPage";
import CustomerHistoryPage from "./pages/customer/CustomerHistoryPage";
import CustomerMenuPage from "./pages/customer/CustomerMenuPage";
import CustomerCartPage from "./pages/customer/CustomerCartPage";
import CustomerCheckoutPage from "./pages/customer/CustomerCheckoutPage";
import CustomerNoticesPage from "./pages/customer/CustomerNoticesPage";
import CustomerProfilePage from "./pages/customer/CustomerProfilePage";
import CustomerReviewPage from "./pages/customer/CustomerReviewPage";
import CashierPOSPage from "./pages/cashier/CashierPOSPage";
import CashierHomePage from "./pages/cashier/CashierHomePage";
import CashierOrdersPage from "./pages/cashier/CashierOrdersPage";
import CashierShiftPage from "./pages/cashier/CashierShiftPage";
import CashierNoticesPage from "./pages/cashier/CashierNoticesPage";
import CashierProfilePage from "./pages/cashier/CashierProfilePage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminHomePage from "./pages/admin/AdminHomePage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminVouchersPage from "./pages/admin/AdminVouchersPage";
import AdminNoticesPage from "./pages/admin/AdminNoticesPage";
import AdminMembersPage from "./pages/admin/AdminMembersPage";
import AdminCashiersPage from "./pages/admin/AdminCashiersPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";
import AdminProfilePage from "./pages/admin/AdminProfilePage";

function App() {
  return (
    <>
      <WebTools />
      <RuntimeStatus />
      <RouteBoundary>
        <Routes>
          <Route path="/" element={<GuestMenu />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/customer"
            element={
              <Guard role="customer">
                <CustomerHome />
              </Guard>
            }
          />
          <Route
            path="/customer/menu"
            element={
              <Guard role="customer">
                <CustomerMenuPage />
              </Guard>
            }
          />
          <Route
            path="/customer/cart"
            element={
              <Guard role="customer">
                <CustomerCartPage />
              </Guard>
            }
          />
          <Route
            path="/customer/history"
            element={
              <Guard role="customer">
                <CustomerHistoryPage />
              </Guard>
            }
          />
          <Route
            path="/customer/checkout"
            element={
              <Guard role="customer">
                <CustomerCheckoutPage />
              </Guard>
            }
          />
          <Route
            path="/customer/notices"
            element={
              <Guard role="customer">
                <CustomerNoticesPage />
              </Guard>
            }
          />
          <Route
            path="/customer/points"
            element={
              <Guard role="customer">
                <CustomerPointsPage />
              </Guard>
            }
          />
          <Route
            path="/customer/profile"
            element={
              <Guard role="customer">
                <CustomerProfilePage />
              </Guard>
            }
          />
          <Route
            path="/customer/review"
            element={
              <Guard role="customer">
                <CustomerReviewPage />
              </Guard>
            }
          />
          <Route
            path="/cashier"
            element={
              <Guard role="cashier">
                <CashierPOSPage />
              </Guard>
            }
          />
          <Route
            path="/cashier/home"
            element={
              <Guard role="cashier">
                <CashierHomePage />
              </Guard>
            }
          />
          <Route
            path="/cashier/orders"
            element={
              <Guard role="cashier">
                <CashierOrdersPage />
              </Guard>
            }
          />
          <Route
            path="/cashier/shift"
            element={
              <Guard role="cashier">
                <CashierShiftPage />
              </Guard>
            }
          />
          <Route
            path="/cashier/notices"
            element={
              <Guard role="cashier">
                <CashierNoticesPage />
              </Guard>
            }
          />
          <Route
            path="/cashier/profile"
            element={
              <Guard role="cashier">
                <CashierProfilePage />
              </Guard>
            }
          />
          <Route
            path="/admin"
            element={
              <Guard role="admin">
                <AdminDashboardPage />
              </Guard>
            }
          />
          <Route
            path="/admin/home"
            element={
              <Guard role="admin">
                <AdminHomePage />
              </Guard>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <Guard role="admin">
                <AdminOrdersPage />
              </Guard>
            }
          />
          <Route
            path="/admin/products"
            element={
              <Guard role="admin">
                <AdminProductsPage />
              </Guard>
            }
          />
          <Route
            path="/admin/vouchers"
            element={
              <Guard role="admin">
                <AdminVouchersPage />
              </Guard>
            }
          />
          <Route
            path="/admin/notices"
            element={
              <Guard role="admin">
                <AdminNoticesPage />
              </Guard>
            }
          />
          <Route
            path="/admin/members"
            element={
              <Guard role="admin">
                <AdminMembersPage />
              </Guard>
            }
          />
          <Route
            path="/admin/cashiers"
            element={
              <Guard role="admin">
                <AdminCashiersPage />
              </Guard>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <Guard role="admin">
                <AdminProfilePage />
              </Guard>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <Guard role="admin">
                <AdminReportsPage />
              </Guard>
            }
          />
          <Route path="/notices" element={<GuestNoticesPage />} />
          <Route
            path="/customer/support"
            element={
              <Guard role="customer">
                <CustomerSupportPage />
              </Guard>
            }
          />
          <Route
            path="/admin/shifts"
            element={
              <Guard role="admin">
                <AdminOperationsPage />
              </Guard>
            }
          />
          <Route
            path="/admin/feedback"
            element={
              <Guard role="admin">
                <AdminOperationsPage />
              </Guard>
            }
          />
          <Route
            path="/admin/support"
            element={
              <Guard role="admin">
                <AdminOperationsPage />
              </Guard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RouteBoundary>
    </>
  );
}

export default App;
