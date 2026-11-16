import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  Wallet,
  History,
  Settings,
  Sun,
  Moon,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  ArrowUpRight,
  Clock3,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "../../contexts/AppContext";
import { dateLabel } from "../../utils/format";
import { useAuth } from "../../contexts/AuthContext";
const nav = [
  { path: "/", title: "Tổng quan", icon: LayoutDashboard },
  { path: "/nhan-vien", title: "Nhân viên", icon: Users },
  { path: "/cham-cong", title: "Chấm công", icon: CalendarCheck2 },
  { path: "/bang-luong", title: "Bảng lương", icon: Wallet },
  { path: "/lich-su", title: "Lịch sử lương", icon: History },
  { path: "/cai-dat", title: "Cài đặt & sao lưu", icon: Settings },
];
export function Layout() {
  const { session, lock } = useAuth();
  const { data, date, mutate, storageError, saving } = useApp(),
    [open, setOpen] = useState(false),
    location = useLocation();
  const title =
    nav.find((n) => n.path === location.pathname)?.title ??
    "Trang không tồn tại";
  return (
    <div className="app-shell">
      {open && (
        <button
          aria-label="Đóng menu"
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link className="brand" to="/" onClick={() => setOpen(false)}>
          <span className="brand-icon">
            <Clock3 size={25} />
          </span>
          <span>
            Công<span className="brand-blue">Việt</span>
            <small>CHẤM CÔNG & TÍNH LƯƠNG</small>
          </span>
        </Link>
        <button
          className="icon-btn mobile-close"
          aria-label="Đóng menu"
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </button>
        <div className="workspace">
          <span className="workspace-logo">CV</span>
          <div>
            <strong>{data.settings.company}</strong>
            <small>Quản trị viên</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <p className="nav-label">KHÔNG GIAN QUẢN LÝ</p>
        <nav>
          {nav.map((n, i) => (
            <NavLink
              key={n.path}
              to={n.path}
              end={n.path === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `${isActive ? "active" : ""} ${i === 5 ? "settings-nav" : ""}`
              }
            >
              <n.icon size={20} />
              <span>{n.title}</span>
              {i === 1 && (
                <b>{data.employees.filter((e) => !e.archived).length}</b>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <span>
              <ShieldCheck size={19} /> Dữ liệu của bạn
            </span>
            <p>
              Lưu trên trình duyệt này.
              <br />
              Sao lưu định kỳ để luôn an tâm.
            </p>
            <Link to="/cai-dat" onClick={() => setOpen(false)}>
              Sao lưu dữ liệu <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="profile">
            <span className="admin-avatar">QT</span>
            <div>
              <strong>Quản trị viên</strong>
              <small>@{session?.envelope.username}</small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn hamburger"
              aria-label="Mở menu"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span>Không gian làm việc</span>
            <ChevronRight size={14} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <span className="today">{dateLabel(date)}</span>
            <span className={`save-status ${storageError ? "save-error" : ""}`}>
              <i />
              {storageError
                ? "Lỗi lưu trữ"
                : saving
                  ? "Đang mã hóa…"
                  : "Dữ liệu đã mã hóa"}
            </span>
            <button
              className="icon-btn theme-btn"
              aria-label={
                data.settings.theme === "light"
                  ? "Bật chế độ tối"
                  : "Bật chế độ sáng"
              }
              onClick={() =>
                mutate((d) => ({
                  ...d,
                  settings: {
                    ...d.settings,
                    theme: d.settings.theme === "light" ? "dark" : "light",
                  },
                }))
              }
            >
              {data.settings.theme === "light" ? (
                <Moon size={19} />
              ) : (
                <Sun size={19} />
              )}
            </button>
            <span className="admin-avatar small">QT</span>
            <button
              className="icon-btn"
              aria-label="Đăng xuất"
              title="Đăng xuất và khóa dữ liệu"
              onClick={() => lock()}
            >
              <LogOut size={19} />
            </button>
          </div>
        </header>
        <main>
          {storageError && (
            <div role="alert" className="alert error">
              {storageError} <Link to="/cai-dat">Mở cài đặt</Link>
            </div>
          )}
          <Outlet />
        </main>
        <div className="app-footer">
          <span>Công Việt · Quản lý gọn gàng, vận hành nhẹ nhàng.</span>
          <span>
            <ShieldCheck size={13} /> Dữ liệu lưu trên thiết bị
          </span>
        </div>
      </div>
    </div>
  );
}
