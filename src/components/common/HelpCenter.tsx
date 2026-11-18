import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Search,
  X,
} from "lucide-react";
import { useHelp } from "../../contexts/HelpContext";
import {
  guideTopics,
  searchGuide,
  topicForPath,
} from "../../constants/userGuide";
import { Button, Empty, Modal } from "./UI";
export function HelpCenter() {
  const { topic, openHelp, closeHelp } = useHelp(),
    { pathname } = useLocation();
  return (
    <>
      <button
        className={`help-launcher ${pathname === "/dang-nhap" ? "auth-help-launcher" : ""}`}
        onClick={() => openHelp(topicForPath(pathname))}
        aria-haspopup="dialog"
      >
        <CircleHelp size={21} />
        <span>Hướng dẫn sử dụng</span>
      </button>
      {topic && <GuidePopup key={pathname} onClose={closeHelp} />}
    </>
  );
}
function GuidePopup({ onClose }: { onClose: () => void }) {
  const { topic, openHelp } = useHelp(),
    [query, setQuery] = useState(""),
    content = useRef<HTMLDivElement>(null);
  const normalized = searchGuide(query),
    filtered = guideTopics.filter((t) =>
      searchGuide(
        [
          t.title,
          t.description,
          ...t.steps.flatMap((s) => [s.title, s.text]),
          ...(t.notes ?? []),
          ...(t.faqs?.flatMap((f) => [f.question, f.answer]) ?? []),
        ].join(" "),
      ).includes(normalized),
    );
  const selected = filtered.find((t) => t.id === topic) ?? filtered[0];
  const index = selected
    ? guideTopics.findIndex((t) => t.id === selected.id)
    : -1;
  useEffect(() => {
    content.current?.scrollTo({ top: 0 });
  }, [selected?.id]);
  const choose = (id: (typeof guideTopics)[number]["id"]) => {
    setQuery("");
    openHelp(id);
  };
  return (
    <Modal
      title="Hướng dẫn sử dụng"
      subtitle="Chọn mục bạn cần, làm theo từng bước ngay bên dưới."
      onClose={onClose}
      wide
      className="help-modal"
    >
      <div
        className="help-main"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <aside className="help-sidebar">
          <label className="help-search">
            <Search size={17} />
            <input
              type="search"
              aria-label="Tìm trong hướng dẫn"
              placeholder="Tìm cách sử dụng…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                aria-label="Xóa tìm kiếm hướng dẫn"
                onClick={() => setQuery("")}
              >
                <X size={15} />
              </button>
            )}
          </label>
          <nav aria-label="Chủ đề hướng dẫn">
            {filtered.map((t) => (
              <button
                key={t.id}
                aria-pressed={selected?.id === t.id}
                className={selected?.id === t.id ? "selected" : ""}
                onClick={() => choose(t.id)}
              >
                <t.icon size={18} />
                <span>{t.title}</span>
                <ChevronRight size={14} />
              </button>
            ))}
          </nav>
          <p className="help-sidebar-note">
            <BookOpen size={15} /> Có thể mở lại hướng dẫn ở mọi trang.
          </p>
        </aside>
        <div className="help-content" ref={content}>
          {selected ? (
            <article>
              <div className="help-topic-heading">
                <span className="help-topic-icon">
                  <selected.icon size={25} />
                </span>
                <div>
                  <span className="eyebrow">HƯỚNG DẪN TỪNG BƯỚC</span>
                  <h2>{selected.title}</h2>
                </div>
              </div>
              <p className="help-intro">{selected.description}</p>
              {selected.steps.length > 0 && (
                <ol className="help-steps">
                  {selected.steps.map((step, i) => (
                    <li key={step.title}>
                      <span>{i + 1}</span>
                      <div>
                        <h3>{step.title}</h3>
                        <p>{step.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {selected.example && (
                <section className="help-example">
                  <h3>Ví dụ minh họa · {selected.example.title}</h3>
                  <dl>
                    {selected.example.rows.map(([label, result]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{result}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
              {selected.notes && (
                <section className="help-notes">
                  <h3>Cần nhớ</h3>
                  {selected.notes.map((note) => (
                    <p key={note}>
                      <Check size={16} />
                      <span>{note}</span>
                    </p>
                  ))}
                </section>
              )}
              {selected.faqs && (
                <div className="help-faq">
                  {selected.faqs.map((f) => (
                    <details key={f.question}>
                      <summary>{f.question}</summary>
                      <p>{f.answer}</p>
                    </details>
                  ))}
                </div>
              )}
              {selected.action && (
                <Link
                  className="btn primary help-page-link"
                  to={selected.action.path}
                  onClick={onClose}
                >
                  {selected.action.label}
                  <ArrowRight size={17} />
                </Link>
              )}
            </article>
          ) : (
            <Empty
              title="Không tìm thấy hướng dẫn"
              description="Thử từ khóa khác như chấm công, nghỉ trưa, tính lương hoặc sao lưu."
              action={
                <Button onClick={() => setQuery("")}>Xem tất cả chủ đề</Button>
              }
            />
          )}
        </div>
      </div>
      <footer className="help-footer">
        <span>
          {index >= 0
            ? `Chủ đề ${index + 1} / ${guideTopics.length}`
            : "Hướng dẫn Công Việt"}
        </span>
        <div>
          <Button
            disabled={index <= 0}
            onClick={() => choose(guideTopics[index - 1].id)}
          >
            <ChevronLeft size={16} /> Trước
          </Button>
          <Button
            disabled={index < 0 || index >= guideTopics.length - 1}
            onClick={() => choose(guideTopics[index + 1].id)}
          >
            Tiếp <ChevronRight size={16} />
          </Button>
          <Button className="primary" onClick={onClose}>
            Đã hiểu
          </Button>
        </div>
      </footer>
    </Modal>
  );
}
