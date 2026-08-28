import React from 'react';
import { CourseStoreProvider, useCourseStore } from './CourseStore';

export const AppProvider = ({ children }) => {
  return <CourseStoreProvider>{children}</CourseStoreProvider>;
};

export const useAppStore = useCourseStore;
export { CourseStoreProvider, useCourseStore };
export default AppProvider;
