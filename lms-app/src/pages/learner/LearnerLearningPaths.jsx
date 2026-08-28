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
          <h1>Lộ Trình Học Tập Của Tôi</h1>
          <Badge tone="rail" icon="ti-map-2">{levelDef.emoji} Level {currentUser?.level} &middot; {levelDef.shortVi}</Badge>
        </div>
        <p>
          4 phân hệ lộ trình: Lộ trình cấp bậc hiện tại, Lộ trình kế cận thăng cấp, Lộ trình tự đề xuất
          và Khóa học gợi ý theo vị trí công việc.
        </p>
      </div>
      <RoadmapTabsPanel user={currentUser} initialTab={initialTab} />
    </>
  );
}
