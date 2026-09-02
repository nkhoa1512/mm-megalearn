import React, { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCourseStore } from '../store/CourseStore';
// @ts-ignore
import { currentUser as fallbackUser, deriveCertificates } from '../data/mockData';
// @ts-ignore
import { computeCourseRecertification, RECERTIFICATION_STATE } from '../utils/recertification';
import { Badge, Button, CertificateModal } from '../components/ui';
import { Screen, Card, COLORS, ChipRow, EmptyState, InfoRow } from '../components/layout';

export default function CertificatesScreen() {
  const navigation = useNavigation<any>();
  const { courses, currentUser: authUser, enrollments, certificateTemplates } = useCourseStore();
  const user = authUser || fallbackUser;

  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [filter, setFilter] = useState('ALL');

  const certificates = useMemo(() => {
    const raw = deriveCertificates(courses, user, enrollments, certificateTemplates);
    return raw.map((cert: any) => {
      const course = courses.find((c: any) => c.id === cert.courseId);
      return { ...cert, course, recert: computeCourseRecertification(course, course?.enrollment, cert) };
    });
  }, [courses, user, enrollments, certificateTemplates]);

  const isLifetime = (c: any) => c.isLifetime || c.validityPeriodMonths === 0 || !c.validUntil;

  const activeCount = certificates.filter(
    (c: any) => c.recert.state === RECERTIFICATION_STATE.ACTIVE && !isLifetime(c)
  ).length;
  const lifetimeCount = certificates.filter(isLifetime).length;
  const dueSoonCount = certificates.filter((c: any) => c.recert.state === RECERTIFICATION_STATE.DUE_SOON).length;
  const expiredCount = certificates.filter((c: any) => c.recert.state === RECERTIFICATION_STATE.EXPIRED).length;

  const filtered = useMemo(() => {
    switch (filter) {
      case 'ACTIVE':
        return certificates.filter((c: any) => c.recert.state === RECERTIFICATION_STATE.ACTIVE && !isLifetime(c));
      case 'LIFETIME':
        return certificates.filter(isLifetime);
      case 'DUE_SOON':
        return certificates.filter((c: any) => c.recert.state === RECERTIFICATION_STATE.DUE_SOON);
      case 'EXPIRED':
        return certificates.filter((c: any) => c.recert.state === RECERTIFICATION_STATE.EXPIRED);
      default:
        return certificates;
    }
  }, [certificates, filter]);

  return (
    <Screen title="Chứng Chỉ Số" subtitle={`${certificates.length} chứng chỉ đã nhận`} back>
      <Card style={{ backgroundColor: COLORS.railSoft, borderColor: '#99F6E4' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Ionicons name="shield-checkmark" size={19} color={COLORS.rail} style={{ marginRight: 10 }} />
          <Text style={{ fontSize: 11.5, color: COLORS.rail, flex: 1, lineHeight: 17 }}>
            Chứng chỉ số chính thức của MM Mega Market Việt Nam, cấp tự động sau khi hoàn thành khóa học, có mã QR xác
            thực và cảnh báo tái cấp định kỳ.
          </Text>
        </View>
      </Card>

      {/* Status tiles */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        <StatusTile label="Còn hạn" value={activeCount} color={COLORS.green} />
        <StatusTile label="Vĩnh viễn" value={lifetimeCount} color={COLORS.blue} />
        <StatusTile label="Cận hạn" value={dueSoonCount} color={COLORS.amber} />
        <StatusTile label="Hết hạn" value={expiredCount} color={COLORS.red} />
      </View>

      <ChipRow
        options={[
          { value: 'ALL', label: 'Tất cả', count: certificates.length },
          { value: 'ACTIVE', label: 'Còn hạn', count: activeCount },
          { value: 'LIFETIME', label: 'Vĩnh viễn', count: lifetimeCount },
          { value: 'DUE_SOON', label: 'Cận hạn', count: dueSoonCount },
          { value: 'EXPIRED', label: 'Hết hạn', count: expiredCount },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon="ribbon-outline"
          title="Chưa có chứng chỉ trong nhóm này"
          hint="Hoàn thành khóa học và đạt bài sát hạch để được cấp chứng chỉ số."
        />
      ) : (
        filtered.map((cert: any) => (
          <CertificateCard
            key={cert.id}
            cert={cert}
            onView={() => setSelectedCert(cert)}
            onRetake={() => navigation.navigate('AssessmentPlayer', { courseId: cert.courseId })}
          />
        ))
      )}

      <CertificateModal
        visible={!!selectedCert}
        certificate={selectedCert}
        onClose={() => setSelectedCert(null)}
        onRetake={() => {
          const courseId = selectedCert?.courseId;
          setSelectedCert(null);
          if (courseId) navigation.navigate('AssessmentPlayer', { courseId });
        }}
      />
    </Screen>
  );
}

function StatusTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View
      style={{
        width: '47.6%',
        flexGrow: 1,
        backgroundColor: COLORS.paper,
        borderWidth: 1,
        borderColor: COLORS.line,
        borderRadius: 12,
        padding: 11,
        marginBottom: 6,
      }}
    >
      <Text style={{ fontSize: 10.5, fontWeight: '800', color: COLORS.inkFaint }}>{label.toUpperCase()}</Text>
      <Text style={{ fontSize: 20, fontWeight: '900', color, marginTop: 3 }}>{value}</Text>
    </View>
  );
}

function CertificateCard({ cert, onView, onRetake }: { cert: any; onView: () => void; onRetake: () => void }) {
  const state = cert.recert.state;
  const tone =
    state === RECERTIFICATION_STATE.EXPIRED ? 'rust' : state === RECERTIFICATION_STATE.DUE_SOON ? 'amber' : 'sage';
  const accent =
    state === RECERTIFICATION_STATE.EXPIRED
      ? COLORS.red
      : state === RECERTIFICATION_STATE.DUE_SOON
      ? COLORS.amber
      : COLORS.green;

  return (
    <Card onPress={onView} style={{ borderLeftWidth: 4, borderLeftColor: accent }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: '#FEF3C7',
            borderWidth: 1.5,
            borderColor: '#FDE68A',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 11,
          }}
        >
          <Ionicons name="ribbon" size={20} color="#D97706" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.ink, lineHeight: 18 }} numberOfLines={3}>
            {cert.courseName}
          </Text>
          <Text style={{ fontSize: 10.5, color: COLORS.inkFaint, marginTop: 3 }}>{cert.id}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 9 }}>
        <Badge tone={tone as any} size="sm">
          {cert.recert.statusLabel || 'Còn hiệu lực'}
        </Badge>
        {!!cert.score && (
          <Badge tone="blue" size="sm">
            Điểm {cert.score}%
          </Badge>
        )}
      </View>

      <InfoRow label="Ngày cấp" value={cert.issueDate || '—'} icon="calendar-outline" />
      <InfoRow
        label="Hiệu lực đến"
        value={cert.validUntil || 'Vĩnh viễn'}
        icon="hourglass-outline"
        valueColor={state === RECERTIFICATION_STATE.EXPIRED ? COLORS.red : undefined}
      />

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Button size="sm" variant="outline" icon="eye-outline" style={{ flex: 1 }} onPress={onView}>
          Xem chứng chỉ
        </Button>
        {cert.recert.needsRecertification && (
          <Button
            size="sm"
            variant="primary"
            tone={cert.recert.isExpired ? 'danger' : 'primary'}
            icon="refresh-outline"
            style={{ flex: 1 }}
            onPress={onRetake}
          >
            Thi tái cấp
          </Button>
        )}
      </View>
    </Card>
  );
}
