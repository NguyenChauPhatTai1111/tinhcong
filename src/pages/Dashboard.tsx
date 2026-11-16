import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownToLine,
  ArrowRight,
  CalendarCheck2,
  Check,
  ChevronRight,
  Clock3,
  Plus,
  Sparkles,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  MonthPicker,
  PageHeading,
} from "../components/common/UI";
import { AttendanceForm } from "../components/attendance/AttendanceForm";
import {
  dateLabel,
  download,
  hours,
  money,
  monthLabel,
  number,
} from "../utils/format";
import { monthlyPayroll, sum } from "../utils/salaryCalculator";
import { payrollCSV } from "../utils/csv";
export default function Dashboard() {
  const { data, month, date, toast } = useApp(),
    [attendance, setAttendance] = useState(false);
  const shifts = data.attendance[month] ?? [],
    payroll = monthlyPayroll(data, month);
  const total = sum(payroll, (p) => p.total),
    paid = sum(
      payroll.filter((p) => p.paid),
      (p) => p.total,
    ),
    minutes = sum(shifts, (s) => s.actualMinutes);
  const employees = data.employees.filter((e) => !e.archived),
    active = employees.filter((e) => e.active);
  const todayCount = new Set(
    (data.attendance[date.slice(0, 7)] ?? [])
      .filter((s) => s.date === date)
      .map((s) => s.employeeId),
  ).size;
  const stats = [
    {
      title: "Tổng nhân viên",
      value: String(employees.length).padStart(2, "0"),
      unit: "người",
      caption: `${active.length} nhân viên đang làm việc`,
      icon: Users,
      color: "blue",
    },
    {
      title: "Đã chấm công hôm nay",
      value: String(todayCount).padStart(2, "0"),
      unit: "người",
      caption: `Ngày ${dateLabel(date)}`,
      icon: CalendarCheck2,
      color: "green",
    },
    {
      title: "Tổng giờ làm trong tháng",
      value: number(minutes / 60),
      unit: "giờ",
      caption: `${shifts.length} ca làm được ghi nhận`,
      icon: Clock3,
      color: "purple",
    },
    {
      title: "Lương dự kiến trong tháng",
      value: money(total),
      unit: "",
      caption: "Đã bao gồm các khoản điều chỉnh",
      icon: Wallet,
      color: "blue",
    },
    {
      title: "Lương đã thanh toán",
      value: money(paid),
      unit: "",
      caption: `${payroll.filter((p) => p.paid).length} bảng lương đã thanh toán`,
      icon: Check,
      color: "green",
    },
    {
      title: "Lương chưa thanh toán",
      value: money(total - paid),
      unit: "",
      caption: `${payroll.filter((p) => !p.paid).length} bảng lương cần thanh toán`,
      icon: Clock3,
      color: "orange",
    },
  ];
  const cost = Array.from({ length: 12 }, (_, i) => {
    const m = `${month.slice(0, 4)}-${String(i + 1).padStart(2, "0")}`;
    return {
      name: `T${i + 1}`,
      total: sum(monthlyPayroll(data, m), (p) => p.total),
    };
  });
  const employeeHours = data.employees
    .map((e) => ({
      id: e.id,
      name: e.name,
      code: e.code,
      minutes: sum(
        shifts.filter((s) => s.employeeId === e.id),
        (s) => s.actualMinutes,
      ),
      hours:
        sum(
          shifts.filter((s) => s.employeeId === e.id),
          (s) => s.actualMinutes,
        ) / 60,
    }))
    .filter((e) => e.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
  const recent = [...shifts]
    .sort((a, b) => b.start.localeCompare(a.start))
    .slice(0, 5);
  const percent = total > 0 ? Math.round((paid / total) * 100) : 0;
  return (
    <>
      <PageHeading
        title="Tổng quan"
        description="Chào bạn, cùng xem hoạt động của đội ngũ hôm nay."
      >
        <MonthPicker />
        <Button
          onClick={() => {
            download(
              payrollCSV(payroll),
              `tong-quan-${month}.csv`,
              "text/csv;charset=utf-8",
            );
            toast("Đã xuất báo cáo trong kỳ.");
          }}
        >
          <ArrowDownToLine size={17} /> Xuất báo cáo
        </Button>
      </PageHeading>
      <section className="welcome-banner">
        <div className="welcome-content">
          <div className="welcome-eyebrow">
            <span /> KHÔNG GIAN QUẢN LÝ NHÂN SỰ
          </div>
          <h2>Mỗi giờ làm, đều được ghi nhận.</h2>
          <p>Chấm công dễ dàng. Tính lương chính xác. An tâm vận hành.</p>
          <button onClick={() => setAttendance(true)}>
            Chấm công hôm nay <ArrowRight size={16} />
          </button>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="art-calendar">
            <div className="art-calendar-top">
              <i />
              <i />
            </div>
            <div className="art-calendar-body">
              <span>{monthLabel(date.slice(0, 7))}</span>
              <strong>{Number(date.slice(8))}</strong>
              <div className="art-week">
                {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d, i) => (
                  <b
                    key={d}
                    className={
                      i === (new Date().getDay() + 6) % 7 ? "selected" : ""
                    }
                  >
                    {d}
                  </b>
                ))}
              </div>
            </div>
          </div>
          <span className="art-check">
            <Check size={27} />
          </span>
          <div className="art-clock">
            <Clock3 size={27} />
            <div>
              <strong>Làm việc hiệu quả</strong>
              <span>Bắt đầu từ sự rõ ràng</span>
            </div>
          </div>
          <Sparkles className="art-sparkle" size={24} />
        </div>
      </section>
      <div className="stats-grid">
        {stats.map((s) => (
          <div className="card stat-card" key={s.title}>
            <div className="stat-top">
              <span>{s.title}</span>
              <span className={`stat-icon ${s.color}`}>
                <s.icon size={19} />
              </span>
            </div>
            <div className="stat-value">
              {s.value}
              <small>{s.unit}</small>
            </div>
            <div className="stat-caption">
              <span className={`tiny-dot ${s.color}`} />
              {s.caption}
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-charts">
        <section className="card cost-chart">
          <div className="section-heading">
            <div>
              <h2>Chi phí lương</h2>
              <p>Tổng chi phí lương theo từng tháng</p>
            </div>
            <span className="chart-legend">
              <i /> Năm {month.slice(0, 4)}
            </span>
          </div>
          <div className="chart-summary">
            <strong>{money(total)}</strong>
            <span>{monthLabel(month)}</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={cost}
                margin={{ top: 15, right: 16, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="salaryGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.22} />
                    <stop
                      offset="95%"
                      stopColor="#3b82f6"
                      stopOpacity={0.015}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="4 5"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  width={62}
                  tickFormatter={(v) =>
                    v >= 1000000
                      ? `${number(v / 1000000)}tr`
                      : v >= 1000
                        ? `${number(v / 1000)}k`
                        : String(v)
                  }
                />
                <Tooltip
                  formatter={(v) => [money(Number(v)), "Chi phí lương"]}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2.8}
                  fill="url(#salaryGradient)"
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-foot">
            <span>Từ dữ liệu chấm công & bảng lương thực tế</span>
            <Link to="/lich-su">
              Xem lịch sử <ArrowRight size={14} />
            </Link>
          </div>
        </section>
        <section className="card payment-card">
          <div className="section-heading">
            <div>
              <h2>Tình hình thanh toán</h2>
              <p>{monthLabel(month)}</p>
            </div>
            <Wallet size={20} className="muted" />
          </div>
          <div
            className="payment-ring"
            style={{
              background: `conic-gradient(#3b82f6 0% ${percent}%, var(--track) ${percent}% 100%)`,
            }}
          >
            <div>
              <strong>{percent}%</strong>
              <span>Đã thanh toán</span>
            </div>
          </div>
          <div className="payment-legend">
            <div>
              <span>
                <i className="blue-dot" />
                Đã thanh toán
              </span>
              <strong>{money(paid)}</strong>
            </div>
            <div>
              <span>
                <i />
                Chưa thanh toán
              </span>
              <strong>{money(total - paid)}</strong>
            </div>
          </div>
          <Link className="payment-link" to="/bang-luong">
            Quản lý bảng lương <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <div className="dashboard-charts lower-charts">
        <section className="card hours-chart">
          <div className="section-heading">
            <div>
              <h2>Giờ làm theo nhân viên</h2>
              <p>Phân bổ giờ làm thực tế trong tháng</p>
            </div>
            <span className="subtle-tag">Đơn vị: giờ</span>
          </div>
          {employeeHours.length ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={employeeHours}
                  margin={{ top: 15, bottom: 0, left: -18, right: 20 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--border)"
                    strokeDasharray="4 5"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "var(--muted)" }}
                    tickFormatter={(v) =>
                      String(v).split(" ").slice(-2).join(" ")
                    }
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted)" }}
                  />
                  <Tooltip
                    formatter={(v) => [`${number(Number(v))} giờ`, "Giờ làm"]}
                    contentStyle={{
                      borderRadius: 12,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  />
                  <Bar
                    dataKey="hours"
                    fill="#60a5fa"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty
              title="Sẵn sàng ghi nhận giờ công"
              description="Biểu đồ hiển thị khi có ca làm đầu tiên."
            />
          )}
        </section>
        <section className="card leaderboard">
          <div className="section-heading">
            <div>
              <h2>Nhân viên nổi bật</h2>
              <p>Đội ngũ với tổng giờ làm cao nhất</p>
            </div>
            <span className="trophy-icon">
              <Trophy size={21} />
            </span>
          </div>
          {employeeHours.length ? (
            <div className="leader-list">
              {employeeHours.slice(0, 5).map((e, i) => (
                <div className="leader" key={e.id}>
                  <span className={`rank rank-${i}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Avatar name={e.name} index={i} />
                  <div>
                    <strong>{e.name}</strong>
                    <small>{e.code}</small>
                  </div>
                  <b>
                    {number(e.hours)}
                    <small> giờ</small>
                  </b>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Cùng bắt đầu một tháng mới"
              description="Những đóng góp của đội ngũ sẽ được hiển thị tại đây."
            />
          )}
          <Link className="leader-link" to="/nhan-vien">
            Xem tất cả nhân viên <ChevronRight size={15} />
          </Link>
        </section>
      </div>
      <section className="card recent-card">
        <div className="section-heading">
          <div>
            <h2>Chấm công gần đây</h2>
            <p>Các ca làm mới nhất trong kỳ đang chọn</p>
          </div>
          <Link className="text-link" to="/cham-cong">
            Xem tất cả <ArrowRight size={16} />
          </Link>
        </div>
        {recent.length ? (
          <div className="table-wrap">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Ngày làm việc</th>
                  <th>Ca làm</th>
                  <th>Giờ thực tế</th>
                  <th>Tiền lương</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s, i) => {
                  const e = data.employees.find((e) => e.id === s.employeeId)!;
                  return (
                    <tr key={s.id}>
                      <td data-label="Nhân viên">
                        <div className="person">
                          <Avatar name={e.name} index={i} />
                          <div>
                            <strong>{e.name}</strong>
                            <small>{e.code}</small>
                          </div>
                        </div>
                      </td>
                      <td data-label="Ngày">{dateLabel(s.date)}</td>
                      <td data-label="Ca làm">
                        {dateLabel(s.start, "HH:mm")} –{" "}
                        {dateLabel(s.end, "HH:mm")}
                      </td>
                      <td data-label="Giờ thực tế">{hours(s.actualMinutes)}</td>
                      <td data-label="Tiền lương" className="semibold">
                        {money(s.amount)}
                      </td>
                      <td data-label="Trạng thái">
                        <Badge tone="green">Đã ghi nhận</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Chưa có chấm công trong tháng"
            description="Bắt đầu bằng cách thêm nhân viên, sau đó ghi nhận ca làm đầu tiên."
            action={
              <Link className="btn" to="/nhan-vien">
                <Plus size={16} /> Quản lý nhân viên
              </Link>
            }
          />
        )}
      </section>
      {attendance && <AttendanceForm onClose={() => setAttendance(false)} />}
    </>
  );
}
