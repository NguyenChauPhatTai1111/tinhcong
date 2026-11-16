import { useState, type FormEvent } from "react";
import {
  Eye,
  Pencil,
  Plus,
  Search,
  Archive,
  Users,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import type { Employee } from "../types";
import { useApp } from "../contexts/AppContext";
import {
  Avatar,
  Badge,
  Button,
  Confirm,
  Empty,
  Field,
  Modal,
  PageHeading,
  Submit,
} from "../components/common/UI";
import { dateLabel, hours, money, today } from "../utils/format";
import { rateAt, refreshDrafts, sum } from "../utils/salaryCalculator";
import { validDate } from "../utils/timeCalculator";
export function EmployeeForm({
  employee,
  onClose,
}: {
  employee?: Employee;
  onClose: () => void;
}) {
  const { data, mutate, toast } = useApp();
  const [name, setName] = useState(employee?.name ?? ""),
    [code, setCode] = useState(
      employee?.code ??
        `NV${String(data.employees.length + 1).padStart(3, "0")}`,
    );
  const [phone, setPhone] = useState(employee?.phone ?? ""),
    [start, setStart] = useState(employee?.startDate ?? today());
  const [rate, setRate] = useState(
      employee ? rateAt(employee, today()) : 30000,
    ),
    [changeRate, setChangeRate] = useState(false),
    [effective, setEffective] = useState(today());
  const [active, setActive] = useState(employee?.active ?? true),
    [notes, setNotes] = useState(employee?.notes ?? "");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (
      !name.trim() ||
      !code.trim() ||
      !validDate(start) ||
      !Number.isSafeInteger(rate) ||
      rate < 0 ||
      ((changeRate || !employee) &&
        (!validDate(effective) || (employee && effective < start)))
    )
      return toast(
        "Kiểm tra tên, mã, ngày và mức lương nguyên không âm.",
        true,
      );
    if (
      data.employees.some(
        (p) =>
          p.id !== employee?.id &&
          p.code.toLowerCase() === code.trim().toLowerCase(),
      )
    )
      return toast("Mã nhân viên đã tồn tại.", true);
    const shifts = Object.values(data.attendance)
      .flat()
      .filter((s) => s.employeeId === employee?.id);
    if (shifts.some((s) => s.date < start))
      return toast("Ngày bắt đầu không được sau ngày đã chấm công.", true);
    let rates = employee?.rates ?? [{ effectiveFrom: start, amount: rate }];
    if (employee && changeRate)
      rates = [
        ...rates.filter((r) => r.effectiveFrom !== effective),
        { effectiveFrom: effective, amount: rate },
      ];
    if (employee && !rates.some((r) => r.effectiveFrom <= start))
      rates = [{ effectiveFrom: start, amount: rates[0].amount }, ...rates];
    const row: Employee = {
      id: employee?.id ?? crypto.randomUUID(),
      name: name.trim(),
      code: code.trim(),
      phone: phone.trim(),
      startDate: start,
      active,
      archived: employee?.archived ?? false,
      notes: notes.trim(),
      rates,
    };
    if (
      await mutate(
        (d) => {
          d.employees = employee
            ? d.employees.map((p) => (p.id === row.id ? row : p))
            : [...d.employees, row];
          return refreshDrafts(d);
        },
        employee ? "Đã cập nhật nhân viên." : "Đã thêm nhân viên.",
      )
    )
      onClose();
  }
  return (
    <Modal
      title={employee ? "Chỉnh sửa nhân viên" : "Thêm nhân viên mới"}
      subtitle="Thông tin được lưu ngay trên trình duyệt của bạn."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-body form-grid">
          <Field label="Họ và tên *" className="full">
            <input
              required
              autoFocus
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Nguyễn Văn Huy"
            />
          </Field>
          <Field label="Mã nhân viên *">
            <input
              required
              maxLength={30}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </Field>
          <Field label="Số điện thoại">
            <input
              type="tel"
              maxLength={30}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Không bắt buộc"
            />
          </Field>
          <Field label="Ngày bắt đầu *">
            <input
              type="date"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field label="Trạng thái">
            <select
              value={active ? "active" : "inactive"}
              onChange={(e) => setActive(e.target.value === "active")}
            >
              <option value="active">Đang làm việc</option>
              <option value="inactive">Đã nghỉ việc</option>
            </select>
          </Field>
          {employee && (
            <label className="check-field full">
              <input
                type="checkbox"
                checked={changeRate}
                onChange={(e) => setChangeRate(e.target.checked)}
              />{" "}
              Thiết lập mức lương mới từ ngày có hiệu lực
            </label>
          )}
          {(!employee || changeRate) && (
            <>
              <Field label="Lương theo giờ (đ) *">
                <input
                  type="number"
                  min="0"
                  max="1000000000"
                  step="1"
                  required
                  value={rate}
                  onChange={(e) => setRate(e.target.valueAsNumber)}
                />
              </Field>
              {employee && (
                <Field label="Ngày có hiệu lực *">
                  <input
                    type="date"
                    required
                    min={start}
                    value={effective}
                    onChange={(e) => setEffective(e.target.value)}
                  />
                </Field>
              )}
              <p className="info-note full">
                Mức lương áp dụng khi tạo ca theo ngày làm việc. Các ca đã lưu
                giữ nguyên đơn giá, kể cả khi chỉnh sửa giờ.
              </p>
            </>
          )}
          <Field label="Ghi chú" className="full">
            <textarea
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Thêm ghi chú về nhân viên…"
            />
          </Field>
        </div>
        <footer>
          <Button onClick={onClose}>Hủy</Button>
          <Submit>Lưu nhân viên</Submit>
        </footer>
      </form>
    </Modal>
  );
}
export default function Employees() {
  const { data, mutate } = useApp(),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all");
  const [form, setForm] = useState<Employee | "new" | null>(null),
    [detail, setDetail] = useState<Employee | null>(null),
    [archive, setArchive] = useState<Employee | null>(null);
  const visible = data.employees.filter((e) => !e.archived),
    rows = visible.filter(
      (e) =>
        `${e.name} ${e.code}`
          .toLocaleLowerCase("vi")
          .includes(search.toLocaleLowerCase("vi")) &&
        (status === "all" || e.active === (status === "active")),
    );
  const stats = [
    {
      name: "Tổng nhân viên",
      value: visible.length,
      icon: Users,
      tone: "blue",
    },
    {
      name: "Đang làm việc",
      value: visible.filter((e) => e.active).length,
      icon: UserCheck,
      tone: "green",
    },
    {
      name: "Đã nghỉ việc",
      value: visible.filter((e) => !e.active).length,
      icon: UserX,
      tone: "orange",
    },
  ];
  return (
    <>
      <PageHeading
        title="Quản lý nhân viên"
        description="Một nơi để quản lý đội ngũ và thông tin lương của bạn."
      >
        <Button className="primary" onClick={() => setForm("new")}>
          <Plus size={18} /> Thêm nhân viên
        </Button>
      </PageHeading>
      <div className="mini-stats">
        {stats.map((s) => (
          <div className="card mini-stat" key={s.name}>
            <span className={`stat-icon ${s.tone}`}>
              <s.icon size={21} />
            </span>
            <div>
              <p>{s.name}</p>
              <strong>{s.value}</strong>
            </div>
          </div>
        ))}
      </div>
      <section className="card">
        <div className="section-heading">
          <div>
            <h2>
              Danh sách nhân viên{" "}
              <span className="count">{visible.length}</span>
            </h2>
            <p>Thông tin đội ngũ, luôn được cập nhật.</p>
          </div>
        </div>
        <div className="table-toolbar">
          <label className="search">
            <Search size={18} />
            <input
              aria-label="Tìm nhân viên"
              placeholder="Tìm theo tên, mã nhân viên…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button aria-label="Xóa tìm kiếm" onClick={() => setSearch("")}>
                <X size={15} />
              </button>
            )}
          </label>
          <select
            aria-label="Lọc trạng thái"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang làm việc</option>
            <option value="inactive">Đã nghỉ việc</option>
          </select>
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Liên hệ</th>
                  <th>Lương theo giờ</th>
                  <th>Ngày bắt đầu</th>
                  <th>Trạng thái</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {rows.map((e, i) => (
                  <tr key={e.id}>
                    <td data-label="Nhân viên">
                      <div className="person">
                        <Avatar name={e.name} index={i} />
                        <div>
                          <strong>{e.name}</strong>
                          <small>{e.code}</small>
                        </div>
                      </div>
                    </td>
                    <td data-label="Liên hệ">{e.phone || "—"}</td>
                    <td data-label="Lương theo giờ" className="semibold">
                      {money(rateAt(e, today()))}
                      <small className="muted inline"> / giờ</small>
                    </td>
                    <td data-label="Ngày bắt đầu">{dateLabel(e.startDate)}</td>
                    <td data-label="Trạng thái">
                      <button
                        className="badge-button"
                        title="Bấm để đổi trạng thái"
                        onClick={() =>
                          mutate((d) => {
                            d.employees = d.employees.map((p) =>
                              p.id === e.id ? { ...p, active: !p.active } : p,
                            );
                            return d;
                          }, "Đã cập nhật trạng thái.")
                        }
                      >
                        <Badge tone={e.active ? "green" : "gray"}>
                          {e.active ? "Đang làm việc" : "Đã nghỉ việc"}
                        </Badge>
                      </button>
                    </td>
                    <td className="actions">
                      <button
                        className="icon-btn"
                        aria-label={`Chi tiết ${e.name}`}
                        onClick={() => setDetail(e)}
                      >
                        <Eye size={17} />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label={`Sửa ${e.name}`}
                        onClick={() => setForm(e)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-btn red"
                        aria-label={`Lưu trữ ${e.name}`}
                        onClick={() => setArchive(e)}
                      >
                        <Archive size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={
              search
                ? "Không tìm thấy nhân viên"
                : "Bắt đầu với nhân viên đầu tiên"
            }
            description="Thêm nhân viên và thiết lập mức lương theo giờ để bắt đầu chấm công."
            action={
              <Button className="primary" onClick={() => setForm("new")}>
                <Plus size={17} /> Thêm nhân viên
              </Button>
            }
          />
        )}
        <div className="table-footer">
          Hiển thị {rows.length} / {visible.length} nhân viên
          <span>Nhấn trạng thái để bật / tắt làm việc</span>
        </div>
      </section>
      {data.employees.some((e) => e.archived) && (
        <section className="card archive-section">
          <h3>Nhân viên đã lưu trữ</h3>
          <p className="muted">Hồ sơ và lịch sử lương vẫn được bảo toàn.</p>
          {data.employees
            .filter((e) => e.archived)
            .map((e) => (
              <div className="archive-row" key={e.id}>
                <span>
                  {e.name} <small className="muted">· {e.code}</small>
                </span>
                <Button
                  onClick={() =>
                    mutate((d) => {
                      d.employees = d.employees.map((p) =>
                        p.id === e.id
                          ? { ...p, archived: false, active: true }
                          : p,
                      );
                      return d;
                    }, "Đã khôi phục nhân viên.")
                  }
                >
                  Khôi phục
                </Button>
              </div>
            ))}
        </section>
      )}
      {form && (
        <EmployeeForm
          employee={form === "new" ? undefined : form}
          onClose={() => setForm(null)}
        />
      )}{" "}
      {archive && (
        <Confirm
          title="Lưu trữ nhân viên?"
          label="Lưu trữ nhân viên"
          danger
          onClose={() => setArchive(null)}
          onConfirm={async () => {
            if (
              await mutate((d) => {
                d.employees = d.employees.map((e) =>
                  e.id === archive.id
                    ? { ...e, archived: true, active: false }
                    : e,
                );
                return d;
              }, "Đã lưu trữ nhân viên, giữ nguyên lịch sử.")
            )
              setArchive(null);
          }}
        >
          Nhân viên {archive.name} sẽ ngừng xuất hiện trong danh sách chấm công
          mới. Toàn bộ dữ liệu chấm công và bảng lương liên quan được giữ lại.
          Bạn có thể khôi phục hồ sơ sau.
        </Confirm>
      )}
      {detail && (
        <Modal title="Chi tiết nhân viên" onClose={() => setDetail(null)}>
          <div className="modal-body">
            <div className="person large">
              <Avatar name={detail.name} />
              <div>
                <h2>{detail.name}</h2>
                <p>{detail.code}</p>
              </div>
            </div>
            <dl className="detail-list">
              <div>
                <dt>Số điện thoại</dt>
                <dd>{detail.phone || "Chưa cập nhật"}</dd>
              </div>
              <div>
                <dt>Ngày bắt đầu</dt>
                <dd>{dateLabel(detail.startDate)}</dd>
              </div>
              <div>
                <dt>Trạng thái</dt>
                <dd>{detail.active ? "Đang làm việc" : "Đã nghỉ việc"}</dd>
              </div>
              <div>
                <dt>Tổng giờ làm mọi kỳ</dt>
                <dd>
                  {hours(
                    sum(
                      Object.values(data.attendance)
                        .flat()
                        .filter((s) => s.employeeId === detail.id),
                      (s) => s.actualMinutes,
                    ),
                  )}
                </dd>
              </div>
            </dl>
            <h3>Lịch sử đơn giá</h3>
            <div className="rate-history">
              {[...detail.rates]
                .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
                .map((r) => (
                  <div key={r.effectiveFrom}>
                    <span>Từ {dateLabel(r.effectiveFrom)}</span>
                    <strong>{money(r.amount)} / giờ</strong>
                  </div>
                ))}
            </div>
            {detail.notes && <p className="info-note">{detail.notes}</p>}
          </div>
          <footer>
            <Button onClick={() => setDetail(null)}>Đóng</Button>
            <Button
              className="primary"
              onClick={() => {
                setForm(detail);
                setDetail(null);
              }}
            >
              <Pencil size={16} /> Chỉnh sửa
            </Button>
          </footer>
        </Modal>
      )}
    </>
  );
}
