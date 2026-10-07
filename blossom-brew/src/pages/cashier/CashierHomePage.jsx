import { Navigate } from "react-router-dom";
import CashierShell from "../../components/CashierShell";
import RoleGuestHome from "../../components/RoleGuestHome";
import { getCurrentUser } from "../../services/authService";

function CashierHomePage() {
  const user = getCurrentUser();

  if (!user || user.role !== "cashier") return <Navigate to="/login" replace />;

  return (
    <CashierShell active="" topbarTitle="Trang chủ." user={user}>
      <section className="cashier-content role-home-content">
        <RoleGuestHome role="cashier" />
      </section>
    </CashierShell>
  );
}

export default CashierHomePage;
