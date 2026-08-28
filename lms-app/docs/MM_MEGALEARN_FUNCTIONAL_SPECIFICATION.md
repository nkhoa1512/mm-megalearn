# TÀI LIỆU ĐẶC TẢ YÊU CẦU NGHIỆP VỤ, HỆ THỐNG & HƯỚNG DẪN SỬ DỤNG GIAO DIỆN
## MM MEGALEARN — CORPORATE LEARNING & DEVELOPMENT SYSTEM
### (Hệ thống Quản lý Đào tạo Nội bộ, Phát triển Năng lực & Hướng dẫn Vận hành Thao tác)

---

| **Mã tài liệu** | **SRS-FSD-UG-MMVN-2026-V7.0** |
|:---|:---|
| **Dự án** | MM MegaLearn (MM Mega Market Vietnam Enterprise Edition) |
| **Loại tài liệu** | Software Requirements Specification, Functional Specification Document & Screen-by-Screen User Guide |
| **Phiên bản** | 7.0 (Includes Comprehensive Screen-by-Screen User Guide) |
| **Ngày cập nhật** | 24/08/2026 |
| **Trạng thái** | Approved / Đối chiếu & Đồng bộ 100% Mã nguồn Front-end Mockup thực tế |
| **Đối tượng áp dụng** | Product Owners, Solution Architects, Business Analysts, Full-Stack Developers, QA Engineers, L&OD Team, End-Users |

---

## MỤC LỤC TỔNG QUAN

1. [TỔNG QUAN DỰ ÁN & MỤC TIÊU HỆ THỐNG](#1-tổng-quan-dự-án--mục-tiêu-hệ-thống)
2. [CƠ CẤU TỔ CHỨC NHÁNH ĐÔI & MA TRẬN PHÂN QUYỀN (RBAC)](#2-cơ-cấu-tổ-chức-nhánh-đôi--ma-trận-phân-quyền-rbac)
3. [DANH MỤC NGUYÊN TẮC NGHIỆP VỤ CỐT LÕI (BUSINESS RULES - BR)](#3-danh-mục-nguyên-tắc-nghiệp-vụ-cốt-lõi-business-rules---br)
4. [ĐẶC TẢ CHI TIẾT CÁC PHÂN HỆ YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS - FR)](#4-đặc-tả-chi-tiết-các-phân-hệ-yêu-cầu-chức-năng-functional-requirements---fr)
   - 4.1. Phân hệ Xác thực, Nhân sự, Cây Tổ chức & Hồ sơ Năng lực (FR-AUTH, FR-HRIS, FR-ORG, FR-PRF)
   - 4.2. Phân hệ Soạn thảo & Quản lý Khóa học Đa phương thức (FR-CRS)
   - 4.3. Phân hệ Khảo thí Đánh giá Cuối khóa (FR-ASSESS)
   - 4.4. Phân hệ Lớp học Thực hành ILT & Quản lý Phòng Thực hành (FR-TRN)
   - 4.5. Phân hệ Cổng Học tập, Lộ trình 70-20-10 & Gamification (FR-LRN)
   - 4.6. Phân hệ Giám sát Quản lý, Action Plan & Phê duyệt Ngân sách (FR-MGR)
   - 4.7. Phân hệ Báo cáo ROI Kirkpatrick, Heatmap & Chi tiêu Ngân sách (FR-REP)
   - 4.8. Phân hệ Trợ lý Trí tuệ Nhân tạo Doanh nghiệp (FR-AI)
5. [MÔ HÌNH DỮ LIỆU & THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)](#5-mô-hình-dữ-liệu--thiết-kế-cơ-sở-dữ-liệu-database-schema)
6. [HƯỚNG DẪN SỬ DỤNG HỆ THỐNG & THAO TÁC TỪNG MÀN HÌNH (SCREEN-BY-SCREEN USER GUIDE)](#6-hướng-dẫn-sử-dụng-hệ-thống--thao-tác-từng-màn-hình-screen-by-screen-user-guide)
   - 6.1. Khung Giao diện Chung & Bộ Chuyển đổi Vai trò (Global Layout & Role Switcher)
   - 6.2. Cổng Trải nghiệm Học tập của Nhân viên (Learner Portal)
   - 6.3. Cổng Giám sát & Quản trị của Line Manager (Manager Portal)
   - 6.4. Cổng Soạn thảo & Quản trị Đào tạo (L&OD Admin Portal)
7. [YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS - NFR) & LỘ TRÌNH TRIỂN KHAI](#7-yêu-cầu-phi-chức-năng-non-functional-requirements---nfr--lộ-trình-triển-khai)

---

## 1. TỔNG QUAN DỰ ÁN & MỤC TIÊU HỆ THỐNG

### 1.1. Mục đích xây dựng hệ thống
**MM MegaLearn** là giải pháp phần mềm quản lý đào tạo, phát triển năng lực tổ chức (Learning & Organizational Development - L&OD) cấp doanh nghiệp. Hệ thống phục vụ toàn bộ cán bộ nhân viên tại chuỗi siêu thị và khối văn phòng trung tâm của **MM Mega Market Vietnam (MMVN)**:
- **Nhân viên (Learner)**: Học các khóa học bắt buộc (Mandatory) và tự chọn (Optional), thực hành tại xưởng (ILT), làm bài kiểm tra đánh giá, tham gia khảo sát phản hồi L1 CSAT, thiết lập cam kết Kế hoạch hành động 90 ngày (Action Plan), tích lũy điểm XP/Huy hiệu Gamification và nhận chứng chỉ hoàn thành.
- **Quản lý trực tiếp (Line Manager)**: Giám sát tiến độ học tập của nhân viên trực thuộc (Direct Reports), nhận cảnh báo quá hạn/không hoạt động, gửi nhắc nhở 1-chạm (Nudge), chỉ định/đề cử khóa học cho nhân viên (Nominate Course), phê duyệt đơn đăng ký khóa học kèm theo dõi chi phí (Program Cost Tracking), theo dõi Kế hoạch hành động (Action Plans) và thực hiện đánh giá hành vi định kỳ sau 3-6 tháng (Kirkpatrick Level 3 Evaluation).
- **Đối tác Nhân sự Vùng (HRBP)**: Xem báo cáo phân tích tuân thủ khu vực, theo dõi lộ trình phát triển nhân tài (Talent Pipeline) và bản đồ nhiệt (Heatmap).
- **Giảng viên (Trainer)**: Quản lý danh sách lớp học thực hành (ILT), mở mã QR điểm danh trực tiếp tại lớp (Live QR Check-in), theo dõi tài liệu bài giảng.
- **Quản trị viên Nhân sự (User Admin)**: Quản lý hồ sơ nhân viên, duyệt cây tổ chức nhánh đôi (Supporting Functions & Operations).
- **Quản trị viên Hệ thống (System Admin)**: Cấu hình tham số bảo mật, giám sát cổng gửi tin thông báo (Email/Zalo/Teams) và đồng bộ dữ liệu SAP SuccessFactors HRIS.
- **Quản trị viên Đào tạo (L&OD Admin)**: Soạn thảo khóa học kéo thả (Course Builder), quản lý ngân hàng câu hỏi & import CSV, cấu hình luật gán tự động (Auto-assignment rules), quản trị phòng thực hành & lịch đặt phòng, xem báo cáo toàn diện Kirkpatrick ROI và xuất dữ liệu CSV / PDF.

### 1.2. Bảng Thuật ngữ & Viết tắt (Glossary)

| Thuật ngữ / Mã | Tên tiếng Anh | Định nghĩa chi tiết |
|:---|:---|:---|
| **BU** | Business Unit | Đơn vị kinh doanh cấp cao nhất trong mô hình tập đoàn (`bu-mmvn`: MM Mega Market Vietnam). |
| **Supporting Functions** | Supporting Office Branch | Nhánh tổ chức Khối Trụ sở chính: Khối (Division) $\rightarrow$ Phòng ban (Department). |
| **Operations Branch** | Store Operations Branch | Nhánh tổ chức Chuỗi Siêu thị: Miền (Area) $\rightarrow$ Cụm (Cluster) $\rightarrow$ Siêu thị (Retail Store). |
| **Mandatory Course** | Mandatory Compliance Course | Khóa học bắt buộc có hạn chót (`dueDate`), được gán theo đối tượng tổ chức mục tiêu. |
| **Optional Course** | Optional Open Course | Khóa học tự chọn mở công khai trên Training Catalog cho 100% nhân viên toàn quốc. |
| **Action Plan** | Post-Training Action Plan | Bản cam kết áp dụng kiến thức vào thực tế công việc trong 90 ngày của nhân viên kèm mục tiêu KPI cụ thể. |
| **Kirkpatrick L1 / L3** | Level 1 CSAT & Level 3 Behavior | Cấp 1: Khảo sát độ hài lòng ngay sau khóa học. Cấp 3: Quản lý đánh giá mức độ thay đổi hành vi sau 3-6 tháng. |
| **Cost Tracking** | Training Cost / Program Cost | Theo dõi chi phí đào tạo từng khóa học (`courseCost`) và chi tiêu ngân sách theo phòng ban (`departmentSpend`). |
| **Enrollment** | Learning Enrollment Record | Bản ghi quan hệ duy nhất giữa 1 Nhân viên và 1 Khóa học, lưu giữ tiến độ tổng thể 70/30 và trạng thái. |
| **Attempt** | Assessment Attempt | Bản ghi lịch sử bất biến (Append-only) ghi nhận 1 lần làm bài đánh giá cuối khóa của học viên. |

---

## 2. CƠ CẤU TỔ CHỨC NHÁNH ĐÔI & MA TRẬN PHÂN QUYỀN (RBAC)

### 2.1. Cây Phân cấp Cơ cấu Tổ chức Nhánh đôi (Dual-Branch Org Architecture)

```
BUSINESS_UNIT: bu-mmvn (MM Mega Market Vietnam)
 │
 ├── [1. NHÁNH TRỤ SỞ CHÍNH] (Supporting Functions Branch)
 │     ├── 16 DIVISIONS (Khối nghiệp vụ):
 │     │     OMD (Merchandise), FAD (Finance), GM (General Management), OPT (Operations HO),
 │     │     SCM (Supply Chain), HRD (Human Resource), MKT (Marketing), LGD (Legal),
 │     │     CDD (Corp Dev), PRC (Pricing), ECOM (E-Commerce), LP (Loss Prevention),
 │     │     IA (Internal Audit), CAP (Procurement), PROP (Property), TU (Trade Union)
 │     │
 │     └── 56 DEPARTMENTS (Phòng ban):
 │           OMD ── PPF (Processed Fresh Food), MIE, NF&PL, UF, DF, SRD, NFIF
 │           SCM ── MDT, SC (Warehouse & Logistics), SIE, ANA
 │           HRD ── L&OD (Learning & Org Dev), HRBP, TA, C&B, ADMIN
 │
 └── [2. NHÁNH CHUỖI SIÊU THỊ] (Operations Branch)
       ├── 3 OPERATIONS AREAS: Area North (Miền Bắc), Area Central (Miền Trung), Area South (Miền Nam)
       │
       ├── STORE CLUSTERS: Cluster Hà Nội, Cluster TP.HCM Đông, Cluster TP.HCM Tây, Cluster Mekong...
       │
       ├── RETAIL STORES: MM Mega Market An Phú (Flagship), Bình Phú, Hiệp Phú, Thăng Long, Cần Thơ...
       │     └─ 4 Store Types: C&C (Cash & Carry), Super Center, Food Service, Depot
       │
       └── IN-STORE DEPARTMENTS & SECTIONS TEMPLATE:
             ├─ Fresh Food Department: Bakery Section, Meat & Poultry, Seafood, Fruit & Vegetable
             ├─ Dry Grocery & Non-Food Departments
             ├─ Customer Service & Cashier Front-end
             └─ Warehouse Receiving Logistics & Store HSE / Loss Prevention
```

### 2.2. Ma trận Phân quyền Chi tiết (RBAC Matrix)

| Chức năng Giao diện | `learner` | `manager` | `hrbp` | `trainer` | `useradmin` | `sysadmin` | `admin` |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Học e-Learning & Thi đánh giá cá nhân** | **CRUD** | **CRUD** | **CRUD** | **CRUD** | **CRUD** | **CRUD** | **CRUD** |
| **Khảo sát L1 & Cam kết Action Plan** | **CRUD (Tạo)** | **R** | **R** | **R** | **R** | **R** | **R** |
| **Đánh giá Hành vi L3 Sau 3-6 Tháng** | ❌ | **CRUD (Team)** | **R (Vùng)** | ❌ | ❌ | ❌ | **CRUD** |
| **Chỉ định/Đề cử Khóa học (Nominate Modal)** | ❌ | **CRUD** | **CRUD** | ❌ | ❌ | ❌ | **CRUD** |
| **Hồ sơ Năng lực (Talent Profile Modal)** | **R** | **R (Team)** | **R (Vùng)** | **R** | **CRUD** | **R** | **CRUD** |
| **Điểm danh Live QR Lớp thực hành (ILT)** | **C (Quét)** | **C** | **C** | **CRUD** | **R** | **R** | **CRUD** |
| **Giám sát Tiến độ Nhân viên & 1-Click Nudge** | ❌ | **CRUD (Team)** | **R (Vùng)** | ❌ | **R (Toàn quốc)** | ❌ | **CRUD** |
| **Phê duyệt Khóa học & Chi phí (Approvals)** | ❌ | **CRUD** | **CRUD** | ❌ | ❌ | ❌ | **CRUD** |
| **Quản lý Giảng viên & Đặt phòng Thực hành** | ❌ | ❌ | ❌ | **CRUD** | ❌ | ❌ | **CRUD** |
| **Soạn thảo Khóa học (Course Builder)** | ❌ | ❌ | ❌ | **R (Tài liệu)** | ❌ | ❌ | **CRUD** |
| **Ngân hàng Đề thi & Import CSV** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **CRUD** |
| **Báo cáo ROI Kirkpatrick, Heatmap & Export** | ❌ | ❌ | **R (Heatmap)** | ❌ | **R** | **R** | **CRUD** |

---

## 3. DANH MỤC NGUYÊN TẮC NGHIỆP VỤ CỐT LÕI (BUSINESS RULES - BR)

### 3.1. Cấu trúc Khóa học & Điều kiện Hoàn thành (BR-001 -> BR-008)
- **BR-001 (Cấu trúc phân cấp 3 tầng)**: Khóa học tuân theo mô hình `Course > Module > Lesson`.
- **BR-002 (Hoàn thành độc lập theo loại nội dung)**: Mỗi bài học tự động ghi nhận hoàn thành theo tiêu chí nội dung riêng; không có bước chặn duyệt thủ công từng bài từ Quản lý.
- **BR-003 (Trọng số bài học bắt buộc)**: Chỉ các bài học có cờ `isRequired = true` mới được tính vào mẫu số phần trăm hoàn thành khóa học.
- **BR-004 (Quy tắc hoàn thành bài Video & YouTube)**:
  - Bài học Video: Hoàn thành khi xem $\ge 90\%$ thời lượng (theo dõi `currentTime / duration`) hoặc nhấn xác nhận "Mark as watched".
  - Bài học YouTube: Phát trực tiếp qua iframe nhúng Video ID và hoàn thành khi bấm nút "Confirm Video Watched".
- **BR-005 (Quy tắc hoàn thành bài Tài liệu SOP & Văn bản)**: Hoàn thành khi cuộn trang $\ge 90\%$ độ sâu tài liệu hoặc nhấn xác nhận "Mark as Read".
- **BR-006 (Quy tắc hoàn thành bài Ảnh Image Gallery)**: Hoàn thành khi đã xem đủ $100\%$ số ảnh cấu hình (`viewedCount >= imageCount`).
- **BR-007 (Vị trí Gateway của Bài thi Assessment)**: Bài thi đánh giá cuối khóa chỉ mở khóa khi học viên đã hoàn thành $100\%$ các bài học bắt buộc trong khóa.
- **BR-008 (Điều kiện xóa khóa học)**: Khóa học chỉ được xóa khi chưa có bất kỳ nhân viên nào phát sinh bản ghi Enrollment (`courseHasParticipants = false`). Nếu đã có người học, khóa học chuyển sang trạng thái `ARCHIVED`.

### 3.2. Động cơ Gán Khóa học Bắt buộc 10 Phạm vi (BR-009 -> BR-012)
- **BR-009 (Phạm vi hiển thị)**: Khóa `OPTIONAL` hiển thị công khai trên Catalog cho toàn thể nhân viên. Khóa `MANDATORY` chỉ xuất hiện khi thông tin tổ chức của nhân viên khớp với cấu hình gán.
- **BR-010 (10 Phạm vi Gán Mục tiêu - Target Scopes)**:
  `BUSINESS_UNIT`, `DIVISION`, `DEPARTMENT`, `AREA`, `STORE_TYPE`, `CLUSTER`, `STORE`, `LEVEL`, `ROLE`, `USER`.
- **BR-011 (Bắt buộc Due Date cho Mandatory)**: Khóa học Mandatory bắt buộc phải cấu hình `dueDate`. Hệ thống chặn lưu nếu để trống.
- **BR-012 (Chuyển đổi Mandatory sang Optional)**: Khi chuyển loại khóa sang Optional, bản ghi cấu hình gán bị hủy (`null`) và khóa học mở rộng cho toàn công ty.

### 3.3. Tính toán Tiến độ 70/30 & Vòng đời Enrollment (BR-018 -> BR-021)
- **BR-018 (Single Source of Truth & Recompute)**: Tiến độ và trạng thái luôn được tính toán lại theo thời gian thực từ dữ liệu bài học và bài thi thật, không lưu cờ độc lập.
- **BR-019 (Công thức Tính toán Tiến độ Tổng thể 70/30)**:
  - Khóa học KHÔNG có Assessment:
    $$\text{Progress \%} = \left( \frac{\text{Số Lesson bắt buộc hoàn thành}}{\text{Tổng Lesson bắt buộc}} \right) \times 100\%$$
  - Khóa học CÓ Assessment:
    $$\text{Progress \%} = \left( \frac{\text{Số Lesson bắt buộc hoàn thành}}{\text{Tổng Lesson bắt buộc}} \times 70\% \right) + \left( \text{Assessment Passed ? } 30\% : 0\% \right)$$
- **BR-020 (Vòng đời Trạng thái)**: `NOT_STARTED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED` (hoàn thành) hoặc `FAILED` (hết lượt thi mà không đạt).
- **BR-021 (Đánh dấu Quá hạn - OVERDUE)**: Tự động gắn nhãn `OVERDUE` khi $\text{Current Date} > \text{dueDate}$ và $\text{Status} \neq \text{COMPLETED}$.

### 3.4. Khảo thí & Giới hạn Lượt thi (BR-022 -> BR-026)
- **BR-022 (Rút đề ngẫu nhiên - Dynamic Random Draw)**: Mỗi lượt thi mới, hệ thống tự động rút ngẫu nhiên tập con $K$ câu hỏi từ ngân hàng $N$ câu của khóa học ($K = \text{questionsPerAttempt}$).
- **BR-023 (Giới hạn Lượt thi Max Attempts)**: Giới hạn cứng bởi `maxAttempts` (mặc định 3 lượt). Hết lượt mà chưa đạt $\ge \text{passingScorePercent}$ thì khóa học chuyển sang `FAILED` vĩnh viễn và hiển thị trong danh sách cảnh báo của Quản lý.
- **BR-024 (Tính Bất biến của Lịch sử thi)**: Mỗi lần nộp bài tạo ra một bản ghi `AssessmentAttempt` mới (Append-only), lưu trữ vĩnh viễn trong học bạ cá nhân.
- **BR-025 (Chính sách Hiển thị Đáp án)**: Hỗ trợ 4 chế độ cấu hình: `IMMEDIATELY`, `AFTER_PASSING`, `AFTER_FINAL_ATTEMPT`, `NEVER`.
- **BR-026 (Tự động nộp bài khi hết giờ)**: Đồng hồ đếm ngược từ `assessmentTimeLimit * 60` giây. Khi hết giờ, hệ thống tự động nộp bài với cơ chế `submittedRef` chống gửi trùng lặp.

### 3.5. Khảo sát Kirkpatrick L1/L3, Action Plan, Gamification & Đặt Phòng (BR-027 -> BR-031)
- **BR-027 (Khảo sát L1 CSAT & Cam kết Action Plan 90 ngày)**: Ngay sau khi hoàn thành khóa học, học viên thực hiện khảo sát đánh giá 3 tiêu chí (Giảng viên, Tài liệu, Tính ứng dụng) và thiết lập 1-2 cam kết Kế hoạch hành động cụ thể tại quầy kèm chỉ số KPI (`kpiTarget`). Hoàn thành L1 giúp mở khóa chứng chỉ và chuyển Action Plan sang Quản lý trực tiếp.
- **BR-028 (Đánh giá Hành vi L3 Sau 3-6 Tháng)**: Quản lý trực tiếp theo dõi danh sách Action Plans của cấp dưới và tiến hành đánh giá định kỳ sau 3-6 tháng: Chấm điểm tiến bộ hành vi (`l3BehaviorRating` 1-5 sao), ghi nhận chỉ số tăng năng suất / giảm hao hụt (`l3ProductivityGain`) và xác nhận ký duyệt (Signed-off).
- **BR-029 (Hệ số Thưởng Điểm XP Gamification)**: Hoàn thành bài học: $+20\text{ XP}$; Thi đạt điểm tối đa $100\%$: $+100\text{ XP}$; Điểm danh Live QR Lớp ILT: $+150\text{ XP}$; Học liên tục: $+1\text{ Streak Day}$.
- **BR-030 (Chống Trùng lịch Phòng Thực hành)**: Kiểm tra xung đột thời gian theo `(roomId, date)` khi đặt phòng thực hành / phòng họp.
- **BR-031 (Quản lý Chi phí Đào tạo - Cost Tracking)**: Mỗi khóa học có trường `courseCost`. Khi Quản lý phê duyệt (Approve Request), chi phí được cộng dồn vào tổng ngân sách đào tạo của phòng ban (`departmentSpend`).

---

## 4. ĐẶC TẢ CHI TIẾT CÁC PHÂN HỆ YÊU CẦU CHỨC NĂNG (FR)

### 4.1. Phân hệ Xác thực, Nhân sự, Cây Tổ chức & Hồ sơ Năng lực (FR-AUTH, FR-HRIS, FR-ORG, FR-PRF)
- **FR-AUTH-001 (Đăng nhập & Bộ chuyển đổi Persona Demo)**: Giao diện đăng nhập doanh nghiệp với email `@mmvietnam.com`. Bộ chuyển đổi vai trò (Role Switcher) tại Topbar hỗ trợ chuyển đổi tức thì 7 vai trò (Learner, Manager, HRBP, Trainer, User Admin, System Admin, L&D Admin) phục vụ demo và kiểm thử giao diện.
- **FR-HRIS-001 (Đồng bộ Cây Nhân sự & Trạng thái Nhân viên)**: Đồng bộ và quản lý 4 trạng thái nhân sự chuẩn HRIS: `ACTIVE` (Đang làm việc), `INACTIVE` (Tạm ngưng/Nghỉ), `TRANSFER` (Điều chuyển khối/siêu thị), `NEW_JOINER` (Nhân sự mới gia nhập). Màn hình quản trị hiển thị trạng thái đồng bộ, nút kích hoạt thủ công (Manual Sync Trigger) và nhật ký đồng bộ.
- **FR-ORG-001 (Trình duyệt Cây Tổ chức Nhánh đôi)**: Hiển thị song song 2 nhánh: Supporting Functions (16 Divisions $\rightarrow$ 56 Departments) và Operations (3 Areas $\rightarrow$ Clusters $\rightarrow$ Stores kèm Store Type Badge); đóng/mở từng cấp độ và form thêm nhanh Phòng ban mới (`Add Department`) hoặc Siêu thị mới (`Add Store`) lưu trạng thái phiên.
- **FR-PRF-001 (Hồ sơ Nhân tài & Năng lực Chi tiết - Talent Profile Modal)**: Modal tra cứu hồ sơ năng lực đầy đủ 4 Tabs:
  1. **Talent & Succession Roadmap**: Vị trí kế nhiệm mục tiêu (`successorFor`), mức sẵn sàng (`readiness`: `READY_NOW`, `READY_IN_6_MONTHS`), người kèm cặp (`mentor`), phân bổ 70-20-10 và danh sách thẻ kỹ năng chuyên môn dạng badge/tag (HACCP Standards, Bakery Oven Operations, Shrinkage Control...).
  2. **Career History & Past Roles**: Thâm niên công tác (`yearsOfService`), ngày vào làm (`joinDate`), các vị trí và phòng ban/siêu thị từng đảm nhiệm.
  3. **Strategic Projects & Taskforces**: Dự án chuyên môn và ban đặc nhiệm đã tham gia.
  4. **Training Curriculum & Scores**: Lịch sử điểm số các khóa học và chứng chỉ đạt được.

### 4.2. Phân hệ Soạn thảo & Quản lý Khóa học Đa phương thức (FR-CRS)
- **FR-CRS-001 (Trình Soạn thảo Course Builder Kéo thả)**: Tạo mới và cấu hình khóa học theo cấu trúc `Course > Module > Lesson`, quản lý phiên bản khóa học (`version: 'v1.0'`). Hỗ trợ đầy đủ **10 định dạng bài học**: SCORM 2004, Video stream, Interactive PPT, External platform embed, **YouTube Video chuyên dụng** (nhập URL YouTube, tự bóc tách Video ID, hiển thị trình phát chuẩn đỏ), Document PDF, Script, Image Gallery, Text HTML, Thực hành ILT. Cấu hình chi phí đào tạo (`courseCost`), điều kiện tiên quyết (Prerequisites) và lựa chọn đối tượng gán mục tiêu 10 phạm vi.
- **FR-CRS-002 (Cấu hình Luật Tự động Gán - Auto-Rules)**: Thiết lập luật tự động gán khóa học bắt buộc theo 10 phạm vi tổ chức (Department, Division, Area, Store, Level, Role...). Cấu hình thời hạn hoàn thành SLA (ví dụ: 14 ngày) và trạng thái kích hoạt luật.

### 4.3. Phân hệ Khảo thí Đánh giá Cuối khóa (FR-ASSESS)
- **FR-ASSESS-001 (Quản lý & Import CSV Ngân hàng Đề thi)**: Hỗ trợ 3 định dạng câu hỏi: `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TRUE_FALSE`. Bộ tiền kiểm duyệt CSV: Phát hiện và bỏ qua các dòng lỗi (thiếu câu hỏi, thiếu đáp án, ít hơn 2 lựa chọn), đếm chính xác số dòng lỗi và thông báo chi tiết cho Admin, không làm mất dữ liệu âm thầm.
- **FR-ASSESS-002 (Trình Làm bài Thi Trực tuyến & Đếm giờ)**: Giao diện làm bài thi chuyên dụng, đồng hồ đếm ngược từng giây, đổi màu đỏ khi $< 60\text{s}$. Tự động nộp bài khi hết giờ (Idempotency Guard). Chấm điểm tức thì, ghi nhận số lần thi (Attempt), hiển thị đáp án theo cấu hình và cập nhật tiến độ 70/30.

### 4.4. Phân hệ Lớp học Thực hành ILT & Quản lý Phòng Thực hành (FR-TRN)
- **FR-TRN-001 (Lớp Thực hành ILT & Điểm danh Live QR)**: Danh sách lớp học thực hành tại quầy hoặc Webinar, thông tin giảng viên, phòng học, số chỗ trống. Modal điểm danh **Quick Live QR Check-in**: Quét mã QR tại lớp để ghi nhận chuyên cần và cộng ngay $+150\text{ XP}$ thưởng Gamification.
- **FR-TRN-002 (Quản lý Giảng viên & Đặt phòng Thực hành)**: Quản trị danh sách giảng viên nội bộ/chuyên gia thuê ngoài, chuyên môn, đánh giá sao. Quản lý danh mục phòng thực hành (Store Practical Labs) & phòng họp Head Office. **Lịch đặt phòng & Kiểm tra trùng lịch (Conflict Detection)**: Xem danh sách các ca đã đặt theo từng phòng và chặn đặt trùng ngày `(roomId, date)`.

### 4.5. Phân hệ Cổng Học tập, Lộ trình 70-20-10 & Gamification (FR-LRN)
- **FR-LRN-001 (Bảng Điều khiển Cá nhân - Dashboard)**: Thẻ "Continue Learning" ghim khóa học `IN_PROGRESS` gần nhất kèm nút Resume mở thẳng bài học. Bộ chỉ số KPI cá nhân và danh sách khóa học lọc theo 4 Tab (All, Mandatory, Optional, Completed).
- **FR-LRN-002 (Lộ trình Nghề nghiệp & Khung 70-20-10)**: Lộ trình Onboarding, Lãnh đạo Fast-track Thánh Gióng, Giám đốc Siêu thị (SGM Pipeline). Widget phân bổ tỷ lệ phát triển: **10% Formal Learning**, **20% Social Coaching**, **70% Experiential OJT** kèm Stepper các chặng học tập.
- **FR-LRN-003 (Gamification XP & Bảng Xếp hạng)**: 5 Cấp bậc năng lực (Level 1 Novice $\rightarrow$ Level 5 Master), thanh tiến trình XP, chuỗi ngày học Streak. Bộ sưu tập Huy hiệu (Fast Starter, HACCP Master, 7-Day Streak, AI Explorer, Compliance Hero). Bảng xếp hạng thi đua theo Phòng ban (`Department Rank`) và Toàn quốc (`Company Rank`).

### 4.6. Phân hệ Giám sát Quản lý, Action Plan & Phê duyệt Ngân sách (FR-MGR)
- **FR-MGR-001 (Giám sát Đội ngũ & 1-Click Nudge)**: Theo dõi 100% nhân viên trực thuộc giới hạn theo cơ cấu tổ chức (**BR-024**). Danh sách cảnh báo "Needs Attention": Nhân viên quá hạn (`OVERDUE`), không học $> 3\text{ ngày}$ (`INACTIVE`), thi trượt hết lượt (`FAILED_EXAM`). Nút hành động **Send Reminder (Nudge)** 1-chạm gửi thông báo nhắc nhở.
- **FR-MGR-002 (Chỉ định & Đề cử Khóa học - Course Nomination Modal)**: Cho phép Quản lý trực tiếp chọn nhân viên cấp dưới và chỉ định khóa học từ Training Catalog. Thiết lập hạn hoàn thành (`dueDate`), nhập lý do giải trình phát triển (`justification`). Tự động ghi danh khóa học vào học bạ của nhân viên và gửi thông báo trực tiếp.
- **FR-MGR-003 (Phê duyệt Khóa học & Chi phí - Program Cost Tracking)**: Tiếp nhận và xét duyệt đơn xin học nâng cao/chứng chỉ ngoài quầy kèm theo dõi chi phí đào tạo (`courseCost`, ví dụ: `4,500,000 VND / Khóa`). Xử lý Approve (ghi danh ngay) hoặc Reject (từ chối kèm lý do).
- **FR-MGR-004 (Khảo sát L1, Cam kết Action Plan & Đánh giá Hành vi L3 Sau 3-6 Tháng)**:
  - **Khảo sát L1 CSAT & Action Plan (Học viên)**: Đánh giá chất lượng giảng viên, tài liệu, tính ứng dụng thực tế (1-5 sao) và thiết lập cam kết Kế hoạch hành động 90 ngày (`targetCommitment`, `kpiTarget`).
  - **Quản lý Kế hoạch Hành động (Tab Action Plans)**: Quản lý theo dõi tiến độ cam kết của từng nhân viên cấp dưới và hạn chót đánh giá (`evaluationDate`).
  - **Đánh giá Hành vi Cấp độ 3 - Kirkpatrick L3 (Line Manager)**: Sau 3-6 tháng, Quản lý mở modal đánh giá sự thay đổi hành vi tại sàn bán lẻ (1-5 sao), ghi nhận chỉ số tăng năng suất / giảm hao hụt (`l3ProductivityGain`), nhập nhận xét và ký duyệt (Signed-off).

### 4.7. Phân hệ Báo cáo ROI Kirkpatrick, Heatmap & Chi tiêu Ngân sách (FR-REP)
- **FR-REP-001 (Trung tâm Phân tích ROI Đào tạo Kirkpatrick)**: Thống kê 4 Cấp độ: Cấp 1 (Hài lòng CSAT từ khảo sát L1), Cấp 2 (Điểm số & Tỷ lệ Pass thi), Cấp 3 (Tỷ lệ tuân thủ SOP & Đánh giá hành vi L3 từ Line Manager), Cấp 4 (Hiệu quả tài chính & Tiết kiệm chi phí hỏng hủy).
- **FR-REP-002 (Bản đồ Nhiệt & Báo cáo Ngân sách - Cost Spend)**: Bảng so sánh tỷ lệ hoàn thành khóa bắt buộc giữa các siêu thị (Operations) và các khối phòng ban (Supporting Functions) theo màu chuẩn: Xanh ($\ge 90\%$), Vàng ($70-89\%$), Đỏ ($< 70\%$). Báo cáo Chi tiêu Ngân sách L&D (`departmentSpend`): Thống kê chi phí đào tạo đã sử dụng theo từng phòng ban và phân bổ ngân sách.
- **FR-REP-003 (Xuất Báo cáo CSV Chuẩn BOM & Print PDF)**: 
  - **Export Excel Report (CSV)**: Tải file `.csv` chuẩn mã hóa UTF-8 BOM hiển thị đúng 100% tiếng Việt có dấu trên Microsoft Excel.
  - **Export Audit Dossier (PDF)**: Kích hoạt lệnh in chuẩn hóa (`window.print()`) hỗ trợ xem trước và lưu file PDF Hồ sơ Báo cáo Kiểm toán Đào tạo.

### 4.8. Phân hệ Trợ lý Trí tuệ Nhân tạo Doanh nghiệp (FR-AI)
- **FR-AI-001 (Tra cứu Ngữ nghĩa Quy trình SOP - Search)**: Tra cứu tài liệu SOP bằng từ khóa hoặc câu hỏi tự nhiên kèm bộ lọc chủ đề (#Bakery, #Food Safety, #Fire Safety, #Security...). Hiển thị trích đoạn khớp ngữ nghĩa (Matched Excerpt) và mã tài liệu SOP chính thức.
- **FR-AI-002 (Trợ lý Gia sư AI & Floating Drawer)**: Khung Chatbot AI tại AI Hub và Ngăn kéo nổi (Floating Drawer) trên toàn hệ thống giải đáp thắc mắc quy trình (Bakery SOP-OMD-04, POS Security SEC-POL-01, Fire Safety HSE-PCCC-02).
- **FR-AI-003 (Gợi ý Khóa học Cá nhân hóa)**: Tab hiển thị danh sách các khóa học gợi ý dựa trên chức danh và lịch sử học tập của nhân viên.

---

## 5. MÔ HÌNH DỮ LIỆU & THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)

### 5.1. Sơ đồ Thực thể Liên kết (Entity Relationship Diagram - ERD)

```
  [BUSINESS_UNITS] ──< [DIVISIONS] ──< [DEPARTMENTS] ──< [USERS] >── [JOB_LEVELS]
                                                             │
  [OPERATIONS_AREAS] ──< [STORE_CLUSTERS] ──< [RETAIL_STORES] ──┤ (stations)
                                          [STORE_TYPES] ──┤
                                                          │
          ┌───────────────────────────────────────────────┴───────────────────────────────┐
          │                                               │                               │
          ▼                                               ▼                               ▼
 [LEARNING_ENROLLMENTS]                          [APPROVAL_REQUESTS]             [ROOM_BOOKINGS]
   │          │                                  (Program Cost)                           ▲
   │          ├──< [ASSESSMENT_ATTEMPTS] (Immutable)                                      │
   │          └──< [ACTION_PLANS & L3 EVALUATION]                                  [MEETING_ROOMS]
   └──< [LESSON_PROGRESS]
   ▲
   │ (enrolled in)
 [COURSES] ──< [COURSE_MODULES] ──< [COURSE_LESSONS]
   ├── (version, courseCost)
   ├──< [COURSE_ASSIGNMENTS] (Target: 10 Scopes)
   ├──< [COURSE_PREREQUISITES] (DAG Graph)
   ├──< [QUESTION_BANKS] ──< [QUESTIONS] ──< [QUESTION_OPTIONS]
   └──< [CERTIFICATES] (Derived)
```

---

## 6. HƯỚNG DẪN SỬ DỤNG HỆ THỐNG & THAO TÁC TỪNG MÀN HÌNH (SCREEN-BY-SCREEN USER GUIDE)

Chương này mô tả chi tiết cách thức thao tác trực quan trên giao diện người dùng thực tế của hệ thống MM MegaLearn:

### 6.1. Khung Giao diện Chung & Bộ Chuyển đổi Vai trò (Global Layout & Role Switcher)

| Thành phần Giao diện | Vị trí & Thao tác Click | Luồng Nghiệp vụ & Kết quả Phản hồi của Hệ thống |
|:---|:---|:---|
| **Bộ chuyển đổi Vai trò (Role Switcher)** | Góc trên cùng bên phải Topbar (Badge vai trò). Nhấp chọn 1 trong 7 vai trò (`learner`, `manager`, `hrbp`, `trainer`, `useradmin`, `sysadmin`, `admin`). | Hệ thống lập tức cập nhật quyền truy cập, chuyển hướng cây menu Sidebar sang đúng vai trò vừa chọn (ví dụ: chuyển từ `learner` sang `manager` sẽ hiển thị menu Team, Approvals) và tải dữ liệu phiên làm việc phù hợp. |
| **Trợ lý Nổi AI Drawer** | Nút tròn biểu tượng tia sáng AI Sparkles ở góc dưới cùng bên phải màn hình. | Mở ngăn kéo nổi (Floating Drawer) từ cạnh phải mà không làm gián đoạn trang đang học. Cho phép đặt câu hỏi nhanh về quy trình SOP (Bakery, Fire Safety, POS Security) và nhận câu trả lời phân tích chuẩn nghiệp vụ sau 500ms. |
| **Chuông Thông báo (Notifications)** | Biểu tượng chuông trên Topbar kèm chấm đỏ số lượng. | Hiển thị danh sách thông báo: Khóa học mới được gán, Cảnh báo hạn chót sắp đến, Đơn xin học đã được Quản lý duyệt, Lời nhắc Nudge từ Quản lý. |

---

### 6.2. Cổng Học viên (Learner Portal)

#### Màn hình 1: Bảng Điều khiển Cá nhân (Learner Dashboard — `/learner/dashboard`)
1. **Thẻ "Continue Learning" (Ghim Khóa Đang Học)**:
   - *Hiển thị:* Tên khóa học gần nhất đang học dở, thanh % tiến độ (ví dụ 40%), hạn hoàn thành `dueDate`.
   - *Thao tác:* Nhấn nút **"Resume Course"**.
   - *Kết quả:* Hệ thống điều hướng thẳng vào bài học kế tiếp chưa hoàn thành trong Trình phát bài học (`LessonPlayer`).
2. **Danh mục Khóa học theo 4 Tabs (All / Mandatory / Optional / Completed)**:
   - *Thao tác:* Bấm chuyển Tab để lọc danh sách khóa học. Nhấp vào bất kỳ thẻ khóa học nào.
   - *Kết quả:* Mở trang Chi tiết Khóa học (`/learner/courses/:id`) hiển thị tóm tắt, thời lượng, số module và danh sách bài học.

#### Màn hình 2: Trình Phát Bài học Đa Định dạng (Lesson Player — `/learner/courses/:id/lessons/:lid`)
| Định dạng Bài học | Thao tác Học viên trên Giao diện | Phản hồi & Điều kiện Ghi nhận Hoàn thành của Hệ thống |
|:---|:---|:---|
| **Video MP4 / Stream** | Xem video trực tuyến trên trình phát. | Hệ thống theo dõi thời lượng. Khi xem $\ge 90\%$ hoặc nhấn nút **"Mark as watched"** $\rightarrow$ Đánh dấu tích xanh hoàn thành bài học, tự động cập nhật tiến độ tổng thể. |
| **YouTube Video Chuyên dụng** | Xem video qua khung phát YouTube nhúng chuẩn đỏ. | Nhấp nút **"Confirm Video Watched"** $\rightarrow$ Hệ thống ghi nhận tiến độ 100% cho bài học và mở khóa bài tiếp theo. |
| **SCORM 2004 Package** | Nhấn nút *Previous / Next Slide* trên thanh điều hướng mô phỏng gói chuẩn SCORM. | Khi đi qua slide cuối cùng $\rightarrow$ Tự động kích hoạt sự kiện `LMSSetValue(cmi.completion_status, 'completed')` và cập nhật khóa học. |
| **Interactive Slide Deck (PPT)** | Xem bộ slide bài giảng, chuyển trang từ slide 1 đến slide cuối. | Hoàn thành khi duyệt đủ 100% các trang slide. |
| **Tài liệu SOP / Text** | Cuộn đọc văn bản hoặc xem file tài liệu nhúng. | Cuộn sâu $\ge 90\%$ hoặc nhấn nút **"Mark as Read"** $\rightarrow$ Ghi nhận hoàn thành. |

#### Màn hình 3: Trình Khảo thí Đánh giá Cuối khóa (Assessment Player — `/learner/courses/:id/assessment`)
1. **Bắt đầu Thi**: Bấm nút **"Start Assessment"** (chỉ sáng khi 100% bài học bắt buộc đã hoàn thành).
2. **Làm bài & Đếm giờ**: Đồng hồ đếm lùi thời gian thực (ví dụ 15:00). Chọn đáp án các câu hỏi trắc nghiệm.
3. **Nộp bài (Submit)**:
   - *Chủ động:* Bấm nút **"Submit Assessment"**.
   - *Tự động:* Khi đồng hồ về 00:00 $\rightarrow$ Hệ thống tự động nộp bài ngay lập tức.
   - *Kết quả:* Chấm điểm tức thì, thông báo Điểm số %, Đạt/Không đạt, Lượt thi còn lại (`attemptsLeft`).
4. **Khảo sát L1 & Cam kết Action Plan**: Mở modal khảo sát đánh giá CSAT 1-5 sao $\rightarrow$ Nhập 1-2 cam kết hành động 90 ngày (`targetCommitment`, `kpiTarget`) $\rightarrow$ Nhấn **"Submit CSAT & Unlock Certificate"** $\rightarrow$ Mở khóa chứng chỉ số và chuyển Action Plan sang Quản lý.

#### Màn hình 4: Lớp Thực hành ILT & Điểm danh Live QR (`/learner/classrooms`)
- *Thao tác:* Nhấn nút **"Quick QR Check-in"** trên thẻ lớp học thực hành quầy hoặc webinar.
- *Kết quả:* Modal hiển thị mã QR động tại lớp. Nhấn **"Confirm Attendance"** $\rightarrow$ Hệ thống ghi nhận có mặt, cấp tích xanh chuyên cần và cộng ngay **+150 XP** thưởng Gamification.

---

### 6.3. Cổng Quản lý Trực tiếp (Line Manager Portal)

#### Màn hình 1: Quản lý Đội ngũ & Giám sát Năng lực (Team Supervision — `/manager/team`)
| Phân vùng / Tab | Thao tác của Quản lý | Hành vi Xử lý & Kết quả Phản hồi của Hệ thống |
|:---|:---|:---|
| **Tab 1: Team Members (Giám sát Tiến độ)** | • Xem danh sách nhân viên trực thuộc.<br>• Nhấn nút **"Assign"** trên hàng nhân viên.<br>• Nhấn nút **"View Profile"**. | • **Assign:** Mở `ManagerNominateModal` cho phép chọn khóa học từ Catalog, đặt hạn chót `dueDate`, nhập lý do `justification` $\rightarrow$ Bấm "Confirm Nomination" $\rightarrow$ Ghi danh ngay và gửi thông báo vào inbox nhân viên.<br>• **View Profile:** Mở `TalentProfileModal` đầy đủ 4 Tabs (Kế nhiệm, Thâm niên, Dự án, Điểm số). |
| **Tab 2: Skill Gap Analysis (Phân tích Khoảng cách Kỹ năng)** | Xem ma trận so sánh năng lực hiện tại vs chuẩn chức danh kế nhiệm. Nhấn nút **"Assign Developmental Course"** tại kỹ năng bị thiếu hụt (Gap âm). | Hệ thống tự động mở form đề xuất khóa học tương ứng với kỹ năng còn yếu $\rightarrow$ Quản lý xác nhận gán bổ sung để nhân viên hoàn thiện năng lực. |
| **Tab 3: Action Plans & L3 Review (Đánh giá Hành vi 3-6 Tháng)** | Xem danh sách cam kết Kế hoạch hành động của nhân viên. Nhấn nút **"Conduct Level 3 Review (3-6 Mos)"**. | Mở modal đánh giá Kirkpatrick L3: Chấm điểm tiến bộ hành vi (1-5 sao), nhập chỉ số tăng năng suất thực tế (ví dụ: +15% tốc độ thu ngân), nhập nhận xét $\rightarrow$ Bấm "Confirm Level 3 Evaluation" $\rightarrow$ Chuyển trạng thái sang **Signed-off** và ghi nhận vào báo cáo ROI Cấp 3. |

#### Màn hình 2: Phê duyệt Khóa học & Chi phí Đào tạo (Course Approvals — `/manager/approvals`)
- *Xem danh sách:* Đơn xin học các chứng chỉ/khóa học đặc thù của nhân viên kèm chi phí đào tạo (`courseCost`, ví dụ: `4,500,000 VND`).
- *Phê duyệt (Approve):* Nhấn **"Approve Request"** $\rightarrow$ Duyệt đơn tức thì, cấp quyền truy cập khóa học cho nhân viên và ghi nhận chi phí vào ngân sách đào tạo của phòng ban.
- *Từ chối (Reject):* Nhấn **"Reject"** $\rightarrow$ Hủy yêu cầu và gửi thông báo từ chối kèm lý do về học viên.

---

### 6.4. Cổng Quản trị Đào tạo (L&OD Admin Portal)

#### Màn hình 1: Trình Soạn thảo Khóa học Đa Hình thức (Course Builder — `/admin/courses/new`)
1. **Lựa chọn Hình thức Đào tạo (Delivery Mode)**:
   - 🌐 **Khóa Học Trực Tuyến (Online E-learning)**: Học viên tự học qua Video, YouTube Embed, SCORM 2004, Slide PPT, PDF & Thi trắc nghiệm cuối khóa.
   - 🏢 **Khóa Đào Tạo Trực Tiếp (In-Person Workshop / ILT)**: Học tập trung tại phòng học hoặc xưởng thực hành siêu thị có Giảng viên (Trainer) đứng lớp và mở mã Live QR điểm danh.
2. **Cấu hình Logistics Khóa Đào tạo Trực tiếp (ILT)**:
   - **Giảng viên Đứng lớp**: Chọn Giảng viên từ danh bạ Master Trainer (Nguyễn Văn Hùng, Đặng Thanh Mai, Vũ Đức Thành, Trần Minh Quang...).
   - **Địa điểm & Phòng thực hành**: Chọn phòng họp hoặc xưởng thực hành (Xưởng Bánh Mì MM An Phú, Phòng đào tạo Thu ngân POS, Bãi tập PCCC...).
   - **Ngày giờ & Sức chứa**: Cấu hình ngày học, khung giờ (Sáng 08:30 - 11:30 / Chiều 13:30 - 16:30), sức chứa tối đa (Max Capacity).
   - **Gán Nhanh Đối tượng Bắt buộc**: Gán nhanh theo nhóm (Tất cả Quản lý - All Managers, Nhân sự Mới - New Joiners, Nhân viên Quầy Bánh An Phú, Toàn công ty).
3. **Cấu trúc Module & Khảo thí**: Cấu hình bài giảng, Slide tài liệu, Ngân hàng đề thi CSV và % điểm đạt.
4. **Xuất bản**: Nhấn **"Publish Course"** $\rightarrow$ Khóa học kích hoạt, tự động gán vào Cổng Học viên và xuất hiện trên Cổng Lịch dạy của Giảng viên.

#### Màn hình 2: Đặt Phòng Thực hành & Quản lý Lịch Đào tạo (Training Ops — `/admin/training-ops`)
- *Thao tác Đặt phòng:* Chọn phòng thực hành quầy hoặc phòng họp tại Head Office, chọn ngày tổ chức và nhập tên chương trình $\rightarrow$ Nhấn **"Reserve Room"**.
- *Kiểm tra Xung đột (Conflict Guard):*
  - Nếu phòng đã có lớp khác đặt vào ngày đó: Hệ thống kích hoạt **Conflict Guard** $\rightarrow$ Chặn đặt và hiển thị cảnh báo đỏ *"Conflict: Phòng đã có chương trình đặt vào ngày này!"*.
  - Nếu phòng còn trống: Ghi nhận đặt phòng thành công và hiển thị lịch trực tiếp trên bảng điều khiển.
- *Nút "Schedule New Cohort":* Điều hướng trực tiếp sang Trình tạo khóa học để tạo lớp đào tạo thực hành mới.
- *Công cụ Upload Danh sách Roster (Batch Student Upload):* Dán danh sách mã nhân viên $\rightarrow$ Ghi danh đồng loạt vào lớp học thực tế chỉ với 1 click.

#### Màn hình 3: Báo cáo ROI Kirkpatrick, Heatmap & Xuất Dữ liệu (`/admin/reports`)
- **Xuất Báo cáo CSV (Excel)**: Nhấn **"Export Excel Report (CSV)"** $\rightarrow$ Tải file `.csv` chuẩn UTF-8 BOM hiển thị chuẩn 100% tiếng Việt trên Excel.
- **Xuất Bản in Hồ sơ Kiểm toán (PDF)**: Nhấn **"Export Audit Dossier"** $\rightarrow$ Kích hoạt lệnh `window.print()` chuẩn CSS A4 để in hoặc lưu file PDF Hồ sơ Kiểm toán Đào tạo phục vụ thanh tra.

---

### 6.5. Cổng Giảng viên Đứng lớp (Trainer Faculty Portal — `/trainer`)
Dành riêng cho Đội ngũ Giảng viên Nội bộ & Master Trainer (ví dụ: Thầy **Nguyễn Văn Hùng** — Head of Operational Training) để quản lý các lớp đào tạo trực tiếp:
- **Lớp Học Tôi Phụ Trách (My Teaching Classes)**:
  - Xem danh sách các lớp thực hành tại xưởng bánh, bãi tập PCCC hoặc webinar được L&D phân công.
  - Nhấn nút **"Mở QR Điểm danh Trực tiếp"** $\rightarrow$ Hiển thị màn hình phóng to mã Live QR Token tại lớp học để học viên quét mã nhận `+150 XP`.
  - Nhấn nút **"Danh sách Học viên"** $\rightarrow$ Mở bảng điểm danh toàn bộ học viên đã ghi danh, hỗ trợ tìm kiếm nhanh và tích điểm danh thủ công.
- **Đánh giá CSAT & Phản hồi từ Học viên**: Xem tổng điểm CSAT trung bình (**4.90 / 5.0★**) và danh sách nhận xét thực tế từ học viên sau các buổi thực hành quầy bánh, PCCC, thu ngân.
- **Phòng Thực hành & Thiết bị Siêu thị**: Tra cứu danh sách xưởng thực hành kèm thông số sức chứa và trang thiết bị có sẵn.

---

### 6.6. Phân hệ Nhân sự HRBP & Quản trị Hệ thống (HRBP, User Admin, IT System Admin)
- **HRBP (Human Resource Business Partner — `Dang Thanh Mai`)**: Giám sát chỉ số tuân thủ đào tạo theo vùng/khối, phát hiện khoảng cách kỹ năng (Skill Gap) của từng bộ phận để phối hợp cùng L&D xây dựng lộ trình kế nhiệm (Succession Pipeline).
- **User Admin (Quản trị Nhân sự / Cây Tổ chức — `Le Thi Mai`)**: Quản lý danh bạ 100+ nhân viên, cập nhật cây cơ cấu tổ chức 2 nhánh Head Office và Chi nhánh Siêu thị, quản lý chức danh và thâm niên.
- **System Admin IT (Quản trị Kỹ thuật — `Tran Quoc Bao`)**: Giám sát toàn bộ hạ tầng kỹ thuật, nhật ký bảo mật (Security Audit Logs), trạng thái tích hợp HRIS Sync, cấu hình phân quyền RBAC và chính sách mật khẩu.

---

## 7. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS - NFR) & LỘ TRÌNH TRIỂN KHAI

### 7.1. Hiệu năng & Khả năng Chịu tải (Performance & Scalability)
- **NFR-PERF-001**: $95\%$ truy vấn API có thời gian phản hồi dưới **$200\text{ms}$** trong điều kiện mạng tiêu chuẩn.
- **NFR-PERF-002**: Hệ thống đáp ứng tối thiểu **$2,000$ người dùng đồng thời (CCU)** trong các đợt thi sát hạch định kỳ toàn quốc.

### 7.2. An toàn Thông tin & Phân quyền (Security & Access Control)
- **NFR-SEC-001**: Toàn bộ dữ liệu truyền tải qua HTTPS (TLS 1.3). Dữ liệu nhạy cảm mã hóa AES-256.
- **NFR-SEC-002**: Kiểm soát phân quyền RBAC nghiêm ngặt ở cả Router và Backend Interceptor, chặn tuyệt đối truy cập trái phép giữa các Quản lý khác phòng ban/siêu thị.

### 7.3. Tính Sẵn sàng (Availability)
- **NFR-AVAIL-001**: Cam kết thời gian hoạt động liên tục đạt tối thiểu **$99.9\%$**. Tự động sao lưu định kỳ bảo đảm an toàn dữ liệu.

---
*(Tài liệu phiên bản V7.1 đã tích hợp hoàn chỉnh toàn bộ Hướng dẫn Thao tác Từng Màn hình - Screen-by-Screen User Guide, phân định rõ ràng 7 vai trò hệ thống, quy trình tạo khóa học Online E-learning vs Khóa Đào tạo Trực tiếp ILT, Cổng Giảng viên Trainer Hub và mã Live QR điểm danh chuyên cần).*
