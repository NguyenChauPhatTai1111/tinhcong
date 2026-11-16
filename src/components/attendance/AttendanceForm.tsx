import { useState, type FormEvent } from "react";
import { addDays, format, parseISO } from "date-fns";
import { Clock3, Sparkles } from "lucide-react";
import type { Attendance } from "../../types";
import { useApp } from "../../contexts/AppContext";
import { Button, Field, Modal, Submit } from "../common/UI";
import { dateLabel, hours, money, today } from "../../utils/format";
import { localISO, shiftMinutes } from "../../utils/timeCalculator";
import { rateAt, salary } from "../../utils/salaryCalculator";
import { saveAttendance } from "../../services/storage";
export function AttendanceForm({
  row,
  initialDate,
  onClose,
}: {
  row?: Attendance;
  initialDate?: string;
  onClose: () => void;
}) {
  const { data, mutate, toast } = useApp();
  const [date, setDate] = useState(row?.date ?? initialDate ?? today()),
    [employeeId, setEmployeeId] = useState(row?.employeeId ?? "");
  const [startTime, setStartTime] = useState(
      row ? dateLabel(row.start, "HH:mm") : "08:00",
    ),
    [endTime, setEndTime] = useState(
      row ? dateLabel(row.end, "HH:mm") : "17:00",
    );
  const [explicitEnd, setExplicitEnd] = useState(
    !!row &&
      dateLabel(row.end, "yyyy-MM-dd") !== dateLabel(row.start, "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(
    row ? dateLabel(row.end, "yyyy-MM-dd") : date,
  );
  const [hasBreak, setHasBreak] = useState(row ? row.breakMinutes > 0 : false),
    [breakHours, setBreakHours] = useState(
      String((row?.breakMinutes || 60) / 60),
    );
  const parsedBreakHours = Number(breakHours.trim().replace(",", "."));
  const breakMins =
    breakHours.trim() &&
    Number.isFinite(parsedBreakHours) &&
    parsedBreakHours >= 0
      ? Math.round(parsedBreakHours * 60)
      : NaN;
  const [manual, setManual] = useState(!!row?.adjustmentReason),
    [actual, setActual] = useState(row?.actualMinutes ?? 0),
    [reason, setReason] = useState(row?.adjustmentReason ?? "");
  const [notes, setNotes] = useState(row?.notes ?? "");
  const employee = data.employees.find((e) => e.id === employeeId);
  const hourlyRate =
    row?.employeeId === employeeId
      ? row.hourlyRate
      : employee
        ? rateAt(employee, date)
        : 0;
  let start = "",
    end = "",
    calculated = 0,
    error = "";
  try {
    const autoEnd =
      endTime <= startTime
        ? format(addDays(parseISO(date), 1), "yyyy-MM-dd")
        : date;
    start = localISO(date, startTime);
    end = localISO(explicitEnd ? endDate : autoEnd, endTime);
    calculated = shiftMinutes(start, end, hasBreak ? breakMins : 0);
  } catch (e) {
    error = (e as Error).message;
  }
  const minutes = manual ? actual : calculated,
    amount = salary(minutes || 0, hourlyRate);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (error) return toast(error, true);
    if (!employee) return toast("Vui lòng chọn nhân viên.", true);
    const shift: Attendance = {
      id: row?.id ?? crypto.randomUUID(),
      employeeId,
      date,
      start,
      end,
      breakMinutes: hasBreak ? breakMins : 0,
      actualMinutes: minutes,
      adjustmentReason: manual ? reason.trim() : "",
      hourlyRate,
      amount,
      notes: notes.trim(),
    };
    if (
      await mutate(
        (d) => saveAttendance(d, shift),
        row
          ? "Đã cập nhật ca làm và tính lại lương nháp."
          : "Đã lưu chấm công.",
      )
    )
      onClose();
  }
  return (
    <Modal
      title={row ? "Chỉnh sửa chấm công" : "Chấm công mới"}
      subtitle="Giờ làm và tiền lương được tính tự động."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-body form-grid">
          <Field label="Ngày làm việc *">
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Nhân viên *">
            <select
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">Chọn nhân viên</option>
              {data.employees
                .filter(
                  (e) => (e.active && !e.archived) || e.id === row?.employeeId,
                )
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} · {e.code}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Giờ bắt đầu *">
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </Field>
          <Field label="Giờ kết thúc *">
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </Field>
          <label className="check-field full">
            <input
              type="checkbox"
              checked={explicitEnd}
              onChange={(e) => {
                setExplicitEnd(e.target.checked);
                setEndDate(date);
              }}
            />{" "}
            Chọn ngày kết thúc riêng
          </label>
          {explicitEnd ? (
            <Field label="Ngày kết thúc *" className="full">
              <input
                type="date"
                min={date}
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>
          ) : (
            <p className="hint full">
              Giờ ra sớm hơn hoặc bằng giờ vào được tính sang ngày hôm sau.
            </p>
          )}
          <div className="break-box full">
            <label className="check-field">
              <input
                type="checkbox"
                checked={hasBreak}
                onChange={(e) => setHasBreak(e.target.checked)}
              />{" "}
              Có nghỉ trưa / nghỉ giữa ca
            </label>
            {hasBreak && (
              <Field
                label="Thời gian nghỉ (giờ)"
                hint="Ví dụ: 0,5 hoặc 1,5 giờ."
              >
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]+"
                  required
                  value={breakHours}
                  onChange={(e) => setBreakHours(e.target.value)}
                />
              </Field>
            )}
          </div>
          <label className="check-field full">
            <input
              type="checkbox"
              checked={manual}
              onChange={(e) => {
                setManual(e.target.checked);
                setActual(calculated);
              }}
            />{" "}
            Điều chỉnh thủ công giờ thực tế
          </label>
          {manual && (
            <>
              <Field label="Thời gian làm thực tế (phút) *">
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={actual}
                  onChange={(e) => setActual(e.target.valueAsNumber)}
                />
              </Field>
              <Field label="Lý do điều chỉnh *">
                <input
                  required
                  value={reason}
                  maxLength={1000}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="VD: Bù giờ làm việc"
                />
              </Field>
            </>
          )}
          {error && (
            <p role="alert" className="alert error full">
              {error}
            </p>
          )}
          <div className="calculation full">
            <div className="calculation-top">
              <span>
                <Sparkles size={16} /> Kết quả tự động
              </span>
              <span>{money(hourlyRate)} / giờ</span>
            </div>
            <div>
              <span>Thời gian có mặt</span>
              <strong>
                {error
                  ? "—"
                  : hours((Date.parse(end) - Date.parse(start)) / 60000)}
              </strong>
            </div>
            <div>
              <span>Thời gian nghỉ</span>
              <strong>
                {hasBreak
                  ? Number.isFinite(breakMins)
                    ? hours(breakMins)
                    : "—"
                  : "Không nghỉ"}
              </strong>
            </div>
            <div>
              <span>
                <Clock3 size={19} /> Giờ làm thực tế
              </span>
              <strong>{error ? "—" : hours(minutes || 0)}</strong>
            </div>
            <div className="calculation-total">
              <span>Tiền lương trong ngày</span>
              <strong>{error ? "—" : money(amount)}</strong>
            </div>
            {row && <small>Giữ đơn giá đã lưu cho nhân viên của ca này.</small>}
          </div>
          <Field label="Ghi chú" className="full">
            <textarea
              rows={2}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú thêm về ca làm…"
            />
          </Field>
        </div>
        <footer>
          <Button onClick={onClose}>Hủy</Button>
          <Submit>Lưu chấm công</Submit>
        </footer>
      </form>
    </Modal>
  );
}
