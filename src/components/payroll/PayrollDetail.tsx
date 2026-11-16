import { useState, type FormEvent } from "react";
import { LockKeyhole, Printer } from "lucide-react";
import type { Payroll } from "../../types";
import { useApp } from "../../contexts/AppContext";
import { Badge, Button, Confirm, Field, Modal, Submit } from "../common/UI";
import { dateLabel, hours, money, monthLabel } from "../../utils/format";
import { calculatePayroll } from "../../utils/salaryCalculator";
import { savePayroll } from "../../services/storage";
export function PayrollDetail({
  row,
  onClose,
}: {
  row: Payroll;
  onClose: () => void;
}) {
  const { data, mutate, toast } = useApp();
  const [bonus, setBonus] = useState(row.bonus),
    [allowance, setAllowance] = useState(row.allowance),
    [deduction, setDeduction] = useState(row.deduction),
    [notes, setNotes] = useState(row.notes),
    [confirm, setConfirm] = useState(false);
  const latest = data.payroll[row.month]?.find(
    (p) => p.employeeId === row.employeeId,
  );
  const current = calculatePayroll(
    data.employees.find((e) => e.id === row.employeeId)!,
    row.month,
    data.attendance[row.month] ?? [],
    latest ?? row,
  );
  const locked = current.confirmed,
    total = current.base + bonus + allowance - deduction;
  const store = async (confirmed = false) => {
    if (
      ![bonus, allowance, deduction].every(
        (v) => Number.isSafeInteger(v) && v >= 0,
      ) ||
      total < 0
    ) {
      toast(
        "Các khoản phải là số nguyên không âm; thực nhận không được âm.",
        true,
      );
      return false;
    }
    if ((bonus || allowance || deduction) && !notes.trim()) {
      toast("Vui lòng ghi chú lý do điều chỉnh lương.", true);
      return false;
    }
    return mutate(
      (d) => {
        const previous =
          d.payroll[row.month]?.find((p) => p.employeeId === row.employeeId) ??
          row;
        const fresh = calculatePayroll(
          d.employees.find((e) => e.id === row.employeeId)!,
          row.month,
          d.attendance[row.month] ?? [],
          previous,
        );
        const adjusted = {
          ...fresh,
          bonus,
          allowance,
          deduction,
          notes: notes.trim(),
          total: fresh.base + bonus + allowance - deduction,
          confirmed,
          confirmedAt: confirmed ? new Date().toISOString() : null,
        };
        return savePayroll(d, adjusted);
      },
      confirmed
        ? "Đã chốt bảng lương và khóa chấm công trong kỳ."
        : "Đã lưu bảng lương.",
    );
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (await store()) onClose();
  }
  const setPaid = () =>
    mutate(
      (d) => {
        const p = d.payroll[row.month]?.find(
          (p) => p.employeeId === row.employeeId,
        );
        if (!p?.confirmed)
          throw new Error("Vui lòng chốt bảng lương trước khi thanh toán.");
        p.paid = !p.paid;
        p.paidAt = p.paid ? new Date().toISOString() : null;
        return d;
      },
      current.paid
        ? "Đã chuyển sang chưa thanh toán."
        : "Đã ghi nhận thanh toán.",
    );
  return (
    <>
      <Modal
        title="Chi tiết bảng lương"
        subtitle={monthLabel(row.month)}
        onClose={onClose}
        wide
      >
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="payslip" id="print-payslip">
              <div className="payslip-heading">
                <div>
                  <span className="eyebrow">CÔNG VIỆT · PHIẾU LƯƠNG</span>
                  <h2>{current.employeeName}</h2>
                  <p className="muted">
                    {current.employeeCode} · {monthLabel(row.month)}
                  </p>
                </div>
                <Badge
                  tone={current.paid ? "green" : locked ? "blue" : "orange"}
                >
                  {current.paid
                    ? "Đã thanh toán"
                    : locked
                      ? "Đã chốt"
                      : "Bản nháp"}
                </Badge>
              </div>
              <div className="table-wrap">
                <table className="compact-table">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Ca làm</th>
                      <th>Giờ thực tế</th>
                      <th>Đơn giá</th>
                      <th>Tiền lương</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...current.shifts]
                      .sort((a, b) => a.start.localeCompare(b.start))
                      .map((s) => (
                        <tr key={s.id}>
                          <td>{dateLabel(s.date)}</td>
                          <td>
                            {dateLabel(s.start, "HH:mm")} –{" "}
                            {dateLabel(s.end, "HH:mm")}
                            {dateLabel(s.end, "yyyy-MM-dd") !== s.date
                              ? ` (${dateLabel(s.end, "dd/MM")})`
                              : ""}
                            {s.adjustmentReason && (
                              <small>{s.adjustmentReason}</small>
                            )}
                          </td>
                          <td>{hours(s.actualMinutes)}</td>
                          <td>{money(s.hourlyRate)}</td>
                          <td>{money(s.amount)}</td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2}>Tổng cộng</td>
                      <td>{hours(current.minutes)}</td>
                      <td />
                      <td>{money(current.base)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="form-grid payroll-adjustments">
                <Field label="Thưởng (đ)">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={bonus}
                    disabled={locked}
                    onChange={(e) => setBonus(e.target.valueAsNumber)}
                  />
                </Field>
                <Field label="Phụ cấp (đ)">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={allowance}
                    disabled={locked}
                    onChange={(e) => setAllowance(e.target.valueAsNumber)}
                  />
                </Field>
                <Field label="Khấu trừ (đ)">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={deduction}
                    disabled={locked}
                    onChange={(e) => setDeduction(e.target.valueAsNumber)}
                  />
                </Field>
                <Field label="Ghi chú điều chỉnh" className="full">
                  <textarea
                    rows={2}
                    maxLength={2000}
                    value={notes}
                    disabled={locked}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Lý do thưởng, phụ cấp hoặc khấu trừ…"
                  />
                </Field>
              </div>
              <div className="print-adjustments">
                <p>
                  Thưởng: {money(bonus)} · Phụ cấp: {money(allowance)} · Khấu
                  trừ: {money(deduction)}
                </p>
                <p>{notes}</p>
              </div>
              <div className="payroll-total">
                <div>
                  <span>LƯƠNG THỰC NHẬN</span>
                  <p>Lương ca + Thưởng + Phụ cấp − Khấu trừ</p>
                </div>
                <strong>{money(total || 0)}</strong>
              </div>
              {locked && (
                <p className="info-note">
                  <LockKeyhole size={16} /> Bảng lương đã chốt lúc{" "}
                  {dateLabel(current.confirmedAt!, "HH:mm dd/MM/yyyy")}.
                  Snapshot và chấm công được khóa.
                </p>
              )}
              {current.paidAt && (
                <p className="muted">
                  Thanh toán: {dateLabel(current.paidAt, "HH:mm dd/MM/yyyy")}
                </p>
              )}
            </div>
          </div>
          <footer className="payroll-footer">
            <Button onClick={() => window.print()}>
              <Printer size={16} /> In phiếu
            </Button>
            {locked ? (
              <Button
                className={current.paid ? "" : "primary"}
                onClick={() => setConfirm(true)}
              >
                {current.paid
                  ? "Đánh dấu chưa thanh toán"
                  : "Đánh dấu đã thanh toán"}
              </Button>
            ) : (
              <>
                <Button onClick={() => setConfirm(true)}>
                  <LockKeyhole size={16} /> Chốt bảng lương
                </Button>
                <Submit>Lưu bảng lương</Submit>
              </>
            )}
          </footer>
        </form>
      </Modal>
      {confirm && (
        <Confirm
          title={
            locked
              ? current.paid
                ? "Đổi trạng thái thanh toán?"
                : "Xác nhận thanh toán?"
              : "Chốt bảng lương?"
          }
          label={locked ? "Xác nhận" : "Chốt và khóa dữ liệu"}
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            if (await (locked ? setPaid() : store(true))) setConfirm(false);
          }}
        >
          {locked
            ? `${current.employeeName} · ${money(current.total)}. Hệ thống sẽ ${current.paid ? "xóa ngày thanh toán hiện tại và chuyển sang chưa thanh toán" : "lưu thời điểm thanh toán hiện tại"}.`
            : "Hệ thống sẽ lưu các khoản điều chỉnh và snapshot chi tiết. Sau khi chốt, bạn không thể sửa ca làm hoặc số tiền trong kỳ của nhân viên này. Hãy kiểm tra kỹ trước khi xác nhận."}
        </Confirm>
      )}
    </>
  );
}
