import React from 'react';
import { useCourseStore } from '../../store/CourseStore';
import { normalizeRole, roleDefinition } from '../../data/roles';
import { myLearningCourses } from '../../data/mockData';

export default function AppFooterBar({ role }) {
  const { currentUser, courses, gamification, language } = useCourseStore();
  const effectiveRole = normalizeRole(role);
  const def = roleDefinition(effectiveRole);
  const myCourses = myLearningCourses(courses, currentUser);
  const completed = myCourses.filter((c) => c.enrollment?.status === 'COMPLETED').length;
  const completionPercent = myCourses.length === 0 ? 0 : Math.round((completed / myCourses.length) * 100);
  const streakDays = gamification?.userStats?.streakDays ?? 0;
  const roleLabel = language === 'en' ? (def.labelEn || def.labelVi) : def.labelVi;
  const branchLabel = currentUser?.branch === 'OPERATIONS'
    ? (language === 'en' ? 'Store Operations' : 'Store Operations')
    : (language === 'en' ? 'Support Center / HO' : 'Support Office');

  return (
    <div className="app-footer-bar">
      <span><span className="app-footer-dot" /> BigC LMS Online Network</span>
      <span>{language === 'en' ? 'Branch: ' : 'Division: '}<strong>{branchLabel}</strong></span>
      <span>{language === 'en' ? 'Role: ' : 'Role: '}<strong>{roleLabel}</strong></span>
      <span>{language === 'en' ? 'Progress: ' : 'Progress: '}<strong>{completionPercent}%</strong></span>
      <span><i className="ti ti-flame" aria-hidden="true" style={{ color: 'var(--rust)' }} /> {language === 'en' ? 'Streak: ' : 'Streak: '}<strong>{streakDays} {language === 'en' ? 'days' : 'days'}</strong></span>
    </div>
  );
}
