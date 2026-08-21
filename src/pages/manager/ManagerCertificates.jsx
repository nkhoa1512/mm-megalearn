import React from 'react';
import { managerUser } from '../../data/mockData';
import LearnerCertificates from '../learner/LearnerCertificates';

// Manager earns certificates the same way a User Learn does — section 39 applies
// to any completer, not just USER_LEARN — so this reuses the same view, scoped
// to the Manager's own completions.
export default function ManagerCertificates() {
  return <LearnerCertificates user={managerUser} />;
}
