import type { Payroll } from "../types";
export function payrollCSV(rows: Payroll[]) {
  const escape = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replaceAll('"', '""')}"`;
  };
  const content: unknown[][] = [
    [
      "Kỳ lương",
      "Mã nhân viên",
      "Họ và tên",
      "Số phút",
      "Số giờ",
      "Lương ca",
      "Thưởng",
      "Phụ cấp",
      "Khấu trừ",
      "Thực nhận",
      "Chốt lương",
      "Thanh toán",
      "Ngày thanh toán",
      "Ghi chú",
    ],
    ...rows.map((p) => [
      p.month,
      p.employeeCode,
      p.employeeName,
      p.minutes,
      p.minutes / 60,
      p.base,
      p.bonus,
      p.allowance,
      p.deduction,
      p.total,
      p.confirmed ? "Đã chốt" : "Bản nháp",
      p.paid ? "Đã thanh toán" : "Chưa thanh toán",
      p.paidAt ?? "",
      p.notes,
    ]),
  ];
  return (
    "\uFEFF" + content.map((row) => row.map(escape).join(",")).join("\r\n")
  );
}
