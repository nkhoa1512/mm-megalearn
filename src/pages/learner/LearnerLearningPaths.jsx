import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { learningPaths } from '../../data/mockData';
import { Badge, Button, ProgressBar } from '../../components/ui';

export default function LearnerLearningPaths() {
  const navigate = useNavigate();
  const [selectedPathId, setSelectedPathId] = useState(learningPaths[0].id);

  const currentPath = learningPaths.find((p) => p.id === selectedPathId) || learningPaths[0];

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Career Learning Paths &amp; Competency Tracks</h1>
            <Badge tone="rail" icon="ti-git-branch">Competency Framework</Badge>
          </div>
          <p>
            Standardized progressive learning tracks aligned with job roles — from Store Onboarding and Fresh Food mastery to Shift Leader development.
          </p>
        </div>
      </div>

      {/* Path Selector Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {learningPaths.map((path) => {
          const isSelected = path.id === selectedPathId;
          return (
            <div
              key={path.id}
              onClick={() => setSelectedPathId(path.id)}
              className="card card-pad card-interactive"
              style={{
                flex: 1,
                minWidth: 280,
                borderColor: isSelected ? 'var(--rail)' : 'var(--line)',
                borderWidth: isSelected ? 2 : 1,
                background: isSelected ? 'var(--rail-soft)' : 'var(--paper-raised)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>{path.code}</span>
                <Badge tone={path.progressPercent >= 100 ? 'sage' : path.progressPercent > 0 ? 'amber' : 'slate'}>
                  {path.progressPercent}% Completed
                </Badge>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: isSelected ? 'var(--rail-soft-text)' : 'var(--ink)', marginBottom: 8 }}>
                {path.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12 }}>
                Target: <strong>{path.targetRole}</strong> &middot; {path.estimatedWeeks}
              </div>
              <ProgressBar value={path.progressPercent} tone={isSelected ? 'rail' : 'sage'} size="sm" />
            </div>
          );
        })}
      </div>

      {/* Path Detail Showcase */}
      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid var(--line)', paddingBottom: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--rail)' }}>{currentPath.title}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4 }}>
              Target Audience: {currentPath.targetAudience} &middot; Duration: {currentPath.estimatedWeeks}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="xp-badge">
              <i className="ti ti-flame" /> +{currentPath.xpReward} XP Reward
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
              <i className="ti ti-rosette" /> Badge: {currentPath.badgeReward}
            </div>
          </div>
        </div>

        {/* Step-by-step Milestones */}
        <div className="section-label" style={{ margin: '0 0 16px' }}>Curriculum Milestones &amp; Learning Stages:</div>
        <div className="path-stepper">
          {currentPath.milestones.map((ms) => {
            const isCompleted = ms.status === 'COMPLETED';
            const isInProgress = ms.status === 'IN_PROGRESS';

            return (
              <div key={ms.step} className="path-step-card" style={{ borderColor: isInProgress ? 'var(--amber)' : isCompleted ? 'var(--sage)' : 'var(--line)' }}>
                {/* Step number circle */}
                <div className={`step-num-circle ${isCompleted ? 'step-num-completed' : isInProgress ? 'step-num-in-progress' : 'step-num-pending'}`}>
                  {isCompleted ? <i className="ti ti-check" /> : ms.step}
                </div>

                {/* Step content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      Stage {ms.step}: {ms.title}
                    </div>
                    {isCompleted ? (
                      <Badge tone="sage" icon="ti-circle-check">Completed {ms.score ? `(${ms.score}%)` : ''}</Badge>
                    ) : isInProgress ? (
                      <Badge tone="amber" icon="ti-loader">In Progress</Badge>
                    ) : (
                      <Badge tone="slate">Locked</Badge>
                    )}
                  </div>

                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', display: 'flex', gap: 16, alignItems: 'center' }}>
                    <span>Linked Course: <strong>{ms.courseTitle}</strong></span>
                    <span>
                      Modality: {ms.type === 'CLASSROOM_PRACTICE' ? 'In-Store Practical Lab (ILT)' : 'E-Learning & Assessment'}
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <div>
                  {isCompleted ? (
                    <Button size="sm" variant="ghost" icon="ti-rotate" onClick={() => navigate(`/learner/courses/${ms.courseId}`)}>
                      Review
                    </Button>
                  ) : isInProgress ? (
                    <Button size="sm" variant="primary" icon="ti-player-play" onClick={() => navigate(`/learner/courses/${ms.courseId}`)}>
                      Continue
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" icon="ti-lock" disabled>
                      Locked
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

