import React from 'react';
import { useCourseStore } from '../../state/CourseStore';
import { currentUser as defaultLearner } from '../../data/mockData';
import LearnerCourses from '../learner/LearnerCourses';

/**
 * Cổng học tập cá nhân dùng chung cho cả 6 role.
 * Mọi role (Manager, Trainer, HRBP, User Admin, System Admin) đều là Learner nên
 * đều vào được màn hình này với hồ sơ và cấp bậc của chính họ.
 */
export default function MyLearning() {
  const { currentUser } = useCourseStore();
  return <LearnerCourses user={currentUser || defaultLearner} basePath="/my-learning" />;
}
