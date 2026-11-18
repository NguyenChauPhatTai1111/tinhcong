import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  CalendarCheck2,
  Users,
} from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { useHelp } from "../../contexts/HelpContext";
import { calculatedShiftIds } from "../../services/wages";
export function QuickStart() {
  const { data, month } = useApp(),
    { openHelp } = useHelp();
  const count = data.employees.filter((e) => !e.archived).length,
    shifts = data.attendance[month] ?? [],
    calculated = calculatedShiftIds(data);
  const pendingEmployees = new Set(
    shifts
      .filter((s) => !calculated.has(s.id) && s.actualMinutes > 0)
      .map((s) => s.employeeId),
  ).size;
  const recommended = !count
    ? 0
    : !shifts.length
      ? 1
      : pendingEmployees
        ? 2
        : 1;
  const steps = [
    {
      title: "Thêm nhân viên",
      description: "Tạo hồ sơ người làm, không cần nhập đơn giá.",
      path: "/nhan-vien",
      icon: Users,
      status: count
        ? `${count} nhân viên trong danh sách`
        : "Bắt đầu với người làm đầu tiên",
    },
    {
      title: "Chấm công",
      description: "Nhập giờ vào, giờ ra và số giờ nghỉ thực tế.",
      path: "/cham-cong",
      icon: CalendarCheck2,
      status: `${shifts.length} ca đã ghi trong tháng đang xem`,
    },
    {
      title: "Tính lương",
      description: "Chọn kỳ công và tính riêng cho từng người.",
      path: "/tong-hop",
      icon: Calculator,
      status: pendingEmployees
        ? `${pendingEmployees} người còn công chưa tính lương`
        : "Mở tổng hợp giờ công và kết quả",
    },
  ];
  return (
    <section className="quick-start" aria-label="Ba bước sử dụng chính">
      <div className="quick-start-heading">
        <div>
          <span className="eyebrow">BẮT ĐẦU TỪ ĐÂU?</span>
          <h2>3 bước để quản lý công mỗi ngày</h2>
        </div>
        <button className="text-link" onClick={() => openHelp("start")}>
          <BookOpen size={17} /> Xem hướng dẫn từng bước
        </button>
      </div>
      <div className="quick-start-grid">
        {steps.map((step, i) => (
          <Link
            className={`card quick-step ${recommended === i ? "recommended" : ""}`}
            to={step.path}
            key={step.path}
          >
            <span className="quick-step-icon">
              <step.icon size={22} />
            </span>
            <div>
              <span className="quick-step-number">
                BƯỚC {i + 1}
                {recommended === i && <em>Tiếp theo</em>}
              </span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <small>{step.status}</small>
            </div>
            <ArrowRight size={18} className="quick-step-arrow" />
          </Link>
        ))}
      </div>
    </section>
  );
}
