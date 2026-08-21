import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { courses as initialCourses } from '../data/mockData';

// No backend in this mockup: courses live in memory (React state) and are mirrored
// to localStorage so Admin's created/edited courses survive a page reload too,
// not just in-session navigation. Clear localStorage to reset to the seed data.
const STORAGE_KEY = 'ridgeline-lms-courses';
const CourseStoreContext = createContext(null);

function loadInitialCourses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Corrupt or inaccessible storage — fall back to the seed data below.
  }
  return initialCourses;
}

export function CourseStoreProvider({ children }) {
  const [courses, setCourses] = useState(loadInitialCourses);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
    } catch {
      // Storage unavailable (private browsing, quota) — edits still work in-session.
    }
  }, [courses]);

  const addCourse = useCallback((course) => {
    setCourses((prev) => [...prev, course]);
  }, []);

  const updateCourse = useCallback((courseId, nextCourse) => {
    setCourses((prev) => prev.map((c) => (c.id === courseId ? nextCourse : c)));
  }, []);

  const removeCourse = useCallback((courseId) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  }, []);

  return (
    <CourseStoreContext.Provider value={{ courses, addCourse, updateCourse, removeCourse }}>
      {children}
    </CourseStoreContext.Provider>
  );
}

export function useCourseStore() {
  const ctx = useContext(CourseStoreContext);
  if (!ctx) throw new Error('useCourseStore must be used within a CourseStoreProvider');
  return ctx;
}
