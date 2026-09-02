import React from 'react';
import { useCourseStore } from '../../store/CourseStore';
import { currentUser as defaultLearner } from '../../data/mockData';
import LearnerCertificates from '../learner/LearnerCertificates';

/** Personal certificates, shared by all 6 roles. */
export default function MyCertificates() {
  const { currentUser } = useCourseStore();
  return <LearnerCertificates user={currentUser || defaultLearner} />;
}
