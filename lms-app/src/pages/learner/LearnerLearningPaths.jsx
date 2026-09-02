import React from 'react';
import { useCourseStore } from '../../store/CourseStore';
import { Badge } from '../../features/common/ui';
import RoadmapTabsPanel from '../../features/roadmaps/RoadmapTabsPanel';
import { levelDefinition } from '../../data/levelSystem';

export default function LearnerLearningPaths({ initialTab = 'CURRENT' }) {
  const { currentUser } = useCourseStore();
  const levelDef = levelDefinition(currentUser?.level);

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h1>My Learning Roadmap</h1>
          <Badge tone="rail" icon="ti-map-2">{levelDef.emoji} Level {currentUser?.level} &middot; {levelDef.shortVi}</Badge>
        </div>
        <p>
          4 roadmap tabs: the current level roadmap, the succession roadmap, the self-proposed roadmap
          and course suggestions based on the job position.
        </p>
      </div>
      <RoadmapTabsPanel user={currentUser} initialTab={initialTab} />
    </>
  );
}
