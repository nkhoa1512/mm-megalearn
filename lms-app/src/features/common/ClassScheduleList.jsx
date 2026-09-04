import React from 'react';
import { Badge } from './ui';
import {
  courseIntakes, sessionHours, intakeHours, intakeDays, intakeLabel, intakeStatus,
  formatHours, formatSessionDate,
} from '../../utils/classSchedule';

/**
 * The training timetable of an in-person course: one card per intake (class run), each
 * listing the days it meets. `highlightIntakeId` marks the run the viewer belongs to.
 */
export default function ClassScheduleList({ course, compact = false, highlightIntakeId = null }) {
  const intakes = courseIntakes(course);

  if (intakes.length === 0) {
    return (
      <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic' }}>
        No training day has been scheduled for this class yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {intakes.map((intake, idx) => {
        const status = intakeStatus(intake);
        const mine = highlightIntakeId && intake.id === highlightIntakeId;
        const hours = intakeHours(intake);
        const days = intakeDays(intake);
        return (
          <div
            key={intake.id}
            style={{
              border: mine ? '1.5px solid var(--blue)' : '1px solid var(--line)',
              borderRadius: 10,
              padding: compact ? '8px 10px' : '10px 12px',
              background: mine ? 'var(--blue-soft)' : 'var(--paper-raised)',
            }}
          >
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--ink)' }}>
                {intakeLabel(intake, idx)}
              </span>
              <Badge tone={status.tone} size="sm" icon={status.icon}>{status.label}</Badge>
              <Badge tone="slate" size="sm">{days === 1 ? '1 day' : `${days} days`}</Badge>
              <Badge tone="slate" size="sm">{formatHours(hours)}</Badge>
              {mine && <Badge tone="blue" size="sm" icon="ti-user-check">Your intake</Badge>}
            </div>

            {(intake.trainerName || intake.venue || intake.maxCapacity) && (
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {intake.trainerName && <span><i className="ti ti-user" style={{ marginRight: 4 }} />{intake.trainerName}</span>}
                {intake.venue && <span><i className="ti ti-map-pin" style={{ marginRight: 4 }} />{intake.venue}</span>}
                {intake.maxCapacity ? <span><i className="ti ti-armchair" style={{ marginRight: 4 }} />{intake.maxCapacity} seats</span> : null}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {intake.sessions.map((s, sIdx) => (
                <div
                  key={s.id || `${s.date}-${s.startTime}-${sIdx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: compact ? '5px 8px' : '7px 10px',
                    background: 'var(--paper-sunken)',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    background: 'var(--blue)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800,
                  }}>
                    {sIdx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{formatSessionDate(s.date)}</div>
                    {s.topic && !compact && (
                      <div style={{ color: 'var(--ink-soft)', fontSize: 11, marginTop: 1 }}>{s.topic}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                      {s.startTime} - {s.endTime}
                    </div>
                    <div style={{ color: 'var(--ink-soft)', fontSize: 11 }}>
                      {formatHours(sessionHours(s.startTime, s.endTime))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
