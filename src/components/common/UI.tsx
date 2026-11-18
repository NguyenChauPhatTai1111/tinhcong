import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LoaderCircle,
  X,
} from "lucide-react";
import { addMonths, format, parseISO } from "date-fns";
import { useApp } from "../../contexts/AppContext";
import { monthLabel } from "../../utils/format";
export function Button({
  children,
  onClick,
  className = "",
  type = "button",
  disabled = false,
  loading = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn ${className}`}
    >
      {loading && <LoaderCircle size={17} className="spin" />}
      {children}
    </button>
  );
}
export function Submit({
  children,
  disabled = false,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  const { saving } = useApp();
  return (
    <button type="submit" className="btn primary" disabled={saving || disabled}>
      {saving && <LoaderCircle size={17} className="spin" />}
      {children}
    </button>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    titleId = useId();
  useEffect(() => {
    const d = ref.current!;
    const previous = document.activeElement as HTMLElement;
    d.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      d.close();
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`modal ${wide ? "wide" : ""} ${className}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <header>
        <div>
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        <button className="icon-btn" aria-label="Đóng" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Confirm({
  title,
  children,
  onConfirm,
  onClose,
  label = "Xác nhận",
  danger = false,
}: {
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
  label?: string;
  danger?: boolean;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="modal-body">
        <p>{children}</p>
      </div>
      <footer>
        <Button onClick={onClose}>Hủy</Button>
        <Button className={danger ? "danger" : "primary"} onClick={onConfirm}>
          {label}
        </Button>
      </footer>
    </Modal>
  );
}
export function MonthPicker() {
  const { month, setMonth } = useApp();
  const move = (amount: number) =>
    setMonth(format(addMonths(parseISO(`${month}-01`), amount), "yyyy-MM"));
  return (
    <div className="month-picker">
      <button aria-label="Tháng trước" onClick={() => move(-1)}>
        <ChevronLeft size={16} />
      </button>
      <label>
        <CalendarDays size={17} />
        <span>{monthLabel(month)}</span>
        <input
          aria-label="Chọn tháng và năm"
          type="month"
          value={month}
          min="1900-01"
          max="9999-12"
          onChange={(e) => {
            if (e.target.validity.valid && e.target.value)
              setMonth(e.target.value);
          }}
        />
      </label>
      <button aria-label="Tháng sau" onClick={() => move(1)}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Empty({
  title = "Chưa có dữ liệu",
  description = "Dữ liệu sẽ xuất hiện tại đây sau khi bạn bắt đầu.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Inbox size={27} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Avatar({ name, index = 0 }: { name: string; index?: number }) {
  return (
    <span className={`avatar color-${index % 5}`}>
      {name
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()}
    </span>
  );
}
export function Badge({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: "blue" | "green" | "gray" | "orange";
}) {
  return (
    <span className={`badge ${tone}`}>
      <i />
      {children}
    </span>
  );
}
export function Field({
  label,
  children,
  hint,
  className = "",
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}</label>
      {isValidElement(children)
        ? cloneElement(
            children as ReactElement<{
              id?: string;
              "aria-describedby"?: string;
            }>,
            { id, "aria-describedby": hint ? `${id}-hint` : undefined },
          )
        : children}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
