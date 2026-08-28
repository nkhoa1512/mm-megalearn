import { INITIAL_ASSESSMENTS, INITIAL_ASSESSMENT_ATTEMPTS, QUESTION_BANK } from '../../data/assessmentData';

export const assessmentApi = {
  async getAssessments() {
    return INITIAL_ASSESSMENTS;
  },
  async getAssessmentById(id) {
    return INITIAL_ASSESSMENTS.find(a => a.id === id) || null;
  },
  async getQuestionBank() {
    return QUESTION_BANK;
  },
  async getAttempts() {
    return INITIAL_ASSESSMENT_ATTEMPTS;
  }
};

export default assessmentApi;
