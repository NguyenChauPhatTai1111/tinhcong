import { format, getDaysInMonth, isValid, parseISO } from "date-fns";
export const money = (value: number) =>
  `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)}đ`;
export const number = (value: number) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
export const hours = (minutes: number) => `${number(minutes / 60)} giờ`;
export const duration = (minutes: number) =>
  `${Math.floor(minutes / 60)} giờ${minutes % 60 ? ` ${minutes % 60} phút` : ""}`;
export const today = () => format(new Date(), "yyyy-MM-dd");
export const currentMonth = () => format(new Date(), "yyyy-MM");
export const dateLabel = (date: string, pattern = "dd/MM/yyyy") =>
  isValid(parseISO(date)) ? format(parseISO(date), pattern) : "—";
export const monthLabel = (month: string) =>
  `Tháng ${Number(month.slice(5))}, ${month.slice(0, 4)}`;
export const monthDays = (month: string) =>
  getDaysInMonth(parseISO(`${month}-01`));
export function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
