/**
 * Đo bề rộng tối thiểu của mọi bảng dữ liệu trong app, cho cả 6 role.
 *
 * Không có trình duyệt nên ta ước lượng: với mỗi ô, tính "đoạn không thể xuống
 * dòng" dài nhất (badge / button / span có white-space:nowrap là một khối liền),
 * cộng padding của .table th|td. Bề rộng tối thiểu của bảng = tổng bề rộng tối
 * thiểu các cột. Nếu vượt quá vùng nội dung thì người dùng buộc phải kéo ngang.
 *
 * Chạy: npm run check:tables
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
const ManagerReports = (await import('../src/pages/manager/ManagerReports')).default;
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
// Mô hình đo
// ---------------------------------------------------------------------------
const SIDEBAR_W = 260;      // --sidebar-w
const CONTENT_PAD = 36 * 2; // .content padding trái/phải
const CARD_BORDER = 2;

// Đọc padding ngang thật của .table td từ CSS, để công cụ luôn bám theo style
// hiện tại thay vì một hằng số chép tay dễ lệch.
const css = (await import('node:fs')).readFileSync('src/styles/app.css', 'utf8');
const tdPad = css.match(/\.table td \{[\s\S]*?padding:\s*[\d.]+px\s+([\d.]+)px/);
const CELL_PAD = tdPad ? Number(tdPad[1]) * 2 : 44;

// Bề rộng ký tự trung bình theo cỡ chữ (font Inter).
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

/** Bề rộng đoạn không thể xuống dòng, dài nhất trong một ô. */
function cellRunWidth(cellHtml, charW, cellAttrs = '') {
  let widest = 0;

  // Hàng flex KHÔNG có flex-wrap:wrap thì các con nằm trên đúng một dòng, nên
  // bề rộng tối thiểu = tổng bề rộng các con + khoảng gap. Đây là thủ phạm hay
  // bị bỏ sót nhất (vd. dòng "mã khóa · chuyên ngành · thời lượng").
  for (const m of cellHtml.matchAll(/<div style="([^"]*display:\s*flex[^"]*)"[^>]*>([\s\S]*?)<\/div>/g)) {
    const style = m[1];
    if (/flex-wrap:\s*wrap/.test(style)) continue;
    const gap = Number((style.match(/gap:\s*([\d.]+)px/) || [])[1] || 0);
    const children = [...m[2].matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)];
    if (children.length === 0) continue;
    const w = children.reduce((sum, c) => sum + textOf(c[1]).length * charW, 0) + gap * (children.length - 1);
    widest = Math.max(widest, w);
  }

  // Ô tự đặt white-space:nowrap -> toàn bộ nội dung là một khối liền.
  if (/white-space:\s*nowrap/.test(cellAttrs)) {
    widest = Math.max(widest, textOf(cellHtml).length * charW);
  }

  // Badge: .badge có white-space:nowrap -> cả nhãn là một khối liền.
  for (const m of cellHtml.matchAll(/<span class="badge[^"]*"[^>]*>([\s\S]*?)<\/span>/g)) {
    const hasIcon = /<i class="ti/.test(m[1]);
    widest = Math.max(widest, textOf(m[1]).length * CH.badge + 18 + (hasIcon ? 19 : 9));
  }
  // Button: không muốn chữ trong nút xuống dòng.
  for (const m of cellHtml.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)) {
    const hasIcon = /<i class="ti/.test(m[1]);
    widest = Math.max(widest, textOf(m[1]).length * CH.btn + 22 + (hasIcon ? 21 : 0));
  }
  // Span đặt white-space:nowrap thủ công (vd. JobLevelBadge).
  for (const m of cellHtml.matchAll(/<span[^>]*white-space:\s*nowrap[^>]*>([\s\S]*?)<\/span>/g)) {
    widest = Math.max(widest, textOf(m[1]).length * CH.badge + 18);
  }
  // Lưu ý: KHÔNG suy ra "cả ô nowrap" từ thẻ con đầu tiên. Một badge nowrap
  // không làm các phần tử anh em của nó mất khả năng xuống dòng; nowrap của
  // chính ô đã được xử lý ở nhánh cellAttrs bên trên.

  // Phần chữ còn lại: chỉ từ dài nhất mới không xuống dòng được.
  const plain = textOf(cellHtml.replace(/<span class="badge[\s\S]*?<\/span>/g, '').replace(/<button[\s\S]*?<\/button>/g, ''));
  for (const word of plain.split(' ')) {
    widest = Math.max(widest, word.length * charW);
  }
  return widest;
}

/** Tách các bảng .table trong HTML rồi tính bề rộng tối thiểu. */
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
      // Bỏ qua hàng "không có dữ liệu" (một ô colSpan trải hết bảng).
      if (cells.length === 1 && /colspan/i.test(cells[0][2])) continue;
      cells.forEach((c, i) => {
        const isTh = c[1] === 'th';
        const w = cellRunWidth(c[3], isTh ? CH.th : CH.td, c[2]) + CELL_PAD;
        // DEBUG_COL=<index>: in ra ô nào đang giữ bề ngang của cột đó.
        if (process.env.DEBUG_COL && Number(process.env.DEBUG_COL) === i && w > (cols[i] || 0)) {
          console.log(`[debug][${globalThis.__label}] cột ${i} -> ${Math.round(w)}px :: ${c[3].slice(0, 600)}`);
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
  ['Khóa Học Của Tôi (learner)', <LearnerCourses />, '/learner/courses'],
  ['Học tập của tôi (mọi role)', <MyLearning />, '/my-learning'],
  ['Lịch Sử Học Tập', <LearnerHistory />, '/learner/history'],
  ['Manager · Đội ngũ', <ManagerTeam />, '/manager/team'],
  ['Manager · Khóa phòng ban', <ManagerCourses />, '/manager/courses'],
  ['Manager · Báo cáo', <ManagerReports />, '/manager/reports'],
  ['Duyệt học vượt cấp', <ManagerApprovals />, '/manager/approvals'],
  ['Trainer · Lớp dạy', <TrainerHub initialTab="CLASSES" />, '/trainer'],
  ['Trainer · Điểm danh', <TrainerHub initialTab="ATTENDANCE" />, '/trainer/attendance'],
  ['Trainer · CSAT', <TrainerHub initialTab="FEEDBACK" />, '/trainer/feedback'],
  ['Trainer · Xưởng lab', <TrainerHub initialTab="LABS" />, '/trainer/labs'],
  ['HRBP · Skill gap', <HrbpDashboard initialTab="SKILL_GAP" />, '/hrbp'],
  ['HRBP · Kế nhiệm', <HrbpDashboard initialTab="SUCCESSION" />, '/hrbp/succession'],
  ['HRBP · Tuân thủ', <HrbpDashboard initialTab="COMPLIANCE" />, '/hrbp/compliance'],
  ['UserAdmin · Danh mục NS', <UserAdminPortal initialTab="DIRECTORY" />, '/user-admin'],
  ['UserAdmin · 7 cấp bậc', <UserAdminPortal initialTab="JOB_LEVELS" />, '/user-admin/job-levels'],
  ['UserAdmin · Phân bổ khóa', <UserAdminPortal initialTab="ALLOCATION" />, '/user-admin/allocation'],
  ['UserAdmin · Phân công GV', <UserAdminPortal initialTab="TRAINER_ASSIGNMENT" />, '/user-admin/trainers'],
  ['SysAdmin · HRIS', <SysAdminPortal initialTab="HRIS" />, '/sysadmin'],
  ['SysAdmin · Audit log', <SysAdminPortal initialTab="AUDIT_LOGS" />, '/sysadmin/audit'],
  ['SysAdmin · Quản trị role', <SysAdminPortal initialTab="ROLE_GOVERNANCE" />, '/sysadmin/roles'],
  ['L&D · Dashboard', <AdminDashboard />, '/admin'],
  ['L&D · Danh mục khóa', <AdminCourses />, '/admin/courses'],
  ['L&D · Cấu hình & RBAC', <AdminConfig />, '/admin/config'],
  ['L&D · Báo cáo ROI', <AdminReports />, '/admin/reports'],
  ['L&D · Training Ops', <AdminTrainingOps />, '/admin/training-ops'],
  // Modal (không phải route riêng) — vẫn phải đo vì trước đây từng lọt lưới:
  // các trang thường mở nó bằng state (transcriptUser !== null) nên route-only
  // audit không bao giờ chạm tới bảng bên trong.
  ['Hồ Sơ Nhân Sự (UserTranscriptModal)', <UserTranscriptModal targetUser={personaForRole('learner')} isOpen onClose={() => {}} />, '/manager/team'],
];

const VIEWPORTS = [1920, 1600, 1440, 1280];
const PRIMARY = 1440; // laptop phổ thông — mốc bắt buộc phải vừa

console.log(`Padding ngang .table td đang là ${CELL_PAD}px (đọc từ app.css)`);
console.log("Vùng nội dung khả dụng:");
for (const v of VIEWPORTS) console.log(`  màn ${v}px -> bảng có ${budgetAt(v)}px`);
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

console.log('10 bảng rộng nhất hiện tại:');
const ranked = [...all.values()].sort((a, b) => b.minWidth - a.minWidth);
ranked.slice(0, 10).forEach((t, i) => {
  const narrowest = VIEWPORTS.filter((v) => t.minWidth <= budgetAt(v)).pop();
  console.log(`  ${String(t.minWidth).padStart(5)}px  ${String(t.columns).padStart(2)} cột  ${t.label.padEnd(30)} vừa từ màn ${narrowest ? narrowest + 'px' : '>1920px'}`);
  // 3 bảng đầu: in luôn cột nào đang giữ bề ngang, để biết chỗ cần rút gọn.
  if (i < 3 && t.widest) {
    const top = [...t.widest].sort((a, b) => b.w - a.w).slice(0, 3);
    console.log(`         cột nặng nhất: ${top.map((w) => `${w.header} ${w.w}px`).join(' · ')}`);
  }
});
console.log('');

// Gộp theo trang: cùng một bảng thường lặp lại ở nhiều role.
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
  console.log(`✅ Không bảng nào vượt ${budgetAt(PRIMARY)}px — mọi cột hiển thị hết ở màn ${PRIMARY}px trở lên.`);
} else {
  console.log(`⚠️  ${list.length} bảng vượt quá ${budgetAt(PRIMARY)}px (màn ${PRIMARY}px) — người dùng phải kéo ngang:\n`);
  for (const g of list) {
    const fitsAt = VIEWPORTS.filter((v) => g.minWidth <= budgetAt(v));
    console.log(`  ${String(g.minWidth).padStart(5)}px  ${g.columns} cột  ${g.label}`);
    console.log(`         role bị: ${[...g.roles].join(', ')}`);
    console.log(`         cột rộng nhất: ${g.widest.map((w) => `${w.header} ${w.w}px`).join(' · ')}`);
    console.log(`         chỉ vừa từ màn: ${fitsAt.length ? fitsAt[fitsAt.length - 1] + 'px' : 'không màn nào trong danh sách'}`);
    console.log('');
  }
}

process.exit(list.length === 0 ? 0 : 1);
