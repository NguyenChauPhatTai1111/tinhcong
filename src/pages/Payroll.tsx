import { useState } from "react";
import {
  Calculator,
  Download,
  Eye,
  Wallet,
  CircleCheck,
  Clock3,
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
import { PayrollDetail } from "../components/payroll/PayrollDetail";
import { download, hours, money, dateLabel, monthLabel } from "../utils/format";
import {
  calculatePayroll,
  monthlyPayroll,
  sum,
} from "../utils/salaryCalculator";
import { payrollCSV } from "../utils/csv";
import type { Payroll as PayrollRow } from "../types";
export default function Payroll({ history = false }: { history?: boolean }) {
  const { data, month, setMonth, mutate, toast } = useApp(),
    [employee, setEmployee] = useState("all"),
    [status, setStatus] = useState("all"),
    [detail, setDetail] = useState<PayrollRow | null>(null),
    [busy, setBusy] = useState(false);
  const all = monthlyPayroll(data, month),
    rows = all.filter(
      (p) =>
        (employee === "all" || p.employeeId === employee) &&
        (status === "all" || p.paid === (status === "paid")),
    );
  const total = sum(all, (p) => p.total),
    paid = sum(
      all.filter((p) => p.paid),
      (p) => p.total,
    );
  async function calculate() {
    const candidates = data.employees.filter((e) =>
      employee === "all"
        ? !e.archived || all.some((p) => p.employeeId === e.id)
        : e.id === employee,
    );
    if (!candidates.length)
      return toast("Thêm nhân viên trước khi tính lương.", true);
    setBusy(true);
    await mutate((d) => {
      d.attendance[month] ??= [];
      d.payroll[month] ??= [];
      for (const e of candidates) {
        const prev = d.payroll[month].find((p) => p.employeeId === e.id);
        if (prev?.confirmed) continue;
        const next = calculatePayroll(e, month, d.attendance[month], prev);
        d.payroll[month] = [
          ...d.payroll[month].filter((p) => p.employeeId !== e.id),
          next,
        ];
      }
      return d;
    }, "Đã tính và lưu bảng lương. Các bảng lương đã chốt được giữ nguyên.");
    setTimeout(() => setBusy(false), 450);
  }
  const periods = [
    ...new Set([...Object.keys(data.attendance), ...Object.keys(data.payroll)]),
  ]
    .sort()
    .reverse();
  return (
    <>
      <PageHeading
        title={history ? "Lịch sử lương" : "Bảng lương"}
        description={
          history
            ? "Theo dõi các kỳ lương và tình trạng thanh toán qua từng tháng."
            : "Từ giờ công đến thu nhập. Chính xác, rõ ràng, dễ quản lý."
        }
      >
        <MonthPicker />
        <Button
          disabled={!rows.length}
          onClick={() => {
            download(
              payrollCSV(rows),
              `bang-luong-${month}.csv`,
              "text/csv;charset=utf-8",
            );
            toast("Đã xuất bảng lương CSV.");
          }}
        >
          <Download size={17} /> Xuất CSV
        </Button>
      </PageHeading>
      <div className="mini-stats">
        <div className="card mini-stat">
          <span className="stat-icon blue">
            <Wallet size={22} />
          </span>
          <div>
            <p>Tổng lương phải trả</p>
            <strong>{money(total)}</strong>
            <small>
              {all.length} nhân viên · {hours(sum(all, (p) => p.minutes))}
            </small>
          </div>
        </div>
        <div className="card mini-stat">
          <span className="stat-icon green">
            <CircleCheck size={22} />
          </span>
          <div>
            <p>Đã thanh toán</p>
            <strong>{money(paid)}</strong>
            <small>{all.filter((p) => p.paid).length} bảng lương</small>
          </div>
        </div>
        <div className="card mini-stat">
          <span className="stat-icon orange">
            <Clock3 size={22} />
          </span>
          <div>
            <p>Chưa thanh toán</p>
            <strong>{money(total - paid)}</strong>
            <small>{all.filter((p) => !p.paid).length} bảng lương</small>
          </div>
        </div>
      </div>
      {history && (
        <div className="period-strip">
          {periods.map((m) => {
            const pay = monthlyPayroll(data, m);
            return (
              <button
                className={`card period ${m === month ? "selected" : ""}`}
                key={m}
                onClick={() => setMonth(m)}
              >
                <span>{monthLabel(m)}</span>
                <strong>{money(sum(pay, (p) => p.total))}</strong>
                <small>
                  {pay.length} nhân viên · {hours(sum(pay, (p) => p.minutes))}
                </small>
              </button>
            );
          })}
        </div>
      )}
      <section className="card">
        <div className="section-heading">
          <div>
            <h2>
              {history ? "Chi tiết kỳ lương" : "Bảng lương nhân viên"}{" "}
              <span className="count">{all.length}</span>
            </h2>
            <p>{monthLabel(month)} · Lương được cộng theo đơn giá từng ca</p>
          </div>
          <Button className="primary" loading={busy} onClick={calculate}>
            <Calculator size={17} />
            {employee === "all" ? "Tính lương tất cả" : "Tính lương"}
          </Button>
        </div>
        <div className="table-toolbar wrap">
          <select
            aria-label="Chọn nhân viên tính lương"
            value={employee}
            onChange={(e) => setEmployee(e.target.value)}
          >
            <option value="all">Tất cả nhân viên</option>
            {data.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} · {e.code}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc thanh toán"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Tất cả thanh toán</option>
            <option value="paid">Đã thanh toán</option>
            <option value="unpaid">Chưa thanh toán</option>
          </select>
          <span className="toolbar-hint">
            Bản nháp tự cập nhật khi chấm công thay đổi
          </span>
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Tổng giờ</th>
                  <th>Lương ca</th>
                  <th>Điều chỉnh</th>
                  <th>Thực nhận</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={p.employeeId}>
                    <td data-label="Nhân viên">
                      <div className="person">
                        <Avatar name={p.employeeName} index={i} />
                        <div>
                          <strong>{p.employeeName}</strong>
                          <small>{p.employeeCode}</small>
                        </div>
                      </div>
                    </td>
                    <td data-label="Tổng giờ">{hours(p.minutes)}</td>
                    <td data-label="Lương ca">{money(p.base)}</td>
                    <td data-label="Điều chỉnh">
                      {money(p.bonus + p.allowance - p.deduction)}
                    </td>
                    <td data-label="Thực nhận" className="semibold text-blue">
                      {money(p.total)}
                    </td>
                    <td data-label="Trạng thái">
                      <Badge
                        tone={
                          p.paid ? "green" : p.confirmed ? "blue" : "orange"
                        }
                      >
                        {p.paid
                          ? "Đã thanh toán"
                          : p.confirmed
                            ? "Đã chốt · Chưa trả"
                            : "Bản nháp"}
                      </Badge>
                      {p.paidAt && (
                        <small className="muted">{dateLabel(p.paidAt)}</small>
                      )}
                    </td>
                    <td className="actions">
                      <Button onClick={() => setDetail(p)}>
                        <Eye size={16} /> Chi tiết
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Chưa có bảng lương phù hợp"
            description="Chấm công hoặc chọn nhân viên và nhấn Tính lương để tạo bảng lương trong kỳ."
          />
        )}
        <div className="table-footer">
          <span>
            {rows.length} bảng lương · {hours(sum(rows, (p) => p.minutes))}
          </span>
          <strong>Tổng: {money(sum(rows, (p) => p.total))}</strong>
        </div>
      </section>
      <p className="page-note">
        Đơn giá được giữ theo từng ca làm. Bảng lương đã chốt được lưu snapshot
        và khóa chấm công của nhân viên trong kỳ.
      </p>
      {detail && <PayrollDetail row={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
