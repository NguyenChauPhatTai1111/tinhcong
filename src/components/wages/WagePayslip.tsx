import type { WageCalculation } from "../../types";
import { dateLabel, duration, money } from "../../utils/format";
import { lunchLabel, totalMinutes } from "../../utils/timeSummary";
import "./payslip.css";

export function WagePayslip({ records, company }: {
  records: WageCalculation[];
  company: string;
}) {
  return (
    <div id="print-payslip" className="payslip wage-payslip">
      {records.map((record) => {
        const days = [...new Set(record.shifts.map((shift) => shift.date))].sort();
        return (
          <section className="wage-record payslip-sheet" key={record.id}>
            <div className="payslip-heading">
              <div>
                <span className="eyebrow">{company}</span>
                <h2>BẢNG LƯƠNG NHÂN VIÊN</h2>
                <p>Kỳ {dateLabel(record.startDate)} – {dateLabel(record.endDate)}</p>
              </div>
              <span className="muted">Đã xác nhận tính lương</span>
            </div>
            <div className="payslip-employee">
              <p><b>Nhân viên:</b> {record.employeeName}</p>
              <p><b>Mã nhân viên:</b> {record.employeeCode}</p>
              <p><b>Ngày tính lương:</b> {dateLabel(record.calculatedAt, "HH:mm dd/MM/yyyy")}</p>
            </div>
            <dl className="detail-list">
              <div><dt>Tổng ngày / ca làm</dt><dd>{days.length} ngày · {record.shifts.length} ca</dd></div>
              <div><dt>Tổng giờ làm thực tế</dt><dd>{duration(record.minutes)}</dd></div>
              <div><dt>Đơn giá theo giờ</dt><dd>{money(record.hourlyRate)} / giờ</dd></div>
              <div><dt>Lương trước khi trừ ứng</dt><dd>{money(record.amount)}</dd></div>
              <div><dt>Tiền lương đã ứng</dt><dd>{money(record.advanceTotal ?? 0)}</dd></div>
              <div className="payslip-net"><dt>Thực nhận</dt><dd>{money(record.netAmount ?? record.amount)}</dd></div>
            </dl>
            <p className="info-note">Lương = tổng giờ thực tế × đơn giá (làm tròn đến đồng). Thực nhận = lương − tiền đã ứng.</p>
            {(record.netAmount ?? record.amount) < 0 && (
              <p className="info-note">Tiền ứng vượt lương {money(-(record.netAmount ?? record.amount))}. Số dư âm chưa tự chuyển sang kỳ sau.</p>
            )}
            <h3 className="payslip-section-title">Chi tiết từng ngày công</h3>
            <div className="table-wrap">
              <table className="compact-table payslip-days">
                <colgroup><col className="day-column" /><col className="shift-column" /><col className="hours-column" /><col className="hours-column" /><col /></colgroup>
                <thead><tr><th>Ngày làm</th><th>Giờ vào / ra</th><th>Nghỉ</th><th>Giờ thực tế</th><th>Ghi chú</th></tr></thead>
                <tbody>
                  {days.map((day) => {
                    const shifts = record.shifts.filter((shift) => shift.date === day)
                      .sort((a, b) => a.start.localeCompare(b.start));
                    return (
                      <tr key={day}>
                        <td>{dateLabel(day)}</td>
                        <td>{shifts.map((shift) => <div key={shift.id}>
                          {dateLabel(shift.start, "HH:mm")} – {dateLabel(shift.end, "HH:mm")}
                          {dateLabel(shift.end, "yyyy-MM-dd") !== day && <small>Ra ngày {dateLabel(shift.end)}</small>}
                        </div>)}</td>
                        <td>{duration(totalMinutes(shifts, "breakMinutes"))}</td>
                        <td><b>{duration(totalMinutes(shifts))}</b></td>
                        <td>{shifts.map((shift, index) => <div key={shift.id}>
                          {shifts.length > 1 && <b>Ca {index + 1}: </b>}{lunchLabel(shift)}
                          {shift.notes && <small>{shift.notes}</small>}
                          {shift.adjustmentReason && <small>Điều chỉnh: {shift.adjustmentReason}</small>}
                        </div>)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr><td colSpan={2}>Tổng {days.length} ngày · {record.shifts.length} ca</td>
                  <td>{duration(totalMinutes(record.shifts, "breakMinutes"))}</td><td>{duration(record.minutes)}</td><td>Đã trừ thời gian nghỉ</td></tr></tfoot>
              </table>
            </div>
            {!!record.advances?.length && <>
              <h3 className="payslip-section-title">Chi tiết ứng lương đã trừ</h3>
              <div className="table-wrap"><table className="compact-table payslip-advances">
                <thead><tr><th>Ngày ứng</th><th>Số tiền</th><th>Ghi chú</th></tr></thead>
                <tbody>{[...record.advances].sort((a, b) => a.date.localeCompare(b.date)).map((advance) => (
                  <tr key={advance.id}><td>{dateLabel(advance.date)}</td><td>{money(advance.amount)}</td><td>{advance.notes || "—"}</td></tr>
                ))}</tbody>
                <tfoot><tr><td>Tổng tiền ứng</td><td>{money(record.advanceTotal ?? 0)}</td><td /></tr></tfoot>
              </table></div>
            </>}
            {record.notes && <p className="info-note payslip-notes"><b>Ghi chú tính lương:</b> {record.notes}</p>}
            <div className="payslip-signatures">
              <div><b>Người lập bảng lương</b><small>(Ký, ghi rõ họ tên)</small></div>
              <div><b>Nhân viên nhận lương</b><small>(Ký, ghi rõ họ tên)</small></div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
