import React from 'react';
import { adminConfig } from '../../data/mockData';
import { Button } from '../../components/ui';

export default function AdminConfig() {
  return (
    <>
      <div className="page-header">
        <h1>Configuration</h1>
        <p>Global rules for inactivity, reminders and default content completion thresholds. Per-course rules are set in each course's builder.</p>
      </div>

      <div className="section-label">Inactivity and reminders</div>
      <div className="grid grid-2" style={{ marginBottom: 8 }}>
        <ConfigField
          label="Inactive threshold"
          value={adminConfig.inactiveThresholdDays}
          unit="days"
          hint="No learning activity for this many days marks an enrollment inactive."
        />
        <ConfigField
          label="Maximum reminder count"
          value={adminConfig.maxReminderCount}
          unit="reminders"
          hint="Stop sending reminders after this many, per enrollment."
        />
      </div>

      <div className="section-label">Manager alerts</div>
      <div className="grid grid-2" style={{ marginBottom: 8 }}>
        <ConfigField
          label="Manager alert after"
          value={adminConfig.managerAlertAfterDays}
          unit="days inactive"
          hint="When a manager is notified of an employee's inactivity within their scope."
        />
        <div className="card card-pad">
          <label className="field-label">Reminder schedule</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            {adminConfig.reminderFrequencyDays.map((d) => (
              <span key={d} className="badge badge-amber">Day {d}</span>
            ))}
          </div>
          <div className="field-hint">Reminders fire on these days after becoming inactive.</div>
        </div>
      </div>

      <div className="section-label">Default content completion rules</div>
      <div className="grid grid-3" style={{ marginBottom: 28 }}>
        <ConfigField
          label="Default video watch"
          value={adminConfig.defaultVideoWatchPercent}
          unit="%"
          hint="Applied to new video lessons unless overridden."
        />
        <ConfigField
          label="Default document read"
          value={adminConfig.defaultDocumentReadPercent}
          unit="%"
          hint="Applied to new document/text/script lessons unless overridden."
        />
        <ConfigField
          label="Default passing score"
          value={adminConfig.defaultPassingScorePercent}
          unit="%"
          hint="Applied to new course assessments unless overridden."
        />
      </div>

      <Button variant="primary" icon="ti-device-floppy">Save configuration</Button>
    </>
  );
}

function ConfigField({ label, value, unit, hint }) {
  return (
    <div className="card card-pad">
      <label className="field-label">{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input className="field-input" defaultValue={value} type="number" style={{ width: 90 }} />
        <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{unit}</span>
      </div>
      <div className="field-hint">{hint}</div>
    </div>
  );
}
