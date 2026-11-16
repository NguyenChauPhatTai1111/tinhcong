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
  hourlyRate: number;
  amount: number;
  notes: string;
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
  version: 2;
  employees: Employee[];
  attendance: Record<string, Attendance[]>;
  payroll: Record<string, Payroll[]>;
  settings: { theme: "light" | "dark"; company: string };
}
