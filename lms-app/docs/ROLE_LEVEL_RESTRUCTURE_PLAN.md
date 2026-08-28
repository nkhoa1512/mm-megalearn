# Tái cấu trúc Role & Job Level — MM MegaLearn (AS-BUILT)

> Tài liệu này mô tả **mô hình đã triển khai** trong code, không còn là kế hoạch.
> Kiểm chứng tự động: `npm run verify` (86 assertion) và `npm run build`.

---

## 1. Các vấn đề của bản cũ và trạng thái xử lý

| # | Vấn đề | Trạng thái |
|---|--------|-----------|
| P1 | 7 role rời rạc (`learner, manager, trainer, hrbp, admin, useradmin, sysadmin`) thay vì 6 | ✅ Còn đúng 6 role; `admin` được alias về `trainer` trong `normalizeRole()` |
| P2 | Không có khái niệm "role nào quản lý được role nào" | ✅ `managedRolesOf()` / `canManage()` trong `src/data/roles.js` |
| P3 | `course.targetLevel` dùng thang 1→5 (1 thấp nhất) còn `user.level` dùng 1→7 (1 cao nhất) — hai thang ngược chiều | ✅ Một thang duy nhất 7→1 trong `src/data/levelSystem.js` |
| P4 | `isHigherLevel = targetLevel > user.level` sai chiều | ✅ Thay bằng `checkCourseAccessRule()` |
| P5 | Chưa có quy tắc tuần tự lv7→lv6→lv5 | ✅ `ACCESS_STATE` + Sequential Level Gate |
| P6 | `getCourseAccessControl` hardcode "khoá Leadership cần level >= 4" | ✅ Nay chỉ bọc `checkCourseAccessRule()` |
| P7 | Minh Tran (Bakery, role learner) có `level: '1'` = cấp cao nhất | ✅ Minh Tran là **Level 7** |
| P8 | `MINH_TRAN_ENROLLMENTS` dùng key `course-fsh-1` trong khi id thật là `CRS-FSH-001` → persona chính có 0 enrollment | ✅ Đã trỏ đúng 12 khoá Level 7 có thật |
| P9 | Route `/manager/approvals` không được khai báo trong `App.jsx` | ✅ Đã khai báo (và thêm `/approvals` dùng chung) |
| P10 | `myLearningCourses` fallback về enrollment của Minh Tran cho mọi user | ✅ Bỏ fallback |
| P11 | Tab "Job Levels" hardcode 5 bậc với Level 1 = thấp nhất | ✅ Sinh từ `jobLevels` (7 bậc, 7 thấp nhất) |
| P12 | Ma trận RBAC trong AdminConfig phân quyền theo job level | ✅ Đổi trục sang **role** |
| P13 (mới) | `enrollCourse` được UI gọi nhưng CourseStore không hề định nghĩa | ✅ Đã có trong store |
| P14 (mới) | `USR-1042` bị trùng giữa persona neo và user sinh tự động thứ 42 | ✅ Dãy sinh tự động né mã của persona neo |
| P15 (mới) | Lesson/Assessment Player chặn mọi khoá vì đọc `course.enrollment` (khoá sinh tự động không có field này) | ✅ Gộp từ ma trận ghi danh + overlay của store |
| P16 (mới) | `AssessmentPlayer` return sớm trước các `useEffect` (vi phạm rules of hooks) | ✅ Mọi hook chạy trước nhánh return |

---

## 2. Mô hình đã triển khai

### 2.1. Sáu Role (rank thấp → cao) — `src/data/roles.js`

| Rank | roleId | Tên | Persona demo | Level | Quản lý được |
|------|--------|-----|--------------|-------|--------------|
| 1 | `learner` | User Learner | Minh Tran (`USR-1042`) | 7 | — |
| 2 | `manager` | Manager | David Tran (`USR-0245`) | 4 | learner |
| 3 | `trainer` | Trainer / L&D | Nguyen Van Hung (`USR-9003`) | 3 | learner, manager |
| 4 | `hrbp` | HRBP | Le Thi Mai (`USR-9004`) | 2 | learner, manager, trainer |
| 5 | `useradmin` | User Admin | Pham Thanh Thao (`USR-9002`) | 2 | learner, manager, trainer, hrbp |
| 6 | `sysadmin` | System Admin (IT) | Tran Quoc Bao (`USR-9001`) | 1 | **tất cả, kể cả useradmin** |

**Cả 6 role đều là Learner** — mỗi role có nhóm nav "Học tập của tôi" (`/my-learning`, `/my-certificates`);
riêng `learner` dùng thẳng `/learner/*`.

### 2.2. Ma trận năng lực (`capabilitiesOf`)

| Capability | learner | manager | trainer | hrbp | useradmin | sysadmin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `canLearn` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `canRequestLevelSkip` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `canApproveLevelSkip` | – | ✔ | ✔ | ✔ | ✔ | ✔ |
| `canTeach` / `canBeAssignedToClass` | – | – | ✔ | – | – | – |
| `canAuthorCourses` | – | – | ✔ | – | ✔ | ✔ |
| `canAssignTrainers` | – | – | – | – | ✔ | ✔ |
| `canViewOrgProgress` | – | team | ✔ | ✔ | ✔ | ✔ |
| `canManageUsers` | – | – | – | – | ✔ | ✔ |
| `canConfigureSystem` | – | – | – | – | – | ✔ |
| `canViewAuditLogs` | – | – | – | – | – | ✔ |
| **`canDevelopPlatform`** (code/schema/hạ tầng) | – | – | – | – | **–** | **✔** |

`useradmin` = quyền nghiệp vụ gần như `sysadmin` **trừ** cấu hình hệ thống, audit log và phát triển nền tảng.

### 2.3. Bảy Job Level — `src/data/levelSystem.js` (7 THẤP nhất → 1 CAO nhất)

| Level | Chức danh | Nội dung đào tạo tiêu biểu |
|---|---|---|
| 1 👑 | Board of Management (BOM) / Giám Đốc Điều Hành | Chiến lược bán lẻ tập đoàn, quản trị rủi ro & khủng hoảng toàn quốc |
| 2 👑 | Store General Manager (SGM) / Trưởng Khối | Quản trị P&L siêu thị, hoạch định ngân sách, quy hoạch kế nhiệm |
| 3 🟠 | Section Manager / Trưởng Ngành Hàng (Master Trainer) | Quản trị chi phí ngành hàng, đàm phán nhà cung cấp |
| 4 🔵 | Store Department Manager (Line Manager) | Quản lý nhân sự phòng ban, phân ca, kèm cặp 1-on-1 |
| 5 🟢 | Shift Supervisor / Trưởng Nhóm | Giám sát ca, kiểm kê thất thoát, an toàn xe nâng |
| 6 🟢 | Specialist / Chuyên Viên Vận Hành Chính Thức | HACCP chuyên sâu, bảo quản tươi sống, vận hành lò nướng |
| 7 ⚪ | Junior Associate / Nhân Viên Tuyến Đầu | Nhập môn văn hóa, vệ sinh cơ bản, PCCC cơ bản, thao tác quầy |

`CL` (Casual Labor) và `IN` (Internship) của HRIS cũ được `normalizeLevel()` quy về Level 7.

Phân bổ 100 khoá học theo cấp: **L7: 23 · L6: 38 · L5: 23 · L4: 8 · L3: 4 · L2: 3 · L1: 1**.
Phân bổ 100 nhân sự: **L7: 30 · L6: 46 · L5: 13 · L4: 6 · L3: 4 · L2: 1**.

### 2.4. Quy tắc mở khoá tuần tự (Sequential Level Gate)

Với `gap = levelValue(user.level) - levelValue(course.targetLevel)` (số bậc khoá học **cao hơn** học viên):

| gap | `ACCESS_STATE` | Ý nghĩa |
|---|---|---|
| `<= 0` | `OPEN` | Khoá ở cấp của mình hoặc thấp hơn → học ngay |
| `= 1` | `REQUESTABLE` | Vượt đúng 1 cấp → hiện nút "🔒 Xin Phê Duyệt Học Vượt Cấp" |
| `= 1` | `PENDING_APPROVAL` | Đã gửi đơn, chờ Manager duyệt (nút bị vô hiệu hoá) |
| `= 1` | `APPROVED` | Manager đã duyệt **riêng khoá này** → mở khoá + tự ghi danh |
| `= 1` | `REJECTED` | Bị từ chối → được gửi lại đơn |
| `>= 2` | `LOCKED_LEVEL_GAP` | Nhảy cóc → **cấm tuyệt đối**, hiển thị lộ trình phải leo qua |

Phê duyệt **không** mở nguyên cấp bậc — mỗi lần duyệt chỉ mở đúng một khoá học.
Một `APPROVED` cho khoá cách ≥ 2 cấp cũng **không** mở được (đã có test).

---

## 3. Bản đồ file

### Nền tảng mới
- `src/data/levelSystem.js` — `LEVEL_DEFINITIONS`, `normalizeLevel()`, `levelGap()`, `nextLevelUp()`, `levelRoadmap()`, `ACCESS_STATE`, `checkCourseAccessRule()`.
- `src/data/roles.js` — `ROLE_DEFINITIONS`, `normalizeRole()` (+ `LEGACY_ROLE_ALIAS`), `managedRolesOf()`, `canManage()`, `capabilitiesOf()`, `ROLE_HOME`.
- `src/pages/shared/MyLearning.jsx`, `src/pages/shared/MyCertificates.jsx` — cổng học tập dùng chung cho 6 role.
- `scripts/verify-role-level-model.jsx` — bộ kiểm chứng chạy bằng `npm run verify`.

### Dữ liệu
- `orgHierarchy.js` — `jobLevels` sinh từ `LEVEL_DEFINITIONS` + metadata HR (`authority`, `typicalRoles`, `descVi`).
- `generated100Data.js` — thang `targetLevel` 7→1 qua `COURSE_LEVEL_LADDER`; personas đúng cấp; enrollment generator không bao giờ tự ghi danh khoá vượt cấp; `getCourseAccessControl` chỉ bọc `checkCourseAccessRule`.
- `mockData.js` — 6 persona + `personaForRole()`, `rolePersonas`, `getManagedUsers()`, `enrollmentsForUser()`; `pendingApprovalRequests` là đơn `LEVEL_ADVANCE` trỏ tới khoá có thật.

### State
- `CourseStore.jsx` — key `v6`; `normalizeRole/normalizeLevel` khi hydrate; `enrollments` overlay; `enrollCourse`, `accessFor`, `requestLevelAdvanceApproval`, `approveRequest` (tự ghi danh khi duyệt), `rejectRequest`, `saveCourseProgress`, `assignTrainerToCourse`.

### Điều hướng & UI
- `App.jsx` — route đầy đủ cho 6 role + `/my-learning/*`, `/approvals`, `/manager/approvals`, tab deep-link cho HRBP / User Admin / SysAdmin / Trainer; giữ `/admin/*` cũ.
- `Sidebar.jsx` — 2 nhóm: "Công việc của <role>" + "Học tập của tôi"; badge số đơn chờ duyệt.
- `ui.jsx` — `JobLevelBadge`, `LevelAccessBadge`.
- `LearnerCourses.jsx` / `LearnerCourseDetail.jsx` — bảng lộ trình cấp bậc, nút theo `access.state`, modal gửi đơn.
- `LessonPlayer.jsx` / `AssessmentPlayer.jsx` — chặn khi `isLevelLocked`.
- `ManagerApprovals.jsx` — khối "Học vượt cấp": cấp hiện tại → cấp khoá, checklist khoá bắt buộc còn thiếu, chặn duyệt đơn nhảy cóc.
- `UserAdminPortal.jsx` — 7 bậc định biên, tab **Phân Bổ Khóa Học** và **Phân Công Giảng Viên Đứng Lớp**.
- `TrainerHub.jsx` — thêm tab **Quản Lý Điểm Danh Học Viên**.
- `SysAdminPortal.jsx` — thêm tab **Quản Trị Toàn Bộ 6 Role** (chuỗi phân cấp, ma trận năng lực, hành động chỉ IT được phép).
- `AdminCourseBuilder.jsx` — field **Cấp bậc mục tiêu** (7→1).
- `AdminConfig.jsx` — ma trận RBAC theo role.

---

## 4. Kịch bản kiểm thử thủ công

1. Đăng nhập **Minh Tran (Level 7)** → `/learner/courses`:
   - Khoá Level 7 → "Đăng Ký Học" / "Tiếp Tục" (vào học được).
   - Khoá Level 6 → "🔒 Xin Phê Duyệt Học Vượt Cấp" → gửi đơn → nút chuyển "⏳ Đang Chờ Quản Lý Duyệt".
   - Khoá Level 5/4/3/2/1 → "⛔ Chặn Nhảy Cóc: Phải hoàn thành Level 6 trước" (nút bị vô hiệu hoá).
2. Đổi sang **David Tran (Manager)** → "Duyệt Đơn Học Vượt Cấp" → thấy đơn của Minh Tran kèm checklist khoá bắt buộc → **Phê Duyệt**.
3. Quay lại **Minh Tran** → khoá Level 6 đã mở, xuất hiện trong "Khóa Học Của Tôi", vào học được.
4. Lần lượt **Trainer / HRBP / User Admin / System Admin** → kiểm tra nhóm nav "Học tập của tôi" đều vào được và hiển thị đúng cấp bậc của họ.
5. `npm run verify` → tất cả assertion pass. `npm run build` → 0 lỗi.
