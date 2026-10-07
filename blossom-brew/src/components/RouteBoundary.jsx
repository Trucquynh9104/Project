import { useEffect, useState } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { useCurrentUser, roleHome } from "../services/authService";
import { store } from "../services/dataStore";
export function Guard({ role, children }) {
  const user = useCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role)
    return (
      <main className="brew-access-denied">
        <h1>Bạn không có quyền truy cập màn này.</h1>
        <p>
          Tài khoản hiện tại thuộc vai trò{" "}
          {user.role === "admin"
            ? "Admin"
            : user.role === "cashier"
              ? "Cashier"
              : "Customer"}
          .
        </p>
        <Link className="brew-button" to={roleHome(user.role)}>
          Về trang của bạn
        </Link>
      </main>
    );
  return children;
}
export default function RouteBoundary({ children }) {
  const { pathname } = useLocation();
  const [ready, setReady] = useState(pathname);
  useEffect(() => {
    let active = true;
    store.refresh().then(() => {
      if (active) setReady(pathname);
    });
    return () => {
      active = false;
    };
  }, [pathname]);
  if (ready !== pathname)
    return (
      <div className="brew-loading" role="status">
        Đang tải Blossom Brew…
      </div>
    );
  return <div key={pathname}>{children}</div>;
}
