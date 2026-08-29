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
  const getColors = () => {
    switch (tone) {
      case 'amber':
      case 'warning':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A', iconColor: '#D97706' };
      case 'sage':
      case 'success':
        return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0', iconColor: '#059669' };
      case 'rust':
      case 'danger':
        return { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA', iconColor: '#DC2626' };
      case 'rail':
        return { bg: '#CCFBF1', text: '#0F766E', border: '#99F6E4', iconColor: '#0D9488' };
      case 'ai':
      case 'purple':
        return { bg: '#EDE9FE', text: '#6D28D9', border: '#DDD6FE', iconColor: '#7C3AED' };
      case 'slate':
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', iconColor: '#64748B' };
      case 'blue':
      case 'primary':
      default:
        return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', iconColor: '#2563EB' };
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
        style={{
          color: colors.text,
          fontSize: isSm ? 10 : isLg ? 13 : 11,
          fontWeight: '700',
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
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  const getBarColor = () => {
    switch (tone) {
      case 'amber':
        return '#F59E0B';
      case 'rust':
        return '#EF4444';
      case 'rail':
        return '#0F766E';
      case 'blue':
        return '#2563EB';
      case 'sage':
      default:
        return '#009E49';
    }
  };

  const height = size === 'sm' ? 4 : size === 'lg' ? 10 : 6;

  return (
    <View style={{ width: '100%' }}>
      <View
        style={{
          height,
          backgroundColor: '#E2E8F0',
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
        <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '600', marginTop: 2, textAlign: 'right' }}>
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
  const getStyles = () => {
    if (disabled) {
      return {
        bg: '#F1F5F9',
        border: '#E2E8F0',
        text: '#94A3B8',
        iconColor: '#94A3B8',
      };
    }
    if (variant === 'outline') {
      return {
        bg: '#FFFFFF',
        border: tone === 'danger' ? '#EF4444' : '#CBD5E1',
        text: tone === 'danger' ? '#DC2626' : '#334155',
        iconColor: tone === 'danger' ? '#DC2626' : '#334155',
      };
    }
    if (variant === 'ghost') {
      return {
        bg: 'transparent',
        border: 'transparent',
        text: '#009E49',
        iconColor: '#009E49',
      };
    }
    if (variant === 'danger' || tone === 'danger') {
      return {
        bg: '#DC2626',
        border: '#DC2626',
        text: '#FFFFFF',
        iconColor: '#FFFFFF',
      };
    }
    if (variant === 'rail') {
      return {
        bg: '#0F766E',
        border: '#0F766E',
        text: '#FFFFFF',
        iconColor: '#FFFFFF',
      };
    }
    // Primary / default
    return {
      bg: '#009E49',
      border: '#009E49',
      text: '#FFFFFF',
      iconColor: '#FFFFFF',
    };
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
          shadowColor: variant === 'primary' ? '#009E49' : '#000',
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
          <Text style={{ color: btnColors.text, fontSize, fontWeight: '700' }}>{children}</Text>
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
  const getTheme = () => {
    switch (tone) {
      case 'sage':
        return { bg: '#F0FDF4', border: '#BBF7D0', valColor: '#009E49', iconColor: '#009E49' };
      case 'amber':
        return { bg: '#FFFBEB', border: '#FDE68A', valColor: '#D97706', iconColor: '#D97706' };
      case 'rail':
        return { bg: '#F0FDFA', border: '#99F6E4', valColor: '#0F766E', iconColor: '#0F766E' };
      case 'rust':
        return { bg: '#FEF2F2', border: '#FECACA', valColor: '#DC2626', iconColor: '#DC2626' };
      case 'blue':
      default:
        return { bg: '#EFF6FF', border: '#BFDBFE', valColor: '#2563EB', iconColor: '#2563EB' };
    }
  };

  const theme = getTheme();

  return (
    <TouchableOpacity
      style={{
        flex: 1,
        minWidth: '46%',
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
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
        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 }} numberOfLines={1}>
          {label}
        </Text>
        {icon && (
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={icon as any} size={14} color={theme.iconColor} />
          </View>
        )}
      </View>
      <Text style={{ fontSize: 20, fontWeight: '800', color: theme.valColor, marginBottom: 2 }}>{value}</Text>
      {subtext && <Text style={{ fontSize: 10, color: '#94A3B8' }} numberOfLines={1}>{subtext}</Text>}
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
  if (!data || data.length === 0) {
    return <Text style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', padding: 20 }}>Chưa có dữ liệu</Text>;
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barColor = tone === 'blue' ? '#2563EB' : tone === 'amber' ? '#F59E0B' : tone === 'rail' ? '#0F766E' : '#009E49';

  return (
    <View style={{ flexDirection: 'row', height: 140, alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 6 }}>
      {data.map((d, idx) => {
        const heightPct = Math.max(8, (d.value / maxVal) * 100);
        return (
          <View key={idx} style={{ flex: 1, alignItems: 'center', marginHorizontal: 2 }}>
            <Text style={{ fontSize: 9, color: '#64748B', fontWeight: '700', marginBottom: 4 }}>
              {d.value > 0 ? `${d.value}${valueSuffix}` : ''}
            </Text>
            <View
              style={{
                width: '75%',
                maxWidth: 24,
                backgroundColor: d.value > 0 ? barColor : '#E2E8F0',
                borderRadius: 4,
                height: `${heightPct}%`,
              }}
            />
            <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '600', marginTop: 6 }}>{d.label}</Text>
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
  if (!data || data.length === 0) return null;
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;

  const getToneColor = (t?: string) => {
    switch (t) {
      case 'sage': return '#009E49';
      case 'amber': return '#F59E0B';
      case 'rail': return '#0F766E';
      case 'rust': return '#EF4444';
      case 'purple': return '#7C3AED';
      case 'blue':
      default: return '#2563EB';
    }
  };

  return (
    <View style={{ paddingVertical: 8 }}>
      {/* Proportion Bar */}
      <View style={{ flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', backgroundColor: '#E2E8F0', marginBottom: 12 }}>
        {data.map((d, i) => {
          const pct = Math.max(4, Math.round((d.value / total) * 100));
          return (
            <View
              key={i}
              style={{
                width: `${pct}%`,
                backgroundColor: getToneColor(d.tone),
                borderRightWidth: i < data.length - 1 ? 1.5 : 0,
                borderColor: '#FFFFFF',
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
              <Text style={{ fontSize: 11, color: '#334155', flex: 1 }} numberOfLines={1}>
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
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const color = tone === 'rail' ? '#0F766E' : '#009E49';

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
                  borderColor: '#FFFFFF',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.2,
                  shadowRadius: 2,
                  elevation: 2,
                  marginBottom: pct,
                }}
              />
              <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '600' }}>{d.label}</Text>
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
  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: '#FFFFFF',
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
              borderColor: '#E2E8F0',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B', flex: 1, marginRight: 10 }} numberOfLines={1}>
              {title || ''}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 6, backgroundColor: '#F1F5F9', borderRadius: 999 }}>
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
  if (!certificate) return null;

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', padding: 16 }}>
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 20,
            borderWidth: 2,
            borderColor: '#D97706',
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
                backgroundColor: '#FEF3C7',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: '#F59E0B',
              }}
            >
              <Ionicons name="ribbon" size={32} color="#D97706" />
            </View>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#D97706', letterSpacing: 1, marginTop: 6, textTransform: 'uppercase' }}>
              MM Mega Market Vietnam &middot; L&OD Academy
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1E293B', marginTop: 2, textAlign: 'center' }}>
              CHỨNG NHẬN HOÀN THÀNH
            </Text>
          </View>

          {/* Certificate Body */}
          <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
            <Text style={{ fontSize: 11, color: '#64748B', textAlign: 'center', marginBottom: 4 }}>Chứng nhận trao cho học viên:</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F766E', textAlign: 'center', marginBottom: 10 }}>
              {certificate.recipientName || 'Minh Tran'}
            </Text>

            <Text style={{ fontSize: 11, color: '#64748B', textAlign: 'center', marginBottom: 4 }}>Đã hoàn thành xuất sắc khóa đào tạo chuyên môn:</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B', textAlign: 'center', marginBottom: 12, lineHeight: 20 }}>
              {certificate.courseName}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#E2E8F0', paddingTop: 8 }}>
              <View>
                <Text style={{ fontSize: 10, color: '#94A3B8' }}>Mã Chứng Chỉ:</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>{certificate.id}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, color: '#94A3B8' }}>Ngày Cấp:</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>{certificate.issueDate || '2026-08-20'}</Text>
              </View>
            </View>

            {certificate.score && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ fontSize: 10, color: '#94A3B8' }}>Điểm Sát Hạch:</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#009E49' }}>{certificate.score}%</Text>
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
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  if (!visible) return null;

  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="star" size={20} color="#F59E0B" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>
                {type === 'L1' ? 'Đánh Giá Chất Lượng Bài Học (L1 CSAT)' : 'Khảo Sát Khóa Học & Giảng Viên'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
            Ý kiến đóng góp của bạn giúp Ban Đào tạo L&OD MM Mega Market liên tục nâng cao chất lượng bài giảng.
          </Text>

          {/* Star rating */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', marginBottom: 8 }}>
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
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>Quét QR Điểm Danh</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Viewfinder */}
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 260,
              height: 260,
              borderWidth: 2,
              borderColor: verifying ? '#009E49' : '#38BDF8',
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.05)',
            }}
          >
            {verifying ? (
              <View style={{ alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#009E49" />
                <Text style={{ color: '#009E49', fontWeight: '700', fontSize: 13, marginTop: 10 }}>Đang xác thực điểm danh...</Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="qr-code-outline" size={80} color="rgba(255,255,255,0.7)" />
                <Text style={{ color: '#E2E8F0', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
                  Hướng camera về mã QR Giảng viên
                </Text>
              </View>
            )}
          </View>

          {session && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 12, marginTop: 20, maxWidth: 300 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>
                {session.title}
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 11, textAlign: 'center', marginTop: 2 }}>
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
