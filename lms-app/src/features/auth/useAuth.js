import { useCourseStore } from '../../store/CourseStore';

export function useAuth() {
  const { isAuthenticated, currentUser, login, logout, switchUser } = useCourseStore();
  return {
    isAuthenticated,
    user: currentUser,
    login,
    logout,
    switchUser,
  };
}

export default useAuth;
