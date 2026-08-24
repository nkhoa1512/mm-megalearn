import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { currentUser, myLearningCourses } from '../../data/mockData';
import { Badge, ProgressBar, Button, CourseTypeBadge } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';

const statusMap = {
  IN_PROGRESS: { tone: 'amber', label: 'Đang Học' },
  NOT_STARTED: { tone: 'slate', label: 'Chưa Bắt Đầu' },
  COMPLETED: { tone: 'sage', label: 'Đã Hoàn Thành' },
  FAILED: { tone: 'rust', label: 'Cần Thi Lại' },
  OVERDUE: { tone: 'rust', label: 'Quá Hạn' },
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export function JobLevelBadge({ level, title }) {
  const lvl = String(level || '1');
  if (lvl === '5') {
    return (
      <span style={{ background: '#FEF08A', color: '#854D0E', border: '1px solid #FDE047', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>
        👑 Level 5: Giám Đốc
      </span>
    );
  }
  if (lvl === '4') {
    return (
      <span style={{ background: '#EDE9FE', color: '#6D28D9', border: '1px solid #DDD6FE', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>
        👑 Level 4: Quản Lý
      </span>
    );
  }
  if (lvl === '3') {
    return (
      <span style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
        🟠 Level 3: Trưởng Quầy
      </span>
    );
  }
  if (lvl === '2') {
    return (
      <span style={{ background: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
        🔵 Level 2: Trưởng Nhóm
      </span>
    );
  }
  return (
    <span style={{ background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      🟢 Level 1: Tuyến Đầu
    </span>
  );
}

export default function LearnerCourses({ user: propUser, basePath = '/learner/courses' }) {
  const navigate = useNavigate();
  const { courses: allCourses, currentUser: authUser, enrollCourse } = useCourseStore();
  const user = propUser || authUser || currentUser;
  const enrolledCourses = myLearningCourses(allCourses, user);

  // Scope Tab: MY_COURSES (12 assigned courses) vs FULL_CATALOG (100 enterprise courses)
  const [scopeTab, setScopeTab] = useState('MY_COURSES'); // MY_COURSES, FULL_CATALOG

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [domainFilter, setDomainFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('TABLE'); // TABLE, GRID
  const [showRecommendations, setShowRecommendations] = useState(true);

  // Active courses based on scope tab
  const activeCourseList = scopeTab === 'MY_COURSES' ? enrolledCourses : allCourses;

  // Filter logic
  const filtered = activeCourseList.filter((c) => {
    const s = c.enrollment?.status;
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'MANDATORY' && c.courseType === 'MANDATORY') ||
      (statusFilter === 'IN_PERSON' && (c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB')) ||
      (statusFilter === 'HIGHER_LEVEL' && Number(c.targetLevel || 1) > Number(user.level || 1)) ||
      s === statusFilter;

    const matchLevel = levelFilter === 'ALL' || String(c.targetLevel || '1') === String(levelFilter);
    const matchDomain = domainFilter === 'ALL' || c.domain === domainFilter || c.category === domainFilter;
    const matchFormat = formatFilter === 'ALL' || c.format?.includes(formatFilter) || c.modality === formatFilter;
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase()) ||
      (c.domain && c.domain.toLowerCase().includes(search.toLowerCase()));

    return matchStatus && matchLevel && matchDomain && matchFormat && matchSearch;
  });

  const completedCount = enrolledCourses.filter((c) => c.enrollment?.status === 'COMPLETED').length;
  const inProgressCount = enrolledCourses.filter((c) => c.enrollment?.status === 'IN_PROGRESS').length;
  const overdueCount = enrolledCourses.filter((c) => c.enrollment?.status === 'OVERDUE').length;
  const mandatoryCount = enrolledCourses.filter((c) => c.courseType === 'MANDATORY').length;
  const higherLevelCount = allCourses.filter((c) => Number(c.targetLevel || 1) > Number(user.level || 1)).length;

  // Smart Recommendations for User based on Department & Level
  const isManager = user?.role === 'manager' || Number(user?.level) >= 4;
  const isFreshFood = user?.departmentCode === 'PPF' || user?.sectionId?.includes('bakery') || user?.position?.includes('Bakery');
  const isNewHire = user?.status === 'NEW_JOINER';

  const recommendations = allCourses.filter((c) => {
    if (isNewHire) return c.code.includes('CULT') || c.code.includes('FSH');
    if (isManager) return c.code.includes('LEAD') || c.code.includes('STOPS');
    if (isFreshFood) return c.code.includes('FSH') || c.code.includes('COLD') || c.code.includes('STOPS');
    return c.courseType === 'MANDATORY';
  }).slice(0, 3);

  return (
    <>
      {/* PAGE HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Chương Trình Đào Tạo &amp; Khóa Học Của Tôi</h1>
            <Badge tone="rail">{enrolledCourses.length} Khóa Học Đang Theo Dõi</Badge>
          </div>
          <p style={{ margin: 0 }}>
            Học viên: <strong>{user.fullName}</strong> &middot; {user.position} ({user.branchName || 'Khối Vận hành Siêu thị'}) &middot; Cấp bậc hiện tại: <strong>Level {user.level || '1'} (Tuyến đầu)</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowRecommendations(!showRecommendations)}
            className="btn btn-sm btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="ti ti-sparkles" />
            {showRecommendations ? 'Ẩn Gợi Ý Bổ Trợ' : 'Hiện Gợi Ý Bổ Trợ'}
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'TABLE' ? 'GRID' : 'TABLE')}
            className="btn btn-sm btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className={`ti ${viewMode === 'TABLE' ? 'ti-layout-grid' : 'ti-list'}`} />
            {viewMode === 'TABLE' ? 'Dạng Lưới (Grid)' : 'Dạng Bảng (Table)'}
          </button>
        </div>
      </div>

      {/* TOP SCOPE TABS: MY_COURSES VS FULL_CATALOG */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 10, flexWrap: 'wrap' }}>
        <button
          onClick={() => { setScopeTab('MY_COURSES'); setStatusFilter('ALL'); setLevelFilter('ALL'); }}
          className="btn btn-sm"
          style={{
            background: scopeTab === 'MY_COURSES' ? 'var(--blue)' : 'var(--paper-raised)',
            color: scopeTab === 'MY_COURSES' ? '#fff' : 'var(--ink)',
            borderColor: scopeTab === 'MY_COURSES' ? 'var(--blue)' : 'var(--line-strong)',
            fontWeight: scopeTab === 'MY_COURSES' ? 700 : 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <i className="ti ti-bookmark" />
          <span>Khóa Học Của Tôi (Được Gán Cho Level {user.level || '1'})</span>
          <Badge tone={scopeTab === 'MY_COURSES' ? 'slate' : 'blue'}>{enrolledCourses.length}</Badge>
        </button>

        <button
          onClick={() => { setScopeTab('FULL_CATALOG'); setStatusFilter('ALL'); setLevelFilter('ALL'); }}
          className="btn btn-sm"
          style={{
            background: scopeTab === 'FULL_CATALOG' ? 'var(--blue)' : 'var(--paper-raised)',
            color: scopeTab === 'FULL_CATALOG' ? '#fff' : 'var(--ink)',
            borderColor: scopeTab === 'FULL_CATALOG' ? 'var(--blue)' : 'var(--line-strong)',
            fontWeight: scopeTab === 'FULL_CATALOG' ? 700 : 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <i className="ti ti-books" />
          <span>Khám Phá Toàn Bộ Thư Viện Doanh Nghiệp (Level 1 → Level 5)</span>
          <Badge tone={scopeTab === 'FULL_CATALOG' ? 'slate' : 'blue'}>{allCourses.length} Khóa</Badge>
        </button>
      </div>

      {/* SMART RECOMMENDATION BANNER */}
      {showRecommendations && (
        <div
          className="card card-pad"
          style={{
            background: 'linear-gradient(135deg, #FAFDF5 0%, #F0FDF4 100%)',
            borderLeft: '4px solid var(--sage)',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--sage-soft)', color: 'var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-sparkles" />
              </div>
              <span style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--sage)' }}>
                Khóa Học Bổ Trợ Đề Xuất Theo Chức Danh: <strong>{user.position}</strong> (Level {user.level || '1'})
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              {isManager ? 'Lộ trình Lãnh đạo & Kèm cặp 70/20/10' : 'Tiêu chuẩn Thực phẩm Tươi sống & Chuỗi lạnh'}
            </span>
          </div>

          <div className="grid grid-3" style={{ gap: 12 }}>
            {recommendations.map((rec) => (
              <div key={rec.id} className="card card-pad" style={{ background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>{rec.code}</span>
                    <JobLevelBadge level={rec.targetLevel} title={rec.targetLevelTitle} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginBottom: 6, lineHeight: 1.4 }}>
                    {rec.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 10 }}>
                    Thời lượng: {rec.estimatedDuration || '3h'} &middot; Điểm đạt: {rec.passingScore || 80}%
                  </div>
                </div>
                <Button size="sm" variant="outline" icon="ti-player-play" onClick={() => navigate(`${basePath}/${rec.id}`)}>
                  Vào Học Ngay
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MULTI-FACETED FILTER BAR */}
      <div className="card card-pad" style={{ marginBottom: 20 }}>
        {/* Status Tabs */}
        {scopeTab === 'MY_COURSES' ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'Tất Cả Khóa Đã Gán', count: enrolledCourses.length },
                { id: 'IN_PROGRESS', label: 'Đang Học', count: inProgressCount },
                { id: 'COMPLETED', label: 'Đã Hoàn Thành', count: completedCount },
                { id: 'OVERDUE', label: 'Quá Hạn', count: overdueCount },
                { id: 'MANDATORY', label: 'Bắt Buộc Tuân Thủ', count: mandatoryCount },
                { id: 'IN_PERSON', label: '🏢 Đào Tạo Trực Tiếp (In-Person)', count: enrolledCourses.filter((c) => c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB').length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`btn btn-sm ${statusFilter === tab.id ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    borderColor: statusFilter === tab.id ? 'var(--blue)' : 'var(--line)',
                    background: statusFilter === tab.id ? 'var(--blue)' : 'transparent',
                    color: statusFilter === tab.id ? '#fff' : 'var(--ink)',
                  }}
                >
                  {tab.label}
                  <span style={{
                    background: statusFilter === tab.id ? 'rgba(255,255,255,0.3)' : 'var(--paper-sunken)',
                    color: statusFilter === tab.id ? '#fff' : 'var(--ink-soft)',
                    padding: '1px 6px',
                    borderRadius: 10,
                    fontSize: 10.5,
                    fontWeight: 700,
                  }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              <i className="ti ti-info-circle" style={{ color: 'var(--blue)', marginRight: 4 }} />
              Đang hiển thị toàn bộ <strong>{allCourses.length} khóa học</strong> trong hệ thống. Học viên có thể chọn lọc theo <strong>Cấp Bậc (Level 1 → Level 5)</strong> để đăng ký học các khóa nâng cao!
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setStatusFilter(statusFilter === 'HIGHER_LEVEL' ? 'ALL' : 'HIGHER_LEVEL')}
                className={`btn btn-sm ${statusFilter === 'HIGHER_LEVEL' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: 12, fontWeight: 700 }}
              >
                👑 Chỉ Xem Khóa Cấp Cao Hơn (Level 2 - 5) ({higherLevelCount})
              </button>
            </div>
          </div>
        )}

        {/* Search and Secondary Dropdowns */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 260 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: 10, color: 'var(--ink-faint)', fontSize: 14 }} />
            <input
              type="text"
              className="field-input"
              style={{ paddingLeft: 32, height: 34, fontSize: 12.5 }}
              placeholder="Tìm mã khóa, tiêu đề..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* JOB LEVEL FILTER */}
          <select
            className="field-select"
            style={{ height: 34, fontSize: 12, minWidth: 170, fontWeight: 600, borderColor: 'var(--blue)' }}
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="ALL">🎯 Tất cả Cấp Bậc (Level 1 - 5)</option>
            <option value="1">🟢 Level 1: Tuyến Đầu (Associate)</option>
            <option value="2">🔵 Level 2: Trưởng Nhóm (Supervisor)</option>
            <option value="3">🟠 Level 3: Trưởng Quầy (Section Lead)</option>
            <option value="4">👑 Level 4: Quản Lý (Dept Manager)</option>
            <option value="5">👑 Level 5: Giám Đốc (Store Director)</option>
          </select>

          <select
            className="field-select"
            style={{ height: 34, fontSize: 12, minWidth: 170 }}
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
          >
            <option value="ALL">Tất cả Chuyên ngành (12 Domains)</option>
            <option value="Food Safety & Hygiene">Food Safety &amp; Hygiene</option>
            <option value="Information Security">Information Security</option>
            <option value="Health & Safety">Health &amp; Safety</option>
            <option value="Cold Chain">Cold Chain</option>
            <option value="Store Operations">Store Operations</option>
            <option value="Leadership">Leadership &amp; Management</option>
            <option value="Supply Chain">Supply Chain &amp; Logistics</option>
            <option value="Merchandising">Merchandising</option>
            <option value="E-Commerce">Digital &amp; E-Commerce</option>
          </select>

          <select
            className="field-select"
            style={{ height: 34, fontSize: 12, minWidth: 140 }}
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
          >
            <option value="ALL">Tất cả Định dạng</option>
            <option value="SCORM">SCORM Package</option>
            <option value="Video">Interactive Video</option>
            <option value="PPT">Interactive PPT</option>
            <option value="CLASSROOM_LAB">Thực Hành Xưởng (ILT)</option>
            <option value="EXTERNAL_PLATFORM">LinkedIn / Coursera</option>
          </select>
        </div>
      </div>

      {/* CONTENT: TABLE VIEW OR GRID VIEW */}
      {viewMode === 'TABLE' ? (
        <div className="card" style={{ overflowX: 'auto', marginBottom: 20 }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Khóa Học</th>
                <th style={{ width: 140 }}>Cấp Bậc (Level)</th>
                <th>Loại Hình</th>
                <th>Định Dạng / Giảng Viên</th>
                <th style={{ width: 130 }}>Tiến Độ</th>
                <th style={{ width: 110 }}>Trạng Thái</th>
                <th style={{ textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-soft)' }}>
                    Không tìm thấy khóa học nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const enr = c.enrollment;
                  const status = enr?.status || 'NOT_STARTED';
                  const stConfig = statusMap[status] || statusMap.NOT_STARTED;
                  const isCompleted = status === 'COMPLETED';
                  const isFailed = status === 'FAILED';
                  const isInPerson = c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB';
                  const isHigherLevel = Number(c.targetLevel || 1) > Number(user.level || 1);

                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>
                          {c.title}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{c.code}</span>
                          <span>&middot;</span>
                          <span>{c.category || c.domain}</span>
                          <span>&middot;</span>
                          <span>{c.estimatedDuration || '3h'}</span>
                        </div>
                      </td>

                      <td>
                        <JobLevelBadge level={c.targetLevel} title={c.targetLevelTitle} />
                      </td>

                      <td>
                        <CourseTypeBadge courseType={c.courseType} />
                      </td>

                      <td>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                          {isInPerson ? (
                            <span style={{ color: 'var(--blue)' }}><i className="ti ti-building-store" style={{ marginRight: 4 }} /> Thực Hành Xưởng ILT</span>
                          ) : (
                            <span>{c.format || 'E-learning Online'}</span>
                          )}
                        </div>
                        {isInPerson && c.trainerName && (
                          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                            GV: {c.trainerName}
                          </div>
                        )}
                      </td>

                      <td>
                        {enr ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <ProgressBar
                                value={enr.progressPercent || 0}
                                tone={isCompleted ? 'sage' : isFailed ? 'rust' : 'amber'}
                                size="sm"
                              />
                            </div>
                            <span style={{ fontSize: 11.5, fontWeight: 700, minWidth: 32 }}>
                              {enr.progressPercent || 0}%
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Chưa đăng ký</span>
                        )}
                      </td>

                      <td>
                        {enr ? (
                          <Badge tone={stConfig.tone} icon={isCompleted ? 'ti-circle-check' : isFailed ? 'ti-alert-circle' : undefined}>
                            {stConfig.label}
                          </Badge>
                        ) : isHigherLevel ? (
                          <Badge tone="blue">Khóa Cấp Cao</Badge>
                        ) : (
                          <Badge tone="slate">Tự Chọn</Badge>
                        )}
                      </td>

                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {isInPerson ? (
                          <Button
                            size="sm"
                            variant="primary"
                            icon="ti-calendar-event"
                            onClick={() => navigate('/learner/classrooms')}
                          >
                            Xem Lịch &amp; QR
                          </Button>
                        ) : enr ? (
                          <Button
                            size="sm"
                            variant={isCompleted ? 'outline' : 'primary'}
                            icon={isCompleted ? 'ti-rotate' : isFailed ? 'ti-reload' : 'ti-player-play'}
                            onClick={() => navigate(`${basePath}/${c.id}`)}
                          >
                            {isCompleted ? 'Ôn Tập' : isFailed ? 'Thi Lại' : enr.progressPercent > 0 ? 'Tiếp Tục' : 'Bắt Đầu'}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant={isHigherLevel ? 'primary' : 'outline'}
                            icon="ti-plus"
                            onClick={() => {
                              enrollCourse(c.id);
                              navigate(`${basePath}/${c.id}`);
                            }}
                          >
                            {isHigherLevel ? 'Đăng Ký Học Nâng Cao' : 'Đăng Ký Học'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-3" style={{ gap: 16, marginBottom: 20 }}>
          {filtered.map((c) => {
            const enr = c.enrollment;
            const status = enr?.status || 'NOT_STARTED';
            const stConfig = statusMap[status] || statusMap.NOT_STARTED;
            const isCompleted = status === 'COMPLETED';
            const isHigherLevel = Number(c.targetLevel || 1) > Number(user.level || 1);

            return (
              <div
                key={c.id}
                className="card card-pad"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: isHigherLevel ? '3px solid #6D28D9' : '3px solid var(--blue)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>{c.code}</span>
                    <JobLevelBadge level={c.targetLevel} title={c.targetLevelTitle} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)', marginBottom: 6, lineHeight: 1.4 }}>
                    {c.title}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: 12 }}>
                    {c.description || 'Chương trình đào tạo chuyên môn theo tiêu chuẩn định biên MM Mega Market.'}
                  </p>
                </div>

                <div>
                  {enr && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-soft)', marginBottom: 4 }}>
                        <span>Tiến độ:</span>
                        <strong>{enr.progressPercent || 0}%</strong>
                      </div>
                      <ProgressBar value={enr.progressPercent || 0} tone={isCompleted ? 'sage' : 'amber'} size="sm" />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                      {c.estimatedDuration || '3h'}
                    </span>
                    <Button
                      size="sm"
                      variant={isHigherLevel ? 'primary' : 'outline'}
                      icon={enr ? 'ti-player-play' : 'ti-plus'}
                      onClick={() => {
                        if (!enr) enrollCourse(c.id);
                        navigate(`${basePath}/${c.id}`);
                      }}
                    >
                      {enr ? 'Vào Học' : isHigherLevel ? 'Học Nâng Cao' : 'Đăng Ký'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
