import React from 'react';
import { Link } from 'react-router-dom';

export function Badge({ tone = 'slate', children, icon }) {
  return (
    <span className={`badge badge-${tone}`}>
      {icon ? <i className={`ti ${icon}`} aria-hidden="true" /> : <span className="badge-dot" />}
      {children}
    </span>
  );
}

export function ProgressBar({ value, tone = 'rail' }) {
  const fillColor = {
    rail: 'var(--rail)',
    sage: 'var(--sage)',
    amber: 'var(--amber)',
    rust: 'var(--rust)',
  }[tone];
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${value}%`, background: fillColor }} />
    </div>
  );
}

export function StatCard({ label, value, tone }) {
  const color = {
    rail: 'var(--rail)',
    sage: 'var(--sage)',
    amber: 'var(--amber)',
    rust: 'var(--rust)',
    ink: 'var(--ink)',
  }[tone || 'ink'];
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
    </div>
  );
}

export function Button({ children, variant = 'default', size, icon, onClick, block, type = 'button', disabled = false }) {
  const cls = ['btn'];
  if (variant === 'primary') cls.push('btn-primary');
  if (variant === 'ghost') cls.push('btn-ghost');
  if (variant === 'danger') cls.push('btn-danger');
  if (size === 'sm') cls.push('btn-sm');
  if (block) cls.push('btn-block');
  return (
    <button type={type} className={cls.join(' ')} onClick={onClick} disabled={disabled}>
      {icon && <i className={`ti ${icon}`} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function CourseTypeBadge({ courseType }) {
  return courseType === 'MANDATORY'
    ? <Badge tone="amber" icon="ti-asterisk">Mandatory</Badge>
    : <Badge tone="slate" icon="ti-list-check">Optional</Badge>;
}

const LESSON_ICON = {
  VIDEO: 'ti-video',
  DOCUMENT: 'ti-file-text',
  IMAGE: 'ti-photo',
  TEXT: 'ti-align-left',
  SCRIPT: 'ti-article',
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
  return { VIDEO: 'Video', DOCUMENT: 'Document', IMAGE: 'Image', TEXT: 'Text', SCRIPT: 'Script', ASSESSMENT: 'Assessment' }[type] || type;
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
