import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  CalendarDays,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
  LockKeyhole,
  X,
} from "lucide-react";
import type { Attendance as Shift } from "../types";
import { useApp } from "../contexts/AppContext";
import {
  Avatar,
  Button,
  Confirm,
  Empty,
  MonthPicker,
  PageHeading,
} from "../components/common/UI";
import { AttendanceForm } from "../components/attendance/AttendanceForm";
import { dateLabel, hours, duration, monthDays, today } from "../utils/format";
import { lunchLabel, presenceMinutes } from "../utils/timeSummary";
import { sum } from "../utils/salaryCalculator";
import { removeAttendance } from "../services/storage";
import { calculatedShiftIds } from "../services/wages";
export default function Attendance() {
  const { data, month, mutate } = useApp(),
    [employee, setEmployee] = useState("all"),
    [date, setDate] = useState(""),
    [search, setSearch] = useState(""),
    [view, setView] = useState("list");
  const [form, setForm] = useState<Shift | "new" | null>(null),
    [deleting, setDeleting] = useState<Shift | null>(null);
  const calculatedIds = calculatedShiftIds(data);
  const filtered = (data.attendance[month] ?? []).filter((s) => {
    const e = data.employees.find((e) => e.id === s.employeeId);
    return (
      (employee === "all" || employee === s.employeeId) &&
      (!search ||
        `${e?.name} ${e?.code} ${s.notes}`
          .toLowerCase()
          .includes(search.toLowerCase()))
    );
  });
  const activeDate = date.startsWith(month) ? date : "";
  const rows = filtered
    .filter((s) => !activeDate || activeDate === s.date)
    .sort((a, b) => b.start.localeCompare(a.start));
  const selectedDate =
    activeDate || (today().startsWith(month) ? today() : `${month}-01`);
  const openNew = () => setForm("new");
  const table = (items: Shift[]) =>
    items.length ? (
      <div className="table-wrap">
        <table className="responsive-table">
          <thead>
            <tr>
              <th>Ngày làm việc</th>
              <th>Nhân viên</th>
              <th>Giờ vào / ra</th>
              <th>Nghỉ</th>
              <th>Giờ thực tế</th>
              <th>Nghỉ trưa / Ghi chú</th>
              <th aria-label="Thao tác" />
            </tr>
          </thead>
          <tbody>
            {items.map((s, i) => {
              const e = data.employees.find((e) => e.id === s.employeeId)!;
              const calculated = calculatedIds.has(s.id);
              return (
                <tr key={s.id}>
                  <td data-label="Ngày">
                    {dateLabel(s.date)}
                    {calculated && (
                      <small className="muted">
                        <LockKeyhole size={11} className="inline-icon" /> Đã
                        tính lương
                      </small>
                    )}
                  </td>
                  <td data-label="Nhân viên">
                    <div className="person">
                      <Avatar name={e.name} index={i} />
                      <div>
                        <strong>{e.name}</strong>
                        <small>{e.code}</small>
                      </div>
                    </div>
                  </td>
                  <td data-label="Giờ vào / ra">
                    <span className="time-chip">
                      {dateLabel(s.start, "HH:mm")}
                    </span>{" "}
                    <span className="muted">→</span>{" "}
                    <span className="time-chip">
                      {dateLabel(s.end, "HH:mm")}
                    </span>
                    {dateLabel(s.end, "yyyy-MM-dd") !== s.date && (
                      <small className="muted">Ra {dateLabel(s.end)}</small>
                    )}
                  </td>
                  <td data-label="Nghỉ">
                    {s.breakMinutes ? hours(s.breakMinutes) : "Không"}
                  </td>
                  <td data-label="Giờ thực tế" className="semibold">
                    {duration(s.actualMinutes)}
                    {s.adjustmentReason && (
                      <small className="muted" title={s.adjustmentReason}>
                        Đã điều chỉnh
                      </small>
                    )}
                  </td>
                  <td data-label="Nghỉ trưa / Ghi chú" className="report-note">
                    {lunchLabel(s)}
                    <small className="muted">{s.notes || "—"}</small>
                  </td>
                  <td className="actions">
                    <button
                      className="icon-btn"
                      aria-label={`Sửa ca ${e.name} ${s.date}`}
                      disabled={calculated}
                      title={calculated ? "Ca đã tính lương" : "Sửa ca làm"}
                      onClick={() => setForm(s)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-btn red"
                      aria-label={`Xóa ca ${e.name} ${s.date}`}
                      disabled={calculated}
                      onClick={() => setDeleting(s)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty
        title="Chưa có ca làm trong thời gian này"
        description="Chọn ngày và thêm ca làm. Tổng giờ thực tế được tự động trừ thời gian nghỉ."
        action={
          <Button className="primary" onClick={openNew}>
            <Plus size={17} /> Chấm công mới
          </Button>
        }
      />
    );
  return (
    <>
      <PageHeading
        title="Chấm công"
        description="Ghi nhận từng ca làm, tính đúng từng giờ công."
      >
        <MonthPicker />
        <Button className="primary" onClick={openNew}>
          <Plus size={18} /> Chấm công mới
        </Button>
      </PageHeading>
      <div className="attendance-summary card">
        <div>
          <span>Tổng ca làm</span>
          <strong>
            {rows.length}
            <small> ca</small>
          </strong>
        </div>
        <div>
          <span>Nhân viên tham gia</span>
          <strong>
            {new Set(rows.map((s) => s.employeeId)).size}
            <small> người</small>
          </strong>
        </div>
        <div>
          <span>Tổng giờ thực tế</span>
          <strong>{duration(sum(rows, (s) => s.actualMinutes))}</strong>
        </div>
        <div>
          <span>Tổng thời gian có mặt</span>
          <strong className="text-blue">
            {duration(sum(rows, presenceMinutes))}
          </strong>
        </div>
      </div>
      <section className="card">
        <div className="section-heading">
          <div>
            <h2>Bảng chấm công</h2>
            <p>Lọc và quản lý các ca làm trong tháng.</p>
          </div>
          <div className="segmented">
            <button
              aria-label="Xem danh sách"
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
            >
              <List size={16} />
              <span>Danh sách</span>
            </button>
            <button
              aria-label="Xem lịch"
              className={view === "calendar" ? "active" : ""}
              onClick={() => setView("calendar")}
            >
              <CalendarDays size={16} />
              <span>Lịch tháng</span>
            </button>
          </div>
        </div>
        <div className="table-toolbar wrap">
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Tìm chấm công"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, mã hoặc ghi chú…"
            />
          </label>
          <select
            aria-label="Lọc nhân viên"
            value={employee}
            onChange={(e) => setEmployee(e.target.value)}
          >
            <option value="all">Tất cả nhân viên</option>
            {data.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <input
            aria-label="Lọc ngày"
            type="date"
            min={`${month}-01`}
            max={`${month}-${monthDays(month)}`}
            value={activeDate}
            onChange={(e) => setDate(e.target.value)}
          />
          {activeDate && (
            <Button onClick={() => setDate("")}>
              <X size={15} /> Bỏ lọc ngày
            </Button>
          )}
        </div>
        {view === "list" ? (
          table(rows)
        ) : (
          <>
            <div className="calendar">
              <div className="calendar-week">
                {[
                  "Thứ 2",
                  "Thứ 3",
                  "Thứ 4",
                  "Thứ 5",
                  "Thứ 6",
                  "Thứ 7",
                  "CN",
                ].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="calendar-grid">
                {Array.from(
                  { length: (parseISO(`${month}-01`).getDay() + 6) % 7 },
                  (_, i) => (
                    <div className="calendar-blank" key={`empty-${i}`} />
                  ),
                )}
                {Array.from({ length: monthDays(month) }, (_, i) => {
                  const d = `${month}-${String(i + 1).padStart(2, "0")}`,
                    shifts = filtered.filter((s) => s.date === d);
                  return (
                    <button
                      key={d}
                      className={`calendar-day ${d === selectedDate ? "selected" : ""} ${d === today() ? "is-today" : ""}`}
                      onClick={() => setDate(d)}
                    >
                      <span>{i + 1}</span>
                      {shifts.length > 0 && (
                        <>
                          <i />
                          <small>{shifts.length} ca làm</small>
                          <em>{hours(sum(shifts, (s) => s.actualMinutes))}</em>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="day-heading">
              <h3>
                Ca làm ngày {format(parseISO(selectedDate), "dd/MM/yyyy")}
              </h3>
              <Button onClick={openNew}>
                <Plus size={16} /> Thêm ca
              </Button>
            </div>
            {table(filtered.filter((s) => s.date === selectedDate))}
          </>
        )}
        <div className="table-footer">
          <span>
            {rows.length} ca làm · {hours(sum(rows, (s) => s.actualMinutes))}
          </span>
          <strong>{duration(sum(rows, (s) => s.actualMinutes))}</strong>
        </div>
      </section>
      {form && (
        <AttendanceForm
          row={form === "new" ? undefined : form}
          initialDate={selectedDate}
          onClose={() => setForm(null)}
        />
      )}{" "}
      {deleting && (
        <Confirm
          title="Xóa ca chấm công?"
          danger
          label="Xóa ca làm"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            if (
              await mutate(
                (d) => removeAttendance(d, deleting),
                "Đã xóa ca và cập nhật tổng giờ công.",
              )
            )
              setDeleting(null);
          }}
        >
          Ca làm ngày {dateLabel(deleting.date)} sẽ bị xóa. Tổng giờ của nhân
          viên trong tuần và tháng sẽ được cập nhật lại.
        </Confirm>
      )}
    </>
  );
}
