import React from 'react';
import { useCourseStore } from '../state/CourseStore';
import { normalizeRole, roleDefinition } from '../data/roles';
import { myLearningCourses } from '../data/mockData';

export default function AppFooterBar({ role }) {
  const { currentUser, courses, gamification } = useCourseStore();
  const effectiveRole = normalizeRole(role);
  const def = roleDefinition(effectiveRole);
  const myCourses = myLearningCourses(courses, currentUser);
  const completed = myCourses.filter((c) => c.enrollment?.status === 'COMPLETED').length;
  const completionPercent = myCourses.length === 0 ? 0 : Math.round((completed / myCourses.length) * 100);
  const streakDays = gamification?.userStats?.streakDays ?? 0;

  return (
    <div className="app-footer-bar">
      <span><span className="app-footer-dot" /> BigC LMS Online Network</span>
      <span>Khối: <strong>{currentUser?.branch === 'OPERATIONS' ? 'Vận Hành Siêu Thị' : 'Văn Phòng Hỗ Trợ'}</strong></span>
      <span>Vai trò: <strong>{def.labelVi}</strong></span>
      <span>Tiến độ: <strong>{completionPercent}%</strong></span>
      <span><i className="ti ti-flame" aria-hidden="true" style={{ color: 'var(--rust)' }} /> Streak: <strong>{streakDays} ngày</strong></span>
    </div>
  );
}
