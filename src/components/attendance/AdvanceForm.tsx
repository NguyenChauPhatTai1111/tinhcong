import { useState, type FormEvent } from "react";
import type { SalaryAdvance } from "../../types";
import { useApp } from "../../contexts/AppContext";
import { Button, Field, Modal, Submit } from "../common/UI";
import { saveAdvance } from "../../services/advances";
import { today } from "../../utils/format";

export function AdvanceForm({ employeeId, initialDate, row, onClose }: {
  employeeId?: string; initialDate?: string; row?: SalaryAdvance; onClose: () => void;
}) {
  const { data, mutate, saving } = useApp();
  const [employee, setEmployee] = useState(row?.employeeId ?? employeeId ?? "");
  const [date, setDate] = useState(row?.date ?? initialDate ?? today());
  const [amount, setAmount] = useState(row ? String(row.amount) : "");
  const [notes, setNotes] = useState(row?.notes ?? "");
  const close = () => { if (!saving) onClose(); };
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await mutate((d) => saveAdvance(d, {
      id: row?.id ?? crypto.randomUUID(), employeeId: employee, date,
      amount: Number(amount), notes,
    }), "Đã lưu khoản ứng lương.")) onClose();
  }
  return <Modal title={row ? "Sửa khoản ứng lương" : "Ghi nhận ứng lương"} onClose={close}>
    <form onSubmit={submit}>
      <div className="modal-body form-grid">
        <Field label="Nhân viên ứng lương *" className="full">
          <select required value={employee} disabled={saving} onChange={(e) => setEmployee(e.target.value)}>
            <option value="">Chọn nhân viên</option>
            {data.employees.filter((e) => (e.active && !e.archived) || e.id === employee).map((e) =>
              <option key={e.id} value={e.id}>{e.name} · {e.code}</option>)}
          </select>
        </Field>
        <Field label="Ngày ứng lương *"><input required type="date" min={data.employees.find((e) => e.id === employee)?.startDate}
          value={date} disabled={saving} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Số tiền ứng (đ) *"><input required type="number" min="1" step="1" value={amount}
          disabled={saving} onChange={(e) => setAmount(e.target.value)} placeholder="VD: 500000" /></Field>
        <Field label="Ghi chú ứng lương" className="full"><textarea rows={2} maxLength={2000} value={notes}
          disabled={saving} onChange={(e) => setNotes(e.target.value)} /></Field>
        <p className="info-note full">Khoản ứng được trừ một lần khi tính lương trong khoảng ngày chứa ngày ứng. Giờ công được giữ nguyên.</p>
      </div>
      <footer><Button disabled={saving} onClick={close}>Hủy</Button><Submit>Lưu ứng lương</Submit></footer>
    </form>
  </Modal>;
}
