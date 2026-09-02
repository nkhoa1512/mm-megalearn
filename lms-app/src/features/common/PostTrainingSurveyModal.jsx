import React, { useState } from 'react';
import { useCourseStore } from '../../store/CourseStore';
import { Modal, Button, Badge } from './ui';

export default function PostTrainingSurveyModal() {
  const { surveyModalConfig, closeSurveyModal, createActionPlan, currentUser } = useCourseStore();
  const { isOpen, course, type, learner } = surveyModalConfig;

  // L1 Form state
  const [trainerRating, setTrainerRating] = useState(5);
  const [contentRating, setContentRating] = useState(5);
  const [usabilityRating, setUsabilityRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [actionPlanCommitment, setActionPlanCommitment] = useState('');
  const [kpiTarget, setKpiTarget] = useState('');

  // L3 Form state (Manager)
  const [l3BehaviorRating, setL3BehaviorRating] = useState(5);
  const [l3ProductivityGain, setL3ProductivityGain] = useState('+15%');
  const [l3ManagerNote, setL3ManagerNote] = useState('');

  // CLASSROOM_CSAT form state (mandatory after checking in to an in-person class)
  const [csatTrainerRating, setCsatTrainerRating] = useState(5);
  const [csatContentRating, setCsatContentRating] = useState(5);
  const [csatFacilityRating, setCsatFacilityRating] = useState(5);
  const [csatComment, setCsatComment] = useState(
    'The hands-on session was very clear; the trainer was enthusiastic and explained every step thoroughly.'
  );

  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const isL1 = type === 'L1';
  const isClassroomCsat = type === 'CLASSROOM_CSAT';
  const courseTitle = course?.title || 'Food Safety & Hygiene Standards (HACCP)';

  function handleSubmit() {
    if (isL1 && actionPlanCommitment.trim()) {
      createActionPlan({
        id: `act-plan-${Date.now()}`,
        learnerId: currentUser?.userId || 'USR-1042',
        learnerName: currentUser?.fullName || 'Minh Tran',
        learnerPosition: currentUser?.position || 'Store Associate',
        managerId: currentUser?.managerId || 'USR-0245',
        managerName: 'David Tran',
        courseId: course?.id || 'course-gen',
        courseName: courseTitle,
        targetCommitment: actionPlanCommitment,
        kpiTarget: kpiTarget || '100% SOP compliance maintained over 90 days',
        startDate: new Date().toISOString().slice(0, 10),
        evaluationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        status: 'IN_PROGRESS',
        progress: 20,
        surveyL1Completed: true,
        surveyL1Score: (trainerRating + contentRating + usabilityRating) / 3,
        managerReviewL3: null,
      });
    }

    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      closeSurveyModal();
    }, 1500);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeSurveyModal}
      title={
        isL1 ? 'Post-Course Feedback & Action Plan (Kirkpatrick Level 1 CSAT)'
        : isClassroomCsat ? 'Training Quality Survey (Level 1 CSAT)'
        : 'Post-Training Impact Review 3-6 Months (Kirkpatrick Level 3)'
      }
      subtitle={
        isL1 ? `Course: ${courseTitle}`
        : isClassroomCsat ? `${course?.title || ''} · Trainer: ${course?.trainerName || ''}`
        : `Evaluating Direct Report: ${learner?.name || learner?.fullName || 'Minh Tran'}`
      }
      size="md"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          {isClassroomCsat ? <span /> : (
            <Button variant="ghost" onClick={closeSurveyModal} disabled={isSubmitted}>
              Cancel
            </Button>
          )}
          <Button variant="primary" icon={isSubmitted ? 'ti-check' : 'ti-send'} onClick={handleSubmit} disabled={isSubmitted}>
            {isSubmitted ? 'Saved!' : isL1 ? 'Submit CSAT & Unlock Certificate' : isClassroomCsat ? 'Submit Feedback' : 'Confirm Level 3 Evaluation'}
          </Button>
        </div>
      }
    >
      {isSubmitted ? (
        <div style={{ padding: '30px 20px', textAlign: 'center', animation: 'scaleUp 0.2s ease' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--sage-soft)', color: 'var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px' }}>
            <i className="ti ti-check" />
          </div>
          <h3 style={{ fontSize: 18, color: 'var(--sage)', marginBottom: 8 }}>
            {isL1 ? 'Thank you for completing your evaluation!' : isClassroomCsat ? 'Thank You For Your Feedback!' : 'Level 3 Evaluation Recorded!'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>
            {isL1
              ? 'Your digital certificate of completion is now unlocked. Your action plan has been routed to your Line Manager.'
              : isClassroomCsat
              ? `Your feedback has gone straight to trainer ${course?.trainerName || ''} and the L&D team to improve future courses.`
              : 'Behavioral impact scores have been updated in enterprise training analytics.'}
          </p>
        </div>
      ) : isClassroomCsat ? (
        /* CLASSROOM CSAT (mandatory after checking in to an in-person class) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Badge tone="amber" icon="ti-alert-circle">
            Mandatory: learners attending an in-person class must submit this feedback
          </Badge>

          {[
            { label: `1. How satisfied are you with ${course?.trainerName || 'the trainer'}'s teaching?`, value: csatTrainerRating, set: setCsatTrainerRating },
            { label: '2. Quality of the content & practice materials', value: csatContentRating, set: setCsatContentRating },
            { label: '3. Facilities / practice workshop', value: csatFacilityRating, set: setCsatFacilityRating },
          ].map((q, qi) => (
            <div key={qi} className="card card-pad" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{q.label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--amber)' }}>{q.value} / 5 Sao</span>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => q.set(star)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 6,
                      border: '1px solid',
                      borderColor: q.value >= star ? 'var(--amber)' : 'var(--line)',
                      background: q.value >= star ? 'var(--amber-soft)' : 'var(--paper-raised)',
                      color: q.value >= star ? 'var(--amber-soft-text)' : 'var(--ink-faint)',
                      cursor: 'pointer',
                      fontSize: 16,
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div>
            <label className="field-label">Additional comments (optional)</label>
            <textarea
              className="field-input"
              rows={3}
              value={csatComment}
              onChange={(e) => setCsatComment(e.target.value)}
              style={{ width: '100%', fontSize: 13 }}
            />
          </div>
        </div>
      ) : isL1 ? (
        /* LEVEL 1 SURVEY (Learner) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--rail-soft)', color: 'var(--rail-soft-text)', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
            Your feedback directly drives curriculum quality and learning excellence across MM Mega Market &amp; Big C.
          </div>

          {/* Question 1: Trainer Rating */}
          <div className="card card-pad" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>1. Instructor Effectiveness &amp; Teaching Quality</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--amber)' }}>{trainerRating} / 5 Stars</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setTrainerRating(star)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: trainerRating >= star ? 'var(--amber)' : 'var(--line)',
                    background: trainerRating >= star ? 'var(--amber-soft)' : 'var(--paper-raised)',
                    color: trainerRating >= star ? 'var(--amber-soft-text)' : 'var(--ink-faint)',
                    cursor: 'pointer',
                    fontSize: 16,
                  }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Question 2: Course Content */}
          <div className="card card-pad" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>2. Course Content, Visual Materials &amp; Media Quality</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--amber)' }}>{contentRating} / 5 Stars</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setContentRating(star)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: contentRating >= star ? 'var(--amber)' : 'var(--line)',
                    background: contentRating >= star ? 'var(--amber-soft)' : 'var(--paper-raised)',
                    color: contentRating >= star ? 'var(--amber-soft-text)' : 'var(--ink-faint)',
                    cursor: 'pointer',
                    fontSize: 16,
                  }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Question 3: Usability */}
          <div className="card card-pad" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>3. Practical Applicability to Daily Store Operations</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--amber)' }}>{usabilityRating} / 5 Stars</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setUsabilityRating(star)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: usabilityRating >= star ? 'var(--amber)' : 'var(--line)',
                    background: usabilityRating >= star ? 'var(--amber-soft)' : 'var(--paper-raised)',
                    color: usabilityRating >= star ? 'var(--amber-soft-text)' : 'var(--ink-faint)',
                    cursor: 'pointer',
                    fontSize: 16,
                  }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Action Plan Setup */}
          <div className="card card-pad" style={{ borderLeft: '4px solid var(--rail)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--rail)', marginBottom: 6 }}>
              Post-Training Operational Action Plan (Commitment)
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10 }}>
              Specify 1-2 concrete workplace actions you will execute over the next 90 days:
            </div>
            <textarea
              className="field-input"
              rows={2}
              placeholder="e.g. Conduct cold-chain temperature checks every 120 minutes and mentor 2 team associates..."
              value={actionPlanCommitment}
              onChange={(e) => setActionPlanCommitment(e.target.value)}
              style={{ fontSize: 13, width: '100%', marginBottom: 10 }}
            />
            <input
              type="text"
              className="field-input"
              placeholder="Target KPI / Metric (e.g. Reduce bakery product shrinkage by 10% in 90 days)"
              value={kpiTarget}
              onChange={(e) => setKpiTarget(e.target.value)}
              style={{ fontSize: 13, width: '100%' }}
            />
          </div>
        </div>
      ) : (
        /* LEVEL 3 SURVEY (Manager Review after 3-6 months) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
            <i className="ti ti-clock" style={{ marginRight: 6 }} />
            Periodic 3-6 month post-training evaluation: Line Manager reviews on-the-job behavioral changes and metric gains.
          </div>

          <div className="card card-pad">
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              1. Behavioral Progression &amp; SOP Execution on the Sales Floor
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setL3BehaviorRating(star)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: l3BehaviorRating >= star ? 'var(--amber)' : 'var(--line)',
                    background: l3BehaviorRating >= star ? 'var(--amber-soft)' : 'var(--paper-raised)',
                    color: l3BehaviorRating >= star ? 'var(--amber-soft-text)' : 'var(--ink-faint)',
                    cursor: 'pointer',
                    fontSize: 16,
                  }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              2. Operational Efficiency Gains &amp; Shrinkage Reduction
            </div>
            <input
              type="text"
              className="field-input"
              value={l3ProductivityGain}
              onChange={(e) => setL3ProductivityGain(e.target.value)}
              placeholder="e.g. +15% cashier checkout speed, 20% spoilage reduction..."
              style={{ fontSize: 13, width: '100%', marginBottom: 10 }}
            />
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Manager Observations &amp; Sign-off Notes:</div>
            <textarea
              className="field-input"
              rows={3}
              value={l3ManagerNote}
              onChange={(e) => setL3ManagerNote(e.target.value)}
              placeholder="Notes on employee attitude, team support, and procedure compliance..."
              style={{ fontSize: 13, width: '100%' }}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
