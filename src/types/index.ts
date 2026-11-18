export interface Rate {
  effectiveFrom: string;
  amount: number;
}
export interface Employee {
  id: string;
  name: string;
  code: string;
  phone: string;
  startDate: string;
  active: boolean;
  archived: boolean;
  notes: string;
  /** Archived rates from earlier versions; not used for hours tracking. */
  rates: Rate[];
}
export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  start: string;
  end: string;
  breakMinutes: number;
  actualMinutes: number;
  adjustmentReason: string;
  /** Archived financial metadata; new hours-only records use zero. Never used to total hours. */
  hourlyRate: number;
  amount: number;
  notes: string;
  breakKind?: "lunch" | "other";
}
export interface Payroll {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  month: string;
  shifts: Attendance[];
  minutes: number;
  base: number;
  bonus: number;
  allowance: number;
  deduction: number;
  notes: string;
  total: number;
  confirmed: boolean;
  confirmedAt: string | null;
  paid: boolean;
  paidAt: string | null;
}
export interface AppData {
  version: 4;
  employees: Employee[];
  attendance: Record<string, Attendance[]>;
  payroll: Record<string, Payroll[]>;
  wageCalculations: WageCalculation[];
  settings: { theme: "light" | "dark"; company: string };
}
export interface WageCalculation {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  startDate: string;
  endDate: string;
  shifts: Attendance[];
  minutes: number;
  hourlyRate: number;
  amount: number;
  notes: string;
  calculatedAt: string;
}
