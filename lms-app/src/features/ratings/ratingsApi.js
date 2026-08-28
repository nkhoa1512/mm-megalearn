import { teachingEligibleUsers, trainerStatsFor } from '../../data/mockData';

export const ratingsApi = {
  async getTrainers() {
    return teachingEligibleUsers;
  },
  async getTrainerStats(userId) {
    return trainerStatsFor(userId);
  }
};

export default ratingsApi;
