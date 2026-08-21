import React from 'react';
import { currentUser, myLearningCourses } from '../../data/mockData';
import { Badge } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';

export default function LearnerHistory() {
  const { courses: allCourses } = useCourseStore();
  const courses = myLearningCourses(allCourses, currentUser);
  const rows = courses.flatMap((c) =>
    (c.assessmentAttempts || []).map((att) => ({
      course: c.title,
      attempt: att.n,
      score: att.score,
      passed: att.score >= c.configuration.passingScorePercent,
    }))
  );

  return (
    <>
      <div className="page-header">
        <h1>Learning history</h1>
        <p>A permanent record of every assessment attempt. Nothing here is ever overwritten.</p>
      </div>

      {rows.length === 0 ? (
        <div className="card empty-state">
          <i className="ti ti-history" aria-hidden="true" />
          <p>No assessment attempts recorded yet.</p>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Attempt</th>
                <th>Score</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r.course}</td>
                  <td>Attempt {r.attempt}</td>
                  <td>{r.score}%</td>
                  <td><Badge tone={r.passed ? 'sage' : 'rust'}>{r.passed ? 'Passed' : 'Failed'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
