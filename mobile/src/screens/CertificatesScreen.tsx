import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Badge, Button, CertificateModal } from '../components/ui';
import { useCourseStore } from '../store/CourseStore';
import { deriveCertificates } from '../data/mockData';
import { computeCourseRecertification, RECERTIFICATION_STATE } from '../utils/recertification';

export default function CertificatesScreen() {
  const navigation = useNavigation<any>();
  const { currentUser, courses: allCourses, myEnrollments } = useCourseStore();
  const user = currentUser;

  const rawCertificates = useMemo(() => deriveCertificates(allCourses, user), [allCourses, user]);
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'DUE_SOON' | 'EXPIRED'>('ALL');

  // Enriched certificates with recertification
  const certificates = useMemo(() => {
    return rawCertificates.map((cert: any) => {
      const course = allCourses.find((c: any) => c.id === cert.courseId);
      const recert = computeCourseRecertification(course, course?.enrollment, cert);
      return {
        ...cert,
        recert,
      };
    });
  }, [rawCertificates, allCourses]);

  const activeCount = certificates.filter((c: any) => c.recert.state === RECERTIFICATION_STATE.ACTIVE).length;
  const dueSoonCount = certificates.filter((c: any) => c.recert.state === RECERTIFICATION_STATE.DUE_SOON).length;
  const expiredCount = certificates.filter((c: any) => c.recert.state === RECERTIFICATION_STATE.EXPIRED).length;

  const filtered = useMemo(() => {
    if (filterTab === 'ACTIVE') return certificates.filter((c: any) => c.recert.state === RECERTIFICATION_STATE.ACTIVE);
    if (filterTab === 'DUE_SOON') return certificates.filter((c: any) => c.recert.state === RECERTIFICATION_STATE.DUE_SOON);
    if (filterTab === 'EXPIRED') return certificates.filter((c: any) => c.recert.state === RECERTIFICATION_STATE.EXPIRED);
    return certificates;
  }, [certificates, filterTab]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header Bar */}
      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B' }}>
          Chứng Chỉ Số &amp; Lịch Tái Cấp Định Kỳ
        </Text>
        <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
          Chứng chỉ điện tử chính thức của MMVN &middot; {certificates.length} chứng chỉ đã nhận
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* 1. METRIC TILES */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 }}>
          <TouchableOpacity
            style={{
              width: '48%',
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: filterTab === 'ALL' ? '#009E49' : '#E2E8F0',
              padding: 12,
              marginBottom: 10,
            }}
            onPress={() => setFilterTab('ALL')}
          >
            <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>Tổng Số Chứng Chỉ</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B', marginTop: 2 }}>{certificates.length}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              width: '48%',
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: filterTab === 'ACTIVE' ? '#009E49' : '#E2E8F0',
              padding: 12,
              marginBottom: 10,
            }}
            onPress={() => setFilterTab('ACTIVE')}
          >
            <Text style={{ fontSize: 11, color: '#047857', fontWeight: '700' }}>Còn Hiệu Lực</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#009E49', marginTop: 2 }}>{activeCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              width: '48%',
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: filterTab === 'DUE_SOON' ? '#D97706' : '#E2E8F0',
              padding: 12,
            }}
            onPress={() => setFilterTab('DUE_SOON')}
          >
            <Text style={{ fontSize: 11, color: '#B45309', fontWeight: '700' }}>Cận Hạn (&le;30 Ngày)</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#D97706', marginTop: 2 }}>{dueSoonCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              width: '48%',
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: filterTab === 'EXPIRED' ? '#DC2626' : '#E2E8F0',
              padding: 12,
            }}
            onPress={() => setFilterTab('EXPIRED')}
          >
            <Text style={{ fontSize: 11, color: '#B91C1C', fontWeight: '700' }}>Đã Hết Hạn</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#DC2626', marginTop: 2 }}>{expiredCount}</Text>
          </TouchableOpacity>
        </View>

        {/* 2. FILTER TABS */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          {[
            { id: 'ALL', label: 'Tất Cả' },
            { id: 'ACTIVE', label: 'Còn Hiệu Lực' },
            { id: 'DUE_SOON', label: 'Cận Hạn' },
            { id: 'EXPIRED', label: 'Hết Hạn' },
          ].map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setFilterTab(t.id as any)}
              style={{
                backgroundColor: filterTab === t.id ? '#009E49' : '#FFFFFF',
                borderColor: filterTab === t.id ? '#009E49' : '#E2E8F0',
                borderWidth: 1,
                borderRadius: 20,
                paddingVertical: 6,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: filterTab === t.id ? '#FFFFFF' : '#475569' }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 3. CERTIFICATES LIST */}
        {filtered.length === 0 ? (
          <View style={{ padding: 32, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
            <Ionicons name="ribbon-outline" size={40} color="#94A3B8" style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', textAlign: 'center' }}>
              Chưa có chứng chỉ trong danh mục này
            </Text>
          </View>
        ) : (
          filtered.map((cert: any) => (
            <View
              key={cert.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: cert.recert.isExpired ? '#FECACA' : cert.recert.isDueSoon ? '#FDE68A' : '#E2E8F0',
                marginBottom: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 3,
                elevation: 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: cert.recert.isExpired ? '#FEE2E2' : cert.recert.isDueSoon ? '#FEF3C7' : '#ECFDF5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Ionicons
                    name="ribbon"
                    size={24}
                    color={cert.recert.isExpired ? '#DC2626' : cert.recert.isDueSoon ? '#D97706' : '#009E49'}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#1E293B', marginBottom: 2 }} numberOfLines={2}>
                    {cert.courseName}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: '#94A3B8', fontFamily: 'monospace' }}>
                    {cert.id}
                  </Text>
                  <View style={{ marginTop: 6 }}>
                    <Badge tone={cert.recert.badgeTone} size="sm">
                      {cert.recert.statusLabel}
                    </Badge>
                  </View>
                </View>
              </View>

              <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>Ngày cấp:</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B' }}>{cert.issueDate || '2026-08-20'}</Text>
                </View>
                {cert.validUntil && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>Hết hạn:</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: cert.recert.isExpired ? '#DC2626' : '#1E293B' }}>
                      {cert.validUntil}
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  variant="outline"
                  size="sm"
                  icon="eye"
                  style={{ flex: 1 }}
                  onPress={() => setSelectedCert(cert)}
                >
                  Xem Chứng Chỉ
                </Button>

                {cert.recert.needsRecertification && (
                  <Button
                    variant="primary"
                    tone="warning"
                    size="sm"
                    icon="refresh"
                    style={{ flex: 1 }}
                    onPress={() => navigation.navigate('AssessmentPlayer', { courseId: cert.courseId })}
                  >
                    Thi Tái Cấp
                  </Button>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* CERTIFICATE MODAL */}
      <CertificateModal
        visible={Boolean(selectedCert)}
        certificate={selectedCert}
        onClose={() => setSelectedCert(null)}
        onRetake={() => {
          const courseId = selectedCert?.courseId;
          setSelectedCert(null);
          navigation.navigate('AssessmentPlayer', { courseId });
        }}
      />
    </SafeAreaView>
  );
}
