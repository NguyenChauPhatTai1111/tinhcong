import { useState, type FormEvent } from "react";
import { Calculator, Download, Printer } from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { Button, Field, Modal, Submit } from "../common/UI";
import { dateLabel, download, duration, money } from "../../utils/format";
import { salary } from "../../utils/salaryCalculator";
import { pendingAdvances } from "../../services/advances";
import { AdvanceForm } from "../attendance/AdvanceForm";
import { WagePayslip } from "./WagePayslip";
import {
  csvContent,
  shiftsInRange,
  totalMinutes,
  type DateRange,
} from "../../utils/timeSummary";
import {
  calculationsInRange,
  finalizeWages,
  pendingShifts,
  shiftSignature,
} from "../../services/wages";

export interface WageTarget {
  employeeId: string;
  range: DateRange;
  mode: "calculate" | "history";
  signature: string;
}
export function WageCalculator({
  target,
  onClose,
}: {
  target: WageTarget;
  onClose: () => void;
}) {
  const { data, mutate, saving } = useApp();
  const [rateText, setRateText] = useState(""),
    [notes, setNotes] = useState("");
  const [addingAdvance, setAddingAdvance] = useState(false);
  const employee = data.employees.find((e) => e.id === target.employeeId)!;
  const shifts = pendingShifts(data, target.employeeId, target.range),
    minutes = totalMinutes(shifts);
  const allMinutes = totalMinutes(
    shiftsInRange(data, target.range).filter(
      (s) => s.employeeId === target.employeeId,
    ),
  );
  const records = calculationsInRange(data, target.employeeId, target.range);
  const advances = pendingAdvances(data, target.employeeId, target.range);
  const advanceTotal = advances.reduce((total, a) => total + a.amount, 0);
  const rate = rateText.trim() ? Number(rateText) : NaN,
    amount = salary(minutes, rate);
  const validAmount =
    Number.isSafeInteger(rate) &&
    rate > 0 &&
    Number.isSafeInteger(amount) &&
    amount >= 0;
  const changed = target.signature !== shiftSignature(shifts);
  const close = () => {
    if (!saving) onClose();
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (
      await mutate(
        (d) =>
          finalizeWages(
            d,
            target.employeeId,
            target.range,
            rate,
            notes,
            target.signature,
          ),
        `Đã tính lương cho ${employee.name}.`,
      )
    )
      onClose();
  }
  const exportResults = () =>
    download(
      csvContent([
        [
          "Nhân viên",
          "Mã nhân viên",
          "Từ ngày",
          "Đến ngày",
          "Số phút",
          "Số giờ",
          "Đơn giá (đ/giờ)",
          "Tiền lương (đ)",
          "Tiền đã ứng (đ)",
          "Thực nhận (đ)",
          "Ngày tính",
          "Ghi chú",
        ],
        ...records.map((r) => [
          r.employeeName,
          r.employeeCode,
          dateLabel(r.startDate),
          dateLabel(r.endDate),
          r.minutes,
          r.minutes / 60,
          r.hourlyRate,
          r.amount,
          r.advanceTotal ?? 0,
          r.netAmount ?? r.amount,
          dateLabel(r.calculatedAt, "HH:mm dd/MM/yyyy"),
          r.notes,
        ]),
      ]),
      `ket-qua-luong-${employee.code}-${target.range.start}-${target.range.end}.csv`,
      "text/csv;charset=utf-8",
    );
  return (
    <Modal
      title={
        target.mode === "calculate"
          ? `Tính lương · ${employee.name}`
          : `Kết quả lương · ${employee.name}`
      }
      subtitle={`${dateLabel(target.range.start)} – ${dateLabel(target.range.end)}`}
      onClose={close}
      wide={target.mode === "history"}
    >
      {target.mode === "calculate" ? (
        <form onSubmit={submit}>
          <div className="modal-body form-grid">
            <div className="calculation full">
              <div className="calculation-top">
                <span>
                  <Calculator size={16} /> Giờ công chưa tính lương
                </span>
                <span>{shifts.length} ca làm</span>
              </div>
              <div>
                <span>Tổng giờ thực tế</span>
                <strong>{duration(minutes)}</strong>
              </div>
              {allMinutes > minutes && (
                <small>
                  Đã bỏ qua {duration(allMinutes - minutes)} được tính trước đó,
                  kể cả khi đổi bộ lọc tuần/tháng.
                </small>
              )}
            </div>
            <Field
              label="Đơn giá của nhân viên (đ/giờ) *"
              className="full"
              hint="Nhập riêng cho lần tính này; không cần đặt đơn giá trong hồ sơ nhân viên."
            >
              <input
                required
                autoFocus
                type="number"
                min="1"
                step="1"
                value={rateText}
                disabled={saving}
                onChange={(e) => setRateText(e.target.value)}
                placeholder="VD: 30000"
              />
            </Field>
            <section className="full">
              <div className="section-heading">
                <h3>Ứng lương trong kỳ · {money(advanceTotal)}</h3>
                <Button disabled={saving || !employee.active || employee.archived} onClick={() => setAddingAdvance(true)}>Ghi nhận ứng lương</Button>
              </div>
              {advances.length ? advances.map((a) => <p className="info-note" key={a.id}>
                {dateLabel(a.date)} · {money(a.amount)}{a.notes && ` · ${a.notes}`}
              </p>) : <p className="hint">Chưa có khoản ứng chưa trừ trong kỳ này.</p>}
            </section>
            <div className="payroll-total full">
              <div>
                <span>TIỀN THỰC NHẬN LẦN NÀY</span>
                <p>
                  {duration(minutes)} × đơn giá theo giờ · Làm tròn đến đồng
                  <br />Lương trước ứng: {validAmount ? money(amount) : "—"} · Trừ ứng: {money(advanceTotal)}
                </p>
              </div>
              <strong aria-live="polite">
                {validAmount ? money(amount - advanceTotal) : "—"}
              </strong>
            </div>
            {validAmount && advanceTotal > amount && <p className="alert warning full">
              Tiền ứng vượt lương {money(advanceTotal - amount)}. Kết quả sẽ ghi nhận số dư âm; không tự chuyển khoản vượt sang kỳ sau.
            </p>}
            <Field label="Ghi chú tính lương" className="full">
              <textarea
                rows={2}
                maxLength={2000}
                value={notes}
                disabled={saving}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú thêm nếu cần…"
              />
            </Field>
            {changed && (
              <p className="alert warning full">
                Giờ công đã thay đổi. Hãy đóng và mở lại ô tính lương để kiểm
                tra.
              </p>
            )}
            <p className="info-note full">
              Bấm xác nhận để lưu kết quả. Những ca trong lần tính này sẽ được
              khóa sửa/xóa; nút của nhân viên sẽ chuyển sang “Đã tính lương”.
              Nếu có ca mới, bạn có thể tính riêng phần công mới.
            </p>
          </div>
          <footer>
            <Button disabled={saving} onClick={close}>
              Hủy
            </Button>
            {!changed && minutes > 0 ? (
              <Submit>Xác nhận tính lương</Submit>
            ) : (
              <Button disabled className="primary">
                Xác nhận tính lương
              </Button>
            )}
          </footer>
        </form>
      ) : (
        <>
          <div className="modal-body">
            <p className="info-note payslip-screen-note">Mẫu in A4 gồm bảng lương, chi tiết từng ngày công và các khoản ứng đã trừ. Mỗi lần tính lương bắt đầu trên một trang mới.</p>
            <WagePayslip records={records} company={data.settings.company} />
          </div>
          <footer>
            <Button onClick={exportResults}>
              <Download size={16} /> Xuất kết quả CSV
            </Button>
            <Button className="primary" onClick={() => window.print()}>
              <Printer size={16} /> In bảng lương A4
            </Button>
          </footer>
        </>
      )}
      {addingAdvance && <AdvanceForm employeeId={employee.id} initialDate={target.range.end}
        onClose={() => setAddingAdvance(false)} />}
    </Modal>
  );
}
