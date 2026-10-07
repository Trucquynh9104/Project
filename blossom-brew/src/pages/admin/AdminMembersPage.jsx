import { useLiveData } from "../../services/useLiveData";
import { store } from "../../services/dataStore";
import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  addLoyaltyMember,
  getCurrentUser,
  getLoyaltyMembers,
  logoutUser,
  updateMemberPoints,
} from "../../services/authService";
import { notifyMemberPointsAdjusted } from "../../services/notificationService";

const MEMBERS_PER_PAGE = 8;

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

function getOrders() {
  try {
    return JSON.parse(store.getItem("blossom-orders") || "[]");
  } catch {
    return [];
  }
}

function getRank(points) {
  const totalPoints = Number(points || 0);

  if (totalPoints > 100) return "Gold";
  if (totalPoints >= 50) return "Silver";
  return "Member";
}

function getMemberCode(member) {
  return `MB-${String(member.id || "")
    .slice(-6)
    .toUpperCase()}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getEmptyMemberForm() {
  return {
    name: "",
    phone: "",
  };
}

function AdminMembersPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [members, setMembers] = useLiveData(getLoyaltyMembers);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState(null);
  const [pointsInput, setPointsInput] = useState("");
  const [message, setMessage] = useState("");
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberForm, setMemberForm] = useState(getEmptyMemberForm);
  const [addMemberMessage, setAddMemberMessage] = useState("");

  const orders = useLiveData(getOrders)[0];

  const memberRows = useMemo(
    () =>
      members.map((member) => {
        const memberOrders = orders.filter(
          (order) =>
            order.member?.id === member.id ||
            (!order.member?.id && order.member?.phone === member.phone),
        );
        const completedOrders = memberOrders.filter(
          (order) => order.status === "Hoàn tất",
        );

        return {
          ...member,
          orderCount: memberOrders.length,
          completedOrderCount: completedOrders.length,
          totalSpent: completedOrders.reduce(
            (sum, order) => sum + Number(order.total || 0),
            0,
          ),
        };
      }),
    [members, orders],
  );

  const filteredMembers = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return memberRows.filter((member) => {
      const matchedKeyword =
        !normalizedKeyword ||
        [member.name, member.phone, member.email, getMemberCode(member)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedKeyword);
      const matchedType =
        typeFilter === "all" || member.memberType === typeFilter;

      return matchedKeyword && matchedType;
    });
  }, [keyword, memberRows, typeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE),
  );
  const activePage = Math.min(currentPage, totalPages);
  const paginatedMembers = filteredMembers.slice(
    (activePage - 1) * MEMBERS_PER_PAGE,
    activePage * MEMBERS_PER_PAGE,
  );

  if (!user || user.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  const navItems = [
    { icon: "⌂", label: "Tổng quan", to: "/admin" },
    { icon: "⌁", label: "Quản lý menu", to: "/admin/products" },
    { icon: "□", label: "Đơn hàng", to: "/admin/orders" },
    { icon: "◦", label: "Thành viên", to: "/admin/members", active: true },
    { icon: "◇", label: "Voucher", to: "/admin/vouchers" },
    { icon: "♙", label: "Tài khoản thu ngân", to: "/admin/cashiers" },
    { icon: "◷", label: "Ca làm việc", to: "/admin/shifts" },
    { icon: "☆", label: "Đánh giá", to: "/admin/feedback" },
    { icon: "?", label: "Yêu cầu hỗ trợ", to: "/admin/support" },
    { icon: "↗", label: "Báo cáo", to: "/admin/reports" },
    { icon: "✦", label: "Thông báo", to: "/admin/notices" },
    { icon: "○", label: "Thông tin cá nhân", to: "/admin/profile" },
  ];

  async function handleLogout() {
    await logoutUser();
    navigate("/");
  }

  function openMember(member) {
    setSelectedMember(member);
    setPointsInput(String(member.points || 0));
    setMessage("");
  }

  function closeMember() {
    setSelectedMember(null);
    setMessage("");
  }

  async function savePoints() {
    if (!window.confirm("Xác nhận lưu số điểm thành viên?")) return;
    const result = await updateMemberPoints({
      id: selectedMember.id,
      memberType: selectedMember.memberType,
      points: pointsInput,
    });

    if (!result.ok) {
      setMessage("Không thể cập nhật điểm thành viên.");
      return;
    }

    notifyMemberPointsAdjusted({ member: selectedMember, points: pointsInput });
    setMembers(getLoyaltyMembers());
    closeMember();
  }

  function openAddMember() {
    setMemberForm(getEmptyMemberForm());
    setAddMemberMessage("");
    setIsAddMemberOpen(true);
  }

  function closeAddMember() {
    setIsAddMemberOpen(false);
    setMemberForm(getEmptyMemberForm());
    setAddMemberMessage("");
  }

  function handleMemberFormChange(event) {
    const { name, value } = event.target;

    setMemberForm((current) => ({ ...current, [name]: value }));
    setAddMemberMessage("");
  }

  async function handleAddMember(event) {
    event.preventDefault();

    if (!window.confirm("Xác nhận thêm thành viên mới?")) return;

    const result = await addLoyaltyMember(memberForm);

    if (!result.ok) {
      setAddMemberMessage(result.message || "Không thể thêm thành viên.");
      return;
    }

    setMembers(getLoyaltyMembers());
    setCurrentPage(1);
    closeAddMember();
  }

  return (
    <div className="admin-dashboard admin-members-page">
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
          {navItems.map((item) => (
            <button
              className={
                item.active ? "admin-nav-item active" : "admin-nav-item"
              }
              key={item.label}
              type="button"
              onClick={() => navigate(item.to)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="admin-profile">
          <span className="admin-avatar">{initials}</span>
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
            <h1>Thành viên.</h1>
            <p>
              Theo dõi hành trình, điểm tích lũy và hạng thành viên của khách
              hàng.
            </p>
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
          <div className="admin-members-toolbar">
            <input
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm mã thành viên, tên, số điện thoại..."
            />

            <div className="admin-members-toolbar-actions">
              <select
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">Tất cả thành viên</option>
                <option value="account">Có tài khoản</option>
                <option value="loyalty">Tích điểm tại quầy</option>
              </select>
              <button
                className="admin-primary-button"
                type="button"
                onClick={openAddMember}
              >
                ＋ Thêm thành viên
              </button>
            </div>
          </div>

          <section className="admin-members-table-figma">
            <div className="admin-members-row-figma admin-members-header-figma">
              <span>Thành viên</span>
              <span>Liên hệ</span>
              <span>Hạng</span>
              <span>Điểm</span>
              <span>Đơn hàng</span>
              <span>Thao tác</span>
            </div>

            {paginatedMembers.map((member) => (
              <div className="admin-members-row-figma" key={member.id}>
                <span className="admin-member-cell">
                  <strong>{member.name}</strong>
                  <small>{getMemberCode(member)}</small>
                </span>

                <span className="admin-member-cell">
                  <strong>{member.phone}</strong>
                  <small>{member.email || "Tích điểm tại quầy"}</small>
                </span>

                <span
                  className={`admin-member-rank ${getRank(member.points).toLowerCase()}`}
                >
                  {getRank(member.points)}
                </span>

                <strong>
                  {Number(member.points || 0).toLocaleString("vi-VN")} điểm
                </strong>
                <span>{member.orderCount} đơn</span>

                <button
                  className="admin-member-detail"
                  type="button"
                  onClick={() => openMember(member)}
                >
                  Xem hồ sơ
                </button>
              </div>
            ))}

            {!filteredMembers.length && (
              <p className="admin-empty">Không tìm thấy thành viên phù hợp.</p>
            )}
            <ListFooter
              currentPage={activePage}
              itemLabel="thành viên"
              onPageChange={setCurrentPage}
              totalItems={memberRows.length}
              totalPages={totalPages}
            />
          </section>
        </section>
      </main>

      {selectedMember && (
        <div className="admin-modal-overlay" onClick={closeMember}>
          <section
            className="admin-member-modal-figma"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="admin-modal-close"
              type="button"
              onClick={closeMember}
            >
              ×
            </button>

            <p className="admin-eyebrow">Member profile</p>
            <h2>{selectedMember.name}</h2>
            <p className="admin-member-modal-code">
              {getMemberCode(selectedMember)} · {getRank(selectedMember.points)}{" "}
              member
            </p>

            <div className="admin-member-profile-grid">
              <p>
                <span>Số điện thoại</span>
                <strong>{selectedMember.phone}</strong>
              </p>
              <p>
                <span>Email</span>
                <strong>{selectedMember.email || "Chưa có tài khoản"}</strong>
              </p>
              <p>
                <span>Đơn đã hoàn tất</span>
                <strong>{selectedMember.completedOrderCount} đơn</strong>
              </p>
              <p>
                <span>Ngày tham gia</span>
                <strong>{formatDate(selectedMember.createdAt)}</strong>
              </p>
            </div>

            <label className="admin-member-points-input">
              ĐIỂM THÀNH VIÊN
              <input
                type="number"
                min="0"
                value={pointsInput}
                onChange={(event) => setPointsInput(event.target.value)}
              />
            </label>

            {message && <p className="admin-form-message error">{message}</p>}

            <div className="admin-member-modal-actions">
              <button
                className="admin-cancel-button"
                type="button"
                onClick={closeMember}
              >
                Hủy
              </button>
              <button
                className="admin-primary-button"
                type="button"
                onClick={savePoints}
              >
                Lưu điểm
              </button>
            </div>
          </section>
        </div>
      )}

      {isAddMemberOpen && (
        <div className="admin-modal-overlay" onClick={closeAddMember}>
          <section
            className="admin-member-modal-figma admin-add-member-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="admin-modal-close"
              type="button"
              onClick={closeAddMember}
            >
              ×
            </button>

            <p className="admin-eyebrow">New member</p>
            <h2>Thêm thành viên</h2>
            <p className="admin-add-member-description">
              Tạo hồ sơ tích điểm tại quầy. Thành viên mới sẽ có 0 điểm.
            </p>

            <form
              className="admin-add-member-form"
              onSubmit={handleAddMember}
              noValidate
            >
              <label>
                HỌ VÀ TÊN
                <input
                  name="name"
                  value={memberForm.name}
                  onChange={handleMemberFormChange}
                  placeholder="Ví dụ: Nguyễn Minh Anh"
                  autoFocus
                />
              </label>

              <label>
                SỐ ĐIỆN THOẠI
                <input
                  name="phone"
                  inputMode="numeric"
                  value={memberForm.phone}
                  onChange={handleMemberFormChange}
                  placeholder="Ví dụ: 0901 234 567"
                />
              </label>

              {addMemberMessage && (
                <p className="admin-form-message error">{addMemberMessage}</p>
              )}

              <div className="admin-member-modal-actions">
                <button
                  className="admin-cancel-button"
                  type="button"
                  onClick={closeAddMember}
                >
                  Hủy
                </button>
                <button className="admin-primary-button" type="submit">
                  Thêm thành viên
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminMembersPage;
