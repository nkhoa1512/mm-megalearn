import React, { useState } from 'react';
import { useCourseStore } from '../state/CourseStore';
import { Modal, Button, Badge } from './ui';

export default function ManagerNominateModal() {
  const { nominateModalConfig, closeNominateModal, nominateCourse, courses } = useCourseStore();
  const { isOpen, member } = nominateModalConfig;

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [justification, setJustification] = useState('');
  const [dueDate, setDueDate] = useState('2026-10-31');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !member) return null;

  const availableCourses = courses.filter((c) => c.published);
  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || availableCourses[0];

  function handleConfirmNominate() {
    if (selectedCourse) {
      nominateCourse(member, selectedCourse);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        closeNominateModal();
      }, 1400);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeNominateModal}
      title="Nominate &amp; Assign Course to Direct Report"
      subtitle={`Employee: ${member.name || member.fullName} (${member.employeeId || member.userId}) · ${member.position}`}
      size="md"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Button variant="ghost" onClick={closeNominateModal} disabled={isSuccess}>
            Cancel
          </Button>
          <Button variant="primary" icon={isSuccess ? 'ti-check' : 'ti-user-plus'} onClick={handleConfirmNominate} disabled={isSuccess}>
            {isSuccess ? 'Course Assigned!' : 'Confirm Nomination'}
          </Button>
        </div>
      }
    >
      {isSuccess ? (
        <div style={{ padding: '24px 10px', textAlign: 'center', animation: 'scaleUp 0.2s ease' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--sage-soft)', color: 'var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 14px' }}>
            <i className="ti ti-check" />
          </div>
          <h3 style={{ fontSize: 17, color: 'var(--sage)', marginBottom: 6 }}>Course Successfully Assigned!</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
            A notification has been dispatched to <strong>{member.name || member.fullName}</strong>'s learning inbox.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>
              Select Course from Enterprise Catalog:
            </label>
            <select
              className="field-input"
              value={selectedCourseId || selectedCourse?.id}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              style={{ width: '100%', fontSize: 13 }}
            >
              {availableCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.code || 'CRS'}] {c.title} ({c.domain || c.category})
                </option>
              ))}
            </select>
          </div>

          {selectedCourse && (
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>{selectedCourse.title}</span>
                <Badge tone={selectedCourse.courseType === 'MANDATORY' ? 'amber' : 'rail'}>
                  {selectedCourse.courseType}
                </Badge>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 8px', lineHeight: 1.4 }}>
                {selectedCourse.description}
              </p>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', display: 'flex', gap: 12 }}>
                <span>Duration: <strong>{selectedCourse.estimatedHours || '3h'}</strong></span>
                <span>Pass Score: <strong>{selectedCourse.passingScore || 80}%</strong></span>
                <span>Format: <strong>{selectedCourse.format || 'SCORM 2004'}</strong></span>
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>
              Target Due Date:
            </label>
            <input
              type="date"
              className="field-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ width: '100%', fontSize: 13 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>
              Nomination Justification &amp; Growth Objective:
            </label>
            <textarea
              className="field-input"
              rows={3}
              placeholder="State rationale, e.g. Preparing for Shift Manager pipeline, closing HACCP competency gap..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              style={{ width: '100%', fontSize: 12.5 }}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
