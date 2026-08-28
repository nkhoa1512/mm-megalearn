// src/utils/calendarDate.js
//
// Ngày trong toàn bộ codebase là chuỗi 'YYYY-MM-DD' thuần (xem isoPlusDays()
// trong mockData.js) — các hàm ở đây tuyệt đối không dùng new Date(isoString)
// để tránh lỗi lệch múi giờ khi parse chuỗi ISO (JS coi 'YYYY-MM-DD' là UTC
// midnight; .getDate() ở múi giờ có offset âm có thể lùi 1 ngày). Chỉ dùng
// constructor số new Date(year, monthIndex, day) cho toán ngày, và luôn
// format ngược lại bằng ghép chuỗi thủ công, không dùng .toISOString().

function pad2(n) {
  return String(n).padStart(2, '0');
}

function parseDateString(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m, d }; // m là số tháng lịch (1-12), không phải zero-indexed
}

function formatDateString(y, m, d) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function todayDateString() {
  const now = new Date();
  return formatDateString(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function firstOfMonth(dateStr) {
  const { y, m } = parseDateString(dateStr);
  return formatDateString(y, m, 1);
}

export function addMonths(monthStr, delta) {
  const { y, m } = parseDateString(monthStr);
  const target = new Date(y, m - 1 + delta, 1);
  return formatDateString(target.getFullYear(), target.getMonth() + 1, 1);
}

export function getMonthGridWeeks(monthStr) {
  const { y, m } = parseDateString(monthStr);
  const startWeekday = new Date(y, m - 1, 1).getDay(); // 0 = Sunday
  const gridStart = new Date(y, m - 1, 1 - startWeekday);

  const weeks = [];
  for (let week = 0; week < 6; week += 1) {
    const days = [];
    for (let dayIdx = 0; dayIdx < 7; dayIdx += 1) {
      const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + week * 7 + dayIdx);
      days.push({
        date: formatDateString(cellDate.getFullYear(), cellDate.getMonth() + 1, cellDate.getDate()),
        inMonth: cellDate.getFullYear() === y && cellDate.getMonth() === m - 1,
      });
    }
    weeks.push(days);
  }
  return weeks;
}

const MONTH_LABELS_VI = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
const MONTH_LABELS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatMonthLabel(monthStr, language) {
  const { y, m } = parseDateString(monthStr);
  if (language === 'en') return `${MONTH_LABELS_EN[m - 1]} ${y}`;
  return `${MONTH_LABELS_VI[m - 1]}, ${y}`;
}
