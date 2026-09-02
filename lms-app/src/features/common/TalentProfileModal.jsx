import React, { useState } from 'react';
import { useCourseStore } from '../../store/CourseStore';
import { Modal, Badge, ProgressBar, Button } from './ui';

export default function TalentProfileModal() {
  const { talentProfileUser, closeTalentProfile } = useCourseStore();
  const [activeTab, setActiveTab] = useState('talent'); // talent, career, projects, learning

  if (!talentProfileUser) return null;

  const u = talentProfileUser;
  const isOps = u.branch === 'OPERATIONS';

  return (
    <Modal
      isOpen={Boolean(talentProfileUser)}
      onClose={closeTalentProfile}
      title="Talent & Competency Profile"
      subtitle={`${u.fullName} · ${u.employeeCode} · Level ${u.level}`}
      size="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            <i className="ti ti-check-circle" style={{ color: 'var(--sage)', marginRight: 4 }} />
            Synchronized directly from HRIS (SAP SuccessFactors)
          </div>
          <Button variant="primary" onClick={closeTalentProfile}>
            Close
          </Button>
        </div>
      }
    >
      {/* Header Profile Summary */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--bigc-green) 0%, var(--mm-blue) 100%)',
          borderRadius: 12,
          padding: '20px 24px',
          color: '#fff',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: 'var(--paper-raised)',
              color: 'var(--bigc-green)',
              fontWeight: 800,
              fontSize: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            {u.avatar || u.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 20, color: '#fff', fontWeight: 800 }}>{u.fullName}</h2>
              <span
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {u.employeeCode}
              </span>
              <Badge tone={u.status === 'ACTIVE' ? 'sage' : u.status === 'TRANSFER' ? 'blue' : u.status === 'NEW_JOINER' ? 'amber' : 'rust'}>
                {u.status === 'ACTIVE' ? 'Active' : u.status === 'TRANSFER' ? 'Transfer' : u.status === 'NEW_JOINER' ? 'New Joiner' : 'Inactive'}
              </Badge>
            </div>
            <div style={{ fontSize: 14, opacity: 0.95, marginBottom: 4 }}>
              <strong>{u.position}</strong> &middot; Grade: <strong>Level {u.level}</strong> ({u.levelTitle})
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>
                <i className="ti ti-building" style={{ marginRight: 4 }} />
                {u.branchName || (isOps ? 'Hypermarket Operations Branch' : 'Head Office Supporting Branch')}
              </span>
              <span>
                <i className="ti ti-map-pin" style={{ marginRight: 4 }} />
                {u.storeName || 'An Phu Head Office'}
              </span>
              <span>
                <i className="ti ti-calendar" style={{ marginRight: 4 }} />
                Tenure: <strong>{u.yearsOfService || 1.5} years</strong> (Joined: {u.joinDate || '2024-01-15'})
              </span>
            </div>
          </div>
        </div>

        {/* Quick Talent Tag */}
        <div
          style={{
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(8px)',
            borderRadius: 10,
            padding: '10px 16px',
            textAlign: 'right',
            minWidth: 160,
          }}
        >
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.8 }}>Talent Potential</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#F59E0B', marginTop: 2 }}>
            {u.talentProfile?.potential === 'TOP_EXECUTIVE' ? 'Top Executive' : u.talentProfile?.potential === 'HIGH_POTENTIAL' ? 'Hi-Po Fast Track' : 'Core Key Talent'}
          </div>
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
            Succession: <strong>{u.talentProfile?.readiness === 'READY_NOW' ? 'Ready Now' : 'In 6 Months'}</strong>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--line)', paddingBottom: 8, marginBottom: 18 }}>
        {[
          { id: 'talent', label: 'Talent & Succession Roadmap', icon: 'ti-trophy' },
          { id: 'career', label: 'Career History & Past Roles', icon: 'ti-briefcase' },
          { id: 'projects', label: 'Strategic Projects & Taskforces', icon: 'ti-folder' },
          { id: 'learning', label: 'Training Curriculum & Scores', icon: 'ti-school' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              background: activeTab === tab.id ? 'var(--rail-soft)' : 'transparent',
              color: activeTab === tab.id ? 'var(--rail-soft-text)' : 'var(--ink-soft)',
            }}
          >
            <i className={`ti ${tab.icon}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Talent Profile & Succession */}
      {activeTab === 'talent' && (
        <div>
          <div className="grid grid-2" style={{ gap: 16, marginBottom: 18 }}>
            <div className="card card-pad" style={{ borderLeft: '4px solid var(--rail)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--rail)', textTransform: 'uppercase', marginBottom: 8 }}>
                Succession Planning
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Target Succession Role:</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginTop: 2 }}>
                  {u.talentProfile?.successorFor || 'Hypermarket Shift Manager'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                <div>
                  <span style={{ color: 'var(--ink-soft)' }}>Readiness Level: </span>
                  <Badge tone="sage">{u.talentProfile?.readiness || 'READY_IN_6_MONTHS'}</Badge>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-soft)' }}>Designated Mentor: </span>
                  <strong>{u.talentProfile?.mentor || 'David Tran (Store General Manager)'}</strong>
                </div>
              </div>
            </div>

            <div className="card card-pad" style={{ borderLeft: '4px solid var(--amber)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', marginBottom: 8 }}>
                70-20-10 Development Framework
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                • <strong>10% Formal:</strong> Completed 100% of HACCP &amp; Fire Safety certifications.<br />
                • <strong>20% Social:</strong> Bi-weekly 1-on-1 coaching with Fresh Food Section Manager.<br />
                • <strong>70% Experiential:</strong> Leading bakery shrinkage audit &amp; display optimization at An Phu Store.
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
              Core &amp; Functional Competency Framework:
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(u.talentProfile?.skills || ['HACCP Standards', 'Bakery Oven Operations', 'Shrinkage Control', 'Customer Dedication']).map((sk, idx) => (
                <span
                  key={idx}
                  style={{
                    background: 'var(--paper-sunken)',
                    border: '1px solid var(--line)',
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <i className="ti ti-rosette" style={{ color: 'var(--rail)' }} />
                  {sk}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Career History */}
      {activeTab === 'career' && (
        <div>
          <div className="section-label">Career History &amp; Internal Transfers across MMVN</div>
          <div style={{ position: 'relative', paddingLeft: 24, borderLeft: '2px solid var(--line)', margin: '12px 0 20px 10px' }}>
            <div style={{ marginBottom: 18, position: 'relative' }}>
              <div style={{ position: 'absolute', left: -31, top: 2, width: 12, height: 12, borderRadius: '50%', background: 'var(--rail)', border: '2px solid #fff' }} />
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{u.position} (Current)</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                {u.storeName || 'Head Office'} &middot; 2025 - Present
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '4px 0 0' }}>
                Responsible for department compliance, product quality, and standard SOP execution.
              </p>
            </div>

            {(u.pastPositions || [
              { role: 'Fresh Food Section Associate', period: '2024 - 2025', org: 'MM Mega Market Binh Phu' },
              { role: 'Store Operations Apprentice', period: '2023 - 2024', org: 'MM Mega Market Hiep Phu' },
            ]).map((pos, i) => (
              <div key={i} style={{ marginBottom: 16, position: 'relative' }}>
                <div style={{ position: 'absolute', left: -31, top: 2, width: 12, height: 12, borderRadius: '50%', background: 'var(--slate)', border: '2px solid #fff' }} />
                <div style={{ fontWeight: 700, fontSize: 14 }}>{pos.role}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  {pos.org} &middot; {pos.period}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Projects */}
      {activeTab === 'projects' && (
        <div>
          <div className="section-label">Strategic Projects &amp; Operational Taskforces</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {(u.projects || [
              'Cold Chain & Food Hygiene Gold Standard Audit Taskforce 2025',
              'New Store Opening Taskforce (NSO Support Team - MM Da Nang)',
              'Bakery & Fresh Food Loss Prevention Initiative Q2/2026',
            ]).map((prj, i) => (
              <div key={i} className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--blue-soft)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  <i className="ti ti-folder-check" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{prj}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    Role: Technical Lead &middot; Awarded Outstanding Contribution Certificate
                  </div>
                </div>
                <Badge tone="sage">Completed</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Learning Journey */}
      {activeTab === 'learning' && (
        <div>
          <div className="grid grid-3" style={{ gap: 12, marginBottom: 18 }}>
            <div className="card card-pad" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Total Learning Hours</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rail)', marginTop: 4 }}>38.5 Hours</div>
            </div>
            <div className="card card-pad" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Average Exam Score</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--sage)', marginTop: 4 }}>92.4%</div>
            </div>
            <div className="card card-pad" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Certificates Earned</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)', marginTop: 4 }}>6 Credentials</div>
            </div>
          </div>

          <div className="card card-pad">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Enrolled Career Pipeline</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Thanh Giong Fast-track Leadership Program</span>
              <Badge tone="amber">65% Progress</Badge>
            </div>
            <ProgressBar value={65} tone="rail" size="sm" />
          </div>
        </div>
      )}
    </Modal>
  );
}
