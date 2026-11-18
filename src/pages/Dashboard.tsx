import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  Clock3,
  Coffee,
  Download,
  Plus,
  Trophy,
  Users,
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
import { QuickStart } from "../components/common/QuickStart";
import {
  dateLabel,
  download,
  duration,
  monthDays,
  monthLabel,
  number,
} from "../utils/format";
import {
  hoursCSV,
  lunchLabel,
  summarizeHours,
  totalMinutes,
} from "../utils/timeSummary";
export default function Dashboard() {
  const { data, month, date } = useApp(),
    [form, setForm] = useState(false);
  const shifts = data.attendance[month] ?? [],
    employees = data.employees.filter((e) => !e.archived),
    summaries = summarizeHours(data, shifts),
    leaders = summaries
      .filter((e) => e.actual > 0)
      .sort((a, b) => b.actual - a.actual);
  const daily = Array.from({ length: monthDays(month) }, (_, i) => {
    const day = `${month}-${String(i + 1).padStart(2, "0")}`,
      rows = shifts.filter((s) => s.date === day);
    return {
      day: String(i + 1),
      minutes: totalMinutes(rows),
      hours: totalMinutes(rows) / 60,
    };
  });
  const todayCount = new Set(
    (data.attendance[date.slice(0, 7)] ?? [])
      .filter((s) => s.date === date)
      .map((s) => s.employeeId),
  ).size;
  const stats = [
    {
      title: "Tổng nhân viên",
      value: employees.length,
      caption: `${employees.filter((e) => e.active).length} người đang làm việc`,
      icon: Users,
      color: "blue",
    },
    {
      title: "Đã chấm công hôm nay",
      value: todayCount,
      caption: dateLabel(date),
      icon: CalendarCheck2,
      color: "green",
    },
    {
      title: "Giờ thực tế trong tháng",
      value: duration(totalMinutes(shifts)),
      caption: "Đã trừ thời gian nghỉ từng ca",
      icon: Clock3,
      color: "purple",
    },
    {
      title: "Tổng ca làm",
      value: shifts.length,
      caption: monthLabel(month),
      icon: CalendarDays,
      color: "blue",
    },
    {
      title: "Tổng thời gian nghỉ",
      value: duration(totalMinutes(shifts, "breakMinutes")),
      caption: "Mỗi người có thể nghỉ khác nhau",
      icon: Coffee,
      color: "orange",
    },
    {
      title: "Ngày có chấm công",
      value: new Set(shifts.map((s) => s.date)).size,
      caption: "Ngày có ít nhất một ca làm",
      icon: CalendarCheck2,
      color: "green",
    },
  ];
  return (
    <>
      <PageHeading
        title="Tổng quan"
        description="Theo dõi giờ làm của đội ngũ. Tổng giờ rõ ràng, dễ đối chiếu."
      >
        <MonthPicker />
        <Button
          onClick={() =>
            download(
              hoursCSV(summaries, {
                start: `${month}-01`,
                end: `${month}-${monthDays(month)}`,
              }),
              `gio-cong-${month}.csv`,
              "text/csv;charset=utf-8",
            )
          }
        >
          <Download size={17} /> Xuất giờ công
        </Button>
      </PageHeading>
      <QuickStart />
      <section className="welcome-banner">
        <div className="welcome-content">
          <div className="welcome-eyebrow">
            <span /> CHẤM CÔNG THEO GIỜ THỰC TẾ
          </div>
          <h2>Mỗi giờ làm, đều được ghi nhận.</h2>
          <p>
            Giờ ra − giờ vào − thời gian nghỉ. Nhập đơn giá riêng khi tính lương
            cho từng người.
          </p>
          <div className="welcome-buttons">
            <button onClick={() => setForm(true)}>
              Chấm công hôm nay <ArrowRight size={16} />
            </button>
            <Link to="/tong-hop">
              Tính lương nhân viên <ArrowRight size={16} />
            </Link>
          </div>
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
                {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                  <b key={d}>{d}</b>
                ))}
              </div>
            </div>
          </div>
          <div className="art-clock">
            <Clock3 size={27} />
            <div>
              <strong>Giờ công thực tế</strong>
              <span>Rõ ca làm · Rõ giờ nghỉ</span>
            </div>
          </div>
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
            <div className="stat-value hours-stat">{s.value}</div>
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
              <h2>Giờ làm theo ngày</h2>
              <p>Giờ thực tế của toàn bộ nhân viên trong tháng</p>
            </div>
            <Badge>{monthLabel(month)}</Badge>
          </div>
          <div className="chart-summary">
            <strong>{duration(totalMinutes(shifts))}</strong>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={daily}
                margin={{ top: 15, right: 20, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="hoursGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop
                      offset="100%"
                      stopColor="#3b82f6"
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="4 5"
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "var(--muted)" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={45}
                  tick={{ fontSize: 10, fill: "var(--muted)" }}
                  tickFormatter={(v) => `${number(v)}h`}
                />
                <Tooltip
                  labelFormatter={(v) => `Ngày ${v}/${month.slice(5)}`}
                  formatter={(v) => [
                    duration(Math.round(Number(v) * 60)),
                    "Giờ thực tế",
                  ]}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  fill="url(#hoursGradient)"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-foot">
            <span>Từ các ca chấm công đã lưu</span>
            <Link to="/tong-hop">
              Tổng hợp tuần / tháng <ArrowRight size={14} />
            </Link>
          </div>
        </section>
        <section className="card leaderboard">
          <div className="section-heading">
            <div>
              <h2>Giờ làm theo nhân viên</h2>
              <p>Tổng giờ thực tế cao nhất trong tháng</p>
            </div>
            <span className="trophy-icon">
              <Trophy size={21} />
            </span>
          </div>
          {leaders.length ? (
            <div className="leader-list">
              {leaders.slice(0, 5).map((r, i) => (
                <div className="leader" key={r.employee.id}>
                  <span className="rank">{i + 1}</span>
                  <Avatar name={r.employee.name} index={i} />
                  <div>
                    <strong>{r.employee.name}</strong>
                    <small>{r.days} ngày có ca</small>
                  </div>
                  <b>{duration(r.actual)}</b>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Chưa có giờ công trong tháng"
              description="Bắt đầu bằng cách ghi nhận ca làm đầu tiên."
            />
          )}
          <Link className="leader-link" to="/tong-hop">
            Xem tổng hợp giờ công <ArrowRight size={15} />
          </Link>
        </section>
      </div>
      <section className="card recent-card">
        <div className="section-heading">
          <div>
            <h2>Chấm công gần đây</h2>
            <p>Giờ làm, giờ nghỉ và ghi chú của từng người.</p>
          </div>
          <Link className="text-link" to="/cham-cong">
            Xem tất cả <ArrowRight size={16} />
          </Link>
        </div>
        {shifts.length ? (
          <div className="table-wrap">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Ngày</th>
                  <th>Giờ vào / ra</th>
                  <th>Nghỉ</th>
                  <th>Giờ thực tế</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {[...shifts]
                  .sort((a, b) => b.start.localeCompare(a.start))
                  .slice(0, 5)
                  .map((s, i) => {
                    const e = data.employees.find(
                      (e) => e.id === s.employeeId,
                    )!;
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
                        <td data-label="Giờ vào / ra">
                          {dateLabel(s.start, "HH:mm")} →{" "}
                          {dateLabel(s.end, "HH:mm")}
                          {dateLabel(s.end, "yyyy-MM-dd") !== s.date && (
                            <small>Ra {dateLabel(s.end)}</small>
                          )}
                        </td>
                        <td data-label="Nghỉ">
                          {duration(s.breakMinutes)}
                          <small>{lunchLabel(s)}</small>
                        </td>
                        <td
                          data-label="Giờ thực tế"
                          className="semibold text-blue"
                        >
                          {duration(s.actualMinutes)}
                        </td>
                        <td data-label="Ghi chú" className="report-note">
                          {s.notes || "—"}
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
            description="Thêm người làm và ghi nhận giờ vào, giờ ra của từng ca."
            action={
              <Link className="btn" to="/nhan-vien">
                <Plus size={16} /> Quản lý nhân viên
              </Link>
            }
          />
        )}
      </section>
      {form && <AttendanceForm onClose={() => setForm(false)} />}
    </>
  );
}
