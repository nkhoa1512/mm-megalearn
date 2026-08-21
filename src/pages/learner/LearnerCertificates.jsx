import React, { useState } from 'react';
import { currentUser, deriveCertificates } from '../../data/mockData';
import { Button, Badge, CertificateModal } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';

export default function LearnerCertificates({ user: propUser }) {
  const { courses, currentUser: authUser } = useCourseStore();
  const user = propUser || authUser || currentUser;
  const certificates = deriveCertificates(courses, user);
  const [selectedCert, setSelectedCert] = useState(null);


  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Digital Certificates &amp; Recertification</h1>
            <Badge tone="sage" icon="ti-shield-check">{certificates.length} Valid Certificates</Badge>
          </div>
          <p>
            Certificates are issued automatically upon meeting completion criteria, featuring verifiable QR codes and annual compliance recertification tracking.
          </p>
        </div>
      </div>

      {certificates.length === 0 ? (
        <div className="card empty-state">
          <i className="ti ti-certificate" aria-hidden="true" />
          <p>Complete mandatory courses to earn your first certified credential.</p>
        </div>
      ) : (
        <div className="grid grid-auto">
          {certificates.map((cert) => (
            <div className="card card-pad card-interactive" key={cert.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'start', marginBottom: 14 }}>
                  <div className="activity-icon" style={{ width: 44, height: 44, background: '#FEF3C7', color: '#B45309', borderRadius: 10 }}>
                    <i className="ti ti-certificate" style={{ fontSize: 22 }} aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)' }}>{cert.courseName}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{cert.id}</div>
                  </div>
                </div>

                <div style={{ background: 'var(--paper-sunken)', padding: '10px 12px', borderRadius: 6, marginBottom: 14, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--ink-soft)' }}>Issue Date:</span>
                    <strong>{cert.issueDate}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--ink-soft)' }}>Recertification (1 yr):</span>
                    <strong style={{ color: 'var(--amber-soft-text)' }}>{cert.validUntil || '2027-07-15'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--ink-soft)' }}>Assessment Score:</span>
                    <strong style={{ color: 'var(--sage)' }}>{cert.score != null ? `${cert.score}%` : 'Passed'}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button block variant="primary" icon="ti-eye" onClick={() => setSelectedCert(cert)}>
                  View &amp; Verify QR
                </Button>
              </div>
            </div>
          ))}
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


