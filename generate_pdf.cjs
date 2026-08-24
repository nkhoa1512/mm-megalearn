const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>MM MegaLearn — SRS, FSD & User Manual Specification</title>
<style>
  @page {
    size: A4;
    margin: 14mm 12mm 14mm 12mm;
  }
  * {
    box-sizing: border-box;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1e293b;
    line-height: 1.48;
    font-size: 11px;
    background: #fff;
    margin: 0;
    padding: 0;
  }
  
  /* COVER PAGE */
  .cover-page {
    min-height: 86vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 20px 8px 8px 8px;
    page-break-after: always;
  }
  .cover-header {
    border-bottom: 3px solid #007A38;
    padding-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .brand-logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .logo-box {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #009E49 0%, #007A38 100%);
    color: #fff;
    font-size: 18px;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
  }
  .brand-title {
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
  }
  .brand-sub {
    font-size: 10px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }
  .doc-badge {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #166534;
    padding: 4px 10px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 10.5px;
  }
  .cover-body {
    margin: 26px 0;
  }
  .doc-type {
    font-size: 11px;
    font-weight: 700;
    color: #0F766E;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 8px;
  }
  .doc-title {
    font-size: 22px;
    font-weight: 900;
    color: #0f172a;
    line-height: 1.25;
    margin-bottom: 12px;
  }
  .doc-subtitle {
    font-size: 12px;
    color: #475569;
    line-height: 1.5;
    max-width: 680px;
    margin-bottom: 18px;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px;
    max-width: 600px;
  }
  .meta-item {
    font-size: 10.5px;
  }
  .meta-label {
    font-weight: 700;
    color: #64748b;
    margin-bottom: 1px;
  }
  .meta-val {
    color: #0f172a;
    font-weight: 600;
  }
  .cover-footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10px;
    color: #64748b;
  }

  /* HEADINGS */
  h1 {
    font-size: 15px;
    font-weight: 800;
    color: #0F766E;
    border-bottom: 2px solid #0F766E;
    padding-bottom: 4px;
    margin-top: 18px;
    margin-bottom: 8px;
    page-break-after: avoid;
  }
  h2 {
    font-size: 12.5px;
    font-weight: 700;
    color: #1e293b;
    margin-top: 12px;
    margin-bottom: 5px;
    page-break-after: avoid;
  }
  h3 {
    font-size: 11px;
    font-weight: 700;
    color: #334155;
    margin-top: 9px;
    margin-bottom: 3px;
    page-break-after: avoid;
  }

  /* TABLES */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 6px 0 10px 0;
    font-size: 9.5px;
    page-break-inside: auto;
  }
  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }
  th {
    background: #0F766E;
    color: #ffffff;
    padding: 5px 6px;
    font-weight: 700;
    text-align: left;
    border: 1px solid #0F766E;
  }
  td {
    padding: 4px 6px;
    border: 1px solid #cbd5e1;
    vertical-align: top;
  }
  tr:nth-child(even) {
    background-color: #f8fafc;
  }

  /* ALERTS & BOXES */
  .alert {
    padding: 7px 10px;
    border-radius: 5px;
    margin: 7px 0;
    font-size: 10px;
    border-left: 4px solid;
    page-break-inside: avoid;
  }
  .alert-info { background: #f0fdfa; border-color: #0F766E; color: #134e4a; }
  .alert-warning { background: #fffbeb; border-color: #f59e0b; color: #92400e; }
  .alert-danger { background: #fef2f2; border-color: #ef4444; color: #991b1b; }
  .alert-success { background: #f0fdf4; border-color: #22c55e; color: #166534; }

  /* BADGES */
  .badge {
    display: inline-block;
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 700;
    line-height: 1.2;
  }
  .badge-green { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
  .badge-blue { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
  .badge-amber { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .badge-red { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
  .badge-slate { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

  /* CODE & PRE */
  pre, code {
    font-family: Consolas, "Courier New", Courier, monospace;
    font-size: 9.5px;
  }
  pre {
    background: #0f172a;
    color: #f8fafc;
    padding: 7px;
    border-radius: 5px;
    overflow-x: auto;
    line-height: 1.35;
    page-break-inside: avoid;
  }
  code {
    background: #f1f5f9;
    color: #0F766E;
    padding: 1px 3px;
    border-radius: 3px;
  }

  /* LISTS */
  ul, ol {
    margin: 4px 0 6px 0;
    padding-left: 15px;
  }
  li {
    margin-bottom: 2px;
  }

  .page-break {
    page-break-before: always;
  }
  .avoid-break {
    page-break-inside: avoid;
  }

  .diagram-box {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 9px;
    margin: 7px 0;
    page-break-inside: avoid;
  }
  .diagram-title {
    font-weight: 800;
    color: #0F766E;
    margin-bottom: 4px;
    font-size: 10px;
    text-transform: uppercase;
  }

  .step-badge {
    background: #0F766E;
    color: #fff;
    padding: 1px 6px;
    border-radius: 10px;
    font-size: 9px;
    font-weight: 700;
    margin-right: 4px;
  }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover-page">
  <div class="cover-header">
    <div class="brand-logo">
      <div class="logo-box">MM</div>
      <div>
        <div class="brand-title">MM Mega<span style="color:#009E49;">Learn</span></div>
        <div class="brand-sub">Corporate Learning & Development System</div>
      </div>
    </div>
    <div class="doc-badge">ENTERPRISE SPECIFICATION 2026</div>
  </div>

  <div class="cover-body">
    <div class="doc-type">Software Requirements Specification, FSD & User Operations Guide</div>
    <div class="doc-title">TÀI LIỆU ĐẶC TẢ NGHIỆP VỤ, HỆ THỐNG & HƯỚNG DẪN SỬ DỤNG GIAO DIỆN</div>
    <div class="doc-subtitle">
      Tài liệu tích hợp toàn diện: Đặc tả Yêu cầu Chức năng (FSD), Quy tắc Nghiệp vụ (BR), Mô hình Dữ liệu (Schema) 
      và <strong>Hướng dẫn Chi tiết Thao tác Từng Màn hình (Screen-by-Screen User Guide)</strong>:
      Cơ chế tương tác, thành phần UI, hành vi khi nhấp chuột (Click triggers), luồng xử lý và kết quả phản hồi của từng phân hệ 
      cho Nhân viên (Learner), Quản lý trực tiếp (Manager) và Quản trị viên Đào tạo (L&D Admin).
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">MÃ TÀI LIỆU:</div>
        <div class="meta-val">SRS-FSD-UG-MMVN-2026-V7.0</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">PHIÊN BẢN (VERSION):</div>
        <div class="meta-val">7.0 (Includes Screen-by-Screen User Guide)</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">DOANH NGHIỆP ÁP DỤNG:</div>
        <div class="meta-val">MM Mega Market Vietnam (MMVN)</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">NGÀY CẬP NHẬT:</div>
        <div class="meta-val">24/08/2026</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">TRẠNG THÁI:</div>
        <div class="meta-val" style="color:#166534;">✓ Đồng bộ hoàn toàn 100% Mã nguồn Front-end Mockup</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">BẢO MẬT:</div>
        <div class="meta-val">Lưu hành Nội bộ Dự án L&OD (Confidential)</div>
      </div>
    </div>
  </div>

  <div class="cover-footer">
    <div>Bộ phận Đào tạo & Phát triển Năng lực Tổ chức (L&OD) - MM Mega Market Vietnam</div>
    <div>Trang 1 / Cover</div>
  </div>
</div>

<!-- SECTION 1 -->
<h1>1. GIỚI THIỆU & MỤC TIÊU HỆ THỐNG</h1>

<h2>1.1. Mục đích</h2>
<p>
  <strong>MM MegaLearn</strong> là hệ thống đào tạo nội bộ doanh nghiệp (Corporate L&D System) được thiết kế cho mô hình phân cấp của MM Mega Market Vietnam:
</p>
<ul>
  <li><strong>Nhân viên (Learner)</strong>: Học các khóa học bắt buộc (Mandatory) và tự chọn (Optional), thực hành tại xưởng (ILT), làm bài kiểm tra đánh giá, tham gia khảo sát phản hồi L1 CSAT, thiết lập cam kết Kế hoạch hành động 90 ngày (Action Plan), tích lũy điểm XP/Huy hiệu Gamification và nhận chứng chỉ hoàn thành.</li>
  <li><strong>Quản lý trực tiếp (Line Manager)</strong>: Giám sát tiến độ học tập của nhân viên trực thuộc (Direct Reports), nhận cảnh báo quá hạn/không hoạt động, gửi nhắc nhở 1-chạm (Nudge), chỉ định/đề cử khóa học cho nhân viên (Nominate Course), phê duyệt đơn đăng ký khóa học kèm theo dõi chi phí (Program Cost Tracking), theo dõi Kế hoạch hành động (Action Plans) và thực hiện đánh giá hành vi định kỳ sau 3-6 tháng (Kirkpatrick Level 3 Evaluation).</li>
  <li><strong>Đối tác Nhân sự Vùng (HRBP)</strong>: Xem báo cáo phân tích tuân thủ khu vực, theo dõi lộ trình phát triển nhân tài (Talent Pipeline) và bản đồ nhiệt (Heatmap).</li>
  <li><strong>Giảng viên (Trainer)</strong>: Quản lý danh sách lớp học thực hành (ILT), mở mã QR điểm danh trực tiếp tại lớp (Live QR Check-in), theo dõi tài liệu bài giảng.</li>
  <li><strong>Quản trị viên Nhân sự (User Admin)</strong>: Quản lý hồ sơ nhân viên, duyệt cây tổ chức nhánh đôi (Supporting Functions & Operations).</li>
  <li><strong>Quản trị viên Hệ thống (System Admin)</strong>: Cấu hình tham số bảo mật, giám sát cổng gửi tin thông báo (Email/Zalo/Teams) và đồng bộ dữ liệu SAP SuccessFactors HRIS.</li>
  <li><strong>Quản trị viên Đào tạo (L&D Admin)</strong>: Soạn thảo khóa học kéo thả (Course Builder), quản lý ngân hàng câu hỏi & import CSV, cấu hình luật gán tự động (Auto-assignment rules), quản trị phòng thực hành & lịch đặt phòng, xem báo cáo toàn diện Kirkpatrick ROI và xuất dữ liệu CSV / PDF.</li>
</ul>

<h2>1.2. Bảng Thuật ngữ & Viết tắt</h2>
<table>
  <thead>
    <tr>
      <th style="width:18%;">Thuật ngữ</th>
      <th style="width:25%;">Tên tiếng Anh</th>
      <th>Định nghĩa Thực tế trong Hệ thống</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>BU</strong></td>
      <td>Business Unit</td>
      <td>Đơn vị kinh doanh cấp tập đoàn (<code>bu-mmvn</code>: MM Mega Market Vietnam).</td>
    </tr>
    <tr>
      <td><strong>Supporting Functions</strong></td>
      <td>Supporting Office Branch</td>
      <td>Nhánh tổ chức Khối Trụ sở chính: Khối (Division) &rarr; Phòng ban (Department).</td>
    </tr>
    <tr>
      <td><strong>Operations Branch</strong></td>
      <td>Store Operations Branch</td>
      <td>Nhánh tổ chức Chuỗi Siêu thị: Miền (Area) &rarr; Cụm (Cluster) &rarr; Siêu thị (Retail Store).</td>
    </tr>
    <tr>
      <td><strong>Mandatory Course</strong></td>
      <td>Mandatory Course</td>
      <td>Khóa học bắt buộc có hạn chót (<code>dueDate</code>), được gán theo đối tượng tổ chức mục tiêu.</td>
    </tr>
    <tr>
      <td><strong>Optional Course</strong></td>
      <td>Optional Course</td>
      <td>Khóa học tự chọn mở công khai trên Training Catalog cho 100% nhân viên.</td>
    </tr>
    <tr>
      <td><strong>Action Plan</strong></td>
      <td>Post-Training Action Plan</td>
      <td>Bản cam kết áp dụng kiến thức vào thực tế công việc trong 90 ngày của nhân viên kèm mục tiêu KPI cụ thể.</td>
    </tr>
    <tr>
      <td><strong>Kirkpatrick L1 / L3</strong></td>
      <td>Level 1 CSAT & Level 3 Behavior</td>
      <td>Cấp 1: Khảo sát độ hài lòng ngay sau khóa học. Cấp 3: Quản lý đánh giá mức độ thay đổi hành vi sau 3-6 tháng.</td>
    </tr>
    <tr>
      <td><strong>Cost Tracking</strong></td>
      <td>Training Cost / Program Cost</td>
      <td>Theo dõi chi phí đào tạo từng khóa học (<code>courseCost</code>) và chi tiêu ngân sách theo phòng ban (<code>departmentSpend</code>).</td>
    </tr>
    <tr>
      <td><strong>Enrollment</strong></td>
      <td>Learning Enrollment</td>
      <td>Bản ghi tiến trình học 1 khóa của 1 nhân viên (trạng thái, điểm số, ngày hoàn thành).</td>
    </tr>
    <tr>
      <td><strong>Attempt</strong></td>
      <td>Assessment Attempt</td>
      <td>Bản ghi lịch sử một lần làm bài đánh giá cuối khóa (Điểm, Kết quả Đạt/Không đạt, Thời gian làm bài).</td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<!-- SECTION 2 -->
<h1>2. CƠ CẤU TỔ CHỨC NHÁNH ĐÔI & MA TRẬN PHÂN QUYỀN (RBAC)</h1>

<h2>2.1. Cây Phân cấp Cơ cấu Tổ chức Nhánh đôi (Dual-Branch Org Architecture)</h2>
<div class="diagram-box">
  <div class="diagram-title">CƠ CẤU TỔ CHỨC NHÁNH ĐÔI (DUAL HIERARCHY)</div>
  <pre>
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
  </pre>
</div>

<h2>2.2. Ma trận Phân quyền 7 Vai trò (RBAC Matrix)</h2>
<table>
  <thead>
    <tr>
      <th style="width:28%;">Chức năng Giao diện</th>
      <th style="text-align:center;">learner</th>
      <th style="text-align:center;">manager</th>
      <th style="text-align:center;">hrbp</th>
      <th style="text-align:center;">trainer</th>
      <th style="text-align:center;">useradmin</th>
      <th style="text-align:center;">sysadmin</th>
      <th style="text-align:center;">admin</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Học e-Learning & Thi đánh giá cá nhân</strong></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
    </tr>
    <tr>
      <td><strong>Khảo sát L1 & Cam kết Action Plan</strong></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD (Tạo)</span></td>
      <td style="text-align:center;"><span class="badge badge-blue">R</span></td>
      <td style="text-align:center;"><span class="badge badge-blue">R</span></td>
      <td style="text-align:center;"><span class="badge badge-blue">R</span></td>
      <td style="text-align:center;"><span class="badge badge-blue">R</span></td>
      <td style="text-align:center;"><span class="badge badge-blue">R</span></td>
      <td style="text-align:center;"><span class="badge badge-blue">R</span></td>
    </tr>
    <tr>
      <td><strong>Đánh giá Hành vi L3 Sau 3-6 Tháng</strong></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD (Team)</span></td>
      <td style="text-align:center;"><span class="badge badge-blue">R (Vùng)</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
    </tr>
    <tr>
      <td><strong>Chỉ định/Đề cử Khóa học (Nominate Modal)</strong></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
    </tr>
    <tr>
      <td><strong>Hồ sơ Năng lực (Talent Profile Modal)</strong></td>
      <td style="text-align:center;"><span class="badge badge-blue">R</span></td>
      <td style="text-align:center;"><span class="badge badge-blue">R (Team)</span></td>
      <td style="text-align:center;"><span class="badge badge-blue">R (Vùng)</span></td>
      <td style="text-align:center;"><span class="badge badge-blue">R</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
      <td style="text-align:center;"><span class="badge badge-blue">R</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
    </tr>
    <tr>
      <td><strong>Điểm danh Live QR Lớp thực hành (ILT)</strong></td>
      <td style="text-align:center;"><span class="badge badge-amber">C (Quét)</span></td>
      <td style="text-align:center;"><span class="badge badge-amber">C</span></td>
      <td style="text-align:center;"><span class="badge badge-amber">C</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
      <td style="text-align:center;"><span class="badge badge-blue">R</span></td>
      <td style="text-align:center;"><span class="badge badge-blue">R</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
    </tr>
    <tr>
      <td><strong>Giám sát Tiến độ Nhân viên & 1-Click Nudge</strong></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD (Team)</span></td>
      <td style="text-align:center;"><span class="badge badge-blue">R (Vùng)</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-blue">R (Toàn quốc)</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
    </tr>
    <tr>
      <td><strong>Phê duyệt Khóa học & Chi phí (Approvals)</strong></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
    </tr>
    <tr>
      <td><strong>Quản lý Giảng viên & Đặt phòng Thực hành</strong></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
    </tr>
    <tr>
      <td><strong>Soạn thảo Khóa học (Course Builder)</strong></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-blue">R (Tài liệu)</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
    </tr>
    <tr>
      <td><strong>Ngân hàng Đề thi & Import CSV</strong></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
    </tr>
    <tr>
      <td><strong>Báo cáo ROI Kirkpatrick, Heatmap & Export</strong></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-blue">R (Heatmap)</span></td>
      <td style="text-align:center;"><span class="badge badge-slate">-</span></td>
      <td style="text-align:center;"><span class="badge badge-blue">R</span></td>
      <td style="text-align:center;"><span class="badge badge-blue">R</span></td>
      <td style="text-align:center;"><span class="badge badge-green">CRUD</span></td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<!-- SECTION 3 -->
<h1>3. DANH MỤC NGUYÊN TẮC NGHIỆP VỤ CỐT LÕI (BUSINESS RULES - BR)</h1>

<h2>3.1. Cấu trúc Khóa học & Điều kiện Hoàn thành</h2>
<ul>
  <li><strong>BR-001 (Cấu trúc phân cấp 3 tầng)</strong>: Khóa học tuân theo mô hình <code>Course &gt; Module &gt; Lesson</code>.</li>
  <li><strong>BR-002 (Hoàn thành độc lập theo loại nội dung)</strong>: Mỗi bài học tự động ghi nhận hoàn thành theo tiêu chí nội dung riêng; không có bước chặn duyệt thủ công từng bài từ Quản lý.</li>
  <li><strong>BR-003 (Trọng số bài học bắt buộc)</strong>: Chỉ các bài học có cờ <code>isRequired = true</code> mới được tính vào mẫu số phần trăm hoàn thành khóa học.</li>
  <li><strong>BR-004 (Quy tắc hoàn thành bài Video & YouTube)</strong>:
    - Bài học Video: Hoàn thành khi xem $\ge 90\%$ thời lượng (theo dõi <code>currentTime / duration</code>) hoặc nhấn xác nhận "Mark as watched".<br>
    - Bài học YouTube: Phát trực tiếp qua iframe nhúng Video ID và hoàn thành khi bấm nút "Confirm Video Watched".
  </li>
  <li><strong>BR-005 (Quy tắc hoàn thành bài Tài liệu SOP & Văn bản)</strong>: Hoàn thành khi cuộn trang $\ge 90\%$ độ sâu tài liệu hoặc nhấn xác nhận "Mark as Read".</li>
  <li><strong>BR-006 (Quy tắc hoàn thành bài Ảnh Image Gallery)</strong>: Hoàn thành khi đã xem đủ $100\%$ số ảnh cấu hình (<code>viewedCount &gt;= imageCount</code>).</li>
  <li><strong>BR-007 (Vị trí Gateway của Bài thi Assessment)</strong>: Bài thi đánh giá cuối khóa chỉ mở khóa khi học viên đã hoàn thành $100\%$ các bài học bắt buộc trong khóa.</li>
  <li><strong>BR-008 (Điều kiện xóa khóa học)</strong>: Khóa học chỉ được xóa khi chưa có bất kỳ nhân viên nào phát sinh bản ghi Enrollment (<code>courseHasParticipants = false</code>). Nếu đã có người học, khóa học chuyển sang trạng thái <code>ARCHIVED</code>.</li>
</ul>

<h2>3.2. Động cơ Gán Khóa học Bắt buộc 10 Phạm vi</h2>
<ul>
  <li><strong>BR-009 (Phạm vi hiển thị)</strong>: Khóa <code>OPTIONAL</code> hiển thị công khai trên Catalog cho toàn thể nhân viên. Khóa <code>MANDATORY</code> chỉ xuất hiện khi thông tin tổ chức của nhân viên khớp với cấu hình gán.</li>
  <li><strong>BR-010 (10 Phạm vi Gán Mục tiêu - Target Scopes)</strong>:
    <code>BUSINESS_UNIT</code>, <code>DIVISION</code>, <code>DEPARTMENT</code>, <code>AREA</code>, <code>STORE_TYPE</code>, <code>CLUSTER</code>, <code>STORE</code>, <code>LEVEL</code>, <code>ROLE</code>, <code>USER</code>.
  </li>
  <li><strong>BR-011 (Bắt buộc Due Date cho Mandatory)</strong>: Khóa học Mandatory bắt buộc phải cấu hình <code>dueDate</code>. Hệ thống chặn lưu nếu để trống.</li>
  <li><strong>BR-012 (Chuyển đổi Mandatory sang Optional)</strong>: Khi chuyển loại khóa sang Optional, bản ghi cấu hình gán bị hủy (<code>null</code>) và khóa học mở rộng cho toàn công ty.</li>
</ul>

<h2>3.3. Tính toán Tiến độ 70/30 & Vòng đời Enrollment</h2>
<ul>
  <li><strong>BR-018 (Single Source of Truth & Recompute)</strong>: Tiến độ và trạng thái luôn được tính toán lại theo thời gian thực từ dữ liệu bài học và bài thi thật, không lưu cờ độc lập.</li>
  <li><strong>BR-019 (Công thức Tính toán Tiến độ Tổng thể 70/30)</strong>:
    <div class="alert alert-info">
      • <strong>Khóa học KHÔNG có Assessment</strong>: $\text{Progress \%} = (\text{Số Lesson bắt buộc hoàn thành} / \text{Tổng Lesson bắt buộc}) \times 100\%$<br>
      • <strong>Khóa học CÓ Assessment</strong>: $\text{Progress \%} = [(\text{Số Lesson bắt buộc hoàn thành} / \text{Tổng Lesson bắt buộc}) \times 70\%] + (\text{Assessment Passed ? } 30\% : 0\%)$
    </div>
  </li>
  <li><strong>BR-020 (Vòng đời Trạng thái)</strong>: <code>NOT_STARTED</code> &rarr; <code>IN_PROGRESS</code> &rarr; <code>COMPLETED</code> (hoàn thành) hoặc <code>FAILED</code> (hết lượt thi mà không đạt).</li>
  <li><strong>BR-021 (Đánh dấu Quá hạn - OVERDUE)</strong>: Tự động gắn nhãn <code>OVERDUE</code> khi $\text{Current Date} > \text{dueDate}$ và $\text{Status} \neq \text{COMPLETED}$.</li>
</ul>

<h2>3.4. Khảo thí & Giới hạn Lượt thi (Assessment Engine)</h2>
<ul>
  <li><strong>BR-022 (Rút đề ngẫu nhiên - Dynamic Random Draw)</strong>: Mỗi lượt thi mới, hệ thống tự động rút ngẫu nhiên tập con $K$ câu hỏi từ ngân hàng $N$ câu của khóa học ($K = \text{questionsPerAttempt}$).</li>
  <li><strong>BR-023 (Giới hạn Lượt thi Max Attempts)</strong>: Giới hạn cứng bởi <code>maxAttempts</code> (mặc định 3 lượt). Hết lượt mà chưa đạt $\ge \text{passingScorePercent}$ thì khóa học chuyển sang <code>FAILED</code> vĩnh viễn và hiển thị trong danh sách cảnh báo của Quản lý.</li>
  <li><strong>BR-024 (Tính Bất biến của Lịch sử thi)</strong>: Mỗi lần nộp bài tạo ra một bản ghi <code>AssessmentAttempt</code> mới (Append-only), lưu trữ vĩnh viễn trong học bạ cá nhân.</li>
  <li><strong>BR-025 (Chính sách Hiển thị Đáp án)</strong>: Hỗ trợ 4 chế độ cấu hình: <code>IMMEDIATELY</code>, <code>AFTER_PASSING</code>, <code>AFTER_FINAL_ATTEMPT</code>, <code>NEVER</code>.</li>
  <li><strong>BR-026 (Tự động nộp bài khi hết giờ)</strong>: Đồng hồ đếm ngược từ <code>assessmentTimeLimit * 60</code> giây. Khi hết giờ, hệ thống tự động nộp bài với cơ chế <code>submittedRef</code> chống gửi trùng lặp.</li>
</ul>

<h2>3.5. Khảo sát Kirkpatrick L1/L3, Action Plan, Gamification & Đặt Phòng</h2>
<ul>
  <li><strong>BR-027 (Khảo sát L1 CSAT & Cam kết Action Plan 90 ngày)</strong>: Ngay sau khi hoàn thành khóa học, học viên thực hiện khảo sát đánh giá 3 tiêu chí (Giảng viên, Tài liệu, Tính ứng dụng) và thiết lập 1-2 cam kết Kế hoạch hành động cụ thể tại quầy kèm chỉ số KPI (<code>kpiTarget</code>). Hoàn thành L1 giúp mở khóa chứng chỉ và chuyển Action Plan sang Quản lý trực tiếp.</li>
  <li><strong>BR-028 (Đánh giá Hành vi L3 Sau 3-6 Tháng)</strong>: Quản lý trực tiếp theo dõi danh sách Action Plans của cấp dưới và tiến hành đánh giá định kỳ sau 3-6 tháng: Chấm điểm tiến bộ hành vi (<code>l3BehaviorRating</code> 1-5 sao), ghi nhận chỉ số tăng năng suất / giảm hao hụt (<code>l3ProductivityGain</code>) và xác nhận ký duyệt (Signed-off).</li>
  <li><strong>BR-029 (Hệ số Thưởng Điểm XP Gamification)</strong>: Hoàn thành bài học: $+20\text{ XP}$; Thi đạt điểm tối đa $100\%$: $+100\text{ XP}$; Điểm danh Live QR Lớp ILT: $+150\text{ XP}$; Học liên tục: $+1\text{ Streak Day}$.</li>
  <li><strong>BR-030 (Chống Trùng lịch Phòng Thực hành)</strong>: Kiểm tra xung đột thời gian theo <code>(roomId, date)</code> khi đặt phòng thực hành / phòng họp.</li>
  <li><strong>BR-031 (Quản lý Chi phí Đào tạo - Cost Tracking)</strong>: Mỗi khóa học có trường <code>courseCost</code>. Khi Quản lý phê duyệt (Approve Request), chi phí được cộng dồn vào tổng ngân sách đào tạo của phòng ban (<code>departmentSpend</code>).</li>
</ul>

<div class="page-break"></div>

<!-- SECTION 4 -->
<h1>4. ĐẶC TẢ CHI TIẾT CÁC PHÂN HỆ YÊU CẦU CHỨC NĂNG (FR)</h1>

<h2>4.1. Phân hệ Xác thực, Nhân sự, Cây Tổ chức & Hồ sơ Năng lực (FR-AUTH, FR-HRIS, FR-ORG, FR-PRF)</h2>
<table>
  <thead>
    <tr>
      <th style="width:18%;">Mã Chức năng</th>
      <th style="width:28%;">Tên Chức năng</th>
      <th>Tiêu chí Nghiệp vụ & Hành vi Giao diện Thực tế</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>FR-AUTH-001</strong></td>
      <td>Đăng nhập & Bộ chuyển đổi Persona Demo</td>
      <td>
        - Giao diện đăng nhập doanh nghiệp với email <code>@mmvietnam.com</code>.<br>
        - Bộ chuyển đổi vai trò (Role Switcher) tại Topbar hỗ trợ chuyển đổi tức thì 7 vai trò (Learner, Manager, HRBP, Trainer, User Admin, System Admin, L&D Admin) phục vụ demo và kiểm thử giao diện.
      </td>
    </tr>
    <tr>
      <td><strong>FR-HRIS-001</strong></td>
      <td>Đồng bộ Cây Nhân sự & Trạng thái Nhân viên</td>
      <td>
        - Đồng bộ và quản lý 4 trạng thái nhân sự chuẩn HRIS: <code>ACTIVE</code> (Đang làm việc), <code>INACTIVE</code> (Tạm ngưng/Nghỉ), <code>TRANSFER</code> (Điều chuyển khối/siêu thị), <code>NEW_JOINER</code> (Nhân sự mới gia nhập).<br>
        - Màn hình quản trị hiển thị trạng thái đồng bộ, nút kích hoạt thủ công (Manual Sync Trigger) và nhật ký đồng bộ.
      </td>
    </tr>
    <tr>
      <td><strong>FR-ORG-001</strong></td>
      <td>Trình duyệt Cây Tổ chức Nhánh đôi</td>
      <td>
        - Hiển thị song song 2 nhánh: Supporting Functions (16 Divisions &rarr; 56 Departments) và Operations (3 Areas &rarr; Clusters &rarr; Stores kèm Store Type Badge).<br>
        - Đóng/mở từng cấp độ và form thêm nhanh Phòng ban mới (<code>Add Department</code>) hoặc Siêu thị mới (<code>Add Store</code>) lưu trạng thái phiên.
      </td>
    </tr>
    <tr>
      <td><strong>FR-PRF-001</strong></td>
      <td>Hồ sơ Nhân tài Chi tiết (Talent Profile Modal)</td>
      <td>
        - Modal tra cứu hồ sơ năng lực đầy đủ 4 Tabs:<br>
        1. <strong>Talent & Succession</strong>: Vị trí kế nhiệm mục tiêu, mức sẵn sàng (<code>READY_NOW</code>, <code>READY_IN_6_MONTHS</code>), người kèm cặp (Mentor), phân bổ 70-20-10 và danh sách thẻ kỹ năng chuyên môn dạng badge/tag (HACCP, Bakery Oven, Shrinkage Control...).<br>
        2. <strong>Career History</strong>: Thâm niên công tác (<code>yearsOfService</code>), ngày vào làm (<code>joinDate</code>), các vị trí và phòng ban/siêu thị từng đảm nhiệm.<br>
        3. <strong>Strategic Projects</strong>: Dự án chuyên môn và ban đặc nhiệm đã tham gia.<br>
        4. <strong>Training Curriculum</strong>: Lịch sử điểm số các khóa học và chứng chỉ đạt được.
      </td>
    </tr>
  </tbody>
</table>

<h2>4.2. Phân hệ Soạn thảo & Quản lý Khóa học Đa phương thức (FR-CRS)</h2>
<table>
  <thead>
    <tr>
      <th style="width:18%;">Mã Chức năng</th>
      <th style="width:28%;">Tên Chức năng</th>
      <th>Tiêu chí Nghiệp vụ & Hành vi Giao diện Thực tế</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>FR-CRS-001</strong></td>
      <td>Trình Soạn thảo Course Builder Kéo thả</td>
      <td>
        - Tạo mới và cấu hình khóa học theo cấu trúc <code>Course &gt; Module &gt; Lesson</code>, quản lý phiên bản khóa học (<code>version: 'v1.0'</code>).<br>
        - Hỗ trợ đầy đủ <strong>10 định dạng bài học</strong>: SCORM 2004, Video stream, Interactive PPT, External platform embed, <strong>YouTube Video chuyên dụng</strong> (nhập URL YouTube, tự bóc tách Video ID, hiển thị trình phát chuẩn đỏ), Document PDF, Script, Image Gallery, Text HTML, Thực hành ILT.<br>
        - Cấu hình chi phí đào tạo (<code>courseCost</code>), điều kiện tiên quyết (Prerequisites) và lựa chọn đối tượng gán mục tiêu 10 phạm vi.
      </td>
    </tr>
    <tr>
      <td><strong>FR-CRS-002</strong></td>
      <td>Cấu hình Luật Tự động Gán (Auto-Rules)</td>
      <td>
        - Thiết lập luật tự động gán khóa học bắt buộc theo 10 phạm vi tổ chức (Department, Division, Area, Store, Level, Role...).<br>
        - Cấu hình thời hạn hoàn thành SLA (ví dụ: 14 ngày) và trạng thái kích hoạt luật.
      </td>
    </tr>
  </tbody>
</table>

<h2>4.3. Phân hệ Khảo thí Đánh giá Cuối khóa (FR-ASSESS)</h2>
<table>
  <thead>
    <tr>
      <th style="width:18%;">Mã Chức năng</th>
      <th style="width:28%;">Tên Chức năng</th>
      <th>Tiêu chí Nghiệp vụ & Hành vi Giao diện Thực tế</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>FR-ASSESS-001</strong></td>
      <td>Quản lý & Import CSV Ngân hàng Đề thi</td>
      <td>
        - Hỗ trợ 3 định dạng câu hỏi: <code>SINGLE_CHOICE</code>, <code>MULTIPLE_CHOICE</code>, <code>TRUE_FALSE</code>.<br>
        - Bộ tiền kiểm duyệt CSV: Phát hiện và bỏ qua các dòng lỗi (thiếu câu hỏi, thiếu đáp án, ít hơn 2 lựa chọn), đếm chính xác số dòng lỗi và thông báo chi tiết cho Admin, không làm mất dữ liệu âm thầm.
      </td>
    </tr>
    <tr>
      <td><strong>FR-ASSESS-002</strong></td>
      <td>Trình Làm bài Thi Trực tuyến & Đếm giờ</td>
      <td>
        - Giao diện làm bài thi chuyên dụng, đồng hồ đếm ngược từng giây, đổi màu đỏ khi &lt; 60s.<br>
        - Tự động nộp bài khi hết giờ (Idempotency Guard).<br>
        - Chấm điểm tức thì, ghi nhận số lần thi (Attempt), hiển thị đáp án theo cấu hình và cập nhật tiến độ 70/30.
      </td>
    </tr>
  </tbody>
</table>

<h2>4.4. Phân hệ Lớp học Thực hành ILT & Quản lý Phòng Thực hành (FR-TRN)</h2>
<table>
  <thead>
    <tr>
      <th style="width:18%;">Mã Chức năng</th>
      <th style="width:28%;">Tên Chức năng</th>
      <th>Tiêu chí Nghiệp vụ & Hành vi Giao diện Thực tế</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>FR-TRN-001</strong></td>
      <td>Lớp Thực hành ILT & Điểm danh Live QR</td>
      <td>
        - Danh sách lớp học thực hành tại quầy hoặc Webinar, thông tin giảng viên, phòng học, số chỗ trống.<br>
        - Modal điểm danh <strong>Quick Live QR Check-in</strong>: Quét mã QR tại lớp để ghi nhận chuyên cần và cộng ngay $+150\text{ XP}$ thưởng Gamification.
      </td>
    </tr>
    <tr>
      <td><strong>FR-TRN-002</strong></td>
      <td>Quản lý Giảng viên & Đặt phòng Thực hành</td>
      <td>
        - Quản trị danh sách giảng viên nội bộ/chuyên gia thuê ngoài, chuyên môn, đánh giá sao.<br>
        - Quản lý danh mục phòng thực hành (Store Practical Labs) & phòng họp Head Office.<br>
        - <strong>Lịch đặt phòng & Kiểm tra trùng lịch (Conflict Detection)</strong>: Xem danh sách các ca đã đặt theo từng phòng và chặn đặt trùng ngày <code>(roomId, date)</code>.
      </td>
    </tr>
  </tbody>
</table>

<h2>4.5. Phân hệ Cổng Học tập, Lộ trình 70-20-10 & Gamification (FR-LRN)</h2>
<table>
  <thead>
    <tr>
      <th style="width:18%;">Mã Chức năng</th>
      <th style="width:28%;">Tên Chức năng</th>
      <th>Tiêu chí Nghiệp vụ & Hành vi Giao diện Thực tế</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>FR-LRN-001</strong></td>
      <td>Bảng Điều khiển Cá nhân (Dashboard)</td>
      <td>
        - Thẻ "Continue Learning" ghim khóa học <code>IN_PROGRESS</code> gần nhất kèm nút Resume mở thẳng bài học.<br>
        - Bộ chỉ số KPI cá nhân và danh sách khóa học lọc theo 4 Tab (All, Mandatory, Optional, Completed).
      </td>
    </tr>
    <tr>
      <td><strong>FR-LRN-002</strong></td>
      <td>Lộ trình Nghề nghiệp & Khung 70-20-10</td>
      <td>
        - Lộ trình Onboarding, Lãnh đạo Fast-track Thánh Gióng, Giám đốc Siêu thị (SGM Pipeline).<br>
        - Widget phân bổ tỷ lệ phát triển: <strong>10% Formal Learning</strong>, <strong>20% Social Coaching</strong>, <strong>70% Experiential OJT</strong> kèm Stepper các chặng học tập.
      </td>
    </tr>
    <tr>
      <td><strong>FR-LRN-003</strong></td>
      <td>Gamification XP & Bảng Xếp hạng</td>
      <td>
        - 5 Cấp bậc năng lực (Level 1 Novice &rarr; Level 5 Master), thanh tiến trình XP, chuỗi ngày học Streak.<br>
        - Bộ sưu tập Huy hiệu (Fast Starter, HACCP Master, 7-Day Streak, AI Explorer, Compliance Hero).<br>
        - Bảng xếp hạng thi đua theo Phòng ban (<code>Department Rank</code>) và Toàn quốc (<code>Company Rank</code>).
      </td>
    </tr>
  </tbody>
</table>

<h2>4.6. Phân hệ Giám sát Quản lý, Action Plan & Phê duyệt (FR-MGR)</h2>
<table>
  <thead>
    <tr>
      <th style="width:18%;">Mã Chức năng</th>
      <th style="width:28%;">Tên Chức năng</th>
      <th>Tiêu chí Nghiệp vụ & Hành vi Giao diện Thực tế</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>FR-MGR-001</strong></td>
      <td>Giám sát Đội ngũ & 1-Click Nudge</td>
      <td>
        - Theo dõi 100% nhân viên trực thuộc giới hạn theo cơ cấu tổ chức (<strong>BR-024</strong>).<br>
        - Danh sách cảnh báo "Needs Attention": Nhân viên quá hạn (<code>OVERDUE</code>), không học &gt; 3 ngày (<code>INACTIVE</code>), thi trượt hết lượt (<code>FAILED_EXAM</code>).<br>
        - Nút hành động <strong>Send Reminder (Nudge)</strong> 1-chạm gửi thông báo nhắc nhở.
      </td>
    </tr>
    <tr>
      <td><strong>FR-MGR-002</strong></td>
      <td>Chỉ định & Đề cử Khóa học (Nominate Modal)</td>
      <td>
        - Cho phép Quản lý trực tiếp chọn nhân viên cấp dưới và chỉ định khóa học từ Training Catalog.<br>
        - Thiết lập hạn hoàn thành (<code>dueDate</code>), nhập lý do giải trình phát triển (<code>justification</code>).<br>
        - Tự động ghi danh khóa học vào học bạ của nhân viên và gửi thông báo trực tiếp.
      </td>
    </tr>
    <tr>
      <td><strong>FR-MGR-003</strong></td>
      <td>Phê duyệt Khóa học & Chi phí (Cost Tracking)</td>
      <td>
        - Tiếp nhận và xét duyệt đơn xin học nâng cao/chứng chỉ ngoài quầy kèm theo dõi chi phí đào tạo (<code>courseCost</code>, ví dụ: <code>4,500,000 VND / Khóa</code>).<br>
        - Xử lý Approve (ghi danh ngay) hoặc Reject (từ chối kèm lý do).
      </td>
    </tr>
    <tr>
      <td><strong>FR-MGR-004</strong></td>
      <td>Khảo sát L1, Cam kết Action Plan & Đánh giá L3 Sau 3-6 Tháng</td>
      <td>
        - <strong>Khảo sát L1 CSAT & Action Plan (Học viên)</strong>: Đánh giá chất lượng giảng viên, tài liệu, tính ứng dụng thực tế (1-5 sao) và thiết lập cam kết Kế hoạch hành động 90 ngày (<code>targetCommitment</code>, <code>kpiTarget</code>).<br>
        - <strong>Quản lý Kế hoạch Hành động (Tab Action Plans)</strong>: Quản lý theo dõi tiến độ cam kết của từng nhân viên cấp dưới và hạn chót đánh giá (<code>evaluationDate</code>).<br>
        - <strong>Đánh giá Hành vi Cấp độ 3 - Kirkpatrick L3 (Line Manager)</strong>: Sau 3-6 tháng, Quản lý mở modal đánh giá sự thay đổi hành vi tại sàn bán lẻ (1-5 sao), ghi nhận chỉ số tăng năng suất / giảm hao hụt (<code>l3ProductivityGain</code>), nhập nhận xét và ký duyệt (Signed-off).
      </td>
    </tr>
  </tbody>
</table>

<h2>4.7. Phân hệ Báo cáo ROI Kirkpatrick, Heatmap & Chi tiêu Ngân sách (FR-REP)</h2>
<table>
  <thead>
    <tr>
      <th style="width:18%;">Mã Chức năng</th>
      <th style="width:28%;">Tên Chức năng</th>
      <th>Tiêu chí Nghiệp vụ & Hành vi Giao diện Thực tế</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>FR-REP-001</strong></td>
      <td>Trung tâm Phân tích ROI Đào tạo Kirkpatrick</td>
      <td>
        - Thống kê 4 Cấp độ: Cấp 1 (Hài lòng CSAT từ khảo sát L1), Cấp 2 (Điểm số & Tỷ lệ Pass thi), Cấp 3 (Tỷ lệ tuân thủ SOP & Đánh giá hành vi L3 từ Line Manager), Cấp 4 (Hiệu quả tài chính & Tiết kiệm chi phí hỏng hủy).
      </td>
    </tr>
    <tr>
      <td><strong>FR-REP-002</strong></td>
      <td>Bản đồ Nhiệt & Báo cáo Ngân sách (Cost Spend)</td>
      <td>
        - Bảng so sánh tỷ lệ hoàn thành khóa bắt buộc giữa các siêu thị (Operations) và các khối phòng ban (Supporting Functions) theo màu chuẩn: Xanh (&ge; 90%), Vàng (70-89%), Đỏ (&lt; 70%).<br>
        - <strong>Báo cáo Chi tiêu Ngân sách L&D (Department Spend)</strong>: Thống kê chi phí đào tạo đã sử dụng theo từng phòng ban và phân bổ ngân sách.
      </td>
    </tr>
    <tr>
      <td><strong>FR-REP-003</strong></td>
      <td>Xuất Báo cáo CSV Chuẩn BOM & Print PDF</td>
      <td>
        - <strong>Export Excel Report (CSV)</strong>: Tải file <code>.csv</code> chuẩn mã hóa UTF-8 BOM hiển thị đúng 100% tiếng Việt có dấu trên Microsoft Excel.<br>
        - <strong>Export Audit Dossier (PDF)</strong>: Kích hoạt lệnh in chuẩn hóa (<code>window.print()</code>) hỗ trợ xem trước và lưu file PDF Hồ sơ Báo cáo Kiểm toán Đào tạo.
      </td>
    </tr>
  </tbody>
</table>

<h2>4.8. Phân hệ Trợ lý Trí tuệ Nhân tạo Doanh nghiệp (FR-AI)</h2>
<table>
  <thead>
    <tr>
      <th style="width:18%;">Mã Chức năng</th>
      <th style="width:28%;">Tên Chức năng</th>
      <th>Tiêu chí Nghiệp vụ & Hành vi Giao diện Thực tế</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>FR-AI-001</strong></td>
      <td>Tra cứu Ngữ nghĩa Quy trình SOP (Search)</td>
      <td>
        - Tra cứu tài liệu SOP bằng từ khóa hoặc câu hỏi tự nhiên kèm bộ lọc chủ đề (#Bakery, #Food Safety, #Fire Safety, #Security...).<br>
        - Hiển thị trích đoạn khớp ngữ nghĩa (Matched Excerpt) và mã tài liệu SOP chính thức.
      </td>
    </tr>
    <tr>
      <td><strong>FR-AI-002</strong></td>
      <td>Trợ lý Gia sư AI & Floating Drawer</td>
      <td>
        - Khung Chatbot AI tại AI Hub và Ngăn kéo nổi (Floating Drawer) trên toàn hệ thống giải đáp thắc mắc quy trình (Bakery SOP-OMD-04, POS Security SEC-POL-01, Fire Safety HSE-PCCC-02).
      </td>
    </tr>
    <tr>
      <td><strong>FR-AI-003</strong></td>
      <td>Gợi ý Khóa học Cá nhân hóa</td>
      <td>
        - Tab hiển thị danh sách các khóa học gợi ý dựa trên chức danh và lịch sử học tập của nhân viên.
      </td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<!-- SECTION 5 -->
<h1>5. MÔ HÌNH DỮ LIỆU & THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)</h1>

<h2>5.1. Sơ đồ Thực thể Liên kết (Entity Relationship Diagram - ERD)</h2>
<div class="diagram-box">
  <div class="diagram-title">SƠ ĐỒ THỰC THỂ LIÊN KẾT TỔNG THỂ (ERD)</div>
  <pre>
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
  </pre>
</div>

<h2>5.2. Đặc tả Chi tiết Các Bảng Dữ liệu Cốt lõi (Data Dictionary)</h2>

<h3>1. Bảng <code>users</code> (Danh sách Cán bộ Nhân viên)</h3>
<table>
  <thead>
    <tr>
      <th style="width:20%;">Tên Cột</th>
      <th style="width:18%;">Kiểu Dữ liệu</th>
      <th style="width:22%;">Ràng buộc</th>
      <th>Mô tả Chi tiết</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>id</code></td>
      <td>VARCHAR(64)</td>
      <td>PK, NOT NULL</td>
      <td>Mã định danh duy nhất (Ví dụ: <code>USR-1042</code>).</td>
    </tr>
    <tr>
      <td><code>employee_code</code></td>
      <td>VARCHAR(32)</td>
      <td>UNIQUE, NOT NULL</td>
      <td>Mã số nhân viên MMVN (Ví dụ: <code>MMVN-1042</code>).</td>
    </tr>
    <tr>
      <td><code>email</code></td>
      <td>VARCHAR(128)</td>
      <td>UNIQUE, NOT NULL</td>
      <td>Email doanh nghiệp <code>@mmvietnam.com</code>.</td>
    </tr>
    <tr>
      <td><code>full_name</code></td>
      <td>VARCHAR(128)</td>
      <td>NOT NULL</td>
      <td>Họ và tên đầy đủ của nhân viên.</td>
    </tr>
    <tr>
      <td><code>role</code></td>
      <td>ENUM</td>
      <td>NOT NULL</td>
      <td><code>learner</code>, <code>manager</code>, <code>hrbp</code>, <code>trainer</code>, <code>useradmin</code>, <code>sysadmin</code>, <code>admin</code>.</td>
    </tr>
    <tr>
      <td><code>job_level</code></td>
      <td>VARCHAR(8)</td>
      <td>FK &rarr; job_levels.level</td>
      <td>Cấp bậc chức danh: <code>1</code> đến <code>7</code>, <code>CL</code> (Casual), <code>IN</code> (Intern).</td>
    </tr>
    <tr>
      <td><code>position_title</code></td>
      <td>VARCHAR(128)</td>
      <td>NOT NULL</td>
      <td>Tên chức danh công việc cụ thể.</td>
    </tr>
    <tr>
      <td><code>years_of_service</code></td>
      <td>DECIMAL(3,1)</td>
      <td>DEFAULT 1.0</td>
      <td>Thâm niên công tác tại MMVN (năm).</td>
    </tr>
    <tr>
      <td><code>join_date</code></td>
      <td>DATE</td>
      <td>NULL</td>
      <td>Ngày chính thức gia nhập công ty.</td>
    </tr>
    <tr>
      <td><code>business_unit_id</code></td>
      <td>VARCHAR(32)</td>
      <td>FK &rarr; business_units.id</td>
      <td>Mã BU trực thuộc (<code>bu-mmvn</code>).</td>
    </tr>
    <tr>
      <td><code>division_id</code></td>
      <td>VARCHAR(32)</td>
      <td>FK &rarr; divisions.id, NULL</td>
      <td>Mã Khối Head Office (<code>div-omd</code>, <code>div-scm</code>...).</td>
    </tr>
    <tr>
      <td><code>department_id</code></td>
      <td>VARCHAR(32)</td>
      <td>FK &rarr; departments.id, NULL</td>
      <td>Mã Phòng ban (<code>dept-ppf</code>, <code>dept-df</code>...).</td>
    </tr>
    <tr>
      <td><code>area_id</code></td>
      <td>VARCHAR(32)</td>
      <td>FK &rarr; operations_areas.id, NULL</td>
      <td>Mã Miền (<code>area-north</code>, <code>area-south</code>...).</td>
    </tr>
    <tr>
      <td><code>cluster_id</code></td>
      <td>VARCHAR(32)</td>
      <td>FK &rarr; store_clusters.id, NULL</td>
      <td>Mã Cụm siêu thị (<code>cluster-hcm-east</code>...).</td>
    </tr>
    <tr>
      <td><code>store_id</code></td>
      <td>VARCHAR(32)</td>
      <td>FK &rarr; retail_stores.id, NULL</td>
      <td>Mã Siêu thị (<code>store-an-phu</code>...).</td>
    </tr>
    <tr>
      <td><code>manager_id</code></td>
      <td>VARCHAR(64)</td>
      <td>FK &rarr; users.id, NULL</td>
      <td>Mã Quản lý trực tiếp (Direct Manager).</td>
    </tr>
    <tr>
      <td><code>status</code></td>
      <td>ENUM</td>
      <td>NOT NULL, DEFAULT 'ACTIVE'</td>
      <td><strong>4 Trạng thái chuẩn:</strong> <code>ACTIVE</code> (Đang làm việc), <code>INACTIVE</code> (Tạm ngưng), <code>TRANSFER</code> (Điều chuyển), <code>NEW_JOINER</code> (Nhân sự mới).</td>
    </tr>
  </tbody>
</table>

<h3>2. Bảng <code>courses</code> (Danh mục Khóa học Đa phương thức)</h3>
<table>
  <thead>
    <tr>
      <th style="width:20%;">Tên Cột</th>
      <th style="width:18%;">Kiểu Dữ liệu</th>
      <th style="width:22%;">Ràng buộc</th>
      <th>Mô tả Chi tiết</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>id</code></td>
      <td>VARCHAR(64)</td>
      <td>PK, NOT NULL</td>
      <td>Mã khóa học (Ví dụ: <code>course-fsh-1</code>).</td>
    </tr>
    <tr>
      <td><code>code</code></td>
      <td>VARCHAR(32)</td>
      <td>UNIQUE, NOT NULL</td>
      <td>Mã chuẩn hóa (Ví dụ: <code>HACCP-101</code>).</td>
    </tr>
    <tr>
      <td><code>title</code></td>
      <td>VARCHAR(255)</td>
      <td>NOT NULL</td>
      <td>Tên tiêu đề khóa học.</td>
    </tr>
    <tr>
      <td><code>version</code></td>
      <td>VARCHAR(16)</td>
      <td>DEFAULT 'v1.0'</td>
      <td><strong>Phiên bản tài liệu khóa học</strong> (Ví dụ: <code>v1.0</code>, <code>v2.1</code>).</td>
    </tr>
    <tr>
      <td><code>course_cost</code></td>
      <td>VARCHAR(64)</td>
      <td>NULL</td>
      <td><strong>Chi phí đào tạo / Đơn vị tổ chức</strong> (Ví dụ: <code>4,500,000 VND / Khóa</code>).</td>
    </tr>
    <tr>
      <td><code>course_type</code></td>
      <td>ENUM</td>
      <td>NOT NULL</td>
      <td><code>MANDATORY</code>, <code>OPTIONAL</code>, <code>ILT_CLASSROOM</code>.</td>
    </tr>
    <tr>
      <td><code>modality</code></td>
      <td>ENUM</td>
      <td>NOT NULL</td>
      <td><code>SCORM_PACKAGE</code>, <code>INTERACTIVE_VIDEO</code>, <code>PPT_PRESENTATION</code>, <code>EXTERNAL_PLATFORM</code>, <code>YOUTUBE_LINK</code>, <code>DOCUMENT</code>, <code>SCRIPT</code>, <code>IMAGE</code>, <code>TEXT</code>, <code>CLASSROOM_LAB</code>.</td>
    </tr>
    <tr>
      <td><code>category</code></td>
      <td>VARCHAR(64)</td>
      <td>NOT NULL</td>
      <td>Phân loại nghiệp vụ (Fresh Food, Safety, Leadership...).</td>
    </tr>
    <tr>
      <td><code>status</code></td>
      <td>ENUM</td>
      <td>DEFAULT 'DRAFT'</td>
      <td><code>DRAFT</code>, <code>PUBLISHED</code>, <code>ARCHIVED</code>.</td>
    </tr>
  </tbody>
</table>

<h3>3. Bảng <code>action_plans</code> (Kế hoạch Hành động & Đánh giá L3 Sau 3-6 Tháng)</h3>
<table>
  <thead>
    <tr>
      <th style="width:20%;">Tên Cột</th>
      <th style="width:18%;">Kiểu Dữ liệu</th>
      <th style="width:22%;">Ràng buộc</th>
      <th>Mô tả Chi tiết</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>id</code></td>
      <td>VARCHAR(64)</td>
      <td>PK, NOT NULL</td>
      <td>Mã kế hoạch hành động (Ví dụ: <code>act-plan-101</code>).</td>
    </tr>
    <tr>
      <td><code>learner_id</code></td>
      <td>VARCHAR(64)</td>
      <td>FK &rarr; users.id, NOT NULL</td>
      <td>Mã nhân viên cam kết hành động.</td>
    </tr>
    <tr>
      <td><code>manager_id</code></td>
      <td>VARCHAR(64)</td>
      <td>FK &rarr; users.id, NOT NULL</td>
      <td>Mã Quản lý trực tiếp theo dõi & đánh giá.</td>
    </tr>
    <tr>
      <td><code>course_id</code></td>
      <td>VARCHAR(64)</td>
      <td>FK &rarr; courses.id, NOT NULL</td>
      <td>Mã khóa học hoàn thành tương ứng.</td>
    </tr>
    <tr>
      <td><code>target_commitment</code></td>
      <td>TEXT</td>
      <td>NOT NULL</td>
      <td>Cam kết áp dụng hành động thực tế tại quầy siêu thị trong 90 ngày.</td>
    </tr>
    <tr>
      <td><code>kpi_target</code></td>
      <td>VARCHAR(255)</td>
      <td>NOT NULL</td>
      <td>Chỉ số KPI mục tiêu (Ví dụ: Giảm hao hụt bánh tươi 10%).</td>
    </tr>
    <tr>
      <td><code>survey_l1_score</code></td>
      <td>DECIMAL(2,1)</td>
      <td>NOT NULL</td>
      <td>Điểm trung bình hài lòng L1 CSAT (1.0 &rarr; 5.0 sao).</td>
    </tr>
    <tr>
      <td><code>evaluation_date</code></td>
      <td>DATE</td>
      <td>NOT NULL</td>
      <td>Hạn chót đánh giá định kỳ sau 3-6 tháng.</td>
    </tr>
    <tr>
      <td><code>manager_review_l3</code></td>
      <td>JSON</td>
      <td>NULL</td>
      <td>Kết quả đánh giá L3 của Manager: <code>{"rating": 5, "gain": "+15%", "notes": "..."}</code>.</td>
    </tr>
    <tr>
      <td><code>status</code></td>
      <td>ENUM</td>
      <td>DEFAULT 'IN_PROGRESS'</td>
      <td><code>IN_PROGRESS</code> (Đang thực hiện), <code>EVALUATED</code> (Đã ký duyệt L3).</td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<!-- SECTION 6 -->
<h1>6. HƯỚNG DẪN SỬ DỤNG HỆ THỐNG & THAO TÁC TỪNG MÀN HÌNH (USER OPERATIONS MANUAL)</h1>

<p>
  Chương này mô tả chi tiết giao diện người dùng, các thành phần hiển thị, hành vi nhấp chuột (Click Triggers), 
  luồng nghiệp vụ và kết quả phản hồi của hệ thống cho từng phân hệ màn hình thực tế:
</p>

<h2>6.1. Khung Giao diện Chung & Bộ Chuyển đổi Vai trò (Global Layout & Role Switcher)</h2>
<table>
  <thead>
    <tr>
      <th style="width:22%;">Thành phần Giao diện</th>
      <th style="width:28%;">Vị trí & Thao tác Click</th>
      <th>Luồng Nghiệp vụ & Kết quả Phản hồi của Hệ thống</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Bộ chuyển đổi Vai trò (Role Switcher)</strong></td>
      <td>Góc trên cùng bên phải Topbar (Badge vai trò hiện tại). Bấm vào menu dropdown và chọn 1 trong 7 vai trò.</td>
      <td>Hệ thống tức thì cập nhật quyền truy cập, chuyển hướng cây menu Sidebar sang đúng vai trò vừa chọn (ví dụ: chuyển từ <code>learner</code> sang <code>manager</code> sẽ mở menu Team, Approvals), đồng thời tải lại dữ liệu phiên phù hợp.</td>
    </tr>
    <tr>
      <td><strong>Trợ lý Nổi AI Drawer</strong></td>
      <td>Nút tròn biểu tượng tia sáng <span class="badge badge-blue">AI Sparkles</span> ở góc dưới cùng bên phải màn hình.</td>
      <td>Mở ngăn kéo nổi (Floating Drawer) từ cạnh phải mà không làm mất trang hiện tại. Cho phép gõ câu hỏi nhanh về quy trình SOP (Bakery, Fire Safety, POS Security) &rarr; Trả lời tức thì sau 500ms.</td>
    </tr>
    <tr>
      <td><strong>Chuông Thông báo (Notifications)</strong></td>
      <td>Biểu tượng chuông trên Topbar kèm chấm đỏ số lượng.</td>
      <td>Hiển thị danh sách thông báo: Khóa học mới được gán, Cảnh báo hạn chót sắp đến, Đơn xin học đã được Manager phê duyệt, Lời nhắc Nudge từ Quản lý.</td>
    </tr>
  </tbody>
</table>

<h2>6.2. Cổng Học viên (Learner Portal)</h2>

<h3>Màn hình 1: Bảng Điều khiển Cá nhân (Learner Dashboard — <code>/learner/dashboard</code>)</h3>
<ul>
  <li><span class="step-badge">1</span> <strong>Thẻ "Continue Learning" (Ghim Khóa Đang Học)</strong>:
    - <em>Hiển thị:</em> Tên khóa học gần nhất đang dở dang, thanh % tiến độ (ví dụ 40%), hạn chót <code>dueDate</code>.<br>
    - <em>Thao tác:</em> Nhấn nút <span class="badge badge-green">Resume Course</span>.<br>
    - <em>Kết quả:</em> Hệ thống điều hướng thẳng vào bài học kế tiếp chưa hoàn thành trong Trình phát bài học (<code>LessonPlayer</code>).
  </li>
  <li><span class="step-badge">2</span> <strong>Danh mục Khóa học theo 4 Tabs (All / Mandatory / Optional / Completed)</strong>:
    - <em>Thao tác:</em> Bấm chuyển Tab để lọc danh sách khóa học. Nhấp vào bất kỳ thẻ khóa học nào.<br>
    - <em>Kết quả:</em> Mở trang Chi tiết Khóa học (<code>/learner/courses/:id</code>) hiển thị tóm tắt, thời lượng, số module và danh sách bài học.
  </li>
</ul>

<h3>Màn hình 2: Trình Phát Bài học Đa Định dạng (Lesson Player — <code>/learner/courses/:id/lessons/:lid</code>)</h3>
<table>
  <thead>
    <tr>
      <th style="width:20%;">Định dạng Bài học</th>
      <th style="width:30%;">Thao tác Học viên trên Giao diện</th>
      <th>Phản hồi & Điều kiện Ghi nhận Hoàn thành của Hệ thống</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Video MP4 / Stream</strong></td>
      <td>Xem video trực tuyến trên trình phát.</td>
      <td>Hệ thống theo dõi thời lượng. Khi xem $\ge 90\%$ hoặc nhấn nút "Mark as watched" &rarr; Đánh dấu tích xanh hoàn thành bài học, tự động cập nhật tiến độ tổng thể.</td>
    </tr>
    <tr>
      <td><strong>YouTube Video Chuyên dụng</strong></td>
      <td>Xem video qua khung phát YouTube nhúng chuẩn đỏ.</td>
      <td>Nhấp nút <strong>"Confirm Video Watched"</strong> &rarr; Hệ thống ghi nhận tiến độ 100% cho bài học và mở khóa bài tiếp theo.</td>
    </tr>
    <tr>
      <td><strong>SCORM 2004 Package</strong></td>
      <td>Nhấn nút <em>Previous / Next Slide</em> trên thanh điều hướng mô phỏng gói chuẩn SCORM.</td>
      <td>Khi đi qua slide cuối cùng &rarr; Tự động kích hoạt sự kiện <code>LMSSetValue(cmi.completion_status, 'completed')</code> và cập nhật khóa học.</td>
    </tr>
    <tr>
      <td><strong>Interactive Slide Deck (PPT)</strong></td>
      <td>Xem bộ slide bài giảng, chuyển trang từ slide 1 đến slide cuối.</td>
      <td>Hoàn thành khi duyệt đủ 100% các trang slide.</td>
    </tr>
    <tr>
      <td><strong>Tài liệu SOP / Text</strong></td>
      <td>Cuộn đọc văn bản hoặc xem file tài liệu nhúng.</td>
      <td>Cuộn sâu $\ge 90\%$ hoặc nhấn nút <strong>"Mark as Read"</strong> &rarr; Ghi nhận hoàn thành.</td>
    </tr>
  </tbody>
</table>

<h3>Màn hình 3: Trình Khảo thí Đánh giá Cuối khóa (Assessment Player — <code>/learner/courses/:id/assessment</code>)</h3>
<ul>
  <li><span class="step-badge">1</span> <strong>Bắt đầu Thi</strong>: Bấm nút <strong>"Start Assessment"</strong> (chỉ sáng khi 100% bài học bắt buộc đã hoàn thành).</li>
  <li><span class="step-badge">2</span> <strong>Làm bài & Đếm giờ</strong>: Đồng hồ đếm lùi thời gian thực (ví dụ 15:00). Chọn đáp án các câu hỏi.</li>
  <li><span class="step-badge">3</span> <strong>Nộp bài (Submit)</strong>:
    - <em>Chủ động:</em> Bấm nút "Submit Assessment".<br>
    - <em>Tự động:</em> Khi đồng hồ về 00:00 &rarr; Hệ thống tự động nộp bài ngay lập tức.<br>
    - <em>Kết quả:</em> Chấm điểm tức thì, thông báo Điểm số %, Đạt/Không đạt, Lượt thi còn lại (<code>attemptsLeft</code>).
  </li>
  <li><span class="step-badge">4</span> <strong>Khảo sát L1 & Cam kết Action Plan</strong>: Mở modal khảo sát đánh giá CSAT 1-5 sao &rarr; Nhập 1-2 cam kết hành động 90 ngày (<code>targetCommitment</code>, <code>kpiTarget</code>) &rarr; Nhấn "Submit CSAT & Unlock Certificate" &rarr; Mở khóa chứng chỉ số và chuyển Action Plan sang Quản lý.</li>
</ul>

<h3>Màn hình 4: Lớp Thực hành ILT & Điểm danh Live QR (<code>/learner/classrooms</code>)</h3>
<ul>
  <li><em>Thao tác:</em> Nhấn nút <strong>"Quick QR Check-in"</strong> trên thẻ lớp học thực hành quầy hoặc webinar.</li>
  <li><em>Kết quả:</em> Modal hiển thị mã QR động tại lớp. Nhấn <strong>"Confirm Attendance"</strong> &rarr; Hệ thống ghi nhận có mặt, cấp tích xanh chuyên cần và cộng ngay <span class="badge badge-green">+150 XP</span> thưởng Gamification.</li>
</ul>

<div class="page-break"></div>

<h2>6.3. Cổng Quản lý Trực tiếp (Line Manager Portal)</h2>

<h3>Màn hình 1: Quản lý Đội ngũ & Giám sát Năng lực (Team Supervision — <code>/manager/team</code>)</h3>
<table>
  <thead>
    <tr>
      <th style="width:20%;">Phân vùng / Tab</th>
      <th style="width:30%;">Thao tác của Quản lý</th>
      <th>Hành vi Xử lý & Kết quả Phản hồi của Hệ thống</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Tab 1: Team Members (Giám sát Tiến độ)</strong></td>
      <td>
        • Xem danh sách nhân viên trực thuộc.<br>
        • Nhấn nút <strong>"Assign"</strong> trên hàng nhân viên.<br>
        • Nhấn nút <strong>"View Profile"</strong>.
      </td>
      <td>
        • <strong>Assign:</strong> Mở <code>ManagerNominateModal</code> cho phép chọn khóa học từ Catalog, đặt hạn chót <code>dueDate</code>, nhập lý do <code>justification</code> &rarr; Bấm "Confirm Nomination" &rarr; Ghi danh ngay và gửi thông báo vào inbox nhân viên.<br>
        • <strong>View Profile:</strong> Mở <code>TalentProfileModal</code> đầy đủ 4 Tabs (Kế nhiệm, Thâm niên, Dự án, Điểm số).
      </td>
    </tr>
    <tr>
      <td><strong>Tab 2: Skill Gap Analysis (Phân tích Khoảng cách Kỹ năng)</strong></td>
      <td>Xem ma trận so sánh năng lực hiện tại vs chuẩn chức danh kế nhiệm. Nhấn nút <strong>"Assign Developmental Course"</strong> tại kỹ năng bị thiếu hụt (Gap âm).</td>
      <td>Hệ thống tự động mở form đề xuất khóa học tương ứng với kỹ năng còn yếu &rarr; Quản lý xác nhận gán bổ sung để nhân viên hoàn thiện năng lực.</td>
    </tr>
    <tr>
      <td><strong>Tab 3: Action Plans & L3 Review (Đánh giá Hành vi 3-6 Tháng)</strong></td>
      <td>
        Xem danh sách cam kết Kế hoạch hành động của nhân viên.<br>
        Nhấn nút <strong>"Conduct Level 3 Review (3-6 Mos)"</strong>.
      </td>
      <td>Mở modal đánh giá Kirkpatrick L3: Chấm điểm tiến bộ hành vi (1-5 sao), nhập chỉ số tăng năng suất thực tế (ví dụ: +15% tốc độ thu ngân), nhập nhận xét &rarr; Bấm "Confirm Level 3 Evaluation" &rarr; Chuyển trạng thái sang <strong>Signed-off</strong> và ghi nhận vào báo cáo ROI Cấp 3.</td>
    </tr>
  </tbody>
</table>

<h3>Màn hình 2: Phê duyệt Khóa học & Chi phí Đào tạo (Course Approvals — <code>/manager/approvals</code>)</h3>
<ul>
  <li><em>Xem danh sách:</em> Đơn xin học các chứng chỉ/khóa học đặc thù của nhân viên kèm chi phí đào tạo (<code>courseCost</code>, ví dụ: <code>4,500,000 VND</code>).</li>
  <li><em>Phê duyệt (Approve):</em> Nhấn <strong>"Approve Request"</strong> &rarr; Duyệt đơn tức thì, cấp quyền truy cập khóa học cho nhân viên và ghi nhận chi phí vào ngân sách đào tạo của phòng ban.</li>
  <li><em>Từ chối (Reject):</em> Nhấn <strong>"Reject"</strong> &rarr; Hủy yêu cầu và gửi thông báo từ chối kèm lý do về học viên.</li>
</ul>

<h2>6.4. Cổng Quản trị Đào tạo (L&OD Admin Portal)</h2>

<h3>Màn hình 1: Trình Soạn thảo Khóa học Đa Hình thức (Course Builder — <code>/admin/courses/new</code>)</h3>
<div class="diagram-box">
  <div class="diagram-title">LUỒNG THAO TÁC SOẠN THẢO KHÓA HỌC: TRỰC TUYẾN (E-LEARNING) VS TRỰC TIẾP (ILT WORKSHOP)</div>
  <pre>
  [1. Chọn Hình thức Đào tạo]
         ├── 🌐 KHÓA HỌC TRỰC TUYẾN (Online E-learning): Tự học Video, SCORM, PPT, YouTube, PDF & Thi trắc nghiệm
         └── 🏢 KHÓA ĐÀO TẠO TRỰC TIẾP (In-Person Workshop): Học tại xưởng thực hành/phòng học có Giảng viên & QR
  
  [2. Cấu hình Logistics Đào tạo Trực tiếp (ILT)]
         ├── Chọn Giảng viên Phụ trách (Assigned Trainer): Nguyễn Văn Hùng (Master Trainer), Đặng Thanh Mai...
         ├── Chọn Địa điểm & Phòng thực hành (Venue): Xưởng Bánh Mì MM An Phú, Cashier Lab, Sapphire Suite...
         ├── Chọn Ngày học & Khung giờ: 2026-08-28 (08:30 - 11:30) & Sức chứa tối đa (Max Capacity: 25 chỗ)
         └── Gán Đối tượng Bắt buộc Nhanh: Tất cả Quản lý (All Managers), Nhân sự Mới (New Joiners), Quầy Bánh...

  [3. Cấu hình Khóa học Trực tuyến (E-Learning)]
         ├── Cấu trúc Module & Lesson (Video MP4, YouTube Embed, SCORM 2004, Slide PPT)
         └── Ngân hàng Đề thi & Khảo thí (Question Bank, % Điểm đạt, Thời gian làm bài, Import CSV)

  [4. Xuất bản] ──> Nhấn "Publish Course" ──> Kích hoạt khóa học và tự động gán vào Cổng Học viên & Lịch Giảng viên.
  </pre>
</div>

<h3>Màn hình 2: Đặt Phòng Thực hành & Quản lý Lịch Đào tạo (Training Ops — <code>/admin/training-ops</code>)</h3>
<ul>
  <li><em>Thao tác Đặt phòng:</em> Chọn phòng thực hành quầy hoặc phòng họp tại Head Office, chọn ngày tổ chức và nhập tên chương trình &rarr; Nhấn <strong>"Reserve Room"</strong>.</li>
  <li><em>Kiểm tra Xung đột (Conflict Guard):</em>
    - Nếu phòng đã có lớp khác đặt vào ngày đó: Hệ thống kích hoạt <strong>Conflict Guard</strong> &rarr; Chặn đặt và hiển thị cảnh báo đỏ <em>"Conflict: Phòng đã có chương trình đặt vào ngày này!"</em>.<br>
    - Nếu phòng còn trống: Ghi nhận đặt phòng thành công và hiển thị lịch trực tiếp trên bảng điều khiển.
  </li>
  <li><em>Nút "Schedule New Cohort":</em> Điều hướng trực tiếp sang Trình tạo khóa học để tạo lớp đào tạo thực hành mới.</li>
  <li><em>Công cụ Upload Danh sách Roster (Batch Student Upload):</em> Dán danh sách mã nhân viên &rarr; Ghi danh đồng loạt vào lớp học thực tế chỉ với 1 click.</li>
</ul>

<h3>Màn hình 3: Báo cáo ROI Kirkpatrick, Heatmap & Xuất Dữ liệu (<code>/admin/reports</code>)</h3>
<ul>
  <li><strong>Xuất Báo cáo CSV (Excel)</strong>: Nhấn <strong>"Export Excel Report (CSV)"</strong> &rarr; Tải file <code>.csv</code> chuẩn UTF-8 BOM hiển thị chuẩn 100% tiếng Việt trên Excel.</li>
  <li><strong>Xuất Bản in Hồ sơ Kiểm toán (PDF)</strong>: Nhấn <strong>"Export Audit Dossier"</strong> &rarr; Kích hoạt lệnh <code>window.print()</code> chuẩn CSS A4 để in hoặc lưu file PDF Hồ sơ Kiểm toán Đào tạo phục vụ thanh tra.</li>
</ul>

<h2>6.5. Cổng Giảng viên Đứng lớp (Trainer Faculty Portal — <code>/trainer</code>)</h2>
<p>
  Dành riêng cho Đội ngũ Giảng viên Nội bộ & Master Trainer (ví dụ: Thầy <strong>Nguyễn Văn Hùng</strong> — Head of Operational Training) để quản lý các lớp đào tạo trực tiếp được L&D phân công:
</p>
<table>
  <thead>
    <tr>
      <th style="width:22%;">Chức năng / Tab</th>
      <th style="width:30%;">Thao tác Giảng viên trên Màn hình</th>
      <th>Phản hồi & Luồng Xử lý của Hệ thống</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Lớp Học Tôi Phụ Trách (My Teaching Classes)</strong></td>
      <td>
        • Xem danh sách các lớp thực hành tại quầy hoặc webinar được phân công.<br>
        • Nhấn nút <span class="badge badge-green">Mở QR Điểm danh Trực tiếp</span>.<br>
        • Nhấn nút <span class="badge badge-blue">Danh sách Học viên</span>.
      </td>
      <td>
        • <strong>Mở QR Trực tiếp:</strong> Hiển thị màn hình phóng to mã Live QR Token tại lớp học. Học viên tại lớp dùng ứng dụng điện thoại quét mã &rarr; Tức thì ghi nhận chuyên cần và nhận <code>+150 XP</code>.<br>
        • <strong>Danh sách Học viên:</strong> Mở bảng điểm danh toàn bộ học viên đã đăng ký, hỗ trợ tìm kiếm nhanh và tích điểm danh thủ công (Manual Check-in Toggle).
      </td>
    </tr>
    <tr>
      <td><strong>Đánh giá CSAT & Phản hồi từ Học viên</strong></td>
      <td>Xem tổng điểm CSAT trung bình (<strong>4.90 / 5.0★</strong>) và danh sách nhận xét thực tế từ học viên sau các buổi thực hành quầy bánh, PCCC, thu ngân.</td>
      <td>Giúp Giảng viên theo dõi phản hồi Kirkpatrick Level 1 để cải tiến phương pháp giảng dạy trực tiếp.</td>
    </tr>
    <tr>
      <td><strong>Phòng Thực hành & Thiết bị Siêu thị</strong></td>
      <td>Tra cứu danh sách xưởng thực hành (Xưởng bánh tươi, Quầy thu ngân demo, Bãi tập PCCC) kèm thông số sức chứa và trang thiết bị có sẵn.</td>
      <td>Hiển thị vị trí phòng học, trang thiết bị chuyên dụng hỗ trợ công tác chuẩn bị bài giảng trước giờ lên lớp.</td>
    </tr>
  </tbody>
</table>

<h2>6.6. Phân hệ Nhân sự HRBP & Quản trị Hệ thống (HRBP, User Admin, IT System Admin)</h2>
<ul>
  <li><strong>HRBP (Human Resource Business Partner — <code>Dang Thanh Mai</code>)</strong>: Giám sát chỉ số tuân thủ đào tạo theo vùng/khối, phát hiện khoảng cách kỹ năng (Skill Gap) của từng bộ phận để phối hợp cùng L&D xây dựng lộ trình kế nhiệm (Succession Pipeline).</li>
  <li><strong>User Admin (Quản trị Nhân sự / Cây Tổ chức — <code>Le Thi Mai</code>)</strong>: Quản lý danh bạ 100+ nhân viên, cập nhật cây cơ cấu tổ chức 2 nhánh Head Office và Chi nhánh Siêu thị, quản lý chức danh và thâm niên.</li>
  <li><strong>System Admin IT (Quản trị Kỹ thuật — <code>Tran Quoc Bao</code>)</strong>: Giám sát toàn bộ hạ tầng kỹ thuật, nhật ký bảo mật (Security Audit Logs), trạng thái tích hợp HRIS Sync, cấu hình phân quyền RBAC và chính sách mật khẩu.</li>
</ul>

<div class="page-break"></div>

<!-- SECTION 7 -->
<h1>7. YÊU CẦU PHI CHỨC NĂNG (NFR) & KẾ HOẠCH BÀN GIAO</h1>

<h2>7.1. Yêu cầu Phi Chức năng Cốt lõi (Non-Functional Requirements)</h2>
<ul>
  <li><strong>NFR-PERF-001 (Thời gian phản hồi)</strong>: $95\%$ truy vấn API có thời gian phản hồi dưới <strong>$200\text{ms}$</strong> trong điều kiện mạng tiêu chuẩn.</li>
  <li><strong>NFR-PERF-002 (Khả năng chịu tải đồng thời)</strong>: Hệ thống đáp ứng tối thiểu <strong>$2,000$ người dùng đồng thời (CCU)</strong> trong các kỳ thi sát hạch chứng chỉ toàn quốc.</li>
  <li><strong>NFR-SEC-001 (Bảo mật & Mã hóa)</strong>: Toàn bộ kết nối mã hóa qua TLS 1.3 (HTTPS). Dữ liệu nhạy cảm mã hóa AES-256.</li>
  <li><strong>NFR-SEC-002 (Kiểm soát RBAC & Chống IDOR)</strong>: Phân quyền đa tầng tại Router và Backend Interceptor, chặn tuyệt đối truy cập trái phép giữa các Quản lý khác phòng ban.</li>
  <li><strong>NFR-AVAIL-001 (Tính sẵn sàng SLA)</strong>: Cam kết thời gian hoạt động liên tục đạt tối thiểu <strong>$99.9\%$</strong>. Sao lưu gia tăng mỗi 1 giờ, sao lưu toàn phần mỗi 24 giờ.</li>
</ul>

<h2>7.2. Kế hoạch Lộ trình Triển khai (Release Roadmap)</h2>
<table>
  <thead>
    <tr>
      <th style="width:18%;">Giai đoạn</th>
      <th style="width:28%;">Nội dung Trọng tâm</th>
      <th style="width:24%;">Thời gian Dự kiến</th>
      <th>Trạng thái Thực tế</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Giai đoạn 1</strong></td>
      <td>Thiết kế Kiến trúc, UI Mockup, Đặc tả SRS/FSD & Hướng dẫn Sử dụng</td>
      <td>01/06/2026 – 24/08/2026</td>
      <td><span class="badge badge-green">✓ HOÀN TẤT 100%</span></td>
    </tr>
    <tr>
      <td><strong>Giai đoạn 2</strong></td>
      <td>Phát triển Microservices Backend, Assessment & HRIS Sync</td>
      <td>25/08/2026 – 15/11/2026</td>
      <td><span class="badge badge-blue">Đang khởi động</span></td>
    </tr>
    <tr>
      <td><strong>Giai đoạn 3</strong></td>
      <td>Động cơ AI Hub (RAG Search, AI Tutor) & Kiểm toán ROI</td>
      <td>15/11/2026 – 31/12/2026</td>
      <td><span class="badge badge-slate">Kế hoạch</span></td>
    </tr>
    <tr>
      <td><strong>Giai đoạn 4</strong></td>
      <td>Kiểm thử Tải, Thí điểm 3 Siêu thị Miền Nam & Go-Live Toàn quốc</td>
      <td>02/01/2027 – 15/03/2027</td>
      <td><span class="badge badge-slate">Kế hoạch</span></td>
    </tr>
  </tbody>
</table>

<div style="margin-top: 24px; padding: 12px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; font-size: 11px; color: #166534;">
  <strong>XÁC NHẬN ĐẶC TẢ TOÀN DIỆN & HƯỚNG DẪN SỬ DỤNG (FULL FSD & USER GUIDE VERIFIED):</strong><br>
  Tài liệu phiên bản V7.0 đã tích hợp hoàn chỉnh toàn bộ Hướng dẫn Thao tác Từng Màn hình (Screen-by-Screen User Guide), 
  mô tả chi tiết từng nút bấm, luồng nghiệp vụ và kết quả phản hồi của từng phân hệ trên ứng dụng web MM MegaLearn.
</div>

</body>
</html>
`;

const htmlPath = path.join(__dirname, 'docs', 'MM_MEGALEARN_SPECIFICATION.html');
const pdfPath = path.join(__dirname, 'MM_MEGALEARN_SRS_FSD_SPECIFICATION.pdf');
const pdfDocsPath = path.join(__dirname, 'docs', 'MM_MEGALEARN_SRS_FSD_SPECIFICATION.pdf');

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('HTML written successfully to:', htmlPath);

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let browserPath = fs.existsSync(chromePath) ? chromePath : edgePath;

console.log('Using browser at:', browserPath);

const cmd = `"${browserPath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" --no-pdf-header-footer "${htmlPath}"`;
console.log('Running print-to-pdf command...');
execSync(cmd, { stdio: 'inherit' });

if (fs.existsSync(pdfPath)) {
  fs.copyFileSync(pdfPath, pdfDocsPath);
  const stats = fs.statSync(pdfPath);
  console.log(`\n=== SUCCESS ===\nPDF generated successfully!`);
  console.log(`File: ${pdfPath}`);
  console.log(`Size: ${(stats.size / 1024).toFixed(1)} KB`);
} else {
  console.error('Failed to generate PDF');
  process.exit(1);
}
