import React from 'react';
import { useCourseStore } from '../../store/CourseStore';
import { currentUser as defaultLearner } from '../../data/mockData';
import LearnerCourses from '../learner/LearnerCourses';

/**
 * The personal learning portal shared by all 6 roles.
 * Every role (Manager, Trainer, HRBP, User Admin, System Admin) is also a Learner, so
 * they all reach this screen with their own profile and job level.
 */
export default function MyLearning() {
  const { currentUser } = useCourseStore();
  return <LearnerCourses user={currentUser || defaultLearner} basePath="/my-learning" />;
}
