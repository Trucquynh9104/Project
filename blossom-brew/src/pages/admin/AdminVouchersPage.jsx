import {
  isVoucherExpired,
  localDay,
  isMoney,
} from "../../../shared/businessRules";
import { useLiveData } from "../../services/useLiveData";
import { store } from "../../services/dataStore";
import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getCurrentUser, logoutUser } from "../../services/authService";
import { notifyVoucherChanged } from "../../services/notificationService";

const VOUCHERS_KEY = "blossom-vouchers";
const ITEMS_PER_PAGE = 8;

function ListFooter({
  currentPage,
  itemLabel,
  onPageChange,
  totalItems,
  totalPages,
}) {
  const buttonStyle = {
    background: "#fff",
    border: "1px solid #dfcfc3",
    color: "#765747",
    height: "26px",
    width: "26px",
    fontSize: "14px",
  };
  return (
    <div
      style={{
        alignItems: "center",
        borderTop: "1px solid #eadfd5",
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        justifyContent: "space-between",
        minHeight: "42px",
        padding: "0 12px",
      }}
    >
      <span style={{ color: "#806858", fontSize: "11px" }}>
        Tổng số {itemLabel}:{" "}
        <strong style={{ color: "#50382c" }}>{totalItems}</strong>
      </span>
      <div style={{ alignItems: "center", display: "flex", gap: "6px" }}>
        <button
          aria-label="Trang trước"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          style={{
            ...buttonStyle,
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            opacity: currentPage === 1 ? 0.4 : 1,
          }}
          type="button"
        >
          {"<"}
        </button>
        <span style={{ color: "#806858", fontSize: "11px" }}>
          Trang {currentPage} / {totalPages}
        </span>
        <button
          aria-label="Trang sau"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          style={{
            ...buttonStyle,
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            opacity: currentPage === totalPages ? 0.4 : 1,
          }}
          type="button"
        >
          {">"}
        </button>
      </div>
    </div>
  );
}

const defaultVouchers = [
  {
    id: "voucher-1",
    code: "BBSILVER",
    type: "percent",
    value: 20,
    minOrder: 80000,
    maxDiscount: 30000,
    active: true,
    startDate: "2026-01-01",
    expiry: "2026-12-31",
    requiresSilver: true,
    usedCount: 37,
    usageLimit: 100,
  },
  {
    id: "voucher-2",
    code: "WELCOME25",
    type: "fixed",
    value: 25000,
    minOrder: 60000,
    maxDiscount: 0,
    active: true,
    startDate: "2026-01-01",
    expiry: "2026-12-31",
    requiresSilver: false,
    usedCount: 82,
    usageLimit: 200,
  },
];

function getVouchers() {
  try {
    return JSON.parse(store.getItem(VOUCHERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function formatPrice(price) {
  return Number(price || 0).toLocaleString("vi-VN") + "đ";
}

function formatDate(value) {
  if (!value) return "Không giới hạn";

  const [year, month, day] = value.split("-");
  return year && month && day ? day + "/" + month + "/" + year : value;
}

function isExpired(expiry) {
  return isVoucherExpired(expiry);
}
function getStatus(voucher) {
  if (!voucher.active) return "Chưa kích hoạt";
  if (isExpired(voucher.expiry)) return "Hết hạn";
  if (voucher.startDate && voucher.startDate > localDay())
    return "Chưa hiệu lực";
  if (
    voucher.usageLimit &&
    Number(voucher.usedCount || 0) >= Number(voucher.usageLimit)
  )
    return "Hết lượt";
  return "Đã kích hoạt";
}

function getDescription(voucher) {
  const promotion =
    voucher.type === "percent"
      ? Number(voucher.maxDiscount || 0) > 0
        ? "Giảm " +
          voucher.value +
          "%, tối đa " +
          formatPrice(voucher.maxDiscount) +
          "."
        : "Giảm " + voucher.value + "%."
      : "Giảm " +
        formatPrice(voucher.value) +
        " cho đơn từ " +
        formatPrice(voucher.minOrder) +
        ".";

  return voucher.requiresSilver
    ? promotion + " Chỉ áp dụng thành viên Silver."
    : promotion;
}

function emptyForm() {
  return {
    code: "",
    type: "percent",
    value: "",
    minOrder: "",
    maxDiscount: "",
    startDate: "",
    expiry: "",
    active: true,
    requiresSilver: false,
    usageLimit: 100,
  };
}

function AdminVouchersPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [vouchers, setVouchers] = useLiveData(getVouchers);
  const [filter, setFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [messageType, setMessageType] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredVouchers = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return vouchers.filter((voucher) => {
      const status = getStatus(voucher);
      const matchedFilter =
        filter === "all" ||
        (filter === "active" && status === "Đã kích hoạt") ||
        (filter === "inactive" && status === "Chưa kích hoạt") ||
        (filter === "expired" && status === "Hết hạn") ||
        (filter === "future" && status === "Chưa hiệu lực") ||
        (filter === "exhausted" && status === "Hết lượt");
      const matchedKeyword =
        !normalizedKeyword ||
        voucher.code.toLowerCase().includes(normalizedKeyword) ||
        getDescription(voucher).toLowerCase().includes(normalizedKeyword);

      return matchedFilter && matchedKeyword;
    });
  }, [filter, keyword, vouchers]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredVouchers.length / ITEMS_PER_PAGE),
  );
  const activePage = Math.min(currentPage, totalPages);
  const paginatedVouchers = filteredVouchers.slice(
    (activePage - 1) * ITEMS_PER_PAGE,
    activePage * ITEMS_PER_PAGE,
  );

  if (!user || user.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  async function saveVouchers(updatedVouchers) {
    if (busy) return false;
    setBusy(true);
    store.setItem("blossom-vouchers", JSON.stringify(updatedVouchers));
    const saved = await store.flush();
    setBusy(false);
    setVouchers(JSON.parse(store.getItem("blossom-vouchers") || "[]"));
    return saved;
  }

  function resetForm() {
    setForm(emptyForm());
    setEditingId(null);
    setMessage("");
    setMessageType("");
  }

  function openCreateForm() {
    resetForm();
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    resetForm();
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setMessage("");
    setMessageType("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;

    const code = form.code.trim().toUpperCase();
    const value = Number(form.value);
    const minOrder = Number(form.minOrder || 0);
    const maxDiscount = Number(form.maxDiscount || 0);
    const usageLimit = Number(form.usageLimit || 0);

    if (
      !code ||
      !isMoney(value) ||
      value <= 0 ||
      !isMoney(minOrder) ||
      !isMoney(maxDiscount) ||
      !isMoney(usageLimit) ||
      usageLimit < 1
    ) {
      setMessageType("error");
      setMessage("Vui lòng nhập mã, giá trị giảm và đơn tối thiểu hợp lệ.");
      return;
    }

    if (!/^[A-Z0-9_-]+$/.test(code)) {
      setMessageType("error");
      setMessage(
        "Mã voucher chỉ gồm chữ in hoa, số, gạch ngang hoặc gạch dưới.",
      );
      return;
    }

    if (form.type === "percent" && value > 100) {
      setMessageType("error");
      setMessage("Voucher phần trăm không được vượt quá 100%.");
      return;
    }

    if (form.type === "percent" && maxDiscount < 0) {
      setMessageType("error");
      setMessage("Giảm tối đa không hợp lệ.");
      return;
    }

    if (form.expiry && isExpired(form.expiry)) {
      setMessageType("error");
      setMessage("Hạn sử dụng phải từ hôm nay trở đi.");
      return;
    }

    if (form.startDate && form.expiry && form.startDate > form.expiry) {
      setMessageType("error");
      setMessage("Ngày bắt đầu phải trước hạn sử dụng.");
      return;
    }

    if (
      vouchers.some(
        (voucher) => voucher.code === code && voucher.id !== editingId,
      )
    ) {
      setMessageType("error");
      setMessage("Mã voucher này đã tồn tại.");
      return;
    }

    if (
      !window.confirm(
        editingId
          ? "Xác nhận lưu thay đổi voucher?"
          : "Xác nhận thêm voucher mới?",
      )
    )
      return;

    const voucherData = {
      code,
      type: form.type,
      value,
      minOrder,
      maxDiscount: form.type === "percent" ? maxDiscount : 0,
      usageLimit,
      startDate: form.startDate,
      expiry: form.expiry,
      active: form.active,
      requiresSilver: form.requiresSilver,
    };

    if (editingId) {
      const updatedVoucher = {
        ...vouchers.find((voucher) => voucher.id === editingId),
        ...voucherData,
      };
      if (
        !(await saveVouchers(
          vouchers.map((voucher) =>
            voucher.id === editingId ? updatedVoucher : voucher,
          ),
        ))
      )
        return;
      notifyVoucherChanged({ action: "updated", voucher: updatedVoucher });
      setMessageType("success");
      setMessage("Đã cập nhật voucher.");
    } else {
      const newVoucher = {
        id: "voucher-" + Date.now(),
        usedCount: 0,
        ...voucherData,
      };
      if (!(await saveVouchers([...vouchers, newVoucher]))) return;
      notifyVoucherChanged({ action: "created", voucher: newVoucher });
      setMessageType("success");
      setMessage("Đã thêm voucher.");
    }
  }

  function handleEdit(voucher) {
    setEditingId(voucher.id);
    setForm({
      code: voucher.code,
      type: voucher.type,
      value: String(voucher.value),
      minOrder: String(voucher.minOrder || ""),
      maxDiscount: String(voucher.maxDiscount || ""),
      startDate: voucher.startDate || "",
      expiry: voucher.expiry || "",
      active: Boolean(voucher.active),
      requiresSilver: Boolean(voucher.requiresSilver),
      usageLimit: String(voucher.usageLimit || 100),
    });
    setMessage("");
    setMessageType("");
    setIsFormOpen(true);
  }

  async function handleToggle(voucherId) {
    const currentVoucher = vouchers.find((voucher) => voucher.id === voucherId);
    if (!currentVoucher) return;

    if (!window.confirm("Xác nhận thay đổi trạng thái voucher?")) return;

    const updatedVoucher = {
      ...currentVoucher,
      active: !currentVoucher.active,
    };
    if (
      !(await saveVouchers(
        vouchers.map((voucher) =>
          voucher.id === voucherId ? updatedVoucher : voucher,
        ),
      ))
    )
      return;
    notifyVoucherChanged({
      action: updatedVoucher.active ? "activated" : "deactivated",
      voucher: updatedVoucher,
    });
  }

  async function handleDelete(voucherId) {
    if (!window.confirm("Bạn có chắc muốn xóa voucher này?")) return;

    const deletedVoucher = vouchers.find((voucher) => voucher.id === voucherId);
    if (
      !(await saveVouchers(
        vouchers.filter((voucher) => voucher.id !== voucherId),
      ))
    )
      return;
    if (deletedVoucher)
      notifyVoucherChanged({ action: "deleted", voucher: deletedVoucher });
    if (editingId === voucherId) resetForm();
    else setMessage("Đã xóa voucher.");
  }

  async function handleLogout() {
    await logoutUser();
    navigate("/");
  }

  return (
    <div className="admin-dashboard admin-voucher-page">
      <aside className="admin-sidebar">
        <button
          className="admin-brand"
          type="button"
          onClick={() => navigate("/admin")}
        >
          <span>B</span>
          Blossom Brew
        </button>

        <p className="admin-sidebar-label">Admin workspace</p>

        <nav className="admin-nav">
          <button
            className="admin-nav-item"
            type="button"
            onClick={() => navigate("/admin")}
          >
            <span>⌂</span>
            Tổng quan
          </button>

          <button
            className="admin-nav-item"
            type="button"
            onClick={() => navigate("/admin/products")}
          >
            <span>⌁</span>
            Quản lý menu
          </button>

          <button
            className="admin-nav-item"
            type="button"
            onClick={() => navigate("/admin/orders")}
          >
            <span>□</span>
            Đơn hàng
          </button>

          <button
            className="admin-nav-item"
            type="button"
            onClick={() => navigate("/admin/members")}
          >
            <span>○</span>
            Thành viên
          </button>

          <button className="admin-nav-item active" type="button">
            <span>◇</span>
            Voucher
          </button>

          <button
            className="admin-nav-item"
            type="button"
            onClick={() => navigate("/admin/cashiers")}
          >
            <span>♙</span>
            Tài khoản thu ngân
          </button>

          <button
            className="admin-nav-item"
            type="button"
            onClick={() => navigate("/admin/reports")}
          >
            <span>↗</span>
            Báo cáo
          </button>

          <button
            className="admin-nav-item"
            type="button"
            onClick={() => navigate("/admin/notices")}
          >
            <span>✦</span>
            Thông báo
          </button>

          <button
            className="admin-nav-item"
            type="button"
            onClick={() => navigate("/admin/profile")}
          >
            <span>○</span>
            Thông tin cá nhân
          </button>
        </nav>

        <div className="admin-profile">
          <span className="admin-avatar">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{user.name}</strong>
            <small>Administrator</small>
          </div>
          <button type="button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-page-title">
            <h1>Voucher & ưu đãi.</h1>
            <p>Tạo và kiểm soát các ưu đãi đang áp dụng cho thành viên.</p>
          </div>
          <span>
            {new Intl.DateTimeFormat("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).format(new Date())}
          </span>
        </header>

        <section className="admin-content">
          <div className="admin-voucher-toolbar">
            <input
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm mã hoặc tên voucher..."
            />

            <div className="admin-voucher-toolbar-actions">
              <select
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">Tất cả voucher</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Chưa kích hoạt</option>
                <option value="expired">Đã hết hạn</option>
                <option value="future">Chưa hiệu lực</option>
                <option value="exhausted">Hết lượt</option>
              </select>
              <button
                className="admin-primary-button admin-create-voucher"
                type="button"
                onClick={openCreateForm}
              >
                ＋ Tạo voucher
              </button>
            </div>
          </div>

          <div className="admin-products-layout">
            <section className="admin-voucher-table">
              <div className="admin-voucher-row admin-voucher-header">
                <span>Mã voucher</span>
                <span>Ưu đãi</span>
                <span>Điều kiện</span>
                <span>Đã dùng</span>
                <span>Hạn dùng</span>
                <span>Trạng thái</span>
                <span>Thao tác</span>
              </div>

              {paginatedVouchers.map((voucher) => {
                const status = getStatus(voucher);

                return (
                  <div className="admin-voucher-row" key={voucher.id}>
                    <div>
                      <strong>{voucher.code}</strong>
                    </div>
                    <span className="admin-voucher-offer">
                      {getDescription(voucher)}
                    </span>
                    <span>Từ {formatPrice(voucher.minOrder)}</span>
                    <span>
                      {Number(voucher.usedCount || 0)} /{" "}
                      {voucher.usageLimit || "—"}
                    </span>
                    <span>{formatDate(voucher.expiry)}</span>
                    <button
                      className={
                        status === "Đã kích hoạt"
                          ? "admin-available"
                          : "admin-unavailable"
                      }
                      type="button"
                      onClick={() => handleToggle(voucher.id)}
                    >
                      {status}
                    </button>
                    <div className="admin-product-actions">
                      <button
                        aria-label="Sửa voucher"
                        className="admin-voucher-action-icon"
                        title="Sửa voucher"
                        type="button"
                        onClick={() => handleEdit(voucher)}
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        aria-label="Xóa voucher"
                        className="admin-voucher-action-icon delete"
                        title="Xóa voucher"
                        type="button"
                        onClick={() => handleDelete(voucher.id)}
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v5M14 11v5" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredVouchers.length === 0 && (
                <p className="admin-empty">Chưa có voucher phù hợp.</p>
              )}
              <ListFooter
                currentPage={activePage}
                itemLabel="voucher"
                onPageChange={setCurrentPage}
                totalItems={vouchers.length}
                totalPages={totalPages}
              />
            </section>

            {isFormOpen && (
              <div className="admin-modal-overlay" onClick={closeForm}>
                <aside
                  className="admin-product-form-card admin-voucher-form-modal"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    className="admin-modal-close"
                    type="button"
                    onClick={closeForm}
                  >
                    ×
                  </button>
                  <p className="admin-eyebrow">
                    {editingId ? "Edit voucher" : "New voucher"}
                  </p>
                  <h2>{editingId ? "Cập nhật voucher" : "Tạo voucher"}</h2>

                  <form onSubmit={handleSubmit} noValidate>
                    <label>
                      MÃ VOUCHER
                      <input
                        name="code"
                        value={form.code}
                        onChange={handleChange}
                        placeholder="Ví dụ: WELCOME25"
                      />
                    </label>

                    <label>
                      LOẠI ƯU ĐÃI
                      <select
                        name="type"
                        value={form.type}
                        onChange={handleChange}
                      >
                        <option value="percent">Giảm theo phần trăm</option>
                        <option value="fixed">Giảm tiền cố định</option>
                      </select>
                    </label>

                    <label>
                      {form.type === "percent"
                        ? "PHẦN TRĂM GIẢM"
                        : "SỐ TIỀN GIẢM"}
                      <input
                        name="value"
                        type="number"
                        min="1"
                        value={form.value}
                        onChange={handleChange}
                      />
                    </label>

                    <label>
                      GIÁ TRỊ ĐƠN TỐI THIỂU
                      <input
                        name="minOrder"
                        type="number"
                        min="0"
                        value={form.minOrder}
                        onChange={handleChange}
                      />
                    </label>

                    <label>
                      GIỚI HẠN LƯỢT DÙNG
                      <input
                        name="usageLimit"
                        type="number"
                        min="1"
                        value={form.usageLimit}
                        onChange={handleChange}
                        placeholder="Ví dụ: 100"
                      />
                    </label>

                    {form.type === "percent" && (
                      <label>
                        GIẢM TỐI ĐA
                        <input
                          name="maxDiscount"
                          type="number"
                          min="0"
                          value={form.maxDiscount}
                          onChange={handleChange}
                          placeholder="Để trống nếu không giới hạn"
                        />
                      </label>
                    )}

                    <label>
                      NGÀY BẮT ĐẦU
                      <input
                        name="startDate"
                        type="date"
                        value={form.startDate}
                        onChange={handleChange}
                      />
                    </label>

                    <label>
                      HẠN SỬ DỤNG
                      <input
                        name="expiry"
                        type="date"
                        value={form.expiry}
                        onChange={handleChange}
                      />
                    </label>

                    <label className="admin-checkbox-label">
                      <input
                        name="requiresSilver"
                        type="checkbox"
                        checked={form.requiresSilver}
                        onChange={handleChange}
                      />
                      Chỉ áp dụng cho thành viên Silver
                    </label>

                    <label className="admin-checkbox-label">
                      <input
                        name="active"
                        type="checkbox"
                        checked={form.active}
                        onChange={handleChange}
                      />
                      Kích hoạt voucher
                    </label>

                    {message && (
                      <p className={`admin-form-message ${messageType}`}>
                        {message}
                      </p>
                    )}

                    <button
                      className="admin-primary-button"
                      type="submit"
                      disabled={busy}
                    >
                      {editingId ? "Lưu thay đổi" : "Tạo voucher"}
                    </button>

                    <button
                      className="admin-cancel-button"
                      type="button"
                      onClick={closeForm}
                    >
                      Hủy
                    </button>
                  </form>
                </aside>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminVouchersPage;
