import { courses, curricula } from '../../data/mockData';

export const catalogApi = {
  async getCourses() {
    return courses;
  },
  async getCurricula() {
    return curricula;
  }
};

export default catalogApi;
