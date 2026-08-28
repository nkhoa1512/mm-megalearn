import React from 'react';
import { managerUser } from '../../data/mockData';
import { useCourseStore } from '../../store/CourseStore';
import LearnerCertificates from '../learner/LearnerCertificates';

export default function ManagerCertificates() {
  const { currentUser: authUser } = useCourseStore();
  const user = (authUser && authUser.role === 'manager') ? authUser : managerUser;
  return <LearnerCertificates user={user} />;
}

