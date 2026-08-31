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
  const [filterTab, setFilterTab] = useState('ALL'); // ALL | ACTIVE | DUE_SOON | EXPIRED

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
  const activeCount = certificates.filter((c) => c.recert.state === RECERTIFICATION_STATE.ACTIVE).length;
  const dueSoonCount = certificates.filter((c) => c.recert.state === RECERTIFICATION_STATE.DUE_SOON).length;
  const expiredCount = certificates.filter((c) => c.recert.state === RECERTIFICATION_STATE.EXPIRED).length;

  const filteredCerts = useMemo(() => {
    if (filterTab === 'ACTIVE') return certificates.filter((c) => c.recert.state === RECERTIFICATION_STATE.ACTIVE);
    if (filterTab === 'DUE_SOON') return certificates.filter((c) => c.recert.state === RECERTIFICATION_STATE.DUE_SOON);
    if (filterTab === 'EXPIRED') return certificates.filter((c) => c.recert.state === RECERTIFICATION_STATE.EXPIRED);
    return certificates;
  }, [certificates, filterTab]);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>{language === 'en' ? 'Digital Credentials & Recertification' : 'Chứng Chỉ Số & Lịch Tái Cấp Định Kỳ'}</h1>
            <Badge tone="sage" icon="ti-certificate">{certificates.length} {language === 'en' ? 'Certificates' : 'Chứng Chỉ'}</Badge>
          </div>
          <p style={{ margin: 0 }}>
            {language === 'en'
              ? 'Verifiable digital credentials featuring instant QR verification and annual compliance recertification tracking.'
              : 'Chứng chỉ số được cấp tự động sau khi hoàn thành khóa học, tích hợp mã QR xác thực và theo dõi chu kỳ tái cấp định kỳ hàng năm.'}
          </p>
        </div>
      </div>

      {/* METRICS & STATUS SUMMARY */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div
          className={`card card-pad ${filterTab === 'ALL' ? 'selected' : ''}`}
          onClick={() => setFilterTab('ALL')}
          style={{ cursor: 'pointer', border: filterTab === 'ALL' ? '2px solid var(--rail)' : '1px solid var(--line)', background: filterTab === 'ALL' ? 'var(--rail-soft)' : 'var(--paper-raised)' }}
        >
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>{language === 'en' ? 'Total Certificates' : 'Tổng Chứng Chỉ Đã Nhận'}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginTop: 2 }}>{certificates.length}</div>
        </div>

        <div
          className={`card card-pad ${filterTab === 'ACTIVE' ? 'selected' : ''}`}
          onClick={() => setFilterTab('ACTIVE')}
          style={{ cursor: 'pointer', border: filterTab === 'ACTIVE' ? '2px solid var(--bigc-green)' : '1px solid var(--line)', background: filterTab === 'ACTIVE' ? 'var(--bigc-green-soft)' : 'var(--paper-raised)' }}
        >
          <div style={{ fontSize: 12, color: 'var(--bigc-green-soft-text)', fontWeight: 600 }}>{language === 'en' ? 'Valid & Active' : 'Còn Hiệu Lực'}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--bigc-green)', marginTop: 2 }}>{activeCount}</div>
        </div>

        <div
          className={`card card-pad ${filterTab === 'DUE_SOON' ? 'selected' : ''}`}
          onClick={() => setFilterTab('DUE_SOON')}
          style={{ cursor: 'pointer', border: filterTab === 'DUE_SOON' ? '2px solid var(--amber)' : '1px solid var(--line)', background: filterTab === 'DUE_SOON' ? 'var(--amber-soft)' : 'var(--paper-raised)' }}
        >
          <div style={{ fontSize: 12, color: 'var(--amber-soft-text)', fontWeight: 600 }}>{language === 'en' ? 'Due Soon (<= 30 Days)' : 'Cận Hạn Tái Cấp (<= 30 Ngày)'}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)', marginTop: 2 }}>{dueSoonCount}</div>
        </div>

        <div
          className={`card card-pad ${filterTab === 'EXPIRED' ? 'selected' : ''}`}
          onClick={() => setFilterTab('EXPIRED')}
          style={{ cursor: 'pointer', border: filterTab === 'EXPIRED' ? '2px solid var(--rust)' : '1px solid var(--line)', background: filterTab === 'EXPIRED' ? 'var(--rust-soft)' : 'var(--paper-raised)' }}
        >
          <div style={{ fontSize: 12, color: 'var(--rust-soft-text)', fontWeight: 600 }}>{language === 'en' ? 'Expired / Needs Recertification' : 'Đã Hết Hạn / Cần Tái Cấp'}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rust)', marginTop: 2 }}>{expiredCount}</div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
        <Button size="sm" variant={filterTab === 'ALL' ? 'primary' : 'outline'} onClick={() => setFilterTab('ALL')}>
          {language === 'en' ? 'All' : 'Tất Cả'} ({certificates.length})
        </Button>
        <Button size="sm" variant={filterTab === 'ACTIVE' ? 'primary' : 'outline'} tone="success" onClick={() => setFilterTab('ACTIVE')}>
          {language === 'en' ? 'Active' : 'Còn Hiệu Lực'} ({activeCount})
        </Button>
        <Button size="sm" variant={filterTab === 'DUE_SOON' ? 'primary' : 'outline'} tone="warning" onClick={() => setFilterTab('DUE_SOON')}>
          {language === 'en' ? 'Due Soon' : 'Cận Hạn Tái Cấp'} ({dueSoonCount})
        </Button>
        <Button size="sm" variant={filterTab === 'EXPIRED' ? 'primary' : 'outline'} tone="danger" onClick={() => setFilterTab('EXPIRED')}>
          {language === 'en' ? 'Expired' : 'Đã Hết Hạn'} ({expiredCount})
        </Button>
      </div>

      {filteredCerts.length === 0 ? (
        <div className="card empty-state">
          <i className="ti ti-certificate" aria-hidden="true" />
          <p>{language === 'en' ? 'No certificates found in this category.' : 'Không có chứng chỉ nào trong mục này.'}</p>
        </div>
      ) : (
        <div className="grid grid-auto">
          {filteredCerts.map((cert) => {
            const { recert } = cert;
            return (
              <div
                className="card card-pad card-interactive"
                key={cert.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: recert.isExpired ? '1.5px solid var(--rust)' : recert.isDueSoon ? '1.5px solid var(--amber)' : '1px solid var(--line)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'start', marginBottom: 12 }}>
                    <div
                      className="activity-icon"
                      style={{
                        width: 44,
                        height: 44,
                        background: recert.isExpired ? 'var(--rust-soft)' : recert.isDueSoon ? 'var(--amber-soft)' : 'var(--bigc-green-soft)',
                        color: recert.isExpired ? 'var(--rust)' : recert.isDueSoon ? 'var(--amber)' : 'var(--bigc-green)',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        flexShrink: 0,
                      }}
                    >
                      <i className={`ti ${recert.isExpired ? 'ti-alert-circle' : 'ti-certificate'}`} aria-hidden="true" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 2 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{cert.courseName}</div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{cert.id}</div>
                      <div style={{ marginTop: 6 }}>
                        <Badge tone={recert.badgeTone} size="sm">
                          {recert.statusLabel}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--paper-sunken)', padding: '10px 12px', borderRadius: 6, marginBottom: 14, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: 'var(--ink-soft)' }}>{language === 'en' ? 'Issue Date:' : 'Ngày Cấp:'}</span>
                      <strong>{cert.issueDate}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: 'var(--ink-soft)' }}>{language === 'en' ? 'Valid Until:' : 'Hạn Hiệu Lực:'}</span>
                      <strong style={{ color: recert.isExpired ? 'var(--rust)' : recert.isDueSoon ? 'var(--amber)' : 'var(--ink)' }}>
                        {cert.validUntil}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--ink-soft)' }}>{language === 'en' ? 'Score:' : 'Điểm Đạt:'}</span>
                      <strong style={{ color: 'var(--sage)' }}>{cert.score != null ? `${cert.score}%` : 'Passed'}</strong>
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
                      {language === 'en' ? 'View & Verify QR' : 'Xem & Xác Thực QR'}
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



