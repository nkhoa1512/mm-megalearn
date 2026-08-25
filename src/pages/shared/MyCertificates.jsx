import React from 'react';
import { useCourseStore } from '../../state/CourseStore';
import { currentUser as defaultLearner } from '../../data/mockData';
import LearnerCertificates from '../learner/LearnerCertificates';

/** Chứng chỉ cá nhân, dùng chung cho cả 6 role. */
export default function MyCertificates() {
  const { currentUser } = useCourseStore();
  return <LearnerCertificates user={currentUser || defaultLearner} />;
}
