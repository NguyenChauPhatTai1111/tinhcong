import { ArrowRight, LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import {
  outstandingPayrollBefore,
  payrollMonthLabel,
} from "../../services/monthlyPayrollGate";
import { duration } from "../../utils/format";
import { Button } from "./UI";
export function MonthlyPayrollNotice({
  targetMonth,
  onResolve,
  compact = false,
}: {
  targetMonth: string;
  onResolve?: () => void;
  compact?: boolean;
}) {
  const { data, setMonth } = useApp(),
    navigate = useNavigate();
  const pending = outstandingPayrollBefore(data, targetMonth);
  if (!pending.length) return null;
  const earliest = pending[0],
    employees = new Set(pending.flatMap((p) => p.employeeIds)).size,
    minutes = pending.reduce((sum, p) => sum + p.minutes, 0);
  const resolve = () => {
    onResolve?.();
    setMonth(earliest.month);
    navigate(`/tong-hop?thang=${earliest.month}`);
  };
  return (
    <section
      className={`monthly-payroll-notice ${compact ? "compact full" : ""}`}
      role="alert"
    >
      <span className="monthly-payroll-icon">
        <LockKeyhole size={22} />
      </span>
      <div>
        <h2>
          Phải tính xong lương tháng cũ trước khi chấm công tháng{" "}
          {payrollMonthLabel(targetMonth)}
        </h2>
        <p>
          Còn {employees} nhân viên với {duration(minutes)} chưa tính lương
          trong {pending.length} tháng trước. Hãy tính đầy đủ phần công còn lại,
          hệ thống sẽ tự mở lại chấm công tháng mới.
        </p>
        <div className="monthly-payroll-periods">
          {pending.map((p) => (
            <span key={p.month}>
              Tháng {payrollMonthLabel(p.month)} · {p.employeeIds.length} người
              · {duration(p.minutes)}
            </span>
          ))}
        </div>
      </div>
      <Button className="primary" onClick={resolve}>
        Tính lương tháng {payrollMonthLabel(earliest.month)}
        <ArrowRight size={16} />
      </Button>
    </section>
  );
}
