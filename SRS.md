# SRS — MM MegaLearn (Corporate Learning & Development System)

> **Ghi chú nguồn gốc tài liệu:** File `SRS.md` gốc được nhắc tới trong code
> (`mockData.js`, `README.md`) không có trong repo này — chỉ còn lại bản mockup
> front-end (React) đã cài đặt theo nó. Tài liệu dưới đây được **dựng lại từ
> logic thực tế trong mã nguồn** (cấu trúc dữ liệu, các rule cứng trong
> `mockData.js`, hành vi từng màn hình, và toàn bộ comment tham chiếu
> `BR-xxx` / `FR-xxx` / "section N"). Những phần code không thể suy ra được
> (ví dụ cơ chế đăng nhập thật) được đánh dấu rõ là **[Đề xuất bổ sung]**
> thay vì bịa ra như thể đã tồn tại trong bản gốc.

## 1. Giới thiệu

### 1.1 Mục đích
MM MegaLearn là hệ thống đào tạo nội bộ doanh nghiệp (Corporate L&D System)
cho phép:
- Nhân viên (**User Learn**) học các khoá học bắt buộc (Mandatory) và tự chọn
  (Optional), làm bài đánh giá cuối khoá, nhận chứng chỉ.
- Quản lý (**Manager**) theo dõi tiến độ học tập của nhân viên thuộc phạm vi
  quản lý của mình, đồng thời cũng là người học các khoá dành cho vai trò
  Manager.
- Quản trị viên (**Admin**) xây dựng khoá học, cấu hình bài đánh giá, gán
  khoá học bắt buộc theo cơ cấu tổ chức, và xem báo cáo toàn hệ thống.

### 1.2 Phạm vi
Bản mockup hiện tại (`lms-app`) là **front-end thuần** (React + Vite +
React Router), không có backend thật:
- Toàn bộ dữ liệu nằm trong `src/data/mockData.js`, được mirror qua
  `localStorage` (key `mm-megalearn-courses-v5`) để việc tạo/sửa khoá học của
  Admin còn giữ lại sau khi reload trang.
- Vai trò hiện được chọn bằng dropdown ở Topbar (`learner` / `manager` /
  `admin`) — đây **chỉ là công cụ demo UI**, không phải cơ chế xác thực/phân
  quyền thật. Hệ thống thật phải suy ra role từ phiên đăng nhập đã xác thực.
- Tài liệu này mô tả **các yêu cầu nghiệp vụ mà UI đã hiện thực hoá**, làm cơ
  sở để dựng backend thật và hoàn thiện các phần UI còn để trống (nút chưa
  nối hành động, filter chưa hoạt động — liệt kê ở mục 10).

### 1.3 Đối tượng sử dụng tài liệu
Business analyst, backend/full-stack dev tiếp nhận dự án, QA viết test case,
và bất kỳ ai cần hiểu lại đúng hành vi hệ thống đã được thiết kế trong mockup
trước khi hiện thực hoá bằng dữ liệu thật.

### 1.4 Thuật ngữ / viết tắt
| Thuật ngữ | Ý nghĩa |
|---|---|
| BU | Business Unit |
| L&OD | Learning & Organizational Development (bộ phận HRD vận hành LMS) |
| Mandatory course | Khoá bắt buộc, có due date, gán theo phạm vi tổ chức |
| Optional course | Khoá tự chọn, mọi nhân viên đều thấy trong catalog |
| Enrollment | Bản ghi tiến trình học một khoá của một user |
| Attempt | Một lần làm bài đánh giá cuối khoá |

## 2. Vai trò & phạm vi truy cập

| Role | Mô tả | Có thể làm gì |
|---|---|---|
| **USER_LEARN** | Nhân viên | Học khoá Optional (tất cả) + Mandatory (được gán cho mình), làm assessment, xem chứng chỉ, xem lịch sử làm bài, nhận thông báo. |
| **MANAGER** | Quản lý cấp phòng/bộ phận | Mọi quyền của USER_LEARN cho **khoá học của chính mình** (Manager cũng là learner) **+** xem (không sửa) tiến độ học của nhân viên trong phạm vi quản lý (**BR-024**). Không được duyệt hay gán khoá học (**BR-025**). |
| **ADMIN** | L&OD Administrator | Toàn quyền: tạo/sửa/publish/archive/xoá khoá học, cấu hình ngân hàng câu hỏi & bài đánh giá, gán Mandatory course theo BU/Division/Department/Role/User, cấu hình toàn hệ thống, xem báo cáo toàn công ty. |

**BR-024** — Phạm vi quan sát của Manager giới hạn theo cơ cấu tổ chức (nhân
viên cùng phòng/bộ phận mà Manager phụ trách), không phải toàn công ty.

**BR-025** — Manager **chỉ giám sát (monitoring-only)**: không có hành động
nào trên màn hình Manager làm thay đổi một course assignment (không duyệt,
không gán, không thu hồi). Áp dụng cho Manager Dashboard, Team, Team courses,
Team reports.

## 3. Mô hình tổ chức & dữ liệu (data model)

```
BUSINESS_UNIT
  └─ DIVISION
       └─ DEPARTMENT
            └─ USER (userId, employeeCode, fullName, role, position,
                      businessUnitId, divisionId, departmentId, managerId, status)

COURSE
  ├─ COURSE_CONFIGURATION   (assessment + completion rules — mục 6)
  ├─ COURSE_ASSIGNMENT      (chỉ khi courseType = MANDATORY — mục 5)
  ├─ COURSE_MODULE[]
  │     └─ COURSE_LESSON[]  (lessonType, isRequired, rule, content, status)
  ├─ QUESTION_BANK[]        (chỉ khi assessmentEnabled = true)
  └─ LEARNING_ENROLLMENT    (1 user ⇄ 1 course)
        └─ ASSESSMENT_ATTEMPT[]  (lịch sử, không bao giờ bị ghi đè)
```

Ví dụ dữ liệu mẫu (seed): 1 Business Unit (MMVN), 3 Division (OMD, IA, HRD),
4 Department (PPF, DF, RSK, L&OD), 6 khoá học mẫu, 3 user mẫu (Admin/Manager/
User Learn).

## 4. Mô hình khoá học: Course > Module > Lesson

**Nguyên tắc cốt lõi:** cấu trúc chương trình học là **Course > Module >
Lesson**, mỗi lesson tự hoàn thành theo rule nội dung riêng của nó — **không
có bước "manager duyệt" nào chặn tiến độ** (thay thế mô hình "level-ladder"
kiểu cũ từng yêu cầu manager gate — xem `components/ui.jsx`).

### 4.1 Loại nội dung lesson & rule hoàn thành (§10–15)
| lessonType | Nội dung | Rule mặc định | Cách hoàn thành |
|---|---|---|---|
| VIDEO | video (URL hoặc upload) | `requiredWatchPercent` (mặc định 90%) | Tự động khi % xem đạt ngưỡng (theo dõi `currentTime/duration`), hoặc bấm "Mark as watched" |
| DOCUMENT | PDF/DOC (URL hoặc upload) | `requiredReadPercent` (mặc định 90%) | Xác nhận thủ công "Mark as read" (không track % đọc thật với file không phải text) |
| SCRIPT | PDF/DOC/TXT | `requiredReadPercent` | Giống DOCUMENT |
| TEXT | văn bản do Admin nhập trực tiếp | `requiredReadPercent` | Tự động theo % cuộn trang (scroll position) đạt ngưỡng |
| IMAGE | tập hợp ảnh | `requireAllViewed`, `imageCount` | Tự động khi số ảnh đã xem ≥ `imageCount` |
| ASSESSMENT | không có content riêng, dùng cấu hình assessment ở course | — | Qua màn hình Assessment Player riêng (mục 6), không render như lesson thường trong danh sách |

Mỗi lesson có cờ `isRequired`; chỉ lesson bắt buộc mới được tính vào % hoàn
thành khoá học.

### 4.2 Prerequisite (điều kiện tiên quyết)
Một course có thể khai báo danh sách course tiên quyết (`prerequisites`).
Nếu bất kỳ course tiên quyết nào của user **chưa** ở trạng thái `COMPLETED`,
toàn bộ course hiện tại bị khoá (không hiển thị module/lesson/assessment nào,
chỉ hiện thông báo khoá và tên course còn thiếu).

### 4.3 Nội dung do Admin upload — giới hạn của bản mockup
File upload cục bộ (local `<input type=file>`) chỉ tạo object URL, **chỉ tồn
tại trong phiên trình duyệt hiện tại**, mất khi reload. Chỉ URL đã host sẵn
(dán trực tiếp) mới tồn tại lâu dài. → **[Đề xuất bổ sung]**: hệ thống thật
cần một dịch vụ lưu trữ file (object storage) để upload không bị mất.

## 5. Gán khoá học (Course Assignment) — chỉ áp dụng Mandatory

Chỉ **Admin** được tạo, cấu hình, publish và gán khoá **Mandatory**. Course
Optional mặc định mở cho mọi nhân viên (catalog), không cần assignment.

**Loại phạm vi gán** (`assignmentType`): `BUSINESS_UNIT` | `DIVISION` |
`DEPARTMENT` | `ROLE` (MANAGER/USER_LEARN) | `USER` (gán đích danh 1 nhân
viên).

**BR-009 / BR-010** — Quy tắc xác định course có nằm trong phạm vi học của
user hay không:
- `courseType = OPTIONAL` → luôn đúng (ai cũng thấy).
- `courseType = MANDATORY` → đúng chỉ khi giá trị tổ chức của user
  (businessUnitId/divisionId/departmentId/role/userId) khớp đúng target đã
  cấu hình trong `assignment` của course. Không có config nào cứng, luôn đọc
  từ assignment thực tế của course (đúng cả khi Admin sửa/gán lại sau khi đã
  publish).

**Ràng buộc bắt buộc khi lưu course Mandatory**: phải có **Due date**, nếu
không hệ thống chặn lưu với thông báo "Mandatory courses need a due date for
their target audience." Khi đổi courseType từ Mandatory → Optional,
assignment bị xoá (set `null`).

Trường "Assigned by" luôn cố định = Admin (không cho chỉnh).

## 6. Hệ thống đánh giá cuối khoá (Assessment Engine)

### 6.1 Cấu hình (COURSE_CONFIGURATION)
`assessmentEnabled`, `questionBankSize`, `questionsPerAttempt`,
`passingScorePercent`, `maxAttempts`, `assessmentTimeLimit` (phút),
`randomizeQuestions`, `randomizeAnswers`,
`showCorrectAnswers` ∈ {IMMEDIATELY, AFTER_PASSING, AFTER_FINAL_ATTEMPT, NEVER}.

### 6.2 Ngân hàng câu hỏi (Question Bank) — FR-ASSESS-001/002
Mỗi câu hỏi: text, `type` ∈ {SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE},
tối đa 4 lựa chọn (đánh dấu đáp án đúng), category, difficulty (EASY/MEDIUM/
HARD), score (điểm), explanation (tuỳ chọn, hiển thị sau khi làm bài theo
`showCorrectAnswers`).

Admin nhập câu hỏi thủ công **hoặc** import CSV (cột: question, type, tối đa
4 option, đáp án đúng — ký tự chữ cái nối nhau bằng `;` nếu multiple, category,
difficulty, score, explanation). **Dòng thiếu text/option/đáp án đúng bị bỏ
qua nhưng phải đếm số dòng bị bỏ qua, không được âm thầm mất dữ liệu.**

Ngân hàng "đủ điều kiện dùng" khi `questionBank.length >= questionsPerAttempt`.

### 6.3 Luồng làm bài — FR-ASSESS-003 → FR-ASSESS-010
1. **Điều kiện bắt đầu**: tất cả lesson bắt buộc (không phải ASSESSMENT) đã
   COMPLETED; chưa từng pass bài này trước đó; còn lượt làm
   (`attemptsLeft = maxAttempts - số attempt đã làm` > 0).
2. **Rút đề (BR chưa có mã, gọi tắt "random draw")**: mỗi lượt làm rút ngẫu
   nhiên `questionsPerAttempt` câu **riêng biệt** trong toàn bộ ngân hàng
   (ví dụ "20 trong 50", "15 trong 30"...), độc lập với 2 cờ randomize —
   2 cờ đó **chỉ** quyết định thứ tự hiển thị câu hỏi/đáp án, không quyết
   định việc có rút tập con hay không.
3. **Giới hạn thời gian**: đếm ngược từ `assessmentTimeLimit * 60` giây, tự
   nộp bài khi hết giờ (không nộp trùng 2 lần), cảnh báo màu khi còn < 60s.
4. **Chấm điểm**: `score = round(tổng điểm đúng / tổng điểm đề * 100)`,
   `passed = score >= passingScorePercent`.
5. **Ghi nhận**: mỗi lượt tạo một **ASSESSMENT_ATTEMPT** mới (số thứ tự, điểm,
   kết quả đạt/không đạt, số câu đã trả lời, thời điểm nộp) — **lịch sử này
   không bao giờ bị ghi đè hay xoá** (xem mục 8, Learning History).
6. **Hiển thị đáp án đúng** sau khi nộp theo đúng `showCorrectAnswers`:
   IMMEDIATELY (luôn hiện) / AFTER_PASSING (chỉ khi đạt) / AFTER_FINAL_ATTEMPT
   (khi đạt HOẶC đây là lượt cuối cùng được phép) / NEVER (không bao giờ hiện).

**BR-020** — Số lượt làm bài đánh giá của một user cho một course bị giới
hạn cứng bởi `configuration.maxAttempts`; hết lượt mà chưa đạt → course
chuyển trạng thái **FAILED** vĩnh viễn (không tự động mở lại lượt mới).

## 7. Tiến trình học & trạng thái Enrollment

**BR-018** — Enrollment chỉ được phép chuyển sang **COMPLETED** đúng một lần,
và chỉ khi **mọi** điều kiện hoàn thành đã đạt (không có đường tắt nào khác
ghi COMPLETED). Điều kiện gồm:
- Tất cả lesson bắt buộc (không tính ASSESSMENT) đã COMPLETED, **và**
- Nếu course có bật assessment: lượt làm bài gần nhất (hoặc bất kỳ lượt nào)
  phải đạt (`score >= passingScorePercent`).

**BR-019** — Enrollment và Assessment Attempt luôn được tính toán lại
(recompute) từ trạng thái lesson + attempt thật, không lưu cờ trạng thái độc
lập có thể lệch pha — một nguồn sự thật duy nhất.

### 7.1 Công thức tiến độ (%)
- Course **không** bật assessment: `progress% = số lesson bắt buộc đã hoàn
  thành / tổng lesson bắt buộc`.
- Course **có** bật assessment: lesson chiếm **70%**, assessment đạt chiếm
  **30%** còn lại — vì vậy course không thể hiện 100% nếu chưa pass bài
  đánh giá.

### 7.2 Vòng đời trạng thái Enrollment (§26)
`NOT_STARTED → IN_PROGRESS → { COMPLETED | FAILED }`, cộng thêm
**OVERDUE** (tính khi quá `dueDate` mà chưa COMPLETED) hiển thị song song
trong báo cáo. Màu sắc chuẩn hoá toàn hệ thống: NOT_STARTED (slate),
IN_PROGRESS (amber), COMPLETED (sage), OVERDUE/FAILED (rust).

### 7.3 "My Learning" (§27)
Danh sách khoá học của 1 user = **tất cả course Optional** (catalog) **+**
course Mandatory nằm trong phạm vi gán của user đó (BR-009/010), và chỉ hiện
những course đã có `enrollment` (đã bắt đầu tồn tại bản ghi tiến trình).

### 7.4 Manager cũng là Learner (§36)
Manager có trải nghiệm học y hệt User Learn (dùng lại toàn bộ component
Learner) cho các course được gán cho **chính Manager đó** (kể cả course
Mandatory theo Role = MANAGER, ví dụ "Leadership Essentials for Managers").

## 8. Chứng chỉ & Lịch sử học tập

**§39 — Chứng chỉ luôn được suy ra (derived), không lưu trữ độc lập:** một
course "có chứng chỉ" cho một user khi và chỉ khi enrollment của user đó =
COMPLETED **và** `configuration.certificateEnabled = true`. Vì vậy không thể
tồn tại chứng chỉ mà không có course thực sự đã hoàn thành. Thông tin hiển
thị: courseName, mã chứng chỉ (`CERT-{courseId}`), ngày hoàn thành, version
khoá học, điểm của lượt làm bài đầu tiên đạt yêu cầu (nếu có assessment).

**Learning History**: bản ghi vĩnh viễn từng lượt làm bài đánh giá
(course, số thứ tự attempt, điểm, kết quả) — **không bao giờ bị ghi đè**,
kể cả sau khi course đã FAILED hay COMPLETED.

## 9. Thông báo & nhắc nhở (§21) + Cấu hình toàn hệ thống (§24)

### 9.1 Hai luồng thông báo
- **Learner inbox**: `COURSE_ASSIGNED` (khoá mới được gán), `DEADLINE_REMINDER`
  (sắp đến hạn), `COURSE_UNFINISHED` (không hoạt động học tập trong N ngày).
- **Manager alerts**: `EMPLOYEE_OVERDUE`, `EMPLOYEE_INACTIVE`,
  `ASSESSMENT_FAILED` — về từng nhân viên trong phạm vi quản lý.

### 9.2 Cấu hình Admin (BR-022/BR-023, §24)
| Tham số | Ý nghĩa |
|---|---|
| `inactiveThresholdDays` | Số ngày không có hoạt động học → enrollment bị đánh dấu "inactive" |
| `reminderFrequencyDays` | Các mốc ngày (offset) sau khi inactive sẽ gửi nhắc nhở, ví dụ [3, 6, 9] |
| `maxReminderCount` | Số lần nhắc tối đa cho một enrollment, sau đó ngừng nhắc |
| `managerAlertAfterDays` | Sau bao nhiêu ngày inactive thì Manager phụ trách được cảnh báo |
| `defaultVideoWatchPercent` | Ngưỡng % xem video mặc định cho lesson mới (không override riêng) |
| `defaultDocumentReadPercent` | Ngưỡng % đọc mặc định cho document/text/script lesson mới |
| `defaultPassingScorePercent` | Điểm đạt mặc định khi tạo course mới |

Các giá trị mặc định này là **giá trị khởi tạo**, mỗi course/lesson vẫn có
thể override riêng khi Admin tạo/sửa nội dung.

## 10. Yêu cầu chức năng theo màn hình

### 10.1 User Learn
- **Dashboard**: thẻ "Continue learning" (course IN_PROGRESS gần nhất),
  thống kê tổng quan (mandatory/optional/in-progress/completed/not-
  started/overdue/certificates/tổng số khoá), lưới danh sách khoá học,
  inbox thông báo.
- **My courses**: bảng course + loại + tiến độ + trạng thái + due date.
- **Course detail**: khoá bị khoá nếu thiếu prerequisite; syllabus module/
  lesson; thẻ assessment (chỉ mở khi 100% lesson bắt buộc đã xong); lịch sử
  các lượt làm bài của chính course đó.
- **Certificates**: danh sách chứng chỉ đã đạt được (derived, mục 8), nút
  Download.
- **Learning history**: toàn bộ lượt làm bài đã từng thực hiện.

### 10.2 Manager (giám sát, BR-024/025)
- **Dashboard**: thống kê team (tổng nhân viên/hoàn thành/đang học/chưa bắt
  đầu/quá hạn), điểm trung bình, tỷ lệ hoàn thành trung bình, danh sách "cần
  chú ý" (OVERDUE hoặc không hoạt động ≥ 3 ngày), feed cảnh báo.
- **My learning / Certificates**: dùng lại trải nghiệm Learner cho chính
  Manager (mục 7.4).
- **Team** (FR-DASH-MGR-002): bảng theo nhân viên × course, lọc theo trạng
  thái, cột: vị trí, loại course, tiến độ, trạng thái, điểm, số lượt làm,
  due date, hoạt động gần nhất — **không có hành động chỉnh sửa gán khoá**.
- **Team courses**: view theo course (bù cho view theo nhân viên ở Team) —
  số liệu tổng hợp completion rate/avg score theo từng course.
- **Team reports**: thống kê + biểu đồ tiến độ từng nhân viên.

### 10.3 Admin
- **Dashboard** (FR-DASH-ADM-001/002): số liệu toàn công ty, biểu đồ trạng
  thái, xu hướng hoàn thành 6 tháng, tỷ lệ theo loại course, xếp hạng
  completion rate theo course.
- **Courses**: danh sách + Edit/Publish (chỉ hiện khi DRAFT)/Delete. **Xoá bị
  chặn** (nút disabled + tooltip) nếu course đã có người bắt đầu học
  (`courseHasParticipants` — kiểm tra cả enrollment của viewer hiện tại lẫn
  toàn bộ team members).
- **Course Builder**: thông tin cơ bản, cấu hình assignment (chỉ Mandatory),
  xây module/lesson, cấu hình assessment + ngân hàng câu hỏi (thêm tay/
  import CSV/tải template CSV), completion rule, prerequisites, bật/tắt
  certificate.
- **Configuration**: các tham số toàn hệ thống ở mục 9.2 — **[Ghi chú]** nút
  "Save configuration" hiện chưa nối logic lưu thật trong bản mockup.
- **Analytics/Reports** (FR-DASH-ADM-002/003/004): hiệu suất theo course,
  theo nhân viên (thiết kế để lọc theo BU/Division/Department/Role/Employee/
  Course/Status/Date — **[Ghi chú] bộ lọc này chưa hiện thực trong UI hiện
  tại**), theo Manager, theo Department.

### 10.4 Các phần UI có sẵn nhưng chưa nối hành động thật (cần hoàn thiện khi làm backend)
- Nút "Send reminder" trong danh sách "Needs attention" của Manager Dashboard.
- Nút "View" trên bảng Manager Team.
- Nút "Save configuration" trong Admin Configuration.
- Bộ lọc BU/Division/Department/Role/Employee/Course/Status/Date trong Admin
  Reports (hiện chỉ có bảng/biểu đồ tĩnh).

## 11. Yêu cầu phi chức năng (Non-functional)

- **Giao diện**: theme sáng duy nhất, nền giấy ấm (`--paper:#FBF9F4`), không
  có dark mode. Màu sắc mang ý nghĩa cố định trên toàn hệ thống: pine green
  = brand/primary, amber = đang xử lý/chờ, sage = đạt/hoàn thành, rust = quá
  hạn/chặn — **không dùng màu là kênh thông tin duy nhất** (luôn có badge/
  label kèm theo).
- **[Đề xuất bổ sung] Xác thực & phân quyền thật**: thay dropdown chọn role
  bằng đăng nhập thật (SSO/LDAP nội bộ đề xuất, vì đây là hệ thống doanh
  nghiệp), role và phạm vi tổ chức phải suy từ session đã xác thực, không
  cho client tự chọn.
- **[Đề xuất bổ sung] Lưu trữ file**: cần object storage (S3-compatible) cho
  video/document/image lesson content, thay cho object URL tạm trong bản
  mockup.
- **[Đề xuất bổ sung] Toàn vẹn dữ liệu lịch sử**: ASSESSMENT_ATTEMPT là bản
  ghi append-only, không cho phép update/xoá ở tầng backend (khớp với ràng
  buộc "never overwritten" đã thấy ở Learning History).
- **[Đề xuất bổ sung] Idempotency khi hết giờ làm bài**: đảm bảo auto-submit
  khi hết thời gian không tạo trùng attempt (mockup đã có guard
  `submittedRef`, backend cần ràng buộc tương đương ở tầng API/DB).

## 12. Giả định & ngoài phạm vi (Out of scope)

- Không có luồng "manager duyệt hoàn thành khoá học" — đây là quyết định
  thiết kế đã ghi rõ trong code (thay thế mô hình cũ), không phải thiếu sót.
- Không có tính năng thảo luận/hỏi đáp trong khoá học (forum, Q&A).
- Không có tính năng tạo report tuỳ biến (custom report builder) — chỉ có
  các báo cáo dựng sẵn.
- Đăng ký/tạo user, đổi cơ cấu tổ chức (BU/Division/Department) chưa có màn
  hình quản trị trong bản mockup — dữ liệu tổ chức hiện là seed tĩnh.

## 13. Phụ lục — Bảng mã tham chiếu

| Mã | Nội dung |
|---|---|
| BR-009/010 | Quy tắc xác định course có thuộc phạm vi học của user hay không |
| BR-018 | Enrollment chỉ COMPLETED khi đủ mọi điều kiện, đúng một lần |
| BR-019 | Enrollment/attempt luôn recompute từ dữ liệu gốc, không lưu cờ rời rạc |
| BR-020 | Giới hạn số lượt làm bài đánh giá theo `maxAttempts` |
| BR-022/023 | Tham số cấu hình nhắc nhở/không hoạt động toàn hệ thống (Admin Config) |
| BR-024 | Phạm vi quan sát của Manager theo cơ cấu tổ chức |
| BR-025 | Manager chỉ giám sát, không được gán/duyệt course |
| FR-ORG-001 | Hiển thị đường dẫn tổ chức (Division/Department) của user |
| FR-COURSE-001 | Khởi tạo course mới (template rỗng) |
| FR-DASH-MGR-002 | Manager theo dõi nhân viên × course × tiến độ/trạng thái/điểm/số lượt/hạn/hoạt động gần nhất |
| FR-DASH-ADM-001/002 | Admin dashboard: số liệu toàn công ty + hiệu suất theo course |
| FR-DASH-ADM-002/003/004 | Admin reports: hiệu suất course/nhân viên (có lọc)/manager |
| FR-ASSESS-001/002 | Định dạng & validate import CSV ngân hàng câu hỏi |
| FR-ASSESS-003–010 | Toàn bộ luồng làm bài đánh giá (rút đề, thời gian, chấm điểm, ghi attempt) |
| §10–15 | Rule hoàn thành theo từng loại lesson |
| §21 | Hệ thống thông báo (learner inbox + manager alerts) |
| §24 | Cấu hình toàn hệ thống (Admin Config) |
| §26 | Vocabulary trạng thái chuẩn hoá (NOT_STARTED/IN_PROGRESS/COMPLETED/OVERDUE/FAILED) |
| §27 | Định nghĩa "My Learning" |
| §36 | Manager dùng chung trải nghiệm học với User Learn |
| §39 | Chứng chỉ luôn derived từ enrollment, không lưu độc lập |
