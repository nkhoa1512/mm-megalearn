import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { currentUser, deriveCertificates } from '../../data/mockData';
import { Button, Badge, CertificateModal } from '../../features/common/ui';
import { useCourseStore } from '../../store/CourseStore';
import { computeCourseRecertification, RECERTIFICATION_STATE } from '../../utils/recertification';

export default function LearnerCertificates({ user: propUser, basePath = '/learner/courses' }) {
  const navigate = useNavigate();
  const { courses, currentUser: authUser, enrollments, certificateTemplates, language = 'vi' } = useCourseStore();
  const user = propUser || authUser || currentUser;
  const rawCertificates = deriveCertificates(courses, user, enrollments, certificateTemplates);
  const [selectedCert, setSelectedCert] = useState(null);
  const [filterTab, setFilterTab] = useState('ALL'); // ALL | ACTIVE | DUE_SOON | EXPIRED | LIFETIME

  // Enriched certificates with recertification status
  const certificates = useMemo(() => {
    return rawCertificates.map((cert) => {
      const course = courses.find((c) => c.id === cert.courseId);
      const recert = computeCourseRecertification(course, course?.enrollment, cert);
      return {
        ...cert,
        recert,
      };
    });
  }, [rawCertificates, courses]);

  // Counts
  const activeCount = certificates.filter((c) => c.recert.state === RECERTIFICATION_STATE.ACTIVE && !c.isLifetime).length;
  const lifetimeCount = certificates.filter((c) => c.isLifetime || c.validityPeriodMonths === 0 || !c.validUntil).length;
  const dueSoonCount = certificates.filter((c) => c.recert.state === RECERTIFICATION_STATE.DUE_SOON).length;
  const expiredCount = certificates.filter((c) => c.recert.state === RECERTIFICATION_STATE.EXPIRED).length;

  const filteredCerts = useMemo(() => {
    if (filterTab === 'ACTIVE') return certificates.filter((c) => c.recert.state === RECERTIFICATION_STATE.ACTIVE && !c.isLifetime);
    if (filterTab === 'LIFETIME') return certificates.filter((c) => c.isLifetime || c.validityPeriodMonths === 0 || !c.validUntil);
    if (filterTab === 'DUE_SOON') return certificates.filter((c) => c.recert.state === RECERTIFICATION_STATE.DUE_SOON);
    if (filterTab === 'EXPIRED') return certificates.filter((c) => c.recert.state === RECERTIFICATION_STATE.EXPIRED);
    return certificates;
  }, [certificates, filterTab]);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>{language === 'en' ? 'Digital Credentials & Recertification' : 'Chứng Chỉ Số & Hồ Sơ Tái Cấp Định Kỳ'}</h1>
            <Badge tone="sage" icon="ti-certificate">{certificates.length} {language === 'en' ? 'Certificates' : 'Chứng Chỉ Đã Nhận'}</Badge>
          </div>
          <p style={{ margin: 0 }}>
            {language === 'en'
              ? 'Verifiable digital credentials featuring instant QR verification and compliance recertification tracking for MM Mega Market Vietnam.'
              : 'Chứng chỉ số chính thức của MM Mega Market Việt Nam được cấp tự động sau khi hoàn thành khóa học, tích hợp mã QR xác thực và cảnh báo tái cấp định kỳ.'}
          </p>
        </div>
      </div>

      {/* METRICS & STATUS SUMMARY */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div
          className={`card card-pad ${filterTab === 'ALL' ? 'selected' : ''}`}
          onClick={() => setFilterTab('ALL')}
          style={{ cursor: 'pointer', border: filterTab === 'ALL' ? '2px solid var(--rail, #005BAA)' : '1px solid var(--line)', background: filterTab === 'ALL' ? 'rgba(0,91,170,0.06)' : '#fff' }}
        >
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>{language === 'en' ? 'Total Certificates' : 'Tổng Chứng Chỉ'}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink)', marginTop: 2 }}>{certificates.length}</div>
        </div>

        <div
          className={`card card-pad ${filterTab === 'ACTIVE' ? 'selected' : ''}`}
          onClick={() => setFilterTab('ACTIVE')}
          style={{ cursor: 'pointer', border: filterTab === 'ACTIVE' ? '2px solid #16A34A' : '1px solid var(--line)', background: filterTab === 'ACTIVE' ? 'rgba(22,163,74,0.08)' : '#fff' }}
        >
          <div style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>{language === 'en' ? 'Valid (Active)' : 'Còn Hạn Định Kỳ'}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#16A34A', marginTop: 2 }}>{activeCount}</div>
        </div>

        <div
          className={`card card-pad ${filterTab === 'LIFETIME' ? 'selected' : ''}`}
          onClick={() => setFilterTab('LIFETIME')}
          style={{ cursor: 'pointer', border: filterTab === 'LIFETIME' ? '2px solid #7C3AED' : '1px solid var(--line)', background: filterTab === 'LIFETIME' ? 'rgba(124,58,237,0.08)' : '#fff' }}
        >
          <div style={{ fontSize: 12, color: '#6D28D9', fontWeight: 600 }}>{language === 'en' ? 'Lifetime' : 'Chứng Chỉ Vĩnh Viễn'}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#7C3AED', marginTop: 2 }}>{lifetimeCount}</div>
        </div>

        <div
          className={`card card-pad ${filterTab === 'DUE_SOON' ? 'selected' : ''}`}
          onClick={() => setFilterTab('DUE_SOON')}
          style={{ cursor: 'pointer', border: filterTab === 'DUE_SOON' ? '2px solid #D97706' : '1px solid var(--line)', background: filterTab === 'DUE_SOON' ? 'rgba(217,119,6,0.08)' : '#fff' }}
        >
          <div style={{ fontSize: 12, color: '#B45309', fontWeight: 600 }}>{language === 'en' ? 'Due Soon (<= 30 Days)' : 'Cận Hạn Tái Cấp'}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#D97706', marginTop: 2 }}>{dueSoonCount}</div>
        </div>

        <div
          className={`card card-pad ${filterTab === 'EXPIRED' ? 'selected' : ''}`}
          onClick={() => setFilterTab('EXPIRED')}
          style={{ cursor: 'pointer', border: filterTab === 'EXPIRED' ? '2px solid #DC2626' : '1px solid var(--line)', background: filterTab === 'EXPIRED' ? 'rgba(220,38,38,0.08)' : '#fff' }}
        >
          <div style={{ fontSize: 12, color: '#991B1B', fontWeight: 600 }}>{language === 'en' ? 'Expired / Needs Recert' : 'Đã Hết Hạn / Cần Thi Lại'}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#DC2626', marginTop: 2 }}>{expiredCount}</div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        <Button size="sm" variant={filterTab === 'ALL' ? 'primary' : 'outline'} onClick={() => setFilterTab('ALL')}>
          {language === 'en' ? 'All' : 'Tất Cả'} ({certificates.length})
        </Button>
        <Button size="sm" variant={filterTab === 'ACTIVE' ? 'primary' : 'outline'} tone="success" onClick={() => setFilterTab('ACTIVE')}>
          {language === 'en' ? 'Active' : 'Còn Hạn Định Kỳ'} ({activeCount})
        </Button>
        <Button size="sm" variant={filterTab === 'LIFETIME' ? 'primary' : 'outline'} onClick={() => setFilterTab('LIFETIME')}>
          {language === 'en' ? 'Lifetime' : 'Vĩnh Viễn'} ({lifetimeCount})
        </Button>
        <Button size="sm" variant={filterTab === 'DUE_SOON' ? 'primary' : 'outline'} tone="warning" onClick={() => setFilterTab('DUE_SOON')}>
          {language === 'en' ? 'Due Soon' : 'Cận Hạn Tái Cấp'} ({dueSoonCount})
        </Button>
        <Button size="sm" variant={filterTab === 'EXPIRED' ? 'primary' : 'outline'} tone="danger" onClick={() => setFilterTab('EXPIRED')}>
          {language === 'en' ? 'Expired' : 'Đã Hết Hạn'} ({expiredCount})
        </Button>
      </div>

      {filteredCerts.length === 0 ? (
        <div className="card empty-state" style={{ background: '#fff', padding: 40 }}>
          <i className="ti ti-certificate" aria-hidden="true" style={{ fontSize: 36, color: 'var(--ink-faint)' }} />
          <p style={{ marginTop: 10 }}>{language === 'en' ? 'No certificates found in this filter category.' : 'Không có chứng chỉ nào trong mục bộ lọc này.'}</p>
        </div>
      ) : (
        <div className="grid grid-auto">
          {filteredCerts.map((cert) => {
            const { recert } = cert;
            const isLifetime = cert.isLifetime || cert.validityPeriodMonths === 0 || !cert.validUntil;

            return (
              <div
                className="card card-pad card-interactive"
                key={cert.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: '#fff',
                  border: recert.isExpired ? '1.5px solid #DC2626' : recert.isDueSoon ? '1.5px solid #D97706' : isLifetime ? '1.5px solid #8B5CF6' : '1px solid var(--line)',
                  borderRadius: 10,
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'start', marginBottom: 12 }}>
                    <div
                      className="activity-icon"
                      style={{
                        width: 46,
                        height: 46,
                        background: recert.isExpired ? '#FEE2E2' : recert.isDueSoon ? '#FEF3C7' : isLifetime ? '#F3E8FF' : '#DCFCE7',
                        color: recert.isExpired ? '#DC2626' : recert.isDueSoon ? '#D97706' : isLifetime ? '#7C3AED' : '#16A34A',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                        flexShrink: 0,
                      }}
                    >
                      <i className={`ti ${recert.isExpired ? 'ti-alert-circle' : isLifetime ? 'ti-rosette' : 'ti-certificate'}`} aria-hidden="true" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 2 }}>
                        <div style={{ fontWeight: 800, fontSize: 14.5, color: '#0F172A', lineHeight: 1.3 }}>{cert.courseName}</div>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace', marginTop: 2 }}>{cert.id}</div>
                      <div style={{ marginTop: 6 }}>
                        <Badge tone={isLifetime ? 'purple' : recert.badgeTone} size="sm">
                          {isLifetime ? 'Chứng Chỉ Vĩnh Viễn' : recert.statusLabel}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--paper-sunken)', padding: '10px 12px', borderRadius: 8, marginBottom: 14, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: 'var(--ink-soft)' }}>{language === 'en' ? 'Issue Date:' : 'Ngày Cấp:'}</span>
                      <strong>{cert.issueDate}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: 'var(--ink-soft)' }}>{language === 'en' ? 'Valid Until:' : 'Hạn Hiệu Lực:'}</span>
                      <strong style={{ color: isLifetime ? '#7C3AED' : recert.isExpired ? '#DC2626' : recert.isDueSoon ? '#D97706' : '#0F172A' }}>
                        {isLifetime ? 'Vĩnh Viễn (Lifetime)' : cert.validUntil}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: 'var(--ink-soft)' }}>{language === 'en' ? 'Score:' : 'Điểm Đạt:'}</span>
                      <strong style={{ color: '#16A34A' }}>{cert.score != null ? `${cert.score}%` : 'Passed'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--line)', paddingTop: 4, marginTop: 4 }}>
                      <span style={{ color: 'var(--ink-soft)' }}>Người Ký:</span>
                      <span style={{ color: '#0F172A', fontWeight: 600 }}>{cert.template?.signerName || 'Bruno Jousselin'}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      block
                      variant="outline"
                      size="sm"
                      icon="ti-eye"
                      onClick={() => setSelectedCert(cert)}
                    >
                      {language === 'en' ? 'View Certificate & QR' : 'Xem Chứng Chỉ & QR'}
                    </Button>
                    {recert.needsRecertification && (
                      <Button
                        variant="primary"
                        size="sm"
                        tone={recert.isExpired ? 'danger' : 'primary'}
                        icon="ti-refresh"
                        onClick={() => navigate(`${basePath}/${cert.courseId}`)}
                      >
                        {recert.actionLabel}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Certificate Preview Modal */}
      <CertificateModal
        certificate={selectedCert}
        isOpen={Boolean(selectedCert)}
        onClose={() => setSelectedCert(null)}
      />
    </>
  );
}
