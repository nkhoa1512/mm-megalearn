import React from 'react';
import UniversalCalendar from '../../components/calendar/UniversalCalendar';

export default function LearnerCalendar({ basePath = '/my-learning' }) {
  return <UniversalCalendar basePath={basePath} />;
}

