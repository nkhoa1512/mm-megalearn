/**
 * Measures the minimum width of every data table in the app, for all 6 roles.
 *
 * There is no browser here, so we estimate: for each cell, take the longest
 * unbreakable run (a badge / button / span with white-space:nowrap counts as one
 * block) plus the .table th|td padding. A table's minimum width is the sum of its
 * columns' minimum widths. Anything wider than the content area forces a sideways scroll.
 *
 * Run: npm run check:tables
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const { CourseStoreProvider } = await import('../src/store/CourseStore');
const { personaForRole } = await import('../src/data/mockData');
const { ROLE_ORDER } = await import('../src/data/roles');

const LearnerCourses = (await import('../src/pages/learner/LearnerCourses')).default;
const LearnerHistory = (await import('../src/pages/learner/LearnerHistory')).default;
const ManagerTeam = (await import('../src/pages/manager/ManagerTeam')).default;
const ManagerCourses = (await import('../src/pages/manager/ManagerCourses')).default;
const ManagerApprovals = (await import('../src/pages/manager/ManagerApprovals')).default;
const MyLearning = (await import('../src/pages/shared/MyLearning')).default;
const AdminDashboard = (await import('../src/pages/admin/AdminDashboard')).default;
const AdminCourses = (await import('../src/pages/admin/AdminCourses')).default;
const AdminConfig = (await import('../src/pages/admin/AdminConfig')).default;
const AdminReports = (await import('../src/pages/admin/AdminReports')).default;
const AdminTrainingOps = (await import('../src/pages/admin/AdminTrainingOps')).default;
const TrainerHub = (await import('../src/pages/trainer/TrainerHub')).default;
const HrbpDashboard = (await import('../src/pages/hrbp/HrbpDashboard')).default;
const UserAdminPortal = (await import('../src/pages/useradmin/UserAdminPortal')).default;
const SysAdminPortal = (await import('../src/pages/sysadmin/SysAdminPortal')).default;
const UserTranscriptModal = (await import('../src/features/common/UserTranscriptModal')).default;

const AUTH_KEY = 'mm-megalearn-auth-v6';

// ---------------------------------------------------------------------------
// Measurement model
// ---------------------------------------------------------------------------
const SIDEBAR_W = 260;      // --sidebar-w
const CONTENT_PAD = 32 * 2; // .content left/right padding (--frame-gutter)
const CARD_BORDER = 2;

// Read the real horizontal padding of .table td from the CSS so the tool always
// tracks the current style instead of a hand-copied constant that drifts.
const css = (await import('node:fs')).readFileSync('src/styles/app.css', 'utf8');
const tdPad = css.match(/\.table td \{[\s\S]*?padding:\s*[\d.]+px\s+([\d.]+)px/);
const CELL_PAD = tdPad ? Number(tdPad[1]) * 2 : 44;

// Average character width per font size (Inter).
const CH = { td: 6.75, th: 7.1, badge: 6.1, btn: 6.5 };

function budgetAt(viewport) {
  return viewport - SIDEBAR_W - CONTENT_PAD - CARD_BORDER;
}

function decode(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&middot;/g, '.')
    .replace(/&nbsp;/g, ' ');
}

function textOf(html) {
  return decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/**
 * Removes subtrees hidden with an inline display:none so they cannot contribute
 * width. ActionsMenu renders its item labels inside a hidden span for SSR
 * discoverability; counting those made the course catalog table measure ~380px
 * wider than it renders — a measurement artifact, not a layout defect.
 *
 * The nesting has to be tracked properly: a non-greedy regex stops at the first
 * inner </span> and leaves the rest of the hidden labels behind.
 */
function stripHidden(html) {
  const open = /<(span|div)\b[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>/;
  let out = html;
  for (let guard = 0; guard < 50; guard += 1) {
    const m = open.exec(out);
    if (!m) break;
    const tag = m[1];
    const tagRe = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, 'g');
    tagRe.lastIndex = m.index + m[0].length;
    let depth = 1;
    let closeEnd = -1;
    let t;
    while ((t = tagRe.exec(out))) {
      depth += t[0][1] === '/' ? -1 : 1;
      if (depth === 0) { closeEnd = t.index + t[0].length; break; }
    }
    if (closeEnd < 0) { out = out.slice(0, m.index); break; }
    out = out.slice(0, m.index) + out.slice(closeEnd);
  }
  return out;
}

/** Width of the longest unbreakable run inside a cell. */
function cellRunWidth(rawCellHtml, charW, cellAttrs = '') {
  const cellHtml = stripHidden(rawCellHtml);
  let widest = 0;

  // A flex row WITHOUT flex-wrap:wrap keeps its children on a single line, so the
  // minimum width is the sum of the children plus the gaps. This is the most
  // commonly missed culprit (e.g. the "course code · specialization · duration" row).
  for (const m of cellHtml.matchAll(/<div style="([^"]*display:\s*flex[^"]*)"[^>]*>([\s\S]*?)<\/div>/g)) {
    const style = m[1];
    if (/flex-wrap:\s*wrap/.test(style)) continue;
    const gap = Number((style.match(/gap:\s*([\d.]+)px/) || [])[1] || 0);
    const children = [...m[2].matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)];
    if (children.length === 0) continue;
    const w = children.reduce((sum, c) => sum + textOf(c[1]).length * charW, 0) + gap * (children.length - 1);
    widest = Math.max(widest, w);
  }

  // A cell that sets white-space:nowrap itself -> its whole content is one block.
  if (/white-space:\s*nowrap/.test(cellAttrs)) {
    widest = Math.max(widest, textOf(cellHtml).length * charW);
  }

  // Badge: .badge sets white-space:nowrap -> the whole label is one block.
  for (const m of cellHtml.matchAll(/<span class="badge[^"]*"[^>]*>([\s\S]*?)<\/span>/g)) {
    const hasIcon = /<i class="ti/.test(m[1]);
    widest = Math.max(widest, textOf(m[1]).length * CH.badge + 18 + (hasIcon ? 19 : 9));
  }
  // Button: we do not want the label inside a button to wrap.
  for (const m of cellHtml.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)) {
    const hasIcon = /<i class="ti/.test(m[1]);
    widest = Math.max(widest, textOf(m[1]).length * CH.btn + 22 + (hasIcon ? 21 : 0));
  }
  // A span that sets white-space:nowrap by hand (e.g. JobLevelBadge).
  for (const m of cellHtml.matchAll(/<span[^>]*white-space:\s*nowrap[^>]*>([\s\S]*?)<\/span>/g)) {
    widest = Math.max(widest, textOf(m[1]).length * CH.badge + 18);
  }
  // Note: do NOT infer "the whole cell is nowrap" from the first child. A nowrap
  // badge does not stop its siblings from wrapping; a nowrap on the cell itself is
  // already handled by the cellAttrs branch above.

  // The remaining text: only the longest word is unbreakable.
  const plain = textOf(cellHtml.replace(/<span class="badge[\s\S]*?<\/span>/g, '').replace(/<button[\s\S]*?<\/button>/g, ''));
  for (const word of plain.split(' ')) {
    widest = Math.max(widest, word.length * charW);
  }
  return widest;
}

/** Extracts the .table elements from the HTML and computes their minimum widths. */
function measureTables(html) {
  const results = [];
  const tableRe = /<table class="table"[^>]*>([\s\S]*?)<\/table>/g;
  for (const t of html.matchAll(tableRe)) {
    const body = t[1];
    const rows = [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((r) => r[1]);
    if (rows.length === 0) continue;

    const cols = [];
    let headers = [];
    for (const row of rows) {
      const cells = [...row.matchAll(/<(th|td)([^>]*)>([\s\S]*?)<\/\1>/g)];
      // Skip the "no data" row (a single colSpan cell spanning the table).
      if (cells.length === 1 && /colspan/i.test(cells[0][2])) continue;
      cells.forEach((c, i) => {
        const isTh = c[1] === 'th';
        const w = cellRunWidth(c[3], isTh ? CH.th : CH.td, c[2]) + CELL_PAD;
        // DEBUG_COL=<index>: print which cell is holding that column open.
        if (process.env.DEBUG_COL && Number(process.env.DEBUG_COL) === i && w > (cols[i] || 0)) {
          console.log(`[debug][${globalThis.__label}] column ${i} ->${Math.round(w)}px :: ${c[3].slice(0, 600)}`);
        }
        cols[i] = Math.max(cols[i] || 0, w);
        if (isTh) headers[i] = textOf(c[3]);
      });
    }
    if (cols.length === 0) continue;
    results.push({
      columns: cols.length,
      minWidth: Math.round(cols.reduce((a, b) => a + b, 0)),
      widest: cols.map((w, i) => ({ header: headers[i] || `#${i + 1}`, w: Math.round(w) }))
        .sort((a, b) => b.w - a.w).slice(0, 3),
    });
  }
  return results;
}

function render(element, path, pattern) {
  try {
    return renderToStaticMarkup(
      <MemoryRouter initialEntries={[path]}>
        <CourseStoreProvider>
          <Routes><Route path={pattern} element={element} /></Routes>
        </CourseStoreProvider>
      </MemoryRouter>
    );
  } catch (err) {
    return '<!-- render error: ' + err.message + ' -->';
  }
}

const PAGES = [
  ['My Courses (learner)', <LearnerCourses />, '/learner/courses'],
  ['My Learning (all roles)', <MyLearning />, '/my-learning'],
  ['Learning History', <LearnerHistory />, '/learner/history'],
  ['Manager · Team', <ManagerTeam />, '/manager/team'],
  ['Manager · Department courses', <ManagerCourses />, '/manager/courses'],
  ['Level skip approvals', <ManagerApprovals />, '/manager/approvals'],
  ['Trainer · Classes', <TrainerHub initialTab="CLASSES" />, '/trainer'],
  ['Trainer · Attendance', <TrainerHub initialTab="ATTENDANCE" />, '/trainer/attendance'],
  ['Trainer · CSAT', <TrainerHub initialTab="FEEDBACK" />, '/trainer/feedback'],
  ['Trainer · Labs', <TrainerHub initialTab="LABS" />, '/trainer/labs'],
  ['HRBP · Skill gap', <HrbpDashboard initialTab="SKILL_GAP" />, '/hrbp'],
  ['HRBP · Succession', <HrbpDashboard initialTab="SUCCESSION" />, '/hrbp/succession'],
  ['HRBP · Compliance', <HrbpDashboard initialTab="COMPLIANCE" />, '/hrbp/compliance'],
  ['UserAdmin · Employee directory', <UserAdminPortal initialTab="DIRECTORY" />, '/user-admin'],
  ['UserAdmin · 7 job levels', <UserAdminPortal initialTab="JOB_LEVELS" />, '/user-admin/job-levels'],
  ['UserAdmin · Course allocation', <UserAdminPortal initialTab="ALLOCATION" />, '/user-admin/allocation'],
  ['UserAdmin · Trainer assignment', <UserAdminPortal initialTab="TRAINER_ASSIGNMENT" />, '/user-admin/trainers'],
  ['SysAdmin · HRIS', <SysAdminPortal initialTab="HRIS" />, '/sysadmin'],
  ['SysAdmin · Audit log', <SysAdminPortal initialTab="AUDIT_LOGS" />, '/sysadmin/audit'],
  ['SysAdmin · Role governance', <SysAdminPortal initialTab="ROLE_GOVERNANCE" />, '/sysadmin/roles'],
  ['L&D · Dashboard', <AdminDashboard />, '/admin'],
  ['L&D · Course catalog', <AdminCourses />, '/admin/courses'],
  ['L&D · Configuration & RBAC', <AdminConfig />, '/admin/config'],
  // NOTE: this reaches the CSAT tab only. The other four report tabs are gated
  // behind canViewOrgProgress, and this harness renders as the default learner
  // persona, so they cannot be measured here — they are checked in the browser
  // instead. Passing an initial tab does not help; the capability gate wins.
  ['L&D · ROI report', <AdminReports />, '/admin/reports'],
  ['L&D · Training Ops', <AdminTrainingOps />, '/admin/training-ops'],
  // Modals (not routes of their own) — still measured, because they used to slip
  // through: pages open them from state (transcriptUser !== null), so a route-only
  // audit never reaches the table inside.
  ['Profile Employee (UserTranscriptModal)', <UserTranscriptModal targetUser={personaForRole('learner')} isOpen onClose={() => {}} />, '/manager/team'],
];

const VIEWPORTS = [1920, 1600, 1440, 1280];
const PRIMARY = 1440; // the common laptop width — tables must fit here

console.log(`.table td horizontal padding is ${CELL_PAD}px (read from app.css)`);
console.log('Available content area:');
for (const v of VIEWPORTS) console.log(`  ${v}px viewport -> ${budgetAt(v)}px for the table`);
console.log('');

globalThis.__label = "";
const offenders = [];
const all = new Map();
for (const role of ROLE_ORDER) {
  store.set(AUTH_KEY, JSON.stringify(personaForRole(role)));
  for (const [label, element, path] of PAGES) {
    globalThis.__label = label;
    const html = render(element, path, path);
    for (const t of measureTables(html)) {
      const key = label + '|' + t.columns;
      if (!all.has(key) || all.get(key).minWidth < t.minWidth) {
        all.set(key, { role, label, ...t });
      }
      if (t.minWidth > budgetAt(PRIMARY)) {
        offenders.push({ role, label, ...t });
      }
    }
  }
}

console.log('The 10 widest tables right now:');
const ranked = [...all.values()].sort((a, b) => b.minWidth - a.minWidth);
ranked.slice(0, 10).forEach((t, i) => {
  const narrowest = VIEWPORTS.filter((v) => t.minWidth <= budgetAt(v)).pop();
  console.log(`  ${String(t.minWidth).padStart(5)}px  ${String(t.columns).padStart(2)} cols  ${t.label.padEnd(30)} fits from ${narrowest ? narrowest + 'px' : '>1920px'}`);
  // Top 3: also print which column is holding the width, to show what to trim.
  if (i < 3 && t.widest) {
    const top = [...t.widest].sort((a, b) => b.w - a.w).slice(0, 3);
    console.log(`         widest columns:${top.map((w) => `${w.header} ${w.w}px`).join(' · ')}`);
  }
});
console.log('');

// Group by page: the same table usually repeats across several roles.
const grouped = new Map();
for (const o of offenders) {
  const key = o.label + '|' + o.columns;
  if (!grouped.has(key)) grouped.set(key, { ...o, roles: new Set() });
  const g = grouped.get(key);
  g.roles.add(o.role);
  g.minWidth = Math.max(g.minWidth, o.minWidth);
}

const list = [...grouped.values()].sort((a, b) => b.minWidth - a.minWidth);

if (list.length === 0) {
  console.log(`✅ No table exceeds ${budgetAt(PRIMARY)}px — every column is fully visible at ${PRIMARY}px and above.`);
} else {
  console.log(`⚠️  ${list.length} table(s) exceed ${budgetAt(PRIMARY)}px (at ${PRIMARY}px) — users must scroll sideways:\n`);
  for (const g of list) {
    const fitsAt = VIEWPORTS.filter((v) => g.minWidth <= budgetAt(v));
    console.log(`  ${String(g.minWidth).padStart(5)}px  ${g.columns} cols  ${g.label}`);
    console.log(`         affected roles:${[...g.roles].join(', ')}`);
    console.log(`         widest columns:${g.widest.map((w) => `${w.header} ${w.w}px`).join(' · ')}`);
    console.log(`         only fits from: ${fitsAt.length ? fitsAt[fitsAt.length - 1] + 'px' : 'none of the listed viewports'}`);
    console.log('');
  }
}

process.exit(list.length === 0 ? 0 : 1);
