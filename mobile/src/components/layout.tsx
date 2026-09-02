import React from 'react';
import { ScrollView, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export const COLORS = {
  green: '#009E49',
  greenDark: '#047857',
  greenSoft: '#ECFDF5',
  rail: '#0F766E',
  railSoft: '#F0FDFA',
  ink: '#0F172A',
  inkSoft: '#475569',
  inkFaint: '#94A3B8',
  line: '#E2E8F0',
  paper: '#FFFFFF',
  bg: '#F8FAFC',
  sunken: '#F1F5F9',
  amber: '#D97706',
  amberSoft: '#FFFBEB',
  red: '#DC2626',
  redSoft: '#FEF2F2',
  blue: '#2563EB',
  blueSoft: '#EFF6FF',
  purple: '#7C3AED',
  purpleSoft: '#F5F3FF',
};

/**
 * Khung màn hình chuẩn: safe area + nền + thanh tiêu đề dính trên cùng.
 * `back` bật nút quay lại cho các màn nằm trong stack (không phải tab).
 */
export function Screen({
  title,
  subtitle,
  back = false,
  right,
  children,
  scroll = true,
  contentStyle,
  refreshControl,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  refreshControl?: React.ReactElement<any>;
}) {
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[{ padding: 14, paddingBottom: 28 + insets.bottom }, contentStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top']}>
      <ScreenHeader title={title} subtitle={subtitle} back={back} right={right} />
      {body}
    </SafeAreaView>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
}) {
  const navigation = useNavigation<any>();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 11,
        backgroundColor: COLORS.paper,
        borderBottomWidth: 1,
        borderColor: COLORS.line,
      }}
    >
      {back && (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: COLORS.sunken,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <Ionicons name="chevron-back" size={19} color={COLORS.inkSoft} />
        </TouchableOpacity>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.ink }} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={{ fontSize: 11.5, color: COLORS.inkFaint, marginTop: 1 }} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  padded = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padded?: boolean;
}) {
  const base: ViewStyle = {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: padded ? 14 : 0,
    marginBottom: 12,
  };
  if (onPress) {
    return (
      <TouchableOpacity style={[base, style]} onPress={onPress} activeOpacity={0.85}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export function SectionTitle({
  children,
  icon,
  action,
  onAction,
}: {
  children: React.ReactNode;
  icon?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        marginTop: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {!!icon && <Ionicons name={icon as any} size={15} color={COLORS.rail} style={{ marginRight: 6 }} />}
        <Text style={{ fontSize: 13.5, fontWeight: '800', color: COLORS.ink, flex: 1 }} numberOfLines={1}>
          {children}
        </Text>
      </View>
      {!!action && (
        <TouchableOpacity onPress={onAction} style={{ flexDirection: 'row', alignItems: 'center' }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.green, marginRight: 2 }}>{action}</Text>
          <Ionicons name="chevron-forward" size={13} color={COLORS.green} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  hint,
}: {
  icon?: string;
  title: string;
  hint?: string;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 34, paddingHorizontal: 20 }}>
      <View
        style={{
          width: 54,
          height: 54,
          borderRadius: 27,
          backgroundColor: COLORS.sunken,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Ionicons name={icon as any} size={24} color={COLORS.inkFaint} />
      </View>
      <Text style={{ fontSize: 13.5, fontWeight: '700', color: COLORS.inkSoft, textAlign: 'center' }}>{title}</Text>
      {!!hint && (
        <Text style={{ fontSize: 12, color: COLORS.inkFaint, textAlign: 'center', marginTop: 5, lineHeight: 17 }}>
          {hint}
        </Text>
      )}
    </View>
  );
}

/** Dải chip lọc cuộn ngang — dùng cho danh mục, trạng thái, bộ lọc phòng ban. */
export function ChipRow({
  options,
  value,
  onChange,
  style,
}: {
  options: Array<{ value: string; label: string; count?: number }>;
  value: string;
  onChange: (value: string) => void;
  style?: ViewStyle;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: 8 }}
      style={[{ marginBottom: 10 }, style]}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
            style={{
              paddingVertical: 6.5,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: active ? COLORS.green : COLORS.line,
              backgroundColor: active ? COLORS.greenSoft : COLORS.paper,
              marginRight: 6,
            }}
          >
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: active ? COLORS.greenDark : COLORS.inkSoft }}>
              {opt.label}
              {typeof opt.count === 'number' ? ` (${opt.count})` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/** Bộ chuyển tab dạng phân đoạn, dùng khi chỉ có 2–3 chế độ xem. */
export function Segmented({
  options,
  value,
  onChange,
  style,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: COLORS.sunken,
          borderRadius: 10,
          padding: 3,
          marginBottom: 12,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.85}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: active ? COLORS.paper : 'transparent',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: active ? 0.06 : 0,
              shadowRadius: 2,
              elevation: active ? 1 : 0,
            }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: '700', color: active ? COLORS.ink : COLORS.inkFaint }}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Hàng nhãn — giá trị, dùng nhiều trong các panel chi tiết. */
export function InfoRow({
  label,
  value,
  icon,
  valueColor,
}: {
  label: string;
  value: React.ReactNode;
  icon?: string;
  valueColor?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderColor: COLORS.line,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
        {!!icon && <Ionicons name={icon as any} size={13} color={COLORS.inkFaint} style={{ marginRight: 6 }} />}
        <Text style={{ fontSize: 12, color: COLORS.inkFaint }} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text
          style={{ fontSize: 12.5, fontWeight: '700', color: valueColor || COLORS.ink, maxWidth: '58%' }}
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

/** Nút tròn trên thanh tiêu đề (chuông, AI, đăng xuất…). */
export function HeaderIconButton({
  icon,
  onPress,
  badge,
  tone = 'slate',
}: {
  icon: string;
  onPress?: () => void;
  badge?: number;
  tone?: 'slate' | 'ai' | 'green';
}) {
  const bg = tone === 'ai' ? COLORS.purpleSoft : tone === 'green' ? COLORS.greenSoft : COLORS.sunken;
  const fg = tone === 'ai' ? COLORS.purple : tone === 'green' ? COLORS.greenDark : COLORS.inkSoft;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
      }}
    >
      <Ionicons name={icon as any} size={17} color={fg} />
      {!!badge && badge > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            minWidth: 16,
            height: 16,
            paddingHorizontal: 3,
            borderRadius: 8,
            backgroundColor: COLORS.red,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: COLORS.paper,
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
