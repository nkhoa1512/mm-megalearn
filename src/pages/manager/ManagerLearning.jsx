import React from 'react';
import { managerUser } from '../../data/mockData';
import LearnerCourses from '../learner/LearnerCourses';

// Section 36: Manager Login -> My Learning -> Optional + Mandatory Courses assigned by
// Admin. Behavior is identical to a User Learn's own learning, just scoped to the
// Manager's own assignments, so it reuses the learner course list/detail components.
export default function ManagerLearning() {
  return <LearnerCourses user={managerUser} basePath="/manager/learning" />;
}
