import React, { useState, useMemo } from 'react';
import { useCourseStore } from '../../store/CourseStore';
import { Badge, Button, Modal, JobLevelBadge, CourseTypeBadge } from '../../features/common/ui';
import { roleDefinition, hasCapability } from '../../data/roles';
import { nextLevelUp, normalizeLevel, levelTitle } from '../../data/levelSystem';

export default function ManagerApprovals() {
  const { approvals, approveRequest, rejectRequest, currentUser, courses, myCourses } = useCourseStore();
  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING | PROCESSED
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL | LEVEL_ADVANCE | ROADMAP_PROMOTION | CURRICULUM_ASSIGNMENT
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [legalityFilter, setLegalityFilter] = useState('ALL'); // ALL | LEGAL | ILLEGAL
  const [groupBy, setGroupBy] = useState('NONE'); // NONE | TYPE | LEVEL
  const [showFilters, setShowFilters] = useState(false);

  const roleDef = roleDefinition(currentUser.role);
  const canApprove = hasCapability(currentUser?.role, 'canApproveLevelSkip');
  const myScopeRequests = approvals || [];

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'ALL') count++;
    if (levelFilter !== 'ALL') count++;
    if (legalityFilter !== 'ALL') count++;
    return count;
  }, [typeFilter, levelFilter, legalityFilter]);

  function readinessOf(req) {
    const learner = { userId: req.userId, employeeCode: req.employeeId, level: req.currentLevel };
    const learnerCourses = myCourses(courses, learner);
    const sameLevelMandatory = learnerCourses.filter(
      (c) => normalizeLevel(c.targetLevel) === normalizeLevel(req.currentLevel) && c.courseType === 'MANDATORY'
    );
    const done = sameLevelMandatory.filter((c) => c.enrollment?.status === 'COMPLETED');
    const outstanding = sameLevelMandatory.filter((c) => c.enrollment?.status !== 'COMPLETED');
    return {
      total: sameLevelMandatory.length,
      done: done.length,
      outstanding,
      ready: sameLevelMandatory.length > 0 && outstanding.length === 0,
    };
  }

  const filterRequests = (list) => list.filter((r) => {
    if (typeFilter !== 'ALL' && r.requestType !== typeFilter) return false;
    if (levelFilter !== 'ALL') {
      const targetLvl = r.courseLevel || r.targetLevel || r.currentLevel;
      if (String(targetLvl) !== levelFilter) return false;
    }
    if (legalityFilter !== 'ALL') {
      const isLevelSkip = r.requestType === 'LEVEL_ADVANCE';
      const jumpIsLegal = !isLevelSkip || String(nextLevelUp(r.currentLevel)) === String(normalizeLevel(r.courseLevel));
      if (legalityFilter === 'LEGAL' && !jumpIsLegal) return false;
      if (legalityFilter === 'ILLEGAL' && jumpIsLegal) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const nameMatch = r.employeeName?.toLowerCase().includes(q) || r.targetLabel?.toLowerCase().includes(q);
      const idMatch = r.employeeId?.toLowerCase().includes(q);
      const courseMatch = r.courseTitle?.toLowerCase().includes(q) || r.curriculumTitle?.toLowerCase().includes(q);
      const deptMatch = r.department?.toLowerCase().includes(q) || r.position?.toLowerCase().includes(q);
      if (!nameMatch && !idMatch && !courseMatch && !deptMatch) return false;
    }
    return true;
  });

  const rawPendingList = myScopeRequests.filter((a) => a.status === 'PENDING');
  const rawProcessedList = myScopeRequests.filter((a) => a.status !== 'PENDING');

  const pendingList = filterRequests(rawPendingList);
  const processedList = filterRequests(rawProcessedList);
  const currentList = activeTab === 'PENDING' ? pendingList : processedList;

  function handleResetAllFilters() {
    setSearch('');
    setTypeFilter('ALL');
    setLevelFilter('ALL');
    setLegalityFilter('ALL');
    setGroupBy('NONE');
  }

  if (!canApprove) {
    return (
      <div className="card card-pad empty-state" style={{ margin: '40px auto', maxWidth: 520 }}>
        <i className="ti ti-lock" style={{ fontSize: 44, color: 'var(--rust)' }} />
        <h2 style={{ fontSize: 18, marginTop: 10 }}>You do not have permission to approve level skips</h2>
        <p style={{ color: 'var(--ink-soft)' }}>
          Only User Admin and System Admin can approve level skip requests and curriculum proposals.
        </p>
      </div>
    );
  }

  function renderRequestCard(req) {
    const isLevelSkip = req.requestType === 'LEVEL_ADVANCE';
    const isRoadmapPromotion = req.requestType === 'ROADMAP_PROMOTION';
    const isCurriculumAssignment = req.requestType === 'CURRICULUM_ASSIGNMENT';
    const readiness = isLevelSkip ? readinessOf(req) : null;
    const jumpIsLegal = !isLevelSkip
      || String(nextLevelUp(req.currentLevel)) === String(normalizeLevel(req.courseLevel));

    return (
      <div
        key={req.id}
        className="card card-pad"
        style={{
          borderColor: isLevelSkip ? 'var(--blue)' : isRoadmapPromotion ? 'var(--sage)' : isCurriculumAssignment ? '#0284C7' : 'var(--amber)',
          borderWidth: 1.5,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="avatar" style={{ background: isCurriculumAssignment ? '#0284C7' : 'var(--rail)', color: '#fff', fontWeight: 700, width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isCurriculumAssignment ? '📚' : (req.employeeName || 'Employee').split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {isCurriculumAssignment ? `Curriculum Allocation Proposal: ${req.curriculumTitle}` : `${req.employeeName} (${req.employeeId})`}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                {isCurriculumAssignment ? `Proposed by: ${req.requesterName} (${req.requesterRole?.toUpperCase() || 'HRBP'})` : `${req.position} · ${req.department}`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {isLevelSkip && <Badge tone="blue" icon="ti-stairs-up">Level skip</Badge>}
            {isRoadmapPromotion && <Badge tone="sage" icon="ti-trophy">Roadmap Promotion Proposal</Badge>}
            {isCurriculumAssignment && <Badge tone="teal" icon="ti-books">Curriculum Allocation Proposal</Badge>}
            <Badge tone="amber" icon="ti-clock">Send days: {req.requestDate}</Badge>
          </div>
        </div>

        {/* Current level -> course level (LEVEL_ADVANCE) or target level (ROADMAP_PROMOTION) */}
        {isLevelSkip && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12, padding: '10px 14px', background: 'var(--blue-soft)', borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--blue-soft-text)' }}>Current job level:</span>
            <JobLevelBadge level={req.currentLevel} />
            <i className="ti ti-arrow-right" style={{ color: 'var(--blue-soft-text)' }} />
            <span style={{ fontSize: 12, color: 'var(--blue-soft-text)' }}>Requested course level:</span>
            <JobLevelBadge level={req.courseLevel} />
            {jumpIsLegal ? (
              <Badge tone="sage" icon="ti-check">Exactly one grade above — valid</Badge>
            ) : (
              <Badge tone="rust" icon="ti-ban">Skipping 2+ grades — approval not permitted</Badge>
            )}
          </div>
        )}
        {isRoadmapPromotion && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12, padding: '10px 14px', background: 'var(--sage-soft)', borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--sage-soft-text)' }}>Current job level:</span>
            <JobLevelBadge level={req.currentLevel} />
            <i className="ti ti-arrow-right" style={{ color: 'var(--sage-soft-text)' }} />
            <span style={{ fontSize: 12, color: 'var(--sage-soft-text)' }}>Proposed promotion to:</span>
            <JobLevelBadge level={req.targetLevel} />
            <Badge tone="sage" icon="ti-check">Completed Tab 1 &amp; Tab 2 (current + succession roadmaps)</Badge>
          </div>
        )}
        {isCurriculumAssignment && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12, padding: '10px 14px', background: '#F0F9FF', borderRadius: 8, border: '1px solid #BAE6FD' }}>
            <span style={{ fontSize: 13, color: '#0369A1', fontWeight: 600 }}>🎯 Assigned audience:</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0C4A6E' }}>{req.targetLabel}</span>
            {req.dueDate && (
              <span style={{ fontSize: 12, color: '#0369A1', marginLeft: 12 }}>
                ⏰ Deadline: <strong>{req.dueDate}</strong>
              </span>
            )}
          </div>
        )}

        {/* Requested course (for LEVEL_ADVANCE) */}
        {isLevelSkip && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12, padding: '8px 12px', background: 'var(--paper-sunken)', borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {req.courseCode} — {req.courseTitle}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                {req.category} &middot; {req.modality === 'ONLINE_SELF_PACED' ? 'Online' : 'In-person'} &middot; {req.durationHours} hours
              </div>
            </div>
            <CourseTypeBadge courseType={req.courseType} />
          </div>
        )}

        {/* Reason for the request / proposal */}
        <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
          <strong style={{ color: 'var(--ink)' }}>{isCurriculumAssignment ? 'Allocation Justification (HRBP Justification):' : 'Reason For The Request / Proposal:'}</strong>{' '}
          <span style={{ color: 'var(--ink-soft)' }}>{req.reason || req.justification || '(Not stated)'}</span>
        </div>

        {/* Readiness only applies to LEVEL_ADVANCE */}
        {isLevelSkip && readiness && (
          <div style={{ marginBottom: 14, padding: '10px 14px', background: readiness.ready ? 'var(--sage-soft)' : 'var(--amber-soft)', borderRadius: 8, border: `1px solid ${readiness.ready ? '#86EFAC' : '#FCD34D'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: readiness.ready ? 'var(--sage-soft-text)' : 'var(--amber-soft-text)' }}>
                Mandatory Level {req.currentLevel} course completion progress:
              </span>
              <strong style={{ color: readiness.ready ? 'var(--sage-soft-text)' : 'var(--amber-soft-text)' }}>
                {readiness.done}/{readiness.total} course ({readiness.total ? Math.round((readiness.done / readiness.total) * 100) : 100}%)
              </strong>
            </div>
            {readiness.ready ? (
              <div style={{ fontSize: 12, color: 'var(--sage-soft-text)' }}>
                ✓ The employee has completed 100% of the mandatory courses at their current level and is eligible for a level skip.
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--amber-soft-text)' }}>
                ⚠️ {readiness.outstanding.length} mandatory Level {req.currentLevel} courses are still incomplete:{' '}
                <strong>{readiness.outstanding.map((c) => c.title).slice(0, 2).join(', ')}{readiness.outstanding.length > 2 ? '...' : ''}</strong>. Consider carefully before approving.
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
            {isCurriculumAssignment
              ? 'Approval automatically assigns every lesson roadmap in the curriculum to the learner\'s account.'
              : isRoadmapPromotion
              ? 'Approval immediately promotes this employee to the new level for real.'
              : 'Approval unlocks this one course for the learner and enrolls them immediately — it does not open the whole level.'}
          </span>
          {canApprove ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="ghost" icon="ti-x" onClick={() => rejectRequest(req.id)}>Reject</Button>
              <Button
                variant="primary"
                icon="ti-check"
                disabled={isLevelSkip && !jumpIsLegal}
                title={isLevelSkip && !jumpIsLegal ? 'A request skipping 2 or more grades cannot be approved.' : undefined}
                onClick={() => approveRequest(req.id)}
              >
                {isCurriculumAssignment ? 'Approve & Assign The Curriculum' : isRoadmapPromotion ? 'Approve The Promotion' : 'Approve The Level Skip Request'}
              </Button>
            </div>
          ) : (
            <Badge tone="amber" icon="ti-clock">Awaiting User Admin approval</Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Approve Level Skip Requests</h1>
            <Badge tone="amber" icon="ti-clipboard-check">{pendingList.length} pending requests</Badge>
          </div>
          <p style={{ margin: 0 }}>
            You are approving in the role of <strong>{roleDef.labelVi}</strong> &middot; Handling level skip requests and curriculum allocation proposals from{' '}
            <strong>every employee in the system</strong> (Learner, Manager, Trainer/L&amp;D and HRBP all submit requests here).
          </p>
        </div>
      </div>

      {/* A reminder of the sequential rule */}
      <div className="card card-pad" style={{ marginBottom: 20, borderLeft: '4px solid var(--blue)', fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--ink)' }}>System Approval Mechanism:</strong>
        <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
          <li><strong>Proposed curriculum allocation:</strong> The HRBP sends an allocation proposal for an employee/sub-department to the User Admin. Once approved, every matching learner receives the mandatory curriculum.</li>
          <li><strong>Level skip (Sequential Level Gate):</strong> An employee may only request a level skip <strong>exactly one grade above</strong>; the system automatically blocks requests skipping 2+ grades.</li>
        </ul>
      </div>

      {/* STANDARDIZED FILTER TOOLBAR CARD */}
      <div className="card card-pad" style={{ marginBottom: 20, background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
        {/* Row 0: Tab Buttons with Badges */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`btn btn-sm ${activeTab === 'PENDING' ? 'btn-primary' : 'btn-outline'}`}
            style={{
              borderRadius: 20,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderColor: activeTab === 'PENDING' ? 'var(--blue)' : 'var(--line)',
              background: activeTab === 'PENDING' ? 'var(--blue)' : 'transparent',
              color: activeTab === 'PENDING' ? '#fff' : 'var(--ink)',
              fontWeight: activeTab === 'PENDING' ? 700 : 500,
            }}
          >
            <i className="ti ti-clock" />
            <span>Pending Requests</span>
            <span style={{
              background: activeTab === 'PENDING' ? 'rgba(255,255,255,0.3)' : 'var(--paper-sunken)',
              color: activeTab === 'PENDING' ? '#fff' : 'var(--ink-soft)',
              padding: '1px 6px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
            }}>
              {pendingList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('PROCESSED')}
            className={`btn btn-sm ${activeTab === 'PROCESSED' ? 'btn-primary' : 'btn-outline'}`}
            style={{
              borderRadius: 20,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderColor: activeTab === 'PROCESSED' ? 'var(--blue)' : 'var(--line)',
              background: activeTab === 'PROCESSED' ? 'var(--blue)' : 'transparent',
              color: activeTab === 'PROCESSED' ? '#fff' : 'var(--ink)',
              fontWeight: activeTab === 'PROCESSED' ? 700 : 500,
            }}
          >
            <i className="ti ti-history" />
            <span>Processed History</span>
            <span style={{
              background: activeTab === 'PROCESSED' ? 'rgba(255,255,255,0.3)' : 'var(--paper-sunken)',
              color: activeTab === 'PROCESSED' ? '#fff' : 'var(--ink-soft)',
              padding: '1px 6px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
            }}>
              {processedList.length}
            </span>
          </button>
        </div>

        {/* Row 1: Search, Group By & Filter Toggle */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
            <input
              type="text"
              className="field-input"
              style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
              placeholder="Search by learner name, employee code, course, curriculum..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14 }}
              >
                <i className="ti ti-x" />
              </button>
            )}
          </div>

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Group By Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--paper-sunken)', padding: '3px 10px', borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', fontWeight: 600 }}>Group by:</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  fontWeight: groupBy !== 'NONE' ? 700 : 500,
                  color: groupBy !== 'NONE' ? 'var(--blue, #005BAA)' : 'var(--ink)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="NONE">No grouping</option>
                <option value="TYPE">By Request Type</option>
                <option value="LEVEL">By Job Level</option>
              </select>
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`btn btn-sm ${activeFiltersCount > 0 ? 'btn-primary' : 'btn-outline'}`}
              style={{ height: 38, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 8 }}
            >
              <i className="ti ti-filter" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span style={{ background: 'var(--paper-raised)', color: 'var(--rail, #005BAA)', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 800 }}>
                  {activeFiltersCount}
                </span>
              )}
              <i className={`ti ${showFilters ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12, marginLeft: 2 }} />
            </button>
          </div>
        </div>

        {/* Row 2: Collapsible Filter Panel */}
        {showFilters && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {/* Type Filter */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                  APPROVAL REQUEST TYPE
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 36,
                    fontSize: 12,
                    borderRadius: 6,
                    background: typeFilter !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                    borderColor: typeFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                    color: typeFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: typeFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="ALL">All request types</option>
                  <option value="LEVEL_ADVANCE">🔒 Level Skip</option>
                  <option value="ROADMAP_PROMOTION">🏆 Promotion Proposal</option>
                  <option value="CURRICULUM_ASSIGNMENT">📚 Curriculum Proposal</option>
                </select>
              </div>

              {/* Level Filter */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                  TARGET JOB LEVEL
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 36,
                    fontSize: 12,
                    borderRadius: 6,
                    background: levelFilter !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                    borderColor: levelFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                    color: levelFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: levelFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                >
                  <option value="ALL">All job levels</option>
                  <option value="5">Level 5 (Supervisor)</option>
                  <option value="6">Level 6 (Officer / Specialist)</option>
                  <option value="7">Level 7 (Staff)</option>
                </select>
              </div>

              {/* Legality Filter */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                  REQUEST VALIDITY
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 36,
                    fontSize: 12,
                    borderRadius: 6,
                    background: legalityFilter !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                    borderColor: legalityFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                    color: legalityFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: legalityFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={legalityFilter}
                  onChange={(e) => setLegalityFilter(e.target.value)}
                >
                  <option value="ALL">All validity states</option>
                  <option value="LEGAL">🟢 Valid (exactly one grade above / already eligible)</option>
                  <option value="ILLEGAL">🔴 Skipping 2+ grades (approval not permitted)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Row 3: Active Filters Summary Bar */}
        {(search || typeFilter !== 'ALL' || levelFilter !== 'ALL' || legalityFilter !== 'ALL' || groupBy !== 'NONE') && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Filtering by:</span>
              {search && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Search term: <strong>"{search}"</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
                </span>
              )}
              {typeFilter !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Request type: <strong>{typeFilter === 'LEVEL_ADVANCE' ? 'Level skip' : typeFilter === 'ROADMAP_PROMOTION' ? 'Promotion' : 'Curriculum'}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setTypeFilter('ALL')} />
                </span>
              )}
              {levelFilter !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Job level: <strong>Level {levelFilter}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setLevelFilter('ALL')} />
                </span>
              )}
              {legalityFilter !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Validity: <strong>{legalityFilter === 'LEGAL' ? 'Valid' : 'Grade-skipping violation'}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setLegalityFilter('ALL')} />
                </span>
              )}
              {groupBy !== 'NONE' && (
                <span className="badge" style={{ background: 'var(--paper-sunken)', color: 'var(--ink-soft)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Group by: <strong>{groupBy === 'TYPE' ? 'By Request Type' : 'By Job Level'}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setGroupBy('NONE')} />
                </span>
              )}
              <button
                type="button"
                onClick={handleResetAllFilters}
                style={{ border: 'none', background: 'transparent', color: 'var(--rust, #DC2626)', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: '2px 4px' }}
              >
                Clear all filters
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Found <strong>{currentList.length}</strong> / {activeTab === 'PENDING' ? rawPendingList.length : rawProcessedList.length} requests
            </div>
          </div>
        )}
      </div>

      {/* Content Rendering */}
      {currentList.length === 0 ? (
        <div className="card empty-state" style={{ padding: '48px 16px', textAlign: 'center' }}>
          <i className="ti ti-clipboard-check" style={{ fontSize: 36, color: 'var(--ink-faint)', display: 'block', marginBottom: 10 }} />
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 4 }}>
            No request matches the filters
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '0 auto 16px', maxWidth: 400 }}>
            {activeTab === 'PENDING'
              ? 'Every level skip request and curriculum proposal has been handled.'
              : 'No request history matches the current search criteria.'}
          </p>
          <Button variant="outline" size="sm" onClick={handleResetAllFilters}>
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {currentList.map((req) => renderRequestCard(req))}
        </div>
      )}
    </>
  );
}
