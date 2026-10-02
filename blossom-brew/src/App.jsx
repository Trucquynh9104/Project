import { Navigate, Route, Routes } from 'react-router-dom'
import GuestMenu from './pages/guest/GuestMenu'
import LoginPage from './pages/guest/LoginPage'
import ForgotPasswordPage from './pages/guest/ForgotPasswordPage'
import RegisterPage from './pages/guest/RegisterPage'
import CustomerHome from './pages/customer/CustomerHome'
import CustomerPointsPage from './pages/customer/CustomerPointsPage'
import CustomerHistoryPage from './pages/customer/CustomerHistoryPage'
import CustomerMenuPage from './pages/customer/CustomerMenuPage'
import CustomerCartPage from './pages/customer/CustomerCartPage'
import CustomerCheckoutPage from './pages/customer/CustomerCheckoutPage'
import CustomerNoticesPage from './pages/customer/CustomerNoticesPage'
import CustomerProfilePage from './pages/customer/CustomerProfilePage'
import CustomerReviewPage from './pages/customer/CustomerReviewPage'
import CashierPOSPage from './pages/cashier/CashierPOSPage'
import CashierOrdersPage from './pages/cashier/CashierOrdersPage'
import CashierShiftPage from './pages/cashier/CashierShiftPage'
import CashierNoticesPage from './pages/cashier/CashierNoticesPage'
import CashierProfilePage from './pages/cashier/CashierProfilePage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import AdminProductsPage from './pages/admin/AdminProductsPage'
import AdminVouchersPage from './pages/admin/AdminVouchersPage'
import AdminNoticesPage from './pages/admin/AdminNoticesPage'
import AdminMembersPage from './pages/admin/AdminMembersPage' 
import AdminCashiersPage from './pages/admin/AdminCashiersPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import AdminProfilePage from './pages/admin/AdminProfilePage'


function App() {
  return (
    <Routes>
      <Route path="/" element={<GuestMenu />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/customer" element={<CustomerHome />} />
      <Route path="/customer/menu" element={<CustomerMenuPage />} />
      <Route path="/customer/cart" element={<CustomerCartPage />} />
      <Route path="/customer/history" element={<CustomerHistoryPage />} />
      <Route path="/customer/checkout" element={<CustomerCheckoutPage />} />
      <Route path="/customer/notices" element={<CustomerNoticesPage />} />
      <Route path="/customer/points" element={<CustomerPointsPage />} />
      <Route path="/customer/profile" element={<CustomerProfilePage />} />
      <Route path="/customer/review" element={<CustomerReviewPage />} />
      <Route path="/cashier" element={<CashierPOSPage />} />
      <Route path="/cashier/orders" element={<CashierOrdersPage />} />
      <Route path="/cashier/shift" element={<CashierShiftPage />} />
      <Route path="/cashier/notices" element={<CashierNoticesPage />} />
      <Route path="/cashier/profile" element={<CashierProfilePage />} />
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="/admin/orders" element={<AdminOrdersPage />} />
      <Route path="/admin/products" element={<AdminProductsPage />} />
      <Route path="/admin/vouchers" element={<AdminVouchersPage />} />
      <Route path="/admin/notices" element={<AdminNoticesPage />} />
      <Route path="/admin/members" element={<AdminMembersPage />} />
<Route path="/admin/cashiers" element={<AdminCashiersPage />} />
<Route path="/admin/profile" element={<AdminProfilePage />} />
      <Route path="/admin/reports" element={<AdminReportsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App