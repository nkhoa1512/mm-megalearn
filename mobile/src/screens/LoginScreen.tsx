import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCourseStore } from '../store/CourseStore';
// @ts-ignore
import { demoUsers, allUsers, currentUser as defaultPersona, divisions } from '../data/mockData';
// @ts-ignore
import { normalizeRole, roleDefinition } from '../data/roles';
// @ts-ignore
import { levelShortLabel } from '../data/levelSystem';
import { Badge, Button } from '../components/ui';

const ROLE_EMOJI: Record<string, string> = {
  learner: '👤',
  manager: '💼',
  trainer: '🎓',
  hrbp: '📊',
  useradmin: '👥',
  sysadmin: '🔒',
};

/**
 * Bản mobile là ứng dụng dành cho học viên, nên màn đăng nhập ưu tiên các persona
 * `learner` thay vì trải đủ 6 role như cổng web. Vẫn cho tra cứu toàn bộ danh bạ
 * để demo bất kỳ nhân sự nào.
 */
export default function LoginScreen() {
  const { login } = useCourseStore();

  const roster = useMemo(() => (typeof allUsers === 'function' ? allUsers() : demoUsers), []);
  const learnerPersonas = useMemo(() => {
    const learners = roster.filter((u: any) => normalizeRole(u.role) === 'learner');
    // Minh Tran là persona demo mặc định — luôn đưa lên đầu danh sách gợi ý.
    const featured = learners.filter((u: any) => u.userId === defaultPersona.userId);
    const rest = learners.filter((u: any) => u.userId !== defaultPersona.userId);
    return [...featured, ...rest].slice(0, 6);
  }, [roster]);

  const [selected, setSelected] = useState<any>(learnerPersonas[0] || defaultPersona);
  const [employeeId, setEmployeeId] = useState<string>((learnerPersonas[0] || defaultPersona).employeeCode);
  const [password, setPassword] = useState('demo1234');
  const [ssoLoading, setSsoLoading] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');

  const filteredRoster = useMemo(() => {
    const q = search.toLowerCase().trim();
    return roster.filter((u: any) => {
      const matchDiv = divisionFilter === 'ALL' || u.divisionCode === divisionFilter;
      if (!matchDiv) return false;
      if (!q) return true;
      return (
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.employeeCode || '').toLowerCase().includes(q) ||
        (u.position || '').toLowerCase().includes(q) ||
        (u.departmentName || '').toLowerCase().includes(q)
      );
    });
  }, [roster, search, divisionFilter]);

  function pick(user: any) {
    setSelected(user);
    setEmployeeId(user.employeeCode);
    setRosterOpen(false);
  }

  function enter(user?: any) {
    login(user || selected);
  }

  function submitCredentials() {
    const typed = employeeId.trim().toLowerCase();
    const matched =
      roster.find(
        (u: any) =>
          (u.employeeCode || '').toLowerCase() === typed || (u.userId || '').toLowerCase() === typed
      ) || selected;
    enter(matched);
  }

  function signInWithSso() {
    setSsoLoading(true);
    setTimeout(() => {
      setSsoLoading(false);
      enter(selected);
    }, 800);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* Brand */}
        <View style={{ alignItems: 'center', marginBottom: 22, marginTop: 8 }}>
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 16,
              backgroundColor: '#009E49',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              shadowColor: '#009E49',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 5,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 23, fontWeight: '900' }}>MM</Text>
          </View>
          <Text style={{ fontSize: 19, fontWeight: '900', color: '#0F172A', letterSpacing: -0.4 }}>
            MM MegaLearn
          </Text>
          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 3, textAlign: 'center' }}>
            Cổng học tập dành cho nhân viên · MM Mega Market Vietnam
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
            <Badge tone="sage" icon="shield-checkmark" size="sm">
              SAP HRIS
            </Badge>
            <Badge tone="blue" icon="cloud-done" size="sm">
              Azure AD SSO
            </Badge>
          </View>
        </View>

        {/* Selected profile card */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>
            Tài khoản đang chọn
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: '#ECFDF5',
                borderWidth: 1.5,
                borderColor: '#A7F3D0',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#047857' }}>
                {selected.avatar || initialsOf(selected.fullName)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                {selected.fullName}
              </Text>
              <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }} numberOfLines={1}>
                {selected.position}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <Badge tone={roleDefinition(selected.role).tone as any} size="sm">
                  {ROLE_EMOJI[normalizeRole(selected.role)] || '👤'} {roleDefinition(selected.role).shortVi}
                </Badge>
                <Badge tone="rail" size="sm">
                  {levelShortLabel(selected.level)}
                </Badge>
                <Badge tone="slate" size="sm">
                  {selected.divisionCode}
                </Badge>
              </View>
            </View>
          </View>
        </View>

        {/* SSO */}
        <TouchableOpacity
          onPress={signInWithSso}
          disabled={ssoLoading}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#FFFFFF',
            borderWidth: 1.5,
            borderColor: '#CBD5E1',
            borderRadius: 12,
            paddingVertical: 13,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          {ssoLoading ? (
            <ActivityIndicator size="small" color="#0078D4" style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name="logo-microsoft" size={18} color="#0078D4" style={{ marginRight: 8 }} />
          )}
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#1E293B' }}>
            {ssoLoading ? 'Đang xác thực Azure AD…' : 'Đăng nhập bằng Microsoft 365'}
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
          <Text style={{ marginHorizontal: 10, fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>
            HOẶC NHẬP MÃ NHÂN VIÊN
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
        </View>

        {/* Credentials */}
        <Field label="Mã nhân viên / User ID" icon="id-card-outline">
          <TextInput
            value={employeeId}
            onChangeText={setEmployeeId}
            placeholder="VD: MMVN-1042"
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
            autoCorrect={false}
            style={inputStyle}
          />
        </Field>

        <Field label="Mật khẩu / Domain PIN" icon="lock-closed-outline">
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            style={inputStyle}
          />
        </Field>

        <Button variant="primary" size="lg" icon="log-in-outline" onPress={submitCredentials} style={{ marginTop: 6 }}>
          {`Vào ứng dụng · ${firstNameOf(selected.fullName)}`}
        </Button>

        {/* Quick personas */}
        <View style={{ marginTop: 26 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>Chọn nhanh học viên</Text>
            <TouchableOpacity onPress={() => setRosterOpen(true)} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#009E49', marginRight: 3 }}>
                Toàn bộ {roster.length} nhân sự
              </Text>
              <Ionicons name="chevron-forward" size={13} color="#009E49" />
            </TouchableOpacity>
          </View>

          {learnerPersonas.map((user: any) => {
            const isSelected = selected.userId === user.userId;
            return (
              <TouchableOpacity
                key={user.userId}
                onPress={() => pick(user)}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isSelected ? '#F0FDFA' : '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: isSelected ? '#0F766E' : '#E2E8F0',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                    {user.fullName}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }} numberOfLines={1}>
                    {user.position}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }} numberOfLines={1}>
                    {user.employeeCode} · {user.divisionCode} · {levelShortLabel(user.level)}
                  </Text>
                </View>
                <Button size="sm" variant={isSelected ? 'primary' : 'outline'} onPress={() => enter(user)}>
                  {isSelected ? 'Vào' : 'Chọn'}
                </Button>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={{ fontSize: 10.5, color: '#94A3B8', textAlign: 'center', marginTop: 20, lineHeight: 16 }}>
          © 2026 MM Mega Market Vietnam · Learning & Organizational Development{'\n'}
          Bảo vệ bởi RBAC & watermark động · ISO-27001
        </Text>
      </ScrollView>

      {/* Full roster browser */}
      <Modal visible={rosterOpen} animationType="slide" onRequestClose={() => setRosterOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top', 'bottom']}>
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderColor: '#E2E8F0',
              backgroundColor: '#FFFFFF',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>Danh bạ nhân sự MMVN</Text>
              <TouchableOpacity onPress={() => setRosterOpen(false)} style={{ padding: 6 }}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F1F5F9',
                borderRadius: 10,
                paddingHorizontal: 10,
                marginBottom: 10,
              }}
            >
              <Ionicons name="search" size={15} color="#94A3B8" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Tìm theo tên, mã NV, chức danh…"
                placeholderTextColor="#94A3B8"
                style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 8, fontSize: 13, color: '#0F172A' }}
              />
              {!!search && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Chip label="Tất cả" active={divisionFilter === 'ALL'} onPress={() => setDivisionFilter('ALL')} />
              {divisions.map((d: any) => (
                <Chip
                  key={d.id}
                  label={d.code}
                  active={divisionFilter === d.code}
                  onPress={() => setDivisionFilter(d.code)}
                />
              ))}
            </ScrollView>
          </View>

          <FlatList
            data={filteredRoster}
            keyExtractor={(u: any) => u.userId}
            initialNumToRender={15}
            contentContainerStyle={{ padding: 12 }}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, marginTop: 40 }}>
                Không tìm thấy nhân sự phù hợp.
              </Text>
            }
            renderItem={({ item }: { item: any }) => (
              <TouchableOpacity
                onPress={() => pick(item)}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                    {item.fullName}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }} numberOfLines={1}>
                    {item.position}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 3 }} numberOfLines={1}>
                    {item.employeeCode} · {item.divisionCode}/{item.departmentCode} · {levelShortLabel(item.level)}
                  </Text>
                </View>
                <Button size="sm" variant="primary" onPress={() => enter(item)}>
                  Vào
                </Button>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const inputStyle = {
  flex: 1,
  paddingVertical: 11,
  paddingHorizontal: 10,
  fontSize: 13.5,
  color: '#0F172A',
} as const;

function Field({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#475569', marginBottom: 6 }}>{label}</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: '#CBD5E1',
          borderRadius: 10,
          paddingHorizontal: 10,
        }}
      >
        <Ionicons name={icon as any} size={16} color="#94A3B8" />
        {children}
      </View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? '#009E49' : '#E2E8F0',
        backgroundColor: active ? '#ECFDF5' : '#FFFFFF',
        marginRight: 6,
      }}
    >
      <Text style={{ fontSize: 11.5, fontWeight: '700', color: active ? '#047857' : '#64748B' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function initialsOf(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function firstNameOf(name = '') {
  const parts = name.split(' ').filter(Boolean);
  return parts[parts.length - 1] || name;
}
