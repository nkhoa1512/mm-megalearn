import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { levelDefinition, ACCESS_STATE } from '../../data/levelSystem';
import { todayDateString, addMonths, firstOfMonth, getMonthGridWeeks, formatMonthLabel } from '../../utils/calendarDate';

/**
 * Job level badge on the INVERTED scale: Level 7 lowest -> Level 1 highest.
 * The color deepens with seniority (Level 1 deep red, Level 7 light grey).
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

/** Unlock status label for a course under the sequential level skip rule. */
export function LevelAccessBadge({ access }) {
  if (!access) return null;
  // A short label so the table does not overflow horizontally; the full description sits in the tooltip.
  const map = {
    [ACCESS_STATE.OPEN]: { tone: 'sage', icon: 'ti-lock-open', label: 'Correct level', hint: 'At or below your level — start right away' },
    [ACCESS_STATE.APPROVED]: { tone: 'sage', icon: 'ti-circle-check', label: 'Approved', hint: 'Your manager approved the level skip for this course' },
    [ACCESS_STATE.PENDING_APPROVAL]: { tone: 'amber', icon: 'ti-clock', label: 'Pending approval', hint: 'The level skip request is awaiting manager approval' },
    [ACCESS_STATE.REJECTED]: { tone: 'rust', icon: 'ti-x', label: 'Rejected', hint: 'Your manager rejected the request — you may resubmit' },
    [ACCESS_STATE.REQUESTABLE]: { tone: 'blue', icon: 'ti-lock', label: 'Approval required', hint: 'Exactly one grade above — requires manager approval' },
    [ACCESS_STATE.LOCKED_LEVEL_GAP]: { tone: 'rust', icon: 'ti-ban', label: 'Grade skipping blocked', hint: 'Two or more grades away — you must climb one grade at a time' },
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
 * The "..." button collects a table row's secondary actions (Edit / Publish / Delete...)
 * into one compact dropdown instead of a row of buttons. The popover is portalled to
 * document.body (position: fixed, coordinates measured from the button) so it is not clipped
 * by parent containers with overflow (e.g. a horizontally scrolling table).
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
 * Month-grid calendar used by the personal Learning Calendar (every role). Hovering a
 * day cell with events shows a quick-look tooltip (read-only, not clickable); clicking
 * the day cell actually selects it (driven by the parent component through
 * onSelectDate) to show the full detail panel. The tooltip is portalled to
 * document.body like ActionsMenu above, so it is not clipped by a parent
 * container with overflow.
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
          {language === 'en' ? 'Today' : 'Today'}
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
// maxWidth overrides the size class in pixels, for the few dialogs that hold a wide table.
export function Modal({ isOpen = true, onClose, title, subtitle, children, footer, size = 'md', maxWidth }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-box modal-${size}`}
        style={maxWidth ? { maxWidth } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
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
  const tpl = certificate.template;
  const isLifetime = certificate.isLifetime || !certificate.validUntil || certificate.validityPeriodMonths === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verify & Download The MM Mega Market Digital Certificate"
      subtitle={`Certificate ID: ${certificate.id}`}
      size="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            <i className="ti ti-shield-check" style={{ color: '#16A34A', marginRight: 4 }} />
            Official Digital Certificate &middot; Verified via MMVN Enterprise Security
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="outline" icon="ti-printer" onClick={() => window.print()}>Print Certificate</Button>
            <Button variant="primary" icon="ti-download" onClick={onClose}>Download PDF (Original)</Button>
          </div>
        </div>
      }
    >
      <div className="cert-frame" style={{ padding: 6, background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', borderRadius: 12 }}>
        <div
          className="cert-border"
          style={{
            border: '3px solid #005BAA',
            padding: '28px 32px',
            background: '#ffffff',
            borderRadius: 8,
            boxShadow: 'inset 0 0 0 4px #FDB813, 0 8px 24px rgba(0,0,0,0.06)',
            position: 'relative',
          }}
        >
          {/* TOP WATERMARK & HEADER */}
          <div className="cert-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div className="cert-logo-box" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                className="brand-mark"
                style={{
                  width: 50,
                  height: 50,
                  fontSize: 22,
                  fontWeight: 900,
                  background: '#005BAA',
                  color: '#fff',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 3px 8px rgba(0,91,170,0.3)',
                }}
              >
                MM
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--blue)', letterSpacing: '0.04em' }}>MM MEGA MARKET VIETNAM</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                  Learning &amp; Organizational Development Academy
                </div>
              </div>
            </div>
            <div
              className="cert-gold-badge"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
                border: '1.5px solid #F59E0B',
                color: 'var(--amber-soft-text)',
                borderRadius: 20,
                fontWeight: 800,
                fontSize: 12,
                boxShadow: '0 2px 6px rgba(245,158,11,0.2)',
              }}
            >
              <i className="ti ti-rosette" style={{ fontSize: 16 }} />
              <span>{isLifetime ? 'LIFETIME CREDENTIAL' : 'CERTIFIED OFFICIAL'}</span>
            </div>
          </div>

          {/* MAIN CERTIFICATE BODY */}
          <div className="cert-body" style={{ textAlign: 'center', padding: '16px 0 24px' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--ink)', letterSpacing: '0.08em', marginBottom: 8 }}>
              {tpl?.nameEn || 'CERTIFICATE OF COMPLETION'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 16 }}>
              {tpl?.name || 'CERTIFICATE OF TRAINING PROGRAM COMPLETION'}
            </div>

            <div style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 8 }}>
              This certificate is proudly awarded to:
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--blue)', margin: '4px 0 8px', letterSpacing: '0.02em' }}>
              {certificate.recipientName || 'MMVN Learner'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 18 }}>
              Job title: <strong>{certificate.recipientPosition || 'Employee'}</strong> &middot; Unit: <strong>{certificate.department || 'MM Mega Market Vietnam'}</strong>
            </div>

            <div style={{ fontSize: 13, color: 'var(--ink-soft)', maxWidth: 620, margin: '0 auto 12px', lineHeight: 1.6 }}>
              Has excellently fulfilled the professional requirements and passed the competency examination for the training course:
            </div>

            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--ink)',
                background: 'var(--paper-sunken)',
                border: '1px solid #E2E8F0',
                padding: '10px 20px',
                borderRadius: 8,
                display: 'inline-block',
                marginBottom: 16,
              }}
            >
              {certificate.courseName}
            </div>

            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              Examination pass score: <strong style={{ color: '#16A34A', fontSize: 14 }}>{certificate.score || 95}%</strong> &middot; Course code: <strong style={{ fontFamily: 'monospace' }}>{certificate.courseCode}</strong>
            </div>
          </div>

          {/* FOOTER: SIGNATURE, QR VERIFICATION, OFFICIAL SEAL */}
          <div
            className="cert-footer"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr 1.2fr',
              gap: 16,
              alignItems: 'end',
              borderTop: '1px dashed #CBD5E1',
              paddingTop: 18,
              marginTop: 10,
            }}
          >
            {/* SIGNATURE COLUMN */}
            <div className="cert-sign-col" style={{ textAlign: 'left' }}>
              <div style={{ height: 40, display: 'flex', alignItems: 'flex-end', fontStyle: 'italic', fontFamily: 'cursive', fontSize: 18, color: 'var(--blue)', paddingLeft: 4 }}>
                {tpl?.signerName ? `${tpl.signerName}` : 'Bruno Jousselin'}
              </div>
              <div style={{ width: 180, height: 1.5, background: '#005BAA', margin: '4px 0 6px' }} />
              <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--ink)' }}>{tpl?.signerName || 'Bruno Jousselin'}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{tpl?.signerTitle || 'Managing Director & Country CEO'}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{tpl?.issuerOrg || 'MM Mega Market Vietnam'}</div>
            </div>

            {/* QR CODE VERIFICATION COLUMN */}
            <div className="cert-qr-col" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <QRCodeView value={certificate.id} size={64} />
              <div style={{ fontSize: 10, color: 'var(--ink-soft)', marginTop: 4, fontFamily: 'monospace' }}>{certificate.id}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>Scan the QR code to verify integrity</div>
            </div>

            {/* SEAL & EXPIRATION COLUMN */}
            <div className="cert-seal-col" style={{ textAlign: 'right' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  background: 'var(--sage-soft)',
                  border: '1px solid #BBF7D0',
                  borderRadius: 6,
                  color: 'var(--sage-soft-text)',
                  fontWeight: 700,
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                <i className="ti ti-award" />
                <span>OFFICIAL MMVN SEAL</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                Issued on: <strong>{certificate.issueDate || certificate.completionDate}</strong>
              </div>
              <div style={{ fontSize: 12, marginTop: 3 }}>
                {isLifetime ? (
                  <span style={{ color: '#16A34A', fontWeight: 800 }}>Validity: Lifetime</span>
                ) : (
                  <span style={{ color: '#D97706', fontWeight: 700 }}>Recertification due: <strong>{certificate.validUntil}</strong></span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// The "Certificate Template" picker shared by Course Builder & Curriculum Editor
export function CertificateTemplatePicker({ templateId, onChange, certificateTemplates = [], companyCategories = [], defaultCategory, onCreateTemplate }) {
  const [mode, setMode] = useState('existing');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [importName, setImportName] = useState('');
  const [importSigner, setImportSigner] = useState('');
  const [importTitle, setImportTitle] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [previewCert, setPreviewCert] = useState(null);

  const filteredTemplates = certificateTemplates.filter((t) => categoryFilter === 'ALL' || t.category === categoryFilter);
  const selectedTemplate = certificateTemplates.find((t) => t.id === templateId) || null;

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeLabel = file.size < 1024 * 1024
      ? `${Math.max(1, Math.round(file.size / 1024))} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    setImportFile({ name: file.name, sizeLabel });
  }

  function handleCreateAndAttach() {
    if (!importName.trim()) return;
    const now = new Date().toISOString().slice(0, 10);
    const newTemplate = {
      id: `CERTTPL-${Date.now()}`,
      name: importName.trim(),
      description: `A custom certificate template created directly for the ${defaultCategory || 'General'} area.`,
      category: defaultCategory || companyCategories[0] || 'General',
      signerName: importSigner.trim() || 'Thái Minh Dũng',
      signerTitle: importTitle.trim() || 'Head of Learning & Org Development',
      issuerOrg: 'MM Mega Market Vietnam',
      validityDefaultMonths: 12,
      warningDaysDefault: 30,
      recertificationMethodDefault: 'RETAKE_FULL_COURSE',
      attachedFile: importFile,
      createdAt: now,
      updatedAt: now,
    };
    if (typeof onCreateTemplate === 'function') {
      onCreateTemplate(newTemplate);
    }
    onChange(newTemplate.id);
    setImportName('');
    setImportSigner('');
    setImportTitle('');
    setImportFile(null);
    setMode('existing');
  }

  function handlePreviewTemplate(tpl) {
    if (!tpl) return;
    setPreviewCert({
      id: `CERT-MMVN-PREVIEW-${Date.now().toString().slice(-4)}`,
      courseName: 'Sample Course Title',
      courseCode: 'MMVN-SAMPLE-001',
      issueDate: new Date().toISOString().slice(0, 10),
      validUntil: tpl.validityDefaultMonths === 0 ? null : new Date(new Date().setFullYear(new Date().getFullYear() + (tpl.validityDefaultMonths / 12 || 1))).toISOString().slice(0, 10),
      isLifetime: tpl.validityDefaultMonths === 0,
      score: 95,
      recipientName: 'Nguyễn Văn Mẫu',
      recipientPosition: 'Operations Executive',
      department: 'MM Mega Market An Phu / OMD Fresh Food',
      template: tpl,
    });
  }

  return (
    <div style={{ background: 'var(--paper-raised)', borderRadius: 8, padding: 14, border: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <label className="field-label" style={{ fontSize: 12, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-certificate" style={{ color: 'var(--blue, #005BAA)', fontSize: 16 }} />
          Certificate Template
        </label>
        {selectedTemplate && (
          <Button size="sm" variant="ghost" icon="ti-eye" onClick={() => handlePreviewTemplate(selectedTemplate)}>
            Preview This Template
          </Button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button type="button" className={`btn btn-sm ${mode === 'existing' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('existing')}>
          Choose An Existing Template ({certificateTemplates.length})
        </button>
        <button type="button" className={`btn btn-sm ${mode === 'import' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('import')}>
          + Create Template / Import New File
        </button>
      </div>

      {mode === 'existing' ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            className="field-select"
            style={{ height: 34, fontSize: 12, width: 170 }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Areas</option>
            {companyCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            className="field-select"
            style={{ height: 34, fontSize: 12, flex: '1 1 240px' }}
            value={templateId || ''}
            onChange={(e) => onChange(e.target.value || null)}
          >
            <option value="">— No specific template (use the Category default) —</option>
            {filteredTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
            ))}
          </select>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--paper-sunken)', padding: 10, borderRadius: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label className="field-label" style={{ fontSize: 11 }}>New Template Name *</label>
              <input
                className="field-input"
                style={{ height: 32, fontSize: 12 }}
                placeholder="E.g. Cold Storage Safety Certificate"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" style={{ fontSize: 11 }}>Approving Signatory</label>
              <input
                className="field-input"
                style={{ height: 32, fontSize: 12 }}
                placeholder="E.g. Thái Minh Dũng"
                value={importSigner}
                onChange={(e) => setImportSigner(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label className="field-label" style={{ fontSize: 11 }}>Signatory Job Title</label>
              <input
                className="field-input"
                style={{ height: 32, fontSize: 12 }}
                placeholder="e.g. Head of Learning & Org Development"
                value={importTitle}
                onChange={(e) => setImportTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" style={{ fontSize: 11 }}>Attached Template File (PDF/DOCX)</label>
              <input type="file" className="field-input" style={{ height: 32, fontSize: 12, paddingTop: 4 }} onChange={handleImportFile} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
            <Button size="sm" variant="ghost" onClick={() => setMode('existing')}>Cancel</Button>
            <Button size="sm" variant="primary" icon="ti-check" disabled={!importName.trim()} onClick={handleCreateAndAttach}>
              Create &amp; Attach To This Course
            </Button>
          </div>
        </div>
      )}

      {selectedTemplate && (
        <div style={{ marginTop: 10, padding: '6px 10px', background: 'var(--blue-soft)', border: '1px solid #BFDBFE', borderRadius: 6, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ color: 'var(--blue-soft-text)', fontWeight: 800 }}>{selectedTemplate.name}</span>
            <span style={{ color: 'var(--ink-soft)', marginLeft: 6 }}>&middot; Signed by: <strong>{selectedTemplate.signerName || 'Board of Management'}</strong></span>
          </div>
          <Badge tone="blue" size="sm">{selectedTemplate.category}</Badge>
        </div>
      )}

      {previewCert && (
        <CertificateModal
          certificate={previewCert}
          isOpen={Boolean(previewCert)}
          onClose={() => setPreviewCert(null)}
        />
      )}
    </div>
  );
}

// 5 standardized lesson formats: SCORM, VIDEO, PDF, PPT, EXTERNAL_LINK
// (Udemy/LinkedIn Learning/Coursera/YouTube/Other) — ASSESSMENT is a standalone
// competency gateway, separate from the 5 lesson content formats.
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
