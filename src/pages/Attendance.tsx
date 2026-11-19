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
import type { Attendance as Shift, SalaryAdvance } from "../types";
import { useApp } from "../contexts/AppContext";
import {
  Avatar,
  Button,
  Confirm,
  Empty,
  MonthPicker,
  PageHeading,
  Modal,
} from "../components/common/UI";
import { AttendanceForm } from "../components/attendance/AttendanceForm";
import { AdvanceForm } from "../components/attendance/AdvanceForm";
import { deductedAdvanceIds, removeAdvance } from "../services/advances";
import { dateLabel, hours, duration, monthDays, today, money } from "../utils/format";
import { lunchLabel, presenceMinutes } from "../utils/timeSummary";
import { sum } from "../utils/salaryCalculator";
import { removeAttendance } from "../services/storage";
import { calculatedShiftIds } from "../services/wages";
export default function Attendance() {
  const { data, month, mutate, saving } = useApp(),
    [employee, setEmployee] = useState("all"),
    [date, setDate] = useState(""),
    [search, setSearch] = useState(""),
    [view, setView] = useState("list");
  const [form, setForm] = useState<Shift | "new" | null>(null),
    [deleting, setDeleting] = useState<Shift | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [advanceForm, setAdvanceForm] = useState<SalaryAdvance | "new" | null>(null);
  const [deletingAdvance, setDeletingAdvance] = useState<SalaryAdvance | null>(null);
  const deductedIds = deductedAdvanceIds(data);
  const monthAdvances = (data.salaryAdvances ?? []).filter((a) => a.date.startsWith(month));
  const employees = data.employees.filter((e) =>
    (!e.archived || rowsForEmployee(e.id)) && (employee === "all" || employee === e.id) &&
    (!search || `${e.name} ${e.code}`.toLowerCase().includes(search.toLowerCase()) ||
      (data.attendance[month] ?? []).some((s) => s.employeeId === e.id && s.notes.toLowerCase().includes(search.toLowerCase()))));
  function rowsForEmployee(id: string) {
    return (data.attendance[month] ?? []).some((s) => s.employeeId === id) || monthAdvances.some((a) => a.employeeId === id);
  }
  const selectedEmployee = data.employees.find((e) => e.id === detail);
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
        <Button onClick={() => setAdvanceForm("new")} disabled={saving}>Ghi nhận ứng lương</Button>
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
            <p>Bấm vào nhân viên để xem ngày đã chấm công và các khoản ứng lương.</p>
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
          employees.length ? <div className="table-wrap"><table className="responsive-table">
            <thead><tr><th>Nhân viên</th><th>Ngày đã chấm</th><th>Số ca</th><th>Tổng giờ thực tế</th><th>Đã ứng trong tháng</th><th /></tr></thead>
            <tbody>{employees.map((e, i) => {
              const shifts = rows.filter((s) => s.employeeId === e.id);
              const advances = monthAdvances.filter((a) => a.employeeId === e.id);
              return <tr key={e.id}>
                <td data-label="Nhân viên"><button className="text-link" onClick={() => setDetail(e.id)}>
                  <Avatar name={e.name} index={i} /><span>{e.name}<small className="muted">{e.code}</small></span>
                </button></td>
                <td data-label="Ngày đã chấm">{new Set(shifts.map((s) => s.date)).size} ngày</td>
                <td data-label="Số ca">{shifts.length}</td>
                <td data-label="Tổng giờ thực tế">{duration(sum(shifts, (s) => s.actualMinutes))}</td>
                <td data-label="Đã ứng trong tháng">{money(sum(advances, (a) => a.amount))}</td>
                <td className="actions"><Button onClick={() => setDetail(e.id)}>Xem chấm công</Button></td>
              </tr>;
            })}</tbody>
          </table></div> : <Empty title="Chưa có nhân viên phù hợp" description="Thêm nhân viên hoặc thay đổi bộ lọc để xem chấm công." />
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
      {selectedEmployee && <Modal title={`Chấm công · ${selectedEmployee.name}`} subtitle={`${selectedEmployee.code} · Tháng ${month.slice(5)}/${month.slice(0, 4)}`} wide onClose={() => setDetail(null)}>
        <div className="modal-body">
          <div className="section-heading"><div><h3>Các ngày đã chấm công</h3>
            <p>{activeDate ? `Đang lọc ngày ${dateLabel(activeDate)}` : "Các ca làm trong tháng đang chọn."}</p></div>
            <Button className="primary" onClick={openNew}>Thêm ca làm</Button></div>
          {table(rows.filter((s) => s.employeeId === detail))}
          <div className="section-heading"><h3>Ứng lương trong tháng</h3>
            <Button disabled={saving || !selectedEmployee.active || selectedEmployee.archived} onClick={() => setAdvanceForm("new")}>Ghi nhận ứng lương</Button></div>
          {monthAdvances.some((a) => a.employeeId === detail) ? <div className="table-wrap"><table className="responsive-table">
            <thead><tr><th>Ngày ứng</th><th>Số tiền</th><th>Ghi chú</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>{monthAdvances.filter((a) => a.employeeId === detail).sort((a, b) => b.date.localeCompare(a.date)).map((a) =>
              <tr key={a.id}><td data-label="Ngày ứng">{dateLabel(a.date)}</td><td data-label="Số tiền">{money(a.amount)}</td>
                <td data-label="Ghi chú">{a.notes || "—"}</td><td data-label="Trạng thái">{deductedIds.has(a.id) ? "Đã trừ vào lương" : "Chưa trừ vào lương"}</td>
                <td className="actions"><button className="icon-btn" aria-label={`Sửa khoản ứng ${a.date}`} disabled={saving || deductedIds.has(a.id)} onClick={() => setAdvanceForm(a)}><Pencil size={16} /></button>
                <button className="icon-btn red" aria-label={`Xóa khoản ứng ${a.date}`} disabled={saving || deductedIds.has(a.id)} onClick={() => setDeletingAdvance(a)}><Trash2 size={16} /></button></td></tr>)}</tbody>
          </table></div> : <p className="info-note">Chưa có khoản ứng trong tháng này.</p>}
        </div>
        <footer><Button onClick={() => setDetail(null)}>Đóng</Button></footer>
      </Modal>}
      {advanceForm && <AdvanceForm employeeId={detail ?? undefined} initialDate={selectedDate}
        row={advanceForm === "new" ? undefined : advanceForm} onClose={() => setAdvanceForm(null)} />}
      {deletingAdvance && <Confirm title="Xóa khoản ứng lương?" danger label="Xóa khoản ứng" onClose={() => setDeletingAdvance(null)}
        onConfirm={async () => { if (await mutate((d) => removeAdvance(d, deletingAdvance.id), "Đã xóa khoản ứng lương.")) setDeletingAdvance(null); }}>
        Xóa khoản ứng {money(deletingAdvance.amount)} ngày {dateLabel(deletingAdvance.date)}?
      </Confirm>}
      {form && (
        <AttendanceForm
          row={form === "new" ? undefined : form}
          initialDate={selectedDate}
          initialEmployeeId={detail ?? undefined}
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
