import React from 'react';
import AppHeader from './AppHeader';
import AppFooterBar from './AppFooterBar';
import AiAssistantDrawer from '../aiAssistant/AiAssistantDrawer';
import TalentProfileModal from '../common/TalentProfileModal';
import PostTrainingSurveyModal from '../common/PostTrainingSurveyModal';

export function Layout({ role, setRole, title, crumb, children }) {
  return (
    <div className="app-shell">
      <AppHeader
        role={role}
        onRoleChange={setRole}
        title={title}
        crumb={crumb}
      />
      <div className="main-scroll">
        <div className="content">
          {children}
        </div>
      </div>

      <AppFooterBar role={role} />

      {/* Global AI Assistant Floating Drawer */}
      <AiAssistantDrawer />

      {/* Global Modals: Talent Profile, L1/L3 Surveys */}
      <TalentProfileModal />
      <PostTrainingSurveyModal />
    </div>
  );
}

export default Layout;
