import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from './theme';

// ---------------------------------------------------------------------------
// 1. BADGE COMPONENT
// ---------------------------------------------------------------------------
export const Badge = ({
  children,
  tone = 'blue',
  icon,
  size = 'md',
  style,
}: {
  children: React.ReactNode;
  tone?: 'amber' | 'sage' | 'rust' | 'rail' | 'blue' | 'slate' | 'ai' | 'purple' | 'success' | 'danger' | 'warning' | 'primary';
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: any;
}) => {
  const C = useColors();
  const getColors = () => {
    switch (tone) {
      case 'amber':
      case 'warning':
        return { bg: C.amberSoft, text: C.amberText, border: C.amberBorder, iconColor: C.amber };
      case 'sage':
      case 'success':
        return { bg: C.greenSoft, text: C.greenText, border: C.greenBorder, iconColor: C.green };
      case 'rust':
      case 'danger':
        return { bg: C.redSoft, text: C.redText, border: C.redBorder, iconColor: C.red };
      case 'rail':
        return { bg: C.railSoft, text: C.rail, border: C.railBorder, iconColor: C.rail };
      case 'ai':
      case 'purple':
        return { bg: C.purpleSoft, text: C.purple, border: C.purpleBorder, iconColor: C.purple };
      case 'slate':
        return { bg: C.sunken, text: C.inkSoft, border: C.line, iconColor: C.inkFaint };
      case 'blue':
      case 'primary':
      default:
        return { bg: C.blueSoft, text: C.blue, border: C.blueBorder, iconColor: C.blue };
    }
  };

  const colors = getColors();
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  return (
    <View
      style={[
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 999,
          paddingVertical: isSm ? 2 : isLg ? 6 : 4,
          paddingHorizontal: isSm ? 6 : isLg ? 12 : 8,
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          // Nhãn tiếng Việt có thể rất dài (vd levelShortLabel: "🟢 Level 6:
          // Chuyên viên / Nhân viên nghiệp vụ"). Cho badge co lại trong hàng
          // thay vì đẩy tràn ra ngoài mép màn hình.
          flexShrink: 1,
          maxWidth: '100%',
        },
        style,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon as any}
          size={isSm ? 10 : isLg ? 14 : 12}
          color={colors.iconColor}
          style={{ marginRight: 4 }}
        />
      )}
      <Text
        numberOfLines={1}
        style={{
          color: colors.text,
          fontSize: isSm ? 10 : isLg ? 13 : 11,
          lineHeight: isSm ? 14 : isLg ? 18 : 15,
          fontWeight: '700',
          flexShrink: 1,
        }}
      >
        {children}
      </Text>
    </View>
  );
};

// ---------------------------------------------------------------------------
// 2. PROGRESS BAR
// ---------------------------------------------------------------------------
export const ProgressBar = ({
  value = 0,
  tone = 'sage',
  size = 'md',
  showLabel = false,
}: {
  value: number;
  tone?: 'sage' | 'amber' | 'rust' | 'rail' | 'blue';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}) => {
  const C = useColors();
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  const getBarColor = () => {
    switch (tone) {
      case 'amber':
        return C.amber;
      case 'rust':
        return C.red;
      case 'rail':
        return C.rail;
      case 'blue':
        return C.blue;
      case 'sage':
      default:
        return C.green;
    }
  };

  const height = size === 'sm' ? 4 : size === 'lg' ? 10 : 6;

  return (
    <View style={{ width: '100%' }}>
      <View
        style={{
          height,
          backgroundColor: C.line,
          borderRadius: 999,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <View
          style={{
            height: '100%',
            backgroundColor: getBarColor(),
            borderRadius: 999,
            width: `${clamped}%`,
          }}
        />
      </View>
      {showLabel && (
        <Text style={{ fontSize: 10, color: C.inkSoft, fontWeight: '600', marginTop: 2, textAlign: 'right' }}>
          {clamped}%
        </Text>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// 3. BUTTON COMPONENT
// ---------------------------------------------------------------------------
export const Button = ({
  children,
  onPress,
  variant = 'primary',
  tone,
  size = 'md',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'success' | 'rail';
  tone?: 'primary' | 'danger' | 'warning' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  style?: any;
}) => {
  const C = useColors();
  const getStyles = () => {
    if (disabled) {
      return { bg: C.sunken, border: C.line, text: C.inkFaint, iconColor: C.inkFaint };
    }
    if (variant === 'outline') {
      return {
        bg: C.paper,
        border: tone === 'danger' ? C.red : C.lineStrong,
        text: tone === 'danger' ? C.red : C.inkSoft,
        iconColor: tone === 'danger' ? C.red : C.inkSoft,
      };
    }
    if (variant === 'ghost') {
      return { bg: 'transparent', border: 'transparent', text: C.green, iconColor: C.green };
    }
    if (variant === 'danger' || tone === 'danger') {
      return { bg: C.red, border: C.red, text: C.paper, iconColor: C.paper };
    }
    if (variant === 'rail') {
      return { bg: C.rail, border: C.rail, text: C.paper, iconColor: C.paper };
    }
    // Primary / default
    return { bg: C.green, border: C.green, text: C.paper, iconColor: C.paper };
  };

  const btnColors = getStyles();
  const padVertical = size === 'sm' ? 6 : size === 'lg' ? 14 : 10;
  const padHorizontal = size === 'sm' ? 10 : size === 'lg' ? 20 : 14;
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 15 : 13;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        {
          backgroundColor: btnColors.bg,
          borderColor: btnColors.border,
          borderWidth: 1,
          borderRadius: 10,
          paddingVertical: padVertical,
          paddingHorizontal: padHorizontal,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: variant === 'primary' ? C.green : '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: variant === 'primary' ? 0.15 : 0.05,
          shadowRadius: 2,
          elevation: variant === 'primary' ? 1.5 : 0,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={btnColors.text} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon as any} size={fontSize + 2} color={btnColors.iconColor} style={{ marginRight: 6 }} />
          )}
          {/* lineHeight tường minh để dấu tiếng Việt (ổ, ộ, ề) không bị cắt,
              flexShrink để nhãn dài co lại thay vì tràn khỏi nút. */}
          <Text
            numberOfLines={1}
            style={{
              color: btnColors.text,
              fontSize,
              lineHeight: fontSize + 5,
              fontWeight: '700',
              flexShrink: 1,
            }}
          >
            {children}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon as any} size={fontSize + 2} color={btnColors.iconColor} style={{ marginLeft: 6 }} />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------
// 4. STAT TILE COMPONENT
// ---------------------------------------------------------------------------
export const StatTile = ({
  label,
  value,
  subtext,
  tone = 'blue',
  icon,
  onClick,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  tone?: 'blue' | 'sage' | 'amber' | 'rail' | 'rust';
  icon?: string;
  onClick?: () => void;
}) => {
  const C = useColors();
  const getTheme = () => {
    switch (tone) {
      case 'sage':
        return { bg: C.greenSoft, border: C.greenBorder, valColor: C.green, iconColor: C.green };
      case 'amber':
        return { bg: C.amberSoft, border: C.amberBorder, valColor: C.amber, iconColor: C.amber };
      case 'rail':
        return { bg: C.railSoft, border: C.railBorder, valColor: C.rail, iconColor: C.rail };
      case 'rust':
        return { bg: C.redSoft, border: C.redBorder, valColor: C.red, iconColor: C.red };
      case 'blue':
      default:
        return { bg: C.blueSoft, border: C.blueBorder, valColor: C.blue, iconColor: C.blue };
    }
  };

  const theme = getTheme();

  return (
    <TouchableOpacity
      style={{
        flex: 1,
        minWidth: '46%',
        backgroundColor: C.paper,
        borderColor: C.line,
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
      }}
      onPress={onClick}
      disabled={!onClick}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ fontSize: 11, color: C.inkSoft, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 }} numberOfLines={1}>
          {label}
        </Text>
        {icon && (
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={icon as any} size={14} color={theme.iconColor} />
          </View>
        )}
      </View>
      <Text style={{ fontSize: 20, fontWeight: '800', color: theme.valColor, marginBottom: 2 }}>{value}</Text>
      {subtext && <Text style={{ fontSize: 10, color: C.inkFaint }} numberOfLines={1}>{subtext}</Text>}
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------
// 5. JOB LEVEL & ACCESS BADGES
// ---------------------------------------------------------------------------
export const JobLevelBadge = ({ level }: { level: string | number }) => {
  const lvlNum = String(level).replace('L', '');
  return (
    <Badge tone="rail" icon="shield-checkmark">
      Level {lvlNum}
    </Badge>
  );
};

export const LevelAccessBadge = ({ state, userLevel, courseLevel }: { state?: string; userLevel?: string; courseLevel?: string }) => {
  if (state === 'DIRECT_ACCESS' || state === 'COMPLETED') {
    return <Badge tone="sage" icon="lock-open">Đúng Cấp</Badge>;
  }
  if (state === 'REQUESTABLE') {
    return <Badge tone="amber" icon="key">Cần Xin Duyệt</Badge>;
  }
  if (state === 'PENDING_APPROVAL') {
    return <Badge tone="amber" icon="time">Chờ Phê Duyệt</Badge>;
  }
  return <Badge tone="slate" icon="lock-closed">Khóa Cấp Bậc</Badge>;
};

export const CourseTypeBadge = ({ courseType }: { courseType?: string }) => {
  const isMandatory = courseType === 'MANDATORY';
  return (
    <Badge tone={isMandatory ? 'amber' : 'blue'} icon={isMandatory ? 'alert-circle' : 'bookmark'}>
      {isMandatory ? 'Bắt Buộc' : 'Tự Chọn'}
    </Badge>
  );
};

// ---------------------------------------------------------------------------
// 6. CHARTS (BAR, DONUT, LINE)
// ---------------------------------------------------------------------------
export const BarChart = ({
  data = [],
  valueSuffix = 'h',
  tone = 'sage',
}: {
  data: Array<{ label: string; value: number }>;
  valueSuffix?: string;
  tone?: 'sage' | 'blue' | 'amber' | 'rail';
}) => {
  const C = useColors();
  if (!data || data.length === 0) {
    return <Text style={{ color: C.inkFaint, fontSize: 12, textAlign: 'center', padding: 20 }}>Chưa có dữ liệu</Text>;
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barColor = tone === 'blue' ? C.blue : tone === 'amber' ? C.amber : tone === 'rail' ? C.rail : C.green;

  return (
    <View style={{ flexDirection: 'row', height: 140, alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 6 }}>
      {data.map((d, idx) => {
        const heightPct = Math.max(8, (d.value / maxVal) * 100);
        return (
          <View key={idx} style={{ flex: 1, alignItems: 'center', marginHorizontal: 2 }}>
            <Text style={{ fontSize: 9, color: C.inkSoft, fontWeight: '700', marginBottom: 4 }}>
              {d.value > 0 ? `${d.value}${valueSuffix}` : ''}
            </Text>
            <View
              style={{
                width: '75%',
                maxWidth: 24,
                backgroundColor: d.value > 0 ? barColor : C.line,
                borderRadius: 4,
                height: `${heightPct}%`,
              }}
            />
            <Text style={{ fontSize: 10, color: C.inkSoft, fontWeight: '600', marginTop: 6 }}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
};

export const DonutChart = ({
  data = [],
  valueSuffix = ' khóa',
}: {
  data: Array<{ label: string; value: number; tone?: string }>;
  valueSuffix?: string;
}) => {
  const C = useColors();
  if (!data || data.length === 0) return null;
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;

  const getToneColor = (t?: string) => {
    switch (t) {
      case 'sage': return C.green;
      case 'amber': return C.amber;
      case 'rail': return C.rail;
      case 'rust': return C.red;
      case 'purple': return C.purple;
      case 'blue':
      default: return C.blue;
    }
  };

  return (
    <View style={{ paddingVertical: 8 }}>
      {/* Proportion Bar */}
      <View style={{ flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', backgroundColor: C.line, marginBottom: 12 }}>
        {data.map((d, i) => {
          const pct = Math.max(4, Math.round((d.value / total) * 100));
          return (
            <View
              key={i}
              style={{
                width: `${pct}%`,
                backgroundColor: getToneColor(d.tone),
                borderRightWidth: i < data.length - 1 ? 1.5 : 0,
                borderColor: C.paper,
              }}
            />
          );
        })}
      </View>

      {/* Legend list */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {data.map((d, i) => {
          const color = getToneColor(d.tone);
          const pct = Math.round((d.value / total) * 100);
          return (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', width: '48%', marginBottom: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 6 }} />
              <Text style={{ fontSize: 11, color: C.inkSoft, flex: 1 }} numberOfLines={1}>
                {d.label} <Text style={{ fontWeight: '700', color }}>({pct}%)</Text>
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export const LineChart = ({
  data = [],
  valueSuffix = 'h',
  tone = 'rail',
}: {
  data: Array<{ label: string; value: number }>;
  valueSuffix?: string;
  tone?: string;
}) => {
  const C = useColors();
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const color = tone === 'rail' ? C.rail : C.green;

  return (
    <View style={{ paddingVertical: 10 }}>
      <View style={{ flexDirection: 'row', height: 100, alignItems: 'flex-end', justifyContent: 'space-around' }}>
        {data.map((d, idx) => {
          const pct = Math.max(10, (d.value / maxVal) * 80);
          return (
            <View key={idx} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color, marginBottom: 4 }}>
                {d.value}{valueSuffix}
              </Text>
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: color,
                  borderWidth: 3,
                  borderColor: C.paper,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.2,
                  shadowRadius: 2,
                  elevation: 2,
                  marginBottom: pct,
                }}
              />
              <Text style={{ fontSize: 10, color: C.inkSoft, fontWeight: '600' }}>{d.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// 7. MODAL / DIALOG COMPONENT
// ---------------------------------------------------------------------------
export const Modal = ({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) => {
  const C = useColors();
  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: C.paper,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '90%',
            paddingBottom: 24,
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderColor: C.line,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink, flex: 1, marginRight: 10 }} numberOfLines={1}>
              {title || ''}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 6, backgroundColor: C.sunken, borderRadius: 999 }}>
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={{ paddingHorizontal: 20, paddingTop: 16 }}>{children}</ScrollView>
        </View>
      </View>
    </RNModal>
  );
};

// ---------------------------------------------------------------------------
// 8. CERTIFICATE MODAL
// ---------------------------------------------------------------------------
export const CertificateModal = ({
  visible,
  certificate,
  onClose,
  onRetake,
}: {
  visible: boolean;
  certificate: any;
  onClose: () => void;
  onRetake?: () => void;
}) => {
  const C = useColors();
  if (!certificate) return null;

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', padding: 16 }}>
        <View
          style={{
            backgroundColor: C.paper,
            borderRadius: 20,
            padding: 20,
            borderWidth: 2,
            borderColor: C.amber,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 6,
          }}
        >
          {/* Gold Crest */}
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: C.amberSoft,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: C.amber,
              }}
            >
              <Ionicons name="ribbon" size={32} color="#D97706" />
            </View>
            <Text style={{ fontSize: 11, fontWeight: '800', color: C.amber, letterSpacing: 1, marginTop: 6, textTransform: 'uppercase' }}>
              MM Mega Market Vietnam &middot; L&OD Academy
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: C.ink, marginTop: 2, textAlign: 'center' }}>
              CHỨNG NHẬN HOÀN THÀNH
            </Text>
          </View>

          {/* Certificate Body */}
          <View style={{ backgroundColor: C.bg, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.line, marginBottom: 16 }}>
            <Text style={{ fontSize: 11, color: C.inkSoft, textAlign: 'center', marginBottom: 4 }}>Chứng nhận trao cho học viên:</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.rail, textAlign: 'center', marginBottom: 10 }}>
              {certificate.recipientName || 'Minh Tran'}
            </Text>

            <Text style={{ fontSize: 11, color: C.inkSoft, textAlign: 'center', marginBottom: 4 }}>Đã hoàn thành xuất sắc khóa đào tạo chuyên môn:</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: C.ink, textAlign: 'center', marginBottom: 12, lineHeight: 20 }}>
              {certificate.courseName}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: C.line, paddingTop: 8 }}>
              <View>
                <Text style={{ fontSize: 10, color: C.inkFaint }}>Mã Chứng Chỉ:</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.inkSoft }}>{certificate.id}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, color: C.inkFaint }}>Ngày Cấp:</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.inkSoft }}>{certificate.issueDate || '2026-08-20'}</Text>
              </View>
            </View>

            {certificate.score && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ fontSize: 10, color: C.inkFaint }}>Điểm Sát Hạch:</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: C.green }}>{certificate.score}%</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button variant="outline" style={{ flex: 1 }} onPress={onClose}>
              Đóng
            </Button>
            {certificate.recert?.needsRecertification && onRetake && (
              <Button variant="primary" style={{ flex: 1 }} icon="refresh" onPress={onRetake}>
                Thi Tái Cấp
              </Button>
            )}
          </View>
        </View>
      </View>
    </RNModal>
  );
};

// ---------------------------------------------------------------------------
// 9. SURVEY CSAT MODAL (LEVEL 1 / WORKSHOP)
// ---------------------------------------------------------------------------
export const PostTrainingSurveyModal = ({
  visible,
  course,
  type = 'L1',
  onClose,
  onSubmit,
}: {
  visible: boolean;
  course: any;
  type?: 'L1' | 'CLASSROOM_CSAT';
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
}) => {
  const C = useColors();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  if (!visible) return null;

  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: C.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="star" size={20} color="#F59E0B" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>
                {type === 'L1' ? 'Đánh Giá Chất Lượng Bài Học (L1 CSAT)' : 'Khảo Sát Khóa Học & Giảng Viên'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16 }}>
            Ý kiến đóng góp của bạn giúp Ban Đào tạo L&OD MM Mega Market liên tục nâng cao chất lượng bài giảng.
          </Text>

          {/* Star rating */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.ink, marginBottom: 8 }}>
            Mức độ hài lòng của bạn ({rating}/5 sao):
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                <Ionicons name={star <= rating ? 'star' : 'star-outline'} size={36} color="#F59E0B" />
              </TouchableOpacity>
            ))}
          </View>

          <Button
            variant="primary"
            icon="checkmark-circle"
            onPress={() => {
              onSubmit(rating, comment);
              onClose();
            }}
          >
            Gửi Đánh Giá CSAT
          </Button>
        </View>
      </View>
    </RNModal>
  );
};

// ---------------------------------------------------------------------------
// 10. QR SCANNER SIMULATION MODAL
// ---------------------------------------------------------------------------
export const QrScannerModal = ({
  visible,
  session,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  session: any;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const C = useColors();
  const [scanning, setScanning] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanning(true);
      setVerifying(false);
    }
  }, [visible]);

  const handleSimulateScan = () => {
    setScanning(false);
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      onSuccess();
    }, 1200);
  };

  if (!visible) return null;

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'space-between', paddingVertical: 40, paddingHorizontal: 20 }}>
        {/* Top bar */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={{ color: C.paper, fontSize: 16, fontWeight: '800' }}>Quét QR Điểm Danh</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Viewfinder */}
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 260,
              height: 260,
              borderWidth: 2,
              borderColor: verifying ? C.green : '#38BDF8',
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.05)',
            }}
          >
            {verifying ? (
              <View style={{ alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#009E49" />
                <Text style={{ color: C.green, fontWeight: '700', fontSize: 13, marginTop: 10 }}>Đang xác thực điểm danh...</Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="qr-code-outline" size={80} color="rgba(255,255,255,0.7)" />
                <Text style={{ color: C.line, fontSize: 12, marginTop: 12, textAlign: 'center' }}>
                  Hướng camera về mã QR Giảng viên
                </Text>
              </View>
            )}
          </View>

          {session && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 12, marginTop: 20, maxWidth: 300 }}>
              <Text style={{ color: C.paper, fontSize: 12, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>
                {session.title}
              </Text>
              <Text style={{ color: C.inkFaint, fontSize: 11, textAlign: 'center', marginTop: 2 }}>
                GV: {session.trainerName || 'Nguyen Van Hung'}
              </Text>
            </View>
          )}
        </View>

        {/* Scan Action */}
        <View style={{ alignItems: 'center' }}>
          <Button
            variant="primary"
            icon="scan-circle"
            size="lg"
            style={{ width: '100%' }}
            onPress={handleSimulateScan}
            disabled={verifying}
          >
            Mô Phỏng Quét Thành Công
          </Button>
        </View>
      </View>
    </RNModal>
  );
};
