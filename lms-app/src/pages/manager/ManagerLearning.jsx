import React from 'react';
import { managerUser } from '../../data/mockData';
import { useCourseStore } from '../../store/CourseStore';
import LearnerCourses from '../learner/LearnerCourses';

export default function ManagerLearning() {
  const { currentUser: authUser } = useCourseStore();
  const user = (authUser && authUser.role === 'manager') ? authUser : managerUser;
  return <LearnerCourses user={user} basePath="/manager/learning" />;
}

