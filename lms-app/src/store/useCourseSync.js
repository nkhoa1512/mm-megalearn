import { useEffect } from 'react';
import { useCourseStore } from './CourseStore';

export function useCourseSync() {
  const store = useCourseStore();

  useEffect(() => {
    // Sync hook for remote API / session cache if needed
    // Currently loads from mock & localStorage in CourseStore
  }, []);

  return store;
}

export default useCourseSync;
