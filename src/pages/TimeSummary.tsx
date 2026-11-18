import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  CalendarRange,
  Clock3,
  Download,
  Eye,
  Printer,
  Users,
  Calculator,
  CheckCircle2,
  CircleHelp,
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Field,
  Modal,
  MonthPicker,
  PageHeading,
} from "../components/common/UI";
import { dateLabel, download, duration, today } from "../utils/format";
import {
  csvContent,
  hoursCSV,
  lunchLabel,
  periodRange,
  presenceMinutes,
  shiftsInRange,
  summarizeHours,
  totalMinutes,
  type Period,
} from "../utils/timeSummary";
import {
  calculationsInRange,
  pendingShifts,
  shiftSignature,
} from "../services/wages";
import {
  WageCalculator,
  type WageTarget,
} from "../components/wages/WageCalculator";
import { useHelp } from "../contexts/HelpContext";
import { validMonth } from "../utils/timeCalculator";
export default function TimeSummary({
  history = false,
}: {
  history?: boolean;
}) {
  const { data, month, setMonth, toast, saving } = useApp();
  const { openHelp } = useHelp();
  const location = useLocation();
  const [wageTarget, setWageTarget] = useState<WageTarget | null>(null);
  const [period, setPeriod] = useState<Period>("month"),
    [day, setDay] = useState(today()),
    [start, setStart] = useState(`${month}-01`),
    [end, setEnd] = useState(today()),
    [employeeId, setEmployeeId] = useState("all"),
    [detail, setDetail] = useState<string | null>(null);
  useEffect(() => {
    const requested = new URLSearchParams(location.search).get("thang");
    if (requested && validMonth(requested)) {
      setPeriod("month");
      setMonth(requested);
      setEmployeeId("all");
      setDetail(null);
      setWageTarget(null);
    }
  }, [location.key, location.search, setMonth]);
  let error = "",
    range = { start: "", end: "" };
  try {
    range = periodRange(period, month, day, start, end);
  } catch (e) {
    error = (e as Error).message;
  }
  const shifts = error ? [] : shiftsInRange(data, range),
    rows = summarizeHours(data, shifts).filter(
      (r) => employeeId === "all" || r.employee.id === employeeId,
    );
  const selectedShifts = shifts.filter(
      (s) => employeeId === "all" || s.employeeId === employeeId,
    ),
    detailShifts = selectedShifts.filter(
      (s) => detail === "all" || s.employeeId === detail,
    );
  const months = Object.keys(data.attendance).sort().reverse();
  const days = [...new Set(detailShifts.map((s) => s.date))].sort();
  const exportSummary = () => {
    download(
      hoursCSV(rows, range),
      `tong-hop-gio-cong-${range.start}-${range.end}.csv`,
      "text/csv;charset=utf-8",
    );
    toast("Đã xuất tổng hợp giờ công.");
  };
  const exportDetail = () => {
    download(
      csvContent([
        [
          "Ngày",
          "Mã nhân viên",
          "Nhân viên",
          "Giờ vào",
          "Giờ ra",
          "Ngày ra",
          "Nghỉ (giờ)",
          "Nghỉ trưa",
          "Thực tế (phút)",
          "Thực tế (giờ)",
          "Ghi chú",
          "Lý do điều chỉnh",
        ],
        ...detailShifts.map((s) => {
          const e = data.employees.find((e) => e.id === s.employeeId)!;
          return [
            dateLabel(s.date),
            e.code,
            e.name,
            dateLabel(s.start, "HH:mm"),
            dateLabel(s.end, "HH:mm"),
            dateLabel(s.end),
            s.breakMinutes / 60,
            lunchLabel(s),
            s.actualMinutes,
            s.actualMinutes / 60,
            s.notes,
            s.adjustmentReason,
          ];
        }),
      ]),
      `chi-tiet-gio-cong-${range.start}-${range.end}.csv`,
      "text/csv;charset=utf-8",
    );
  };
  return (
    <>
      <PageHeading
        title={history ? "Lịch sử giờ công" : "Tổng hợp giờ công"}
        description="Chọn kỳ công, rồi bấm Tính lương ở từng nhân viên để nhập đơn giá riêng."
      >
        <Button disabled={!!error} onClick={exportSummary}>
          <Download size={17} /> Xuất CSV
        </Button>
        <Button
          disabled={!!error || !selectedShifts.length}
          onClick={() => setDetail("all")}
        >
          <Printer size={17} /> In tổng hợp
        </Button>
      </PageHeading>
      <section className="task-callout">
        <span className="task-callout-icon">
          <Calculator size={22} />
        </span>
        <div>
          <strong>Tính lương ở ngay dòng nhân viên</strong>
          <p>
            Chọn thời gian bên dưới → tìm người cần tính → bấm <b>Tính lương</b>{" "}
            → nhập đơn giá và xác nhận.
          </p>
        </div>
        <button className="text-link" onClick={() => openHelp("wages")}>
          <CircleHelp size={17} /> Xem cách làm
        </button>
      </section>
      <section className="card time-filters">
        <div className="segmented">
          {(
            [
              { id: "month", label: "Theo tháng" },
              { id: "week", label: "Theo tuần" },
              { id: "custom", label: "Khoảng ngày" },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              className={period === p.id ? "active" : ""}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="time-filter-fields">
          {period === "month" && <MonthPicker />}
          {period === "week" && (
            <Field label="Chọn ngày trong tuần">
              <input
                type="date"
                required
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </Field>
          )}
          {period === "custom" && (
            <>
              <Field label="Từ ngày">
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </Field>
              <Field label="Đến ngày">
                <input
                  type="date"
                  min={start}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </Field>
            </>
          )}
          <Field label="Nhân viên">
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="all">Tất cả nhân viên</option>
              {data.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · {e.code}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {error ? (
          <p className="alert error" role="alert">
            {error}
          </p>
        ) : (
          <p className="hint">
            Từ {dateLabel(range.start)} đến {dateLabel(range.end)}
            {period === "week" && " · Tuần từ thứ Hai đến Chủ nhật"}
          </p>
        )}
      </section>
      <div className="mini-stats">
        <div className="card mini-stat">
          <span className="stat-icon blue">
            <Users size={21} />
          </span>
          <div>
            <p>Nhân viên có chấm công</p>
            <strong>{rows.filter((r) => r.shifts.length > 0).length}</strong>
          </div>
        </div>
        <div className="card mini-stat">
          <span className="stat-icon purple">
            <Clock3 size={21} />
          </span>
          <div>
            <p>Tổng giờ làm thực tế</p>
            <strong data-testid="summary-worked">
              {duration(totalMinutes(selectedShifts))}
            </strong>
          </div>
        </div>
        <div className="card mini-stat">
          <span className="stat-icon orange">
            <CalendarRange size={21} />
          </span>
          <div>
            <p>Tổng thời gian nghỉ</p>
            <strong>
              {duration(totalMinutes(selectedShifts, "breakMinutes"))}
            </strong>
            <small>{selectedShifts.length} ca được ghi nhận</small>
          </div>
        </div>
      </div>
      {history && (
        <div className="period-strip">
          {months.map((m) => {
            const s = data.attendance[m];
            return (
              <button
                key={m}
                className={`card period ${m === month && period === "month" ? "selected" : ""}`}
                onClick={() => {
                  setPeriod("month");
                  setMonth(m);
                }}
              >
                <span>
                  Tháng {m.slice(5)}/{m.slice(0, 4)}
                </span>
                <strong>{duration(totalMinutes(s))}</strong>
                <small>{s.length} ca làm</small>
              </button>
            );
          })}
        </div>
      )}
      <section className="card">
        <div className="section-heading">
          <div>
            <h2>Tổng giờ của từng nhân viên</h2>
            <p>Giờ thực tế đã trừ thời gian nghỉ của từng ca.</p>
          </div>
          <Badge>Tính lương riêng từng người</Badge>
        </div>
        {rows.length && !error ? (
          <div className="table-wrap summary-table">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Ngày có ca</th>
                  <th>Số ca</th>
                  <th>Có mặt</th>
                  <th>Thời gian nghỉ</th>
                  <th>Giờ thực tế</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const pending = pendingShifts(data, r.employee.id, range),
                    pendingMinutes = totalMinutes(pending);
                  const records = calculationsInRange(
                    data,
                    r.employee.id,
                    range,
                  );
                  const done = records.length > 0 && pendingMinutes <= 0;
                  const openWage = (mode: WageTarget["mode"]) =>
                    setWageTarget({
                      employeeId: r.employee.id,
                      range: { ...range },
                      mode,
                      signature: shiftSignature(pending),
                    });
                  return (
                    <tr key={r.employee.id}>
                      <td data-label="Nhân viên">
                        <div className="person">
                          <Avatar name={r.employee.name} index={i} />
                          <div>
                            <strong>{r.employee.name}</strong>
                            <small>{r.employee.code}</small>
                          </div>
                        </div>
                      </td>
                      <td data-label="Ngày có ca">{r.days}</td>
                      <td data-label="Số ca">{r.shifts.length}</td>
                      <td data-label="Có mặt">{duration(r.presence)}</td>
                      <td data-label="Thời gian nghỉ">{duration(r.breaks)}</td>
                      <td
                        data-label="Giờ thực tế"
                        className="semibold text-blue"
                      >
                        {duration(r.actual)}
                        {records.length > 0 && pendingMinutes > 0 && (
                          <small className="muted">
                            Chưa tính lương: {duration(pendingMinutes)}
                          </small>
                        )}
                      </td>
                      <td className="actions">
                        <div className="wage-actions">
                          <Button
                            disabled={!r.shifts.length}
                            onClick={() => setDetail(r.employee.id)}
                          >
                            <Eye size={16} /> Chi tiết
                          </Button>
                          <Button
                            className={done ? "calculated-btn" : "primary"}
                            disabled={saving || pendingMinutes <= 0}
                            onClick={() => openWage("calculate")}
                          >
                            {done ? (
                              <CheckCircle2 size={16} />
                            ) : (
                              <Calculator size={16} />
                            )}
                            {done ? "Đã tính lương" : "Tính lương"}
                          </Button>
                          {records.length > 0 && (
                            <Button onClick={() => openWage("history")}>
                              Xem kết quả
                            </Button>
                          )}
                          {!done && pendingMinutes <= 0 && (
                            <small className="action-hint">
                              Chưa có giờ công để tính lương.
                            </small>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Chưa có dữ liệu giờ công"
            description="Chọn khoảng thời gian hoặc ghi nhận ca làm đầu tiên."
          />
        )}
        <div className="table-footer">
          <span>
            {selectedShifts.length} ca làm · {dateLabel(range.start)} –{" "}
            {dateLabel(range.end)}
          </span>
          <strong>{duration(totalMinutes(selectedShifts))}</strong>
        </div>
      </section>
      <p className="page-note">
        Bạn có thể cộng giờ bất kỳ lúc nào, kể cả giữa tuần hoặc giữa tháng. Bấm
        “Tính lương” ở dòng nhân viên để nhập đơn giá. Ca đã tính sẽ được bỏ qua
        ở các lần sau, kể cả khi đổi bộ lọc.
      </p>
      {wageTarget && (
        <WageCalculator
          target={wageTarget}
          onClose={() => setWageTarget(null)}
        />
      )}
      {detail && (
        <Modal
          title="Chi tiết giờ công"
          subtitle={`${dateLabel(range.start)} – ${dateLabel(range.end)}`}
          wide
          onClose={() => setDetail(null)}
        >
          <div className="modal-body">
            <div id="print-payslip" className="payslip">
              <div className="payslip-heading">
                <div>
                  <span className="eyebrow">CÔNG VIỆT · TỔNG HỢP GIỜ CÔNG</span>
                  <h2>
                    {detail === "all"
                      ? "Tất cả nhân viên trong bộ lọc"
                      : data.employees.find((e) => e.id === detail)?.name}
                  </h2>
                  <p>
                    {dateLabel(range.start)} – {dateLabel(range.end)}
                  </p>
                </div>
                <strong>{duration(totalMinutes(detailShifts))}</strong>
              </div>
              {days.map((date) => {
                const shifts = detailShifts.filter((s) => s.date === date);
                return (
                  <section className="report-day" key={date}>
                    <h3>
                      {dateLabel(date)}{" "}
                      <small>
                        · Tổng ngày: {duration(totalMinutes(shifts))}
                      </small>
                    </h3>
                    <div className="table-wrap">
                      <table className="compact-table">
                        <thead>
                          <tr>
                            <th>Nhân viên</th>
                            <th>Giờ vào / ra</th>
                            <th>Thời gian nghỉ</th>
                            <th>Giờ thực tế</th>
                            <th>Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shifts.map((s) => (
                            <tr key={s.id}>
                              <td>
                                {
                                  data.employees.find(
                                    (e) => e.id === s.employeeId,
                                  )?.name
                                }
                              </td>
                              <td>
                                {dateLabel(s.start, "HH:mm")} →{" "}
                                {dateLabel(s.end, "HH:mm")}
                                {dateLabel(s.end, "yyyy-MM-dd") !== s.date && (
                                  <small>Ra ngày {dateLabel(s.end)}</small>
                                )}
                                <small>
                                  Có mặt: {duration(presenceMinutes(s))}
                                </small>
                              </td>
                              <td>
                                {duration(s.breakMinutes)}
                                <small>{lunchLabel(s)}</small>
                              </td>
                              <td className="semibold">
                                {duration(s.actualMinutes)}
                              </td>
                              <td className="report-note">
                                {s.notes || "—"}
                                {s.adjustmentReason && (
                                  <small>
                                    Điều chỉnh: {s.adjustmentReason}
                                  </small>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                );
              })}
              <div className="payroll-total">
                <div>
                  <span>TỔNG GIỜ LÀM THỰC TẾ</span>
                  <p>Đã trừ thời gian nghỉ theo từng ca.</p>
                </div>
                <strong>{duration(totalMinutes(detailShifts))}</strong>
              </div>
            </div>
          </div>
          <footer>
            <Button onClick={exportDetail}>
              <Download size={16} /> Xuất chi tiết CSV
            </Button>
            <Button className="primary" onClick={() => window.print()}>
              <Printer size={16} /> In bảng giờ công
            </Button>
          </footer>
        </Modal>
      )}
    </>
  );
}
