import { SCOPE_ROADMAP_MATRIX } from '../../data/levelRoadmapMatrix';

export const roadmapApi = {
  async getRoadmapScopes() {
    return SCOPE_ROADMAP_MATRIX;
  }
};

export default roadmapApi;
