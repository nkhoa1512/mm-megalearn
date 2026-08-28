import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { levelDefinition, ACCESS_STATE } from '../../data/levelSystem';
import { todayDateString, addMonths, firstOfMonth, getMonthGridWeeks, formatMonthLabel } from '../../utils/calendarDate';

/**
 * Huy hiệu cấp bậc trên thang ĐẢO NGƯỢC: Level 7 thấp nhất -> Level 1 cao nhất.
 * Màu đậm dần khi lên cấp cao (Level 1 đỏ đô, Level 7 xám nhạt).
 */
export function JobLevelBadge({ level, title, compact = false }) {
  const def = levelDefinition(level);
  return (
    <span
      title={title || def.titleVi}
      style={{
        background: def.colors.bg,
        color: def.colors.text,
        border: `1px solid ${def.colors.border}`,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {def.emoji} Level {def.level}{compact ? '' : `: ${def.shortVi}`}
    </span>
  );
}

/** Nhãn trạng thái mở khóa của một khóa học theo quy tắc học vượt cấp tuần tự. */
export function LevelAccessBadge({ access }) {
  if (!access) return null;
  // Nhãn ngắn để bảng không bị đẩy tràn ngang; mô tả đầy đủ nằm ở tooltip.
  const map = {
    [ACCESS_STATE.OPEN]: { tone: 'sage', icon: 'ti-lock-open', label: 'Đúng cấp', hint: 'Khóa ở cấp bậc của bạn hoặc thấp hơn — học ngay' },
    [ACCESS_STATE.APPROVED]: { tone: 'sage', icon: 'ti-circle-check', label: 'Đã duyệt', hint: 'Quản lý đã phê duyệt học vượt cấp cho khóa này' },
    [ACCESS_STATE.PENDING_APPROVAL]: { tone: 'amber', icon: 'ti-clock', label: 'Chờ duyệt', hint: 'Đơn xin học vượt cấp đang chờ Quản lý phê duyệt' },
    [ACCESS_STATE.REJECTED]: { tone: 'rust', icon: 'ti-x', label: 'Bị từ chối', hint: 'Quản lý đã từ chối đơn — bạn có thể gửi lại' },
    [ACCESS_STATE.REQUESTABLE]: { tone: 'blue', icon: 'ti-lock', label: 'Cần xin duyệt', hint: 'Vượt đúng 1 cấp — phải được Quản lý phê duyệt' },
    [ACCESS_STATE.LOCKED_LEVEL_GAP]: { tone: 'rust', icon: 'ti-ban', label: 'Chặn nhảy cóc', hint: 'Cách từ 2 cấp trở lên — phải leo tuần tự từng bậc' },
  };
  const cfg = map[access.state] || map[ACCESS_STATE.OPEN];
  return <span title={access.reason || cfg.hint}><Badge tone={cfg.tone} icon={cfg.icon}>{cfg.label}</Badge></span>;
}

export function Badge({ tone = 'slate', children, icon, size }) {
  return (
    <span className={`badge badge-${tone} ${size === 'sm' ? 'badge-sm' : ''}`}>
      {icon ? <i className={`ti ${icon}`} aria-hidden="true" /> : <span className="badge-dot" />}
      {children}
    </span>
  );
}

export function ProgressBar({ value, tone = 'rail', size = 'md' }) {
  const fillColor = {
    rail: 'var(--rail-gradient)',
    sage: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    amber: 'var(--gold-gradient)',
    rust: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    ai: 'var(--ai-gradient)',
    blue: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
  }[tone] || 'var(--rail-gradient)';

  const height = size === 'sm' ? 6 : size === 'lg' ? 12 : 8;

  return (
    <div className="progress-track" style={{ height }}>
      <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: fillColor }} />
    </div>
  );
}

export function StatCard({ label, value, tone, icon, trend, sublabel }) {
  const color = {
    rail: 'var(--rail)',
    sage: 'var(--sage)',
    amber: 'var(--amber)',
    rust: 'var(--rust)',
    blue: 'var(--blue)',
    ai: 'var(--ai-primary)',
    ink: 'var(--ink)',
  }[tone || 'ink'];

  return (
    <div className="stat card-interactive">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
        <div className="stat-label">{label}</div>
        {icon && (
          <div className="stat-icon-badge" style={{ background: `var(--${tone || 'rail'}-soft)`, color: `var(--${tone || 'rail'}-soft-text)` }}>
            <i className={`ti ${icon}`} aria-hidden="true" />
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div className="stat-value" style={{ color }}>{value}</div>
        {trend && (
          <span className="stat-trend" style={{ color: trend.startsWith('+') ? 'var(--sage)' : 'var(--rust)' }}>
            <i className={`ti ${trend.startsWith('+') ? 'ti-trending-up' : 'ti-trending-down'}`} /> {trend}
          </span>
        )}
      </div>
      {sublabel && <div className="stat-sublabel">{sublabel}</div>}
    </div>
  );
}

export function Button({ children, variant = 'default', size, icon, onClick, block, type = 'button', disabled = false, className = '', title }) {
  const cls = ['btn'];
  if (variant === 'primary') cls.push('btn-primary');
  if (variant === 'ghost') cls.push('btn-ghost');
  if (variant === 'danger') cls.push('btn-danger');
  if (variant === 'outline') cls.push('btn-outline');
  if (variant === 'ai') cls.push('btn-ai');
  if (variant === 'gold') cls.push('btn-gold');
  if (size === 'sm') cls.push('btn-sm');
  if (size === 'lg') cls.push('btn-lg');
  if (block) cls.push('btn-block');
  if (className) cls.push(className);
  return (
    <button type={type} className={cls.join(' ')} onClick={onClick} disabled={disabled} title={title}>
      {icon && <i className={`ti ${icon}`} aria-hidden="true" />}
      {children}
    </button>
  );
}

/**
 * Nút "..." gom các hành động phụ của 1 hàng bảng (Edit / Publish / Delete...)
 * vào 1 dropdown gọn thay vì bày hết ra thành dãy nút. Popover được portal ra
 * document.body (position: fixed, toạ độ tính từ nút bấm) để không bị cắt cụt
 * bởi các container cha có overflow (vd bảng cuộn ngang).
 */
export function ActionsMenu({ items, label = 'More actions', icon = 'ti-dots-vertical' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleClickOutside(e) {
      if (btnRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function handleDismiss() {
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [open]);

  const visibleItems = (items || []).filter(Boolean);
  if (visibleItems.length === 0) return null;

  function toggle() {
    if (!open) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="btn btn-sm btn-outline actions-menu-trigger"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
      >
        <i className={`ti ${icon}`} aria-hidden="true" />
        <span style={{ display: 'none' }} aria-hidden="true">
          {visibleItems.map((item, idx) => (
            <span key={item.key || idx}>{item.label}</span>
          ))}
        </span>
      </button>
      {open && pos && createPortal(
        <div ref={menuRef} className="actions-menu-popover" style={{ top: pos.top, right: pos.right }} role="menu">
          {visibleItems.map((item, i) => (
            <button
              key={item.key || i}
              type="button"
              role="menuitem"
              className={`actions-menu-item ${item.variant === 'danger' ? 'danger' : ''}`}
              disabled={item.disabled}
              title={item.title}
              onClick={() => { setOpen(false); item.onClick(); }}
            >
              {item.icon && <i className={`ti ${item.icon}`} aria-hidden="true" />}
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

/**
 * Lịch dạng lưới tháng dùng cho Lịch Học Tập cá nhân (mọi role). Hover 1 ô
 * ngày có sự kiện hiện tooltip xem nhanh (chỉ đọc, không click được); bấm
 * vào ô ngày mới thực sự chọn ngày đó (điều khiển bởi component cha qua
 * onSelectDate) để hiện panel chi tiết đầy đủ. Tooltip portal ra
 * document.body giống ActionsMenu ở trên, để không bị cắt bởi container cha
 * có overflow.
 */
export function MonthCalendarGrid({ viewMonth, selectedDate, eventsByDate, onSelectDate, onMonthChange, language = 'vi' }) {
  const [hoverCell, setHoverCell] = useState(null); // { date, top, left } | null

  const weeks = getMonthGridWeeks(viewMonth);
  const weekdayLabels = language === 'en'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const today = todayDateString();

  function handleMouseEnter(date, evt) {
    if (!(eventsByDate.get(date) || []).length) return;
    const rect = evt.currentTarget.getBoundingClientRect();
    setHoverCell({ date, top: rect.bottom + 4, left: rect.left });
  }

  function handleMouseLeave() {
    setHoverCell(null);
  }

  return (
    <div className="card card-pad cal-grid-card">
      <div className="cal-grid-header">
        <button type="button" className="icon-btn" onClick={() => onMonthChange(addMonths(viewMonth, -1))} aria-label="Previous month">
          <i className="ti ti-chevron-left" aria-hidden="true" />
        </button>
        <div className="cal-grid-month-label">{formatMonthLabel(viewMonth, language)}</div>
        <button type="button" className="icon-btn" onClick={() => onMonthChange(addMonths(viewMonth, 1))} aria-label="Next month">
          <i className="ti ti-chevron-right" aria-hidden="true" />
        </button>
        <Button size="sm" variant="outline" onClick={() => onMonthChange(firstOfMonth(today))}>
          {language === 'en' ? 'Today' : 'Hôm nay'}
        </Button>
      </div>

      <div className="cal-weekday-row">
        {weekdayLabels.map((wd) => <div key={wd} className="cal-weekday-cell">{wd}</div>)}
      </div>

      {weeks.map((week, weekIdx) => (
        <div className="cal-week-row" key={weekIdx}>
          {week.map((cell) => {
            const dayEvents = eventsByDate.get(cell.date) || [];
            const visibleEvents = dayEvents.slice(0, 2);
            const overflowCount = dayEvents.length - visibleEvents.length;
            const cellClasses = ['cal-cell'];
            if (!cell.inMonth) cellClasses.push('other-month');
            if (cell.date === today) cellClasses.push('today');
            if (cell.date === selectedDate) cellClasses.push('selected');

            return (
              <div
                key={cell.date}
                className={cellClasses.join(' ')}
                onClick={() => cell.inMonth && onSelectDate(cell.date)}
                onMouseEnter={(e) => cell.inMonth && handleMouseEnter(cell.date, e)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="cal-cell-daynum">{Number(cell.date.slice(8, 10))}</div>
                {visibleEvents.map((ev) => (
                  <div key={ev.id} className="cal-event-chip"><Badge tone={ev.tone} size="sm">{ev.title}</Badge></div>
                ))}
                {overflowCount > 0 && <div className="cal-event-chip-overflow">+{overflowCount}</div>}
              </div>
            );
          })}
        </div>
      ))}

      {hoverCell && createPortal(
        <div className="cal-day-tooltip" style={{ top: hoverCell.top, left: hoverCell.left }}>
          {(eventsByDate.get(hoverCell.date) || []).map((ev) => (
            <div key={ev.id} className="cal-day-tooltip-row">
              <span className="cal-day-tooltip-title">{ev.title}</span>
              <Badge tone={ev.tone} size="sm">{ev.statusLabel}</Badge>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

export function CourseTypeBadge({ courseType }) {
  return courseType === 'MANDATORY'
    ? <Badge tone="amber" icon="ti-alert-triangle">Mandatory (Compliance)</Badge>
    : <Badge tone="slate" icon="ti-book-2">Optional (Elective)</Badge>;
}


// Modal Component
export function Modal({ isOpen, onClose, title, subtitle, children, footer, size = 'md' }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal-box modal-${size}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{title}</h3>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <i className="ti ti-x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// Tabs Component
export function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="tabs-container">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <i className={`ti ${tab.icon}`} />}
            <span>{tab.label}</span>
            {tab.count != null && (
              <span className={`tab-count ${isActive ? 'active' : ''}`}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Visual QR Code Generator (SVG Simulation)
export function QRCodeView({ value, size = 160, label }) {
  return (
    <div className="qr-container" style={{ width: size + 32 }}>
      <div className="qr-box" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width="100%" height="100%" className="qr-svg">
          {/* Outer finder patterns */}
          <rect x="5" y="5" width="28" height="28" fill="#0F766E" rx="4" />
          <rect x="11" y="11" width="16" height="16" fill="#FFFFFF" rx="2" />
          <rect x="15" y="15" width="8" height="8" fill="#0F766E" rx="1" />

          <rect x="67" y="5" width="28" height="28" fill="#0F766E" rx="4" />
          <rect x="73" y="11" width="16" height="16" fill="#FFFFFF" rx="2" />
          <rect x="77" y="15" width="8" height="8" fill="#0F766E" rx="1" />

          <rect x="5" y="67" width="28" height="28" fill="#0F766E" rx="4" />
          <rect x="11" y="73" width="16" height="16" fill="#FFFFFF" rx="2" />
          <rect x="15" y="77" width="8" height="8" fill="#0F766E" rx="1" />

          {/* Matrix data cells */}
          <rect x="38" y="8" width="6" height="6" fill="#111827" rx="1" />
          <rect x="48" y="8" width="6" height="6" fill="#0F766E" rx="1" />
          <rect x="58" y="12" width="6" height="6" fill="#111827" rx="1" />

          <rect x="8" y="38" width="6" height="6" fill="#0F766E" rx="1" />
          <rect x="18" y="44" width="6" height="6" fill="#111827" rx="1" />
          <rect x="28" y="38" width="6" height="6" fill="#0F766E" rx="1" />

          {/* Center decorative logo */}
          <rect x="40" y="40" width="20" height="20" fill="#0F766E" rx="4" />
          <text x="50" y="54" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold" fontFamily="sans-serif">MM</text>

          <rect x="68" y="38" width="6" height="6" fill="#111827" rx="1" />
          <rect x="78" y="44" width="6" height="6" fill="#0F766E" rx="1" />
          <rect x="88" y="38" width="6" height="6" fill="#111827" rx="1" />

          <rect x="38" y="68" width="6" height="6" fill="#111827" rx="1" />
          <rect x="48" y="74" width="6" height="6" fill="#0F766E" rx="1" />
          <rect x="58" y="84" width="6" height="6" fill="#111827" rx="1" />
          <rect x="78" y="74" width="6" height="6" fill="#0F766E" rx="1" />
          <rect x="88" y="84" width="6" height="6" fill="#111827" rx="1" />
        </svg>
      </div>
      {label && <div className="qr-label">{label}</div>}
      <div className="qr-value-code">{value}</div>
    </div>
  );
}

// Certificate Preview Modal
export function CertificateModal({ certificate, isOpen, onClose }) {
  if (!isOpen || !certificate) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xác thực & Tải Chứng chỉ Điện tử"
      subtitle={`Mã chứng chỉ: ${certificate.id}`}
      size="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            <i className="ti ti-shield-check" style={{ color: 'var(--sage)', marginRight: 4 }} />
            Official Digital Certificate &middot; Verified via MMVN Enterprise Security
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="outline" icon="ti-printer" onClick={() => window.print()}>Print Certificate</Button>
            <Button variant="primary" icon="ti-download" onClick={onClose}>Download PDF</Button>
          </div>
        </div>
      }
    >
      <div className="cert-frame">
        <div className="cert-border">
          <div className="cert-header">
            <div className="cert-logo-box">
              <div className="brand-mark" style={{ width: 44, height: 44, fontSize: 22 }}>MM</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--rail)', letterSpacing: '0.05em' }}>MM MEGA MARKET VIETNAM</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Learning &amp; Organizational Development</div>
              </div>
            </div>
            <div className="cert-gold-badge">
              <i className="ti ti-rosette" />
              <span>CERTIFIED</span>
            </div>
          </div>

          <div className="cert-body">
            <div className="cert-title-eng">CERTIFICATE OF COMPLETION</div>
            <div className="cert-presented">This is to certify that:</div>
            <div className="cert-recipient">{certificate.recipientName || 'Minh Tran'}</div>
            <div className="cert-details">
              Role: <strong>{certificate.recipientPosition || 'Bakery Associate'}</strong> &middot; Department: <strong>{certificate.department || 'OMD / Processed Fresh Food'}</strong>
            </div>
            <div className="cert-course-name">{certificate.courseName}</div>
            <div className="cert-score-text">
              Has successfully completed the prescribed curriculum and demonstrated professional competency with an assessment score of <strong>{certificate.score || 95}%</strong>.
            </div>
          </div>

          <div className="cert-footer">
            <div className="cert-sign-col">
              <div className="cert-sign-line" />
              <div className="cert-sign-title">Head of Learning &amp; Org Development</div>
              <div className="cert-sign-org">MM Mega Market Vietnam</div>
            </div>

            <div className="cert-qr-col">
              <QRCodeView value={certificate.id} size={70} />
              <div style={{ fontSize: 9.5, color: 'var(--ink-faint)', marginTop: 4 }}>Scan QR code to verify authenticity</div>
            </div>

            <div className="cert-seal-col">
              <div className="cert-seal">
                <i className="ti ti-award" />
                <span>OFFICIAL SEAL</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
                Issued: {certificate.issueDate}<br />
                {certificate.validUntil && <span style={{ color: 'var(--amber-soft-text)' }}>Recertification due: {certificate.validUntil}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// 5 định dạng bài giảng chuẩn hóa: SCORM, VIDEO, PDF, PPT, EXTERNAL_LINK
// (Udemy/LinkedIn Learning/Coursera/YouTube/Khác) — ASSESSMENT là cổng thẩm
// định năng lực riêng, tách biệt khỏi 5 định dạng nội dung bài giảng.
const LESSON_ICON = {
  SCORM: 'ti-package',
  VIDEO: 'ti-video',
  PDF: 'ti-file-text',
  PPT: 'ti-presentation',
  EXTERNAL_LINK: 'ti-external-link',
  ASSESSMENT: 'ti-writing',
};

const LESSON_STATUS_META = {
  COMPLETED: { tone: 'sage', label: 'Completed' },
  IN_PROGRESS: { tone: 'amber', label: null },
  NOT_STARTED: { tone: 'slate', label: 'Not started' },
  LOCKED: { tone: 'slate', label: 'Locked' },
};

// Renders a course's module/lesson syllabus (COURSE -> COURSE_MODULE -> COURSE_LESSON).
// Replaces the old level-ladder progression model: modules aren't gated by manager
// approval, they're a syllabus whose lessons complete per their own content rule.
// `getLessonHref(lesson)` returns a URL to open the lesson player, or null/undefined
// to render it as a plain (non-clickable) row — e.g. ASSESSMENT lessons, which are
// opened from the dedicated assessment card instead.
export function ModuleList({ modules, disabled, getLessonHref }) {
  return (
    <div className="module-list">
      {modules.map((m, idx) => (
        <div className="module-block" key={m.id}>
          <div className="module-header">
            <span className="module-number">{idx + 1}</span>
            <span className="module-title">{m.title}</span>
          </div>
          <div className="module-lessons">
            {m.lessons.map((l) => {
              const href = !disabled && getLessonHref ? getLessonHref(l) : null;
              const row = <LessonRow lesson={l} disabled={disabled} />;
              return href ? <Link key={l.id} to={href} className="lesson-link">{row}</Link> : <div key={l.id}>{row}</div>;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LessonRow({ lesson, disabled }) {
  const meta = LESSON_STATUS_META[disabled ? 'LOCKED' : lesson.status] || LESSON_STATUS_META.NOT_STARTED;
  const label = meta.label || `${lesson.progressPercent || 0}% complete`;
  return (
    <div className="activity-row">
      <div className="activity-icon" style={{
        background: meta.tone === 'sage' ? 'var(--sage-soft)' : meta.tone === 'amber' ? 'var(--amber-soft)' : 'var(--slate-soft)',
        color: meta.tone === 'sage' ? 'var(--sage-soft-text)' : meta.tone === 'amber' ? 'var(--amber-soft-text)' : 'var(--slate-soft-text)',
      }}>
        <i className={`ti ${LESSON_ICON[lesson.lessonType] || 'ti-file'}`} aria-hidden="true" />
      </div>
      <div style={{ flex: 1 }}>
        <div className="activity-title">{lesson.title}</div>
        <div className="activity-meta">
          {lessonTypeLabel(lesson.lessonType)} {lesson.isRequired ? '· Required' : '· Optional'}
        </div>
      </div>
      <Badge tone={meta.tone}>{label}</Badge>
    </div>
  );
}

function lessonTypeLabel(type) {
  return { SCORM: 'SCORM', VIDEO: 'Video', PDF: 'PDF', PPT: 'PPT', EXTERNAL_LINK: 'External Link', ASSESSMENT: 'Assessment' }[type] || type;
}

const TONE_COLOR = {
  rail: 'var(--rail)', sage: 'var(--sage)', amber: 'var(--amber)', rust: 'var(--rust)', slate: 'var(--slate)',
};

// Horizontal magnitude bar chart: one measure across categories, single hue.
// Every bar is directly value-labeled at its tip, so no axis/gridlines are needed
// (marks-and-anatomy.md: ticks are only required when values aren't all labeled).
export function BarChart({ data, valueSuffix = '', tone = 'rail' }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="barchart">
      {data.map((d) => (
        <div className="barchart-row" key={d.label} title={d.detail || `${d.label}: ${d.value}${valueSuffix}`}>
          <div className="barchart-label">{d.label}</div>
          <div className="barchart-track">
            <div className="barchart-fill" style={{ width: `${Math.max(2, Math.round((d.value / max) * 100))}%`, background: TONE_COLOR[d.tone || tone] }} />
          </div>
          <div className="barchart-value">{d.value}{valueSuffix}</div>
        </div>
      ))}
    </div>
  );
}

const STATUS_TONE = { NOT_STARTED: 'slate', IN_PROGRESS: 'amber', COMPLETED: 'sage', OVERDUE: 'rust', FAILED: 'rust' };
const STATUS_LABEL = { NOT_STARTED: 'Not started', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', OVERDUE: 'Overdue', FAILED: 'Failed' };

// Single segmented bar showing a status breakdown (section 26 statuses). Status
// color is reserved and always paired with an icon+label in the legend below it,
// never color alone — each segment also carries a native hover tooltip.
export function StatusStackedBar({ segments }) {
  const visible = segments.filter((s) => s.value > 0);
  const total = visible.reduce((s, seg) => s + seg.value, 0) || 1;
  return (
    <div>
      <div className="stackedbar">
        {visible.map((seg) => (
          <div
            key={seg.status}
            className="stackedbar-seg"
            style={{ width: `${(seg.value / total) * 100}%`, background: TONE_COLOR[STATUS_TONE[seg.status]] }}
            title={`${STATUS_LABEL[seg.status]}: ${seg.value} (${Math.round((seg.value / total) * 100)}%)`}
          />
        ))}
      </div>
      <div className="stackedbar-legend">
        {visible.map((seg) => (
          <span className="stackedbar-legend-item" key={seg.status}>
            <span className="stackedbar-dot" style={{ background: TONE_COLOR[STATUS_TONE[seg.status]] }} />
            {STATUS_LABEL[seg.status]} &middot; {seg.value}
          </span>
        ))}
      </div>
    </div>
  );
}

const CHART_W = 560;
const CHART_H = 200;
const CHART_PAD = 28;

// Single-series trend line (one hue, per choosing-a-form.md: "trend over time ->
// line"). A single series needs no legend box; the end point carries the value
// per marks-and-anatomy.md ("Lines -> value at the end"), gridlines stay hairline
// and recessive, and every point gets a native hover tooltip.
export function LineChart({ data, valueSuffix = '', tone = 'rail' }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const innerW = CHART_W - CHART_PAD * 2;
  const innerH = CHART_H - CHART_PAD * 2;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: CHART_PAD + i * stepX,
    y: CHART_PAD + innerH - (d.value / max) * innerH,
    ...d,
  }));
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="linechart" role="img" aria-label="Trend line chart">
      {gridLines.map((g) => (
        <line key={g} x1={CHART_PAD} x2={CHART_W - CHART_PAD} y1={CHART_PAD + innerH * g} y2={CHART_PAD + innerH * g} className="linechart-grid" />
      ))}
      <path d={path} fill="none" stroke={TONE_COLOR[tone]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p) => (
        <circle key={p.label} cx={p.x} cy={p.y} r="5" fill="var(--paper-raised)" stroke={TONE_COLOR[tone]} strokeWidth="2">
          <title>{`${p.label}: ${p.value}${valueSuffix}`}</title>
        </circle>
      ))}
      {points.map((p) => (
        <text key={`x-${p.label}`} x={p.x} y={CHART_H - 6} textAnchor="middle" className="linechart-axis-label">{p.label}</text>
      ))}
      <text x={points[points.length - 1].x} y={points[points.length - 1].y - 12} textAnchor="middle" className="linechart-value-label">
        {points[points.length - 1].value}{valueSuffix}
      </text>
    </svg>
  );
}

// Part-to-whole proportion, capped at a handful of slices (choosing-a-form.md
// caps categorical treatments at 4 before a legend becomes mandatory) — each
// slice is both legend-labeled and directly value-labeled, never color alone.
export function DonutChart({ data, valueSuffix = '' }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = 60;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;
  const gapDeg = 2;
  let cumulative = 0;

  return (
    <div className="donutchart">
      <svg viewBox="0 0 160 160" width="160" height="160" role="img" aria-label="Proportion donut chart">
        <g transform="rotate(-90 80 80)">
          {data.map((d) => {
            const fraction = d.value / total;
            const dash = Math.max(0, fraction * circumference - gapDeg);
            const offset = -((cumulative / total) * circumference);
            cumulative += d.value;
            return (
              <circle
                key={d.label}
                cx="80" cy="80" r={radius}
                fill="none"
                stroke={TONE_COLOR[d.tone || 'rail']}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
              >
                <title>{`${d.label}: ${d.value}${valueSuffix} (${Math.round(fraction * 100)}%)`}</title>
              </circle>
            );
          })}
        </g>
        <text x="80" y="76" textAnchor="middle" className="donutchart-total">{total}</text>
        <text x="80" y="92" textAnchor="middle" className="donutchart-total-label">total</text>
      </svg>
      <div className="donutchart-legend">
        {data.map((d) => (
          <span className="stackedbar-legend-item" key={d.label}>
            <span className="stackedbar-dot" style={{ background: TONE_COLOR[d.tone || 'rail'] }} />
            {d.label} &middot; {d.value}{valueSuffix} ({Math.round((d.value / total) * 100)}%)
          </span>
        ))}
      </div>
    </div>
  );
}
