import React, { useState, useMemo, useRef } from 'react';
import { COURSE_IMAGE_PRESETS, getCourseImage } from '../../data/courseImages';
import { Badge, Button } from './ui';

const CATEGORY_TABS = [
  { id: 'ALL', label: 'Tất Cả Ảnh Mẫu', icon: 'ti-layout-grid' },
  { id: 'Food Safety & Hygiene', label: '🥩 Vệ Sinh & HACCP', icon: 'ti-meat' },
  { id: 'Cold Chain', label: '❄️ Chuỗi Lạnh & Kho Mát', icon: 'ti-snowflake' },
  { id: 'Store Operations', label: '🏪 Vận Hành Siêu Thị', icon: 'ti-building-store' },
  { id: 'Information Security', label: '🔒 Bảo Mật Thông Tin', icon: 'ti-shield-lock' },
  { id: 'Supply Chain & Logistics', label: '🚚 Chuỗi Cung Ứng', icon: 'ti-truck' },
  { id: 'Leadership & Management', label: '👥 Lãnh Đạo & Quản Trị', icon: 'ti-users' },
  { id: 'Health & Safety', label: '🧯 PCCC & An Toàn HSE', icon: 'ti-flame' },
  { id: 'Corporate Governance', label: '🌱 Văn Hóa & ESG', icon: 'ti-certificate' },
];

export default function CourseImagePickerStudio({
  imageUrl = '',
  onChange,
  courseTitle = '',
  courseCode = '',
  courseCategory = '',
  courseType = 'MANDATORY',
  estimatedHours = '2.0h',
}) {
  const [activeSourceTab, setActiveSourceTab] = useState('GALLERY'); // 'GALLERY' | 'UPLOAD' | 'URL'
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [previewMode, setPreviewMode] = useState('CATALOG'); // 'CATALOG' | 'ROADMAP' | 'HERO'
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState(imageUrl || '');
  const [suggestNotice, setSuggestNotice] = useState('');
  const fileInputRef = useRef(null);

  // Sync internal url state if prop changes
  React.useEffect(() => {
    setUrlInput(imageUrl || '');
  }, [imageUrl]);

  // Filter presets by sub-category
  const filteredPresets = useMemo(() => {
    if (selectedCategory === 'ALL') return COURSE_IMAGE_PRESETS;
    return COURSE_IMAGE_PRESETS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  // Smart AI Auto-suggest preset based on title/category
  function handleSmartSuggest() {
    const query = `${courseTitle} ${courseCategory}`.toLowerCase();
    let bestMatch = null;

    if (query.includes('haccp') || query.includes('vệ sinh') || query.includes('thực phẩm') || query.includes('bánh') || query.includes('thịt') || query.includes('cá')) {
      bestMatch = COURSE_IMAGE_PRESETS.find((p) => p.id === 'fsh-haccp' || p.id === 'fsh-kitchen' || p.id === 'fsh-bakery');
    } else if (query.includes('lạnh') || query.includes('cold') || query.includes('sữa') || query.includes('mát')) {
      bestMatch = COURSE_IMAGE_PRESETS.find((p) => p.id === 'cold-warehouse' || p.id === 'cold-dairy');
    } else if (query.includes('pccc') || query.includes('cháy') || query.includes('an toàn') || query.includes('hse') || query.includes('bảo hộ')) {
      bestMatch = COURSE_IMAGE_PRESETS.find((p) => p.id === 'hse-drill' || p.id === 'hse-gear');
    } else if (query.includes('bảo mật') || query.includes('security') || query.includes('phishing') || query.includes('dữ liệu')) {
      bestMatch = COURSE_IMAGE_PRESETS.find((p) => p.id === 'sec-shield' || p.id === 'sec-code');
    } else if (query.includes('xe nâng') || query.includes('logistics') || query.includes('kho') || query.includes('giao hàng')) {
      bestMatch = COURSE_IMAGE_PRESETS.find((p) => p.id === 'scm-forklift' || p.id === 'scm-fleet');
    } else if (query.includes('lãnh đạo') || query.includes('lead') || query.includes('quản lý') || query.includes('coaching') || query.includes('họp')) {
      bestMatch = COURSE_IMAGE_PRESETS.find((p) => p.id === 'lead-meeting' || p.id === 'lead-teamwork');
    } else if (query.includes('thu ngân') || query.includes('pos') || query.includes('quầy') || query.includes('trưng bày') || query.includes('khách hàng')) {
      bestMatch = COURSE_IMAGE_PRESETS.find((p) => p.id === 'store-shelves' || p.id === 'store-pos' || p.id === 'store-customer');
    }

    if (!bestMatch) {
      bestMatch = COURSE_IMAGE_PRESETS[0];
    }

    if (bestMatch) {
      onChange(bestMatch.url);
      setUrlInput(bestMatch.url);
      setSuggestNotice(`✨ Đã tự động chọn ảnh: "${bestMatch.label}" phù hợp với chuyên đề`);
      setTimeout(() => setSuggestNotice(''), 4000);
    }
  }

  // Handle local file upload via FileReader
  function handleFileSelect(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      onChange(dataUrl);
      setUrlInput(dataUrl);
      setSuggestNotice(`✓ Đã tải ảnh lên từ thiết bị: ${file.name}`);
      setTimeout(() => setSuggestNotice(''), 4000);
    };
    reader.readAsDataURL(file);
  }

  const effectiveImage = imageUrl || getCourseImage({ title: courseTitle, category: courseCategory, domain: courseCategory });

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--line)', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
      {/* 1. STUDIO HEADER */}
      <div
        style={{
          padding: '14px 18px',
          background: '#F8FAFC',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-photo-edit" style={{ fontSize: 18 }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
              Hình Ảnh Đại Diện Khóa Học &amp; Mốc Lộ Trình (Course Visual Studio)
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
              Tối ưu chuẩn 16:9 cho Thẻ bài giảng &amp; Vòng tròn 1:1 cho Lộ trình cấp bậc (Roadmap)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, borderColor: 'var(--blue)', color: 'var(--blue)', background: '#EFF6FF' }}
            onClick={handleSmartSuggest}
            title="Tự động chọn ảnh phù hợp theo tên khóa học"
          >
            <i className="ti ti-sparkles" />
            <span>AI Gợi Ý Ảnh Phù Hợp</span>
          </button>
          {imageUrl && (
            <Button
              size="sm"
              variant="ghost"
              icon="ti-trash"
              onClick={() => {
                onChange('');
                setUrlInput('');
              }}
              style={{ color: 'var(--rust)' }}
              title="Xóa ảnh tùy chỉnh, sử dụng ảnh mặc định"
            >
              Xóa Ảnh
            </Button>
          )}
        </div>
      </div>

      {suggestNotice && (
        <div style={{ padding: '8px 18px', background: '#ECFDF5', color: '#065F46', fontSize: 12, fontWeight: 600, borderBottom: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-circle-check" />
          {suggestNotice}
        </div>
      )}

      {/* 2. MAIN 2-COLUMN STUDIO LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(300px, 1fr)', gap: 0 }}>
        {/* LEFT COLUMN: SOURCE & PICKER TABS */}
        <div style={{ padding: '16px', borderRight: '1px solid var(--line)' }}>
          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, background: 'var(--paper-sunken)', padding: 4, borderRadius: 8 }}>
            {[
              { id: 'GALLERY', label: 'Thư Viện Ảnh MMVN', icon: 'ti-library-photo' },
              { id: 'UPLOAD', label: 'Tải Lên Từ Máy', icon: 'ti-cloud-upload' },
              { id: 'URL', label: 'Nhập Link Ảnh', icon: 'ti-link' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSourceTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: activeSourceTab === tab.id ? '#fff' : 'transparent',
                  color: activeSourceTab === tab.id ? 'var(--blue)' : 'var(--ink-soft)',
                  fontWeight: activeSourceTab === tab.id ? 700 : 500,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  boxShadow: activeSourceTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <i className={`ti ${tab.icon}`} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: MMVN CURATED GALLERY */}
          {activeSourceTab === 'GALLERY' && (
            <div>
              {/* Category Pills Filter */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 12 }}>
                {CATEGORY_TABS.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: selectedCategory === cat.id ? 700 : 500,
                      border: selectedCategory === cat.id ? '1px solid var(--blue)' : '1px solid var(--line)',
                      background: selectedCategory === cat.id ? '#EFF6FF' : '#fff',
                      color: selectedCategory === cat.id ? 'var(--blue)' : 'var(--ink-soft)',
                      cursor: 'pointer',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Presets Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, maxHeight: 250, overflowY: 'auto', paddingRight: 4 }}>
                {filteredPresets.map((preset) => {
                  const isSelected = imageUrl === preset.url;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        onChange(preset.url);
                        setUrlInput(preset.url);
                      }}
                      style={{
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: isSelected ? '2.5px solid var(--blue)' : '1px solid var(--line)',
                        background: isSelected ? '#EFF6FF' : '#fff',
                        cursor: 'pointer',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        position: 'relative',
                        boxShadow: isSelected ? '0 0 0 1px var(--blue)' : 'none',
                      }}
                      title={preset.label}
                    >
                      <div style={{ position: 'relative', width: '100%', height: 74, overflow: 'hidden' }}>
                        <img
                          src={preset.url}
                          alt={preset.label}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {isSelected && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              background: 'var(--blue)',
                              color: '#fff',
                              borderRadius: '50%',
                              width: 20,
                              height: 20,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 900,
                            }}
                          >
                            ✓
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '6px 8px' }}>
                        <div
                          style={{
                            fontSize: 10.5,
                            fontWeight: isSelected ? 700 : 600,
                            color: isSelected ? 'var(--blue)' : 'var(--ink)',
                            lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {preset.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: DEVICE UPLOAD (DRAG & DROP) */}
          {activeSourceTab === 'UPLOAD' && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/png, image/jpeg, image/webp, image/jpg"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                style={{
                  border: dragOver ? '2px dashed var(--blue)' : '2px dashed var(--line-strong, #CBD5E1)',
                  background: dragOver ? '#EFF6FF' : '#F8FAFC',
                  borderRadius: 10,
                  padding: '32px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#EFF6FF',
                    color: 'var(--blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    fontSize: 22,
                  }}
                >
                  <i className="ti ti-cloud-upload" />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  Kéo thả tệp ảnh vào đây hoặc bấm để chọn
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                  Hỗ trợ JPG, PNG, WEBP &middot; Tối đa 5 MB &middot; Tỉ lệ khuyến nghị 16:9 (1200 x 675 px)
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  style={{ marginTop: 14, fontSize: 12 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current && fileInputRef.current.click();
                  }}
                >
                  <i className="ti ti-folder-open" /> Chọn Tệp Từ Máy
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DIRECT IMAGE URL */}
          {activeSourceTab === 'URL' && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 6 }}>
                ĐƯỜNG DẪN ẢNH (IMAGE URL)
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  className="field-input"
                  placeholder="https://images.unsplash.com/... hoặc link ảnh nội bộ"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    onChange(e.target.value);
                  }}
                  style={{ fontSize: 12.5, height: 38 }}
                />
                {urlInput && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="ti-x"
                    onClick={() => {
                      setUrlInput('');
                      onChange('');
                    }}
                    title="Xóa link"
                  />
                )}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
                Bạn có thể copy &amp; paste bất kỳ đường dẫn ảnh HTTPS trực tiếp từ kho lưu trữ Unsplash, Cloudinary hoặc máy chủ Media nội bộ MMVN.
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LIVE REALISTIC MULTI-DEVICE PREVIEW STUDIO */}
        <div style={{ padding: '16px', background: '#FAFBFD', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-device-laptop" style={{ color: 'var(--sage)' }} />
                Xem Trước Hiển Thị Thực Tế
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { id: 'CATALOG', label: 'Thẻ Bài Giảng', icon: 'ti-layout-grid' },
                  { id: 'ROADMAP', label: 'Mốc Lộ Trình', icon: 'ti-stairs-up' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPreviewMode(mode.id)}
                    style={{
                      fontSize: 10.5,
                      fontWeight: previewMode === mode.id ? 700 : 500,
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: 'none',
                      background: previewMode === mode.id ? 'var(--rail)' : 'transparent',
                      color: previewMode === mode.id ? '#fff' : 'var(--ink-soft)',
                      cursor: 'pointer',
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PREVIEW MODE 1: CATALOG CARD */}
            {previewMode === 'CATALOG' && (
              <div style={{ maxWidth: 260, margin: '0 auto', background: '#fff', borderRadius: 10, border: '1px solid var(--line)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ position: 'relative', width: '100%', height: 120, overflow: 'hidden', background: '#E2E8F0' }}>
                  <img
                    src={effectiveImage}
                    alt="Course Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: 8, left: 8 }}>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: courseType === 'MANDATORY' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 91, 170, 0.9)',
                        color: '#fff',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {courseType === 'MANDATORY' ? 'BẮT BUỘC' : 'TỰ CHỌN'}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                    {courseCode || 'MMVN-CRS-001'} &middot; {estimatedHours}
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: 'var(--ink)',
                      marginTop: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.3,
                    }}
                  >
                    {courseTitle || 'Tên Khóa Học Mẫu'}
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW MODE 2: ROADMAP MILESTONE NODE */}
            {previewMode === 'ROADMAP' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '3.5px solid var(--blue)',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                      background: '#fff',
                    }}
                  >
                    <img
                      src={effectiveImage}
                      alt="Roadmap Node"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -4,
                      right: -4,
                      background: 'var(--sage)',
                      color: '#fff',
                      borderRadius: '50%',
                      width: 22,
                      height: 22,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      border: '2px solid #fff',
                    }}
                  >
                    <i className="ti ti-check" />
                  </div>
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)', textAlign: 'center', maxWidth: 180 }}>
                  {courseTitle || 'Chặng Lộ Trình Cấp Bậc'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink-soft)', marginTop: 2 }}>
                  Mốc năng lực hoàn thành
                </div>
              </div>
            )}
          </div>

          <div style={{ fontSize: 11, color: 'var(--ink-faint)', textAlign: 'center', marginTop: 10, borderTop: '1px dashed var(--line)', paddingTop: 8 }}>
            ✓ Tự động căn chỉnh độ nét cao trên mọi màn hình
          </div>
        </div>
      </div>
    </div>
  );
}
