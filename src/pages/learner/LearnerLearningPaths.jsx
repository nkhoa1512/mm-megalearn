import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { learningPaths } from '../../data/mockData';
import { Badge, Button, ProgressBar } from '../../components/ui';

export default function LearnerLearningPaths() {
  const navigate = useNavigate();
  const [selectedPathId, setSelectedPathId] = useState(learningPaths[0].id);
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // ALL, ONBOARDING, TALENT_PIPELINE, FUNCTIONAL

  const filteredPaths = learningPaths.filter((p) => {
    if (categoryFilter === 'ALL') return true;
    return p.trackType === categoryFilter;
  });

  const currentPath = learningPaths.find((p) => p.id === selectedPathId) || learningPaths[0];

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Career Learning Paths &amp; Succession Framework</h1>
            <Badge tone="rail" icon="ti-git-branch">70-20-10 Model &middot; Talent Pipeline</Badge>
          </div>
          <p>
            Standardized progressive learning tracks aligned with roles — from Store/Office Onboarding to the Thánh Gióng Fast-track Leadership &amp; Store General Manager (SGM) Pipeline.
          </p>
        </div>
      </div>

      {/* Category Tabs Filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { id: 'ALL', label: 'All Learning Paths', icon: 'ti-apps' },
          { id: 'ONBOARDING', label: 'Onboarding (Store & Office)', icon: 'ti-user-plus' },
          { id: 'TALENT_PIPELINE', label: 'Thánh Gióng & SGM Pipelines', icon: 'ti-flame' },
          { id: 'FUNCTIONAL', label: 'Functional & Fresh Food Mastery', icon: 'ti-certificate' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id)}
            className="btn btn-sm"
            style={{
              background: categoryFilter === tab.id ? 'var(--rail)' : 'var(--paper-raised)',
              color: categoryFilter === tab.id ? '#fff' : 'var(--ink)',
              borderColor: categoryFilter === tab.id ? 'var(--rail)' : 'var(--line-strong)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className={`ti ${tab.icon}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Path Selector Cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {filteredPaths.map((path) => {
          const isSelected = path.id === selectedPathId;
          return (
            <div
              key={path.id}
              onClick={() => setSelectedPathId(path.id)}
              className="card card-pad card-interactive"
              style={{
                flex: 1,
                minWidth: 260,
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--rail)', margin: 0 }}>{currentPath.title}</h2>
              <Badge tone={currentPath.trackType === 'TALENT_PIPELINE' ? 'amber' : 'blue'}>
                {currentPath.trackType}
              </Badge>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4 }}>
              Target Audience: <strong>{currentPath.targetAudience}</strong> &middot; Estimated Duration: {currentPath.estimatedWeeks}
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

        {/* 70-20-10 SUCCESSOR FRAMEWORK BREAKDOWN WIDGET */}
        {currentPath.framework702010 && (
          <div style={{ marginBottom: 24, background: 'var(--paper-sunken)', borderRadius: 10, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-chart-pie" style={{ color: 'var(--rail)' }} />
              70-20-10 Development Model (Successor Architecture):
            </div>
            <div className="grid grid-3" style={{ gap: 12 }}>
              <div className="card card-pad" style={{ background: '#fff', borderTop: '3px solid #005BAA' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#005BAA', textTransform: 'uppercase', marginBottom: 4 }}>
                  10% Formal Learning
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                  {currentPath.framework702010.formal10}
                </div>
              </div>
              <div className="card card-pad" style={{ background: '#fff', borderTop: '3px solid #F59E0B' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#B45309', textTransform: 'uppercase', marginBottom: 4 }}>
                  20% Social &amp; Coaching
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                  {currentPath.framework702010.social20}
                </div>
              </div>
              <div className="card card-pad" style={{ background: '#fff', borderTop: '3px solid #009E49' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#006830', textTransform: 'uppercase', marginBottom: 4 }}>
                  70% Experiential &amp; OJT
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                  {currentPath.framework702010.experiential70}
                </div>
              </div>
            </div>
          </div>
        )}

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
                      {ms.title}
                    </div>
                    {isCompleted ? (
                      <Badge tone="sage" icon="ti-circle-check">Completed {ms.score ? `(${ms.score}%)` : ''}</Badge>
                    ) : isInProgress ? (
                      <Badge tone="amber" icon="ti-loader">In Progress</Badge>
                    ) : (
                      <Badge tone="slate">Locked</Badge>
                    )}
                  </div>

                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>Linked Course: <strong>{ms.courseTitle}</strong></span>
                    <span>
                      Delivery Modality: {ms.type === 'CLASSROOM_PRACTICE' ? 'Store Practical Lab (ILT)' : ms.type === 'CAPSTONE_ASSESSMENT' ? 'Capstone Defense & Committee Review' : 'E-Learning & Assessment'}
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
