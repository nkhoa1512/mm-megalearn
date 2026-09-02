import { useCourseStore } from '../store/CourseStore';

/**
 * Bảng màu theo chế độ sáng/tối.
 *
 * Quy ước: các màu *nhấn* (green/rail/amber/red/blue/purple) giữ vai trò ngữ
 * nghĩa ở cả hai chế độ, chỉ chỉnh độ sáng cho đủ tương phản trên nền tối. Các
 * màu *bề mặt* (bg/paper/sunken/line) và *chữ* (ink/inkSoft/inkFaint) thì đảo
 * hẳn. Nhờ vậy mọi bản đồ màu khai báo ở phạm vi module (ví dụ màu theo loại sự
 * kiện lịch) vẫn dùng được vì chúng chỉ tham chiếu màu nhấn.
 */
export type Palette = {
  green: string; greenDark: string; greenSoft: string;
  rail: string; railSoft: string;
  amber: string; amberSoft: string;
  red: string; redSoft: string;
  blue: string; blueSoft: string;
  purple: string; purpleSoft: string;
  /** Viền của các hộp cảnh báo nền nhạt (soft callout). */
  greenBorder: string; amberBorder: string; redBorder: string;
  railBorder: string; blueBorder: string; purpleBorder: string;
  /** Chữ đậm đặt trên nền nhạt cùng tông. */
  greenText: string; amberText: string; redText: string;
  ink: string; inkSoft: string; inkFaint: string;
  line: string; lineStrong: string;
  paper: string; bg: string; sunken: string;
  /** Nền phủ phía sau bottom sheet / modal. */
  scrim: string;
  /** Chữ đặt trên nền màu nhấn đậm. */
  onAccent: string;
};

export const LIGHT: Palette = {
  green: '#009E49',
  greenDark: '#047857',
  greenSoft: '#ECFDF5',
  rail: '#0F766E',
  railSoft: '#F0FDFA',
  amber: '#D97706',
  amberSoft: '#FFFBEB',
  red: '#DC2626',
  redSoft: '#FEF2F2',
  blue: '#2563EB',
  blueSoft: '#EFF6FF',
  purple: '#7C3AED',
  purpleSoft: '#F5F3FF',
  greenBorder: '#A7F3D0',
  amberBorder: '#FDE68A',
  redBorder: '#FECACA',
  railBorder: '#99F6E4',
  blueBorder: '#BFDBFE',
  purpleBorder: '#DDD6FE',
  greenText: '#166534',
  amberText: '#B45309',
  redText: '#B91C1C',
  ink: '#0F172A',
  inkSoft: '#475569',
  inkFaint: '#94A3B8',
  line: '#E2E8F0',
  lineStrong: '#CBD5E1',
  paper: '#FFFFFF',
  bg: '#F8FAFC',
  sunken: '#F1F5F9',
  scrim: 'rgba(15,23,42,0.55)',
  onAccent: '#FFFFFF',
};

export const DARK: Palette = {
  // Xanh thương hiệu MM (#009E49) quá tối trên nền đậm nên nâng sáng một bậc.
  green: '#2BB673',
  greenDark: '#5EE9A4',
  greenSoft: 'rgba(43,182,115,0.16)',
  rail: '#3FBFAE',
  railSoft: 'rgba(63,191,174,0.14)',
  amber: '#F0A93B',
  amberSoft: 'rgba(240,169,59,0.15)',
  red: '#F26B6B',
  redSoft: 'rgba(242,107,107,0.15)',
  blue: '#5B94F5',
  blueSoft: 'rgba(91,148,245,0.15)',
  purple: '#A78BFA',
  purpleSoft: 'rgba(167,139,250,0.16)',
  greenBorder: 'rgba(43,182,115,0.38)',
  amberBorder: 'rgba(240,169,59,0.38)',
  redBorder: 'rgba(242,107,107,0.38)',
  railBorder: 'rgba(63,191,174,0.34)',
  blueBorder: 'rgba(91,148,245,0.34)',
  purpleBorder: 'rgba(167,139,250,0.38)',
  greenText: '#7BE8B0',
  amberText: '#F5C46B',
  redText: '#FF9B9B',
  ink: '#F1F5F9',
  inkSoft: '#B6C2D2',
  inkFaint: '#8494A8',
  line: '#2A3648',
  lineStrong: '#3A4759',
  paper: '#151E2E',
  bg: '#0B1220',
  sunken: '#1D2739',
  scrim: 'rgba(0,0,0,0.65)',
  onAccent: '#08111C',
};

/**
 * Bảng màu đang áp dụng. Dùng trong thân component; các hằng khai báo ở phạm vi
 * module hãy tham chiếu LIGHT (chỉ nên là màu nhấn — xem ghi chú ở trên).
 */
export function useColors(): Palette {
  const { theme } = useCourseStore();
  return theme === 'dark' ? DARK : LIGHT;
}

export function paletteFor(theme?: string): Palette {
  return theme === 'dark' ? DARK : LIGHT;
}
