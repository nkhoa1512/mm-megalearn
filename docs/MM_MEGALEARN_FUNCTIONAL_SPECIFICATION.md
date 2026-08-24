# TÀI LIỆU ĐẶC TẢ YÊU CẦU NGHIỆP VỤ & CHỨC NĂNG HỆ THỐNG
## MM MEGALEARN — CORPORATE LEARNING & DEVELOPMENT SYSTEM
### (Hệ thống Quản lý Đào tạo Nội bộ & Phát triển Năng lực Doanh nghiệp)

---

| **Mã tài liệu** | **SRS-FSD-MMVN-MEGALEARN-2026-V6.3** |
|:---|:---|
| **Dự án** | MM MegaLearn (MM Mega Market Vietnam Enterprise Edition) |
| **Loại tài liệu** | Software Requirements Specification & Functional Specification Document (SRS/FSD) |
| **Phiên bản** | 6.3 (Full Codebase, Action Plan & L3 Evaluation Verified) |
| **Ngày cập nhật** | 24/08/2026 |
| **Trạng thái** | Approved / Đối chiếu & Đồng bộ 100% Mã nguồn & Yêu cầu thực tế |
| **Đối tượng áp dụng** | Product Owners, Solution Architects, Business Analysts, Full-Stack Developers, QA Engineers, L&OD Team |

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
6. [ĐẶC TẢ KIẾN TRÚC VÀ API ENDPOINTS](#6-đặc-tả-kiến-trúc-và-api-endpoints)
7. [YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS - NFR)](#7-yêu-cầu-phi-chức-năng-non-functional-requirements---nfr)

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

### 5.2. Đặc tả Chi tiết Các Bảng Dữ liệu Cốt lõi (Data Dictionary)

#### 1. Bảng `users` (Danh sách Cán bộ Nhân viên)
| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Mô tả Chi tiết |
|:---|:---|:---|:---|
| `id` | VARCHAR(64) | PK, NOT NULL | Mã định danh duy nhất (Ví dụ: `USR-1042`). |
| `employee_code` | VARCHAR(32) | UNIQUE, NOT NULL | Mã số nhân viên MMVN (Ví dụ: `MMVN-1042`). |
| `email` | VARCHAR(128) | UNIQUE, NOT NULL | Email doanh nghiệp `@mmvietnam.com`. |
| `full_name` | VARCHAR(128) | NOT NULL | Họ và tên đầy đủ của nhân viên. |
| `role` | ENUM | NOT NULL | `learner`, `manager`, `hrbp`, `trainer`, `useradmin`, `sysadmin`, `admin`. |
| `job_level` | VARCHAR(8) | FK -> job_levels.level | Cấp bậc chức danh: `1` đến `7`, `CL` (Casual), `IN` (Intern). |
| `position_title` | VARCHAR(128) | NOT NULL | Tên chức danh công việc cụ thể. |
| `years_of_service` | DECIMAL(3,1) | DEFAULT 1.0 | Thâm niên công tác tại MMVN (năm). |
| `join_date` | DATE | NULL | Ngày chính thức gia nhập công ty. |
| `business_unit_id` | VARCHAR(32) | FK -> business_units.id | Mã BU trực thuộc (`bu-mmvn`). |
| `division_id` | VARCHAR(32) | FK -> divisions.id, NULL | Mã Khối Head Office (`div-omd`, `div-scm`...). |
| `department_id` | VARCHAR(32) | FK -> departments.id, NULL | Mã Phòng ban (`dept-ppf`, `dept-df`...). |
| `area_id` | VARCHAR(32) | FK -> operations_areas.id, NULL | Mã Miền (`area-north`, `area-south`...). |
| `cluster_id` | VARCHAR(32) | FK -> store_clusters.id, NULL | Mã Cụm siêu thị (`cluster-hcm-east`...). |
| `store_id` | VARCHAR(32) | FK -> retail_stores.id, NULL | Mã Siêu thị (`store-an-phu`...). |
| `manager_id` | VARCHAR(64) | FK -> users.id, NULL | Mã Quản lý trực tiếp (Direct Manager). |
| `status` | ENUM | NOT NULL, DEFAULT 'ACTIVE' | **4 Trạng thái chuẩn:** `ACTIVE` (Đang làm việc), `INACTIVE` (Tạm ngưng), `TRANSFER` (Điều chuyển), `NEW_JOINER` (Nhân sự mới). |

#### 2. Bảng `courses` (Danh mục Khóa học Đa phương thức)
| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Mô tả Chi tiết |
|:---|:---|:---|:---|
| `id` | VARCHAR(64) | PK, NOT NULL | Mã khóa học (Ví dụ: `course-fsh-1`). |
| `code` | VARCHAR(32) | UNIQUE, NOT NULL | Mã chuẩn hóa (Ví dụ: `HACCP-101`). |
| `title` | VARCHAR(255) | NOT NULL | Tên tiêu đề khóa học. |
| `version` | VARCHAR(16) | DEFAULT 'v1.0' | **Phiên bản tài liệu khóa học** (Ví dụ: `v1.0`, `v2.1`). |
| `course_cost` | VARCHAR(64) | NULL | **Chi phí đào tạo / Đơn vị tổ chức** (Ví dụ: `4,500,000 VND / Khóa`). |
| `course_type` | ENUM | NOT NULL | `MANDATORY`, `OPTIONAL`, `ILT_CLASSROOM`. |
| `modality` | ENUM | NOT NULL | `SCORM_PACKAGE`, `INTERACTIVE_VIDEO`, `PPT_PRESENTATION`, `EXTERNAL_PLATFORM`, `YOUTUBE_LINK`, `DOCUMENT`, `SCRIPT`, `IMAGE`, `TEXT`, `CLASSROOM_LAB`. |
| `category` | VARCHAR(64) | NOT NULL | Phân loại nghiệp vụ (Fresh Food, Safety, Leadership...). |
| `status` | ENUM | DEFAULT 'DRAFT' | `DRAFT`, `PUBLISHED`, `ARCHIVED`. |

#### 3. Bảng `action_plans` (Kế hoạch Hành động & Đánh giá L3 Sau 3-6 Tháng)
| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Mô tả Chi tiết |
|:---|:---|:---|:---|
| `id` | VARCHAR(64) | PK, NOT NULL | Mã kế hoạch hành động (Ví dụ: `act-plan-101`). |
| `learner_id` | VARCHAR(64) | FK -> users.id, NOT NULL | Mã nhân viên cam kết hành động. |
| `manager_id` | VARCHAR(64) | FK -> users.id, NOT NULL | Mã Quản lý trực tiếp theo dõi & đánh giá. |
| `course_id` | VARCHAR(64) | FK -> courses.id, NOT NULL | Mã khóa học hoàn thành tương ứng. |
| `target_commitment` | TEXT | NOT NULL | Cam kết áp dụng hành động thực tế tại quầy siêu thị trong 90 ngày. |
| `kpi_target` | VARCHAR(255) | NOT NULL | Chỉ số KPI mục tiêu (Ví dụ: Giảm hao hụt bánh tươi 10%). |
| `survey_l1_score` | DECIMAL(2,1) | NOT NULL | Điểm trung bình hài lòng L1 CSAT (1.0 -> 5.0 sao). |
| `evaluation_date` | DATE | NOT NULL | Hạn chót đánh giá định kỳ sau 3-6 tháng. |
| `manager_review_l3` | JSON | NULL | Kết quả đánh giá L3 của Manager: `{"rating": 5, "gain": "+15%", "notes": "..."}`. |
| `status` | ENUM | DEFAULT 'IN_PROGRESS' | `IN_PROGRESS` (Đang thực hiện), `EVALUATED` (Đã ký duyệt L3). |

#### 4. Bảng `approval_requests` (Đơn Đăng ký & Phê duyệt Khóa học)
| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Mô tả Chi tiết |
|:---|:---|:---|:---|
| `id` | VARCHAR(64) | PK, NOT NULL | Mã yêu cầu phê duyệt (Ví dụ: `req-101`). |
| `user_id` | VARCHAR(64) | FK -> users.id, NOT NULL | Mã nhân viên nộp đơn đăng ký. |
| `course_id` | VARCHAR(64) | FK -> courses.id, NOT NULL | Mã khóa học đề xuất tham gia. |
| `course_cost` | VARCHAR(64) | NOT NULL | **Chi phí chương trình** (Ví dụ: `4,500,000 VND`). |
| `justification` | TEXT | NOT NULL | Lý do / Giải trình nhu cầu phát triển năng lực. |
| `status` | ENUM | DEFAULT 'PENDING' | `PENDING`, `APPROVED`, `REJECTED`. |

#### 5. Bảng `learning_enrollments` (Tiến trình Học tập)
| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Mô tả Chi tiết |
|:---|:---|:---|:---|
| `id` | VARCHAR(64) | PK, NOT NULL | Khóa chính Enrollment (Ví dụ: `enr-1042-fsh`). |
| `user_id` | VARCHAR(64) | FK -> users.id, NOT NULL | Mã nhân viên học tập. |
| `course_id` | VARCHAR(64) | FK -> courses.id, NOT NULL | Mã khóa học tham gia. |
| `status` | ENUM | NOT NULL | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `FAILED`, `OVERDUE`. |
| `progress_percent` | INT | DEFAULT 0 | Tiến độ từ $0\%$ đến $100\%$ tính theo công thức chuẩn 70/30. |
| `final_score` | INT | NULL | Điểm thi cao nhất đạt được ($\%$). |
| `completed_at` | TIMESTAMP | NULL | Thời điểm hoàn thành toàn bộ điều kiện khóa học. |

#### 6. Bảng `assessment_attempts` (Nhật ký Thi Bất biến)
| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Mô tả Chi tiết |
|:---|:---|:---|:---|
| `id` | VARCHAR(64) | PK, NOT NULL | Khóa chính bản ghi thi (Ví dụ: `att-98124`). |
| `enrollment_id` | VARCHAR(64) | FK -> learning_enrollments.id | Mã bản ghi tiến trình tương ứng. |
| `attempt_number` | INT | NOT NULL | Lần thi thứ mấy (1, 2, 3...). |
| `score_percent` | INT | NOT NULL | Điểm số đạt được ($\%$). |
| `passed` | BOOLEAN | NOT NULL | Kết quả Đạt (`true`) hoặc Không đạt (`false`). |
| `duration_seconds` | INT | NOT NULL | Thời gian thực tế làm bài (giây). |
| `submitted_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm nộp bài (Append-only, không cho phép sửa/xóa). |

---

## 6. ĐẶC TẢ KIẾN TRÚC VÀ API ENDPOINTS

```
/api/v1
├── /auth
│   ├── POST   /login                      # Đăng nhập tài khoản
│   ├── POST   /logout                     # Hủy phiên làm việc
│   └── GET    /me                         # Lấy thông tin User Profile & Quyền hạn
│
├── /learner
│   ├── GET    /dashboard                  # KPI cá nhân & Khóa học gần nhất
│   ├── GET    /courses                    # Danh sách My Courses & Catalog
│   ├── GET    /courses/:id                # Chi tiết khóa học, module, lesson
│   ├── POST   /courses/:id/lessons/:lid/progress # Ghi nhận tiến độ bài học (Watch %, Read %)
│   ├── POST   /courses/:id/assessment/start      # Bắt đầu thi, rút ngẫu nhiên K câu hỏi
│   ├── POST   /courses/:id/assessment/submit     # Nộp bài thi, tự động chấm điểm tức thì
│   ├── POST   /courses/:id/survey-l1      # Nộp khảo sát CSAT L1 & Thiết lập Action Plan 90 ngày
│   ├── GET    /classrooms                 # Danh sách lớp thực hành ILT
│   ├── POST   /classrooms/:id/checkin     # Điểm danh Live QR Code (+150 XP)
│   ├── GET    /learning-paths             # Lộ trình nghề nghiệp & Khung 70-20-10
│   ├── GET    /talent-profile             # Hồ sơ năng lực & Kế nhiệm 4 Tabs
│   ├── GET    /certificates               # Danh sách chứng chỉ số
│   └── GET    /leaderboard                # Bảng xếp hạng XP & Huy hiệu
│
├── /manager
│   ├── GET    /team-dashboard             # Thống kê KPI tuân thủ toàn đội
│   ├── GET    /direct-reports             # Danh sách nhân viên & Tiến độ chi tiết
│   ├── POST   /nominate-course            # Chỉ định/Đề cử khóa học cho nhân viên
│   ├── POST   /nudge-reminder             # 1-Click gửi nhắc nhở nhân viên quá hạn
│   ├── GET    /action-plans               # Danh sách cam kết Action Plans của Direct Reports
│   ├── POST   /action-plans/:id/evaluation-l3 # Đánh giá Hành vi L3 sau 3-6 tháng & Ký duyệt
│   ├── GET    /approvals                  # Danh sách yêu cầu xin học & Chi phí (Program Cost)
│   └── POST   /approvals/:id/decide       # Xử lý Approve / Reject yêu cầu
│
├── /admin
│   ├── GET    /executive-overview         # Chỉ số Executive KPI toàn quốc
│   ├── CRUD   /courses                    # Quản lý khóa học & Trình soạn thảo Builder (version, cost)
│   ├── POST   /courses/:id/questions/import-csv # Import câu hỏi kiểm tra CSV
│   ├── CRUD   /auto-assignment-rules      # Quản trị luật tự động gán khóa học
│   ├── GET    /org-hierarchy              # Lấy cây cơ cấu tổ chức nhánh đôi
│   ├── POST   /org-hierarchy/nodes        # Thêm phòng ban / siêu thị mới
│   ├── POST   /hris/sync-trigger          # Kích hoạt đồng bộ SAP SuccessFactors
│   ├── GET    /training-ops/venues        # Danh sách phòng thực hành & Lịch đặt
│   ├── POST   /training-ops/venues/reserve # Đặt phòng thực hành (Kiểm tra trùng lịch)
│   ├── GET    /reports/kirkpatrick-roi    # Báo cáo ROI đào tạo 4 cấp độ
│   ├── GET    /reports/cost-budget        # Báo cáo chi tiêu ngân sách (departmentSpend)
│   └── GET    /reports/export-csv         # Xuất báo cáo CSV chuẩn UTF-8 BOM
│
└── /ai-hub
    ├── POST   /sop-search                 # Tra cứu ngữ nghĩa tài liệu SOP
    └── POST   /chat-assistant             # Chatbot Gia sư AI giải đáp thắc mắc
```

---

## 7. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS - NFR)

### 7.1. Hiệu năng & Khả năng Chịu tải (Performance & Scalability)
- **NFR-PERF-001**: $95\%$ truy vấn API có thời gian phản hồi dưới **$200\text{ms}$** trong điều kiện mạng tiêu chuẩn.
- **NFR-PERF-002**: Hệ thống đáp ứng tối thiểu **$2,000$ người dùng đồng thời (CCU)** trong các đợt thi sát hạch định kỳ toàn quốc.

### 7.2. An toàn Thông tin & Phân quyền (Security & Access Control)
- **NFR-SEC-001**: Toàn bộ dữ liệu truyền tải qua HTTPS (TLS 1.3). Dữ liệu nhạy cảm mã hóa AES-256.
- **NFR-SEC-002**: Kiểm soát phân quyền RBAC nghiêm ngặt ở cả Router và Backend Interceptor, chặn tuyệt đối truy cập trái phép giữa các Quản lý khác phòng ban/siêu thị.

### 7.3. Tính Sẵn sàng (Availability)
- **NFR-AVAIL-001**: Cam kết thời gian hoạt động liên tục đạt tối thiểu **$99.9\%$**. Tự động sao lưu định kỳ bảo đảm an toàn dữ liệu.

---
*(Tài liệu đã được đối chiếu, bổ sung đầy đủ phân hệ Action Plan, Khảo sát L1 và Đánh giá Hành vi L3 sau 3-6 tháng, đồng bộ tuyệt đối 100% với mã nguồn Mockup Front-end thực tế của dự án MM MegaLearn).*
