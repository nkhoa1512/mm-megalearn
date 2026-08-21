import React from 'react';
import { currentUser, deriveCertificates } from '../../data/mockData';
import { Button } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';

// Section 39: a certificate exists only once a course's own completion criteria
// are met, so this is derived from real enrollment state, never a separate list.
export default function LearnerCertificates({ user = currentUser }) {
  const { courses } = useCourseStore();
  const certificates = deriveCertificates(courses, user);

  return (
    <>
      <div className="page-header">
        <h1>Certificates</h1>
        <p>Issued automatically when a course's completion criteria are met.</p>
      </div>

      {certificates.length === 0 ? (
        <div className="card empty-state">
          <i className="ti ti-certificate" aria-hidden="true" />
          <p>Complete a course with a certificate enabled to earn your first one.</p>
        </div>
      ) : (
        <div className="grid grid-auto">
          {certificates.map((cert) => (
            <div className="card card-pad" key={cert.id}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'start', marginBottom: 14 }}>
                <div className="activity-icon" style={{ width: 40, height: 40, background: 'var(--amber-soft)', color: 'var(--amber-soft-text)' }}>
                  <i className="ti ti-certificate" style={{ fontSize: 20 }} aria-hidden="true" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{cert.courseName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{cert.id}</div>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 4 }}>Completed {cert.completionDate} &middot; {cert.courseVersion}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 16 }}>{cert.score != null ? `Final score ${cert.score}%` : 'No assessment required'}</div>
              <Button block icon="ti-download">Download certificate</Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
