import React, { useState } from 'react';
import { useCourseStore } from '../../state/CourseStore';
import { Badge, Button } from '../../components/ui';

export default function ManagerApprovals() {
  const { approvals, approveRequest, rejectRequest } = useCourseStore();
  const [activeTab, setActiveTab] = useState('PENDING');

  const pendingList = approvals.filter((a) => a.status === 'PENDING');
  const processedList = approvals.filter((a) => a.status !== 'PENDING');

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Course Enrollment Approvals</h1>
            <Badge tone="amber" icon="ti-clipboard-check">{pendingList.length} Pending Review</Badge>
          </div>
          <p>
            Review and approve specialized training requests and store lab workshops for associates within your reporting line.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`btn ${activeTab === 'PENDING' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: 13 }}
        >
          <i className="ti ti-clock" /> Pending Requests ({pendingList.length})
        </button>
        <button
          onClick={() => setActiveTab('PROCESSED')}
          className={`btn ${activeTab === 'PROCESSED' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: 13 }}
        >
          <i className="ti ti-history" /> Processed History ({processedList.length})
        </button>
      </div>

      {/* Request Cards */}
      {activeTab === 'PENDING' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {pendingList.length === 0 ? (
            <div className="card empty-state">
              <i className="ti ti-circle-check" />
              <p>All training enrollment requests have been processed.</p>
            </div>
          ) : (
            pendingList.map((req) => (
              <div key={req.id} className="card card-pad" style={{ borderColor: 'var(--amber)', borderWidth: 1.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="avatar" style={{ background: 'var(--rail)', color: '#fff', fontWeight: 700, width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {req.employeeName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14.5 }}>{req.employeeName} ({req.employeeId})</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                        {req.position} &middot; {req.department}
                      </div>
                    </div>
                  </div>
                  <Badge tone="amber" icon="ti-clock">Requested: {req.requestDate}</Badge>
                </div>

                <div style={{ background: 'var(--paper-sunken)', padding: '14px 16px', borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--rail)', marginBottom: 4 }}>
                    Requested Course: {req.courseName}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 8 }}>
                    Program Cost / Organizer: <strong>{req.courseCost}</strong>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>
                    <strong>Development Justification:</strong> "{req.justification}"
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                    <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
                    Approval will automatically grant course access and dispatch an email confirmation to the associate.
                  </span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Button variant="ghost" icon="ti-x" onClick={() => rejectRequest(req.id)}>
                      Reject
                    </Button>
                    <Button variant="primary" icon="ti-check" onClick={() => approveRequest(req.id)}>
                      Approve Request
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'PROCESSED' && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Associate</th>
                <th>Course Requested</th>
                <th>Submission Date</th>
                <th>Status</th>
                <th>Program Cost</th>
              </tr>
            </thead>
            <tbody>
              {processedList.map((req) => (
                <tr key={req.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{req.employeeName}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{req.employeeId} &middot; {req.position}</div>
                  </td>
                  <td style={{ fontWeight: 500 }}>{req.courseName}</td>
                  <td style={{ color: 'var(--ink-soft)' }}>{req.requestDate}</td>
                  <td>
                    <Badge tone={req.status === 'APPROVED' ? 'sage' : 'rust'}>
                      {req.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                    </Badge>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{req.courseCost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

