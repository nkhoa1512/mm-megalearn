import React, { useState } from 'react';
import { teachingEligibleUsers, trainerStatsFor } from '../../data/mockData';
import { roleDefinition } from '../../data/roles';
import { Badge, Button, Modal } from '../common/ui';

// A shared sample comment set — every trainer shows this same set of comments
// (demo data), rather than authoring separate feedback for each person.
const SAMPLE_TESTIMONIALS = [
  {
    student: 'Trần Quốc Bảo',
    role: 'Bakery Counter Associate (MM An Phu)',
    rating: 5,
    comment: 'The trainer was very enthusiastic and explained things clearly and simply.',
    date: '2026-08-20',
  },
  {
    student: 'Sarah Johnson',
    role: 'Pastry Chef Associate (MM An Phu)',
    rating: 5,
    comment: 'A very practical session! It pinpointed the common mistakes and how to fix them.',
    date: '2026-08-18',
  },
  {
    student: 'Lê Hoàng Nam',
    role: 'Cashier Shift Leader (MM An Phu)',
    rating: 4.8,
    comment: 'The case exercises were lively and the whole class practised hands-on.',
    date: '2026-08-15',
  },
];

function initialsOf(name) {
  return (name || 'NV').split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase();
}

export default function TrainerRatingsDirectory() {
  const [selected, setSelected] = useState(null);

  // Sorted by CSAT descending so the strongest trainers appear first.
  const trainers = teachingEligibleUsers()
    .map((t) => ({ ...t, stats: trainerStatsFor(t.userId) }))
    .sort((a, b) => b.stats.rating - a.stats.rating);

  const avgRating = trainers.length
    ? Math.round((trainers.reduce((sum, t) => sum + t.stats.rating, 0) / trainers.length) * 100) / 100
    : 0;
  const totalClasses = trainers.reduce((sum, t) => sum + t.stats.totalClassesTaught, 0);
  const totalLearners = trainers.reduce((sum, t) => sum + t.stats.totalLearners, 0);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Trainer Ratings (CSAT)</h1>
            <Badge tone="amber" icon="ti-star">Visible to all 6 roles</Badge>
          </div>
          <p style={{ margin: 0 }}>
            Satisfaction score (CSAT), sessions taught and total learners for every trainer (Trainer/L&amp;D, HRBP, User Admin, System Admin)
            — anyone assigned to teach a senior-level class.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="card card-pad" style={{ padding: '8px 16px', background: 'var(--paper-sunken)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>★ {avgRating}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>CSAT<br />Average</div>
          </div>
          <div className="card card-pad" style={{ padding: '8px 16px', background: 'var(--paper-sunken)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rail)' }}>{totalClasses}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Training sessions<br />Delivered</div>
          </div>
          <div className="card card-pad" style={{ padding: '8px 16px', background: 'var(--paper-sunken)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>{totalLearners.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Learner<br />Trained</div>
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: 16, marginBottom: 28 }}>
        {trainers.map((t) => (
          <div key={t.userId} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--rail-soft)', color: 'var(--rail-soft-text)', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {initialsOf(t.fullName)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>{t.fullName}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{roleDefinition(t.role).labelVi}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--amber)' }}>★ {t.stats.rating}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Learner CSAT</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12 }}>
                <span>Sessions taught: <strong>{t.stats.totalClassesTaught}</strong></span>
                <span>Total learners: <strong>{t.stats.totalLearners.toLocaleString()}</strong></span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <Button size="sm" variant="outline" onClick={() => setSelected(t)}>View Detailed Feedback</Button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Learner Comments"
        subtitle={selected ? `${selected.fullName} · ${roleDefinition(selected.role).labelVi} · ★ ${selected.stats.rating}` : ''}
        size="md"
        footer={<Button variant="primary" onClick={() => setSelected(null)}>Close</Button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SAMPLE_TESTIMONIALS.map((fb, idx) => (
            <div key={idx} className="card card-pad" style={{ background: 'var(--paper-sunken)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{fb.student}</span>
                <span style={{ color: 'var(--amber)', fontWeight: 700 }}>{'★'.repeat(Math.floor(fb.rating))} {fb.rating}★</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8 }}>{fb.role}</div>
              <p style={{ fontSize: 13, color: 'var(--ink)', fontStyle: 'italic', margin: 0, lineHeight: 1.45 }}>"{fb.comment}"</p>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 8, textAlign: 'right' }}>{fb.date}</div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
