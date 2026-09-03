import React, { useState, useMemo } from 'react';
import { useCourseStore } from '../../store/CourseStore';
import { Badge, Button } from './ui';

export default function OrgHierarchyBrowser() {
  const {
    businessUnits = [{ id: 'bu-mmvn', code: 'MMVN', name: 'MM Mega Market Vietnam' }],
    addBusinessUnit,
    updateBusinessUnit,
    deleteBusinessUnit,
    divisions = [],
    addDivision,
    updateDivision,
    deleteDivision,
    departments = [],
    addDepartment,
    updateDepartment,
    deleteDepartment,
    subDepartments = [],
    addSubDepartment,
    updateSubDepartment,
    deleteSubDepartment,
  } = useCourseStore();

  const [selectedBuId, setSelectedBuId] = useState('ALL');
  const [activeBranchFilter, setActiveBranchFilter] = useState('ALL'); // ALL | SUPPORTING | OPERATIONS
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDivisionId, setExpandedDivisionId] = useState(null);
  const [expandedDeptId, setExpandedDeptId] = useState(null);

  // Modals
  const [buModal, setBuModal] = useState({ isOpen: false, mode: 'ADD', data: null });
  const [buForm, setBuForm] = useState({ code: '', name: '', description: '' });

  const [divModal, setDivModal] = useState({ isOpen: false, mode: 'ADD', data: null });
  const [divForm, setDivForm] = useState({ code: '', name: '', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING' });

  const [deptModal, setDeptModal] = useState({ isOpen: false, mode: 'ADD', data: null, divisionId: null });
  const [deptForm, setDeptForm] = useState({ code: '', name: '' });

  const [subDeptModal, setSubDeptModal] = useState({ isOpen: false, mode: 'ADD', data: null, departmentId: null });
  const [subDeptForm, setSubDeptForm] = useState({ code: '', name: '' });

  // Bulk import of the org tree (Division -> Department -> Sub-Department) from a file
  const [importModal, setImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [parsedOrgRows, setParsedOrgRows] = useState([]);
  const [importFeedback, setImportFeedback] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: '', id: null, title: '', message: '' });

  // Filtered Divisions
  const filteredDivisions = useMemo(() => {
    return divisions.filter((div) => {
      if (selectedBuId !== 'ALL' && div.businessUnitId && div.businessUnitId !== selectedBuId) {
        return false;
      }
      if (activeBranchFilter !== 'ALL') {
        const isOps = div.branch === 'OPERATIONS' || (!div.branch && !isNaN(parseInt(div.code?.charAt(0))));
        if (activeBranchFilter === 'OPERATIONS' && !isOps) return false;
        if (activeBranchFilter === 'SUPPORTING' && isOps) return false;
      }
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchDiv = (div.name || '').toLowerCase().includes(term) || (div.code || '').toLowerCase().includes(term);
      if (matchDiv) return true;

      const depts = departments.filter((d) => d.divisionId === div.id);
      const matchDept = depts.some((d) =>
        (d.name || '').toLowerCase().includes(term) || (d.code || '').toLowerCase().includes(term)
      );
      if (matchDept) return true;

      const matchSub = subDepartments.some((s) => {
        const dept = depts.find((d) => d.id === s.departmentId);
        if (!dept) return false;
        return (s.name || '').toLowerCase().includes(term) || (s.code || '').toLowerCase().includes(term);
      });
      return matchSub;
    });
  }, [divisions, selectedBuId, activeBranchFilter, searchTerm, departments, subDepartments]);

  const supportingDivisions = useMemo(() => {
    return filteredDivisions.filter((d) => d.branch === 'SUPPORTING' || (!d.branch && isNaN(parseInt(d.code?.charAt(0)))));
  }, [filteredDivisions]);

  const operationsDivisions = useMemo(() => {
    return filteredDivisions.filter((d) => d.branch === 'OPERATIONS' || (!d.branch && !isNaN(parseInt(d.code?.charAt(0)))));
  }, [filteredDivisions]);

  function toggleDivision(id) {
    setExpandedDivisionId((cur) => (cur === id ? null : id));
  }
  function toggleDepartment(id) {
    setExpandedDeptId((cur) => (cur === id ? null : id));
  }

  // BU Handlers
  function handleOpenAddBu() {
    setBuForm({ code: '', name: '', description: '' });
    setBuModal({ isOpen: true, mode: 'ADD', data: null });
  }
  function handleOpenEditBu(bu) {
    setBuForm({ code: bu.code, name: bu.name, description: bu.description || '' });
    setBuModal({ isOpen: true, mode: 'EDIT', data: bu });
  }
  function handleSaveBuSubmit(e) {
    e.preventDefault();
    if (!buForm.code.trim() || !buForm.name.trim()) return;
    if (buModal.mode === 'ADD') {
      addBusinessUnit(buForm);
    } else if (buModal.data) {
      updateBusinessUnit(buModal.data.id, buForm);
    }
    setBuModal({ isOpen: false, mode: 'ADD', data: null });
  }

  // Division Handlers
  function handleOpenAddDiv() {
    setDivForm({ code: '', name: '', businessUnitId: selectedBuId !== 'ALL' ? selectedBuId : 'bu-mmvn', branch: 'SUPPORTING' });
    setDivModal({ isOpen: true, mode: 'ADD', data: null });
  }
  function handleOpenEditDiv(div) {
    setDivForm({ code: div.code, name: div.name, businessUnitId: div.businessUnitId || 'bu-mmvn', branch: div.branch || 'SUPPORTING' });
    setDivModal({ isOpen: true, mode: 'EDIT', data: div });
  }
  function handleSaveDivSubmit(e) {
    e.preventDefault();
    if (!divForm.code.trim() || !divForm.name.trim()) return;
    if (divModal.mode === 'ADD') {
      addDivision(divForm);
    } else if (divModal.data) {
      updateDivision(divModal.data.id, divForm);
    }
    setDivModal({ isOpen: false, mode: 'ADD', data: null });
  }

  // Department Handlers
  function handleOpenAddDept(divId) {
    setDeptForm({ code: '', name: '' });
    setDeptModal({ isOpen: true, mode: 'ADD', data: null, divisionId: divId });
  }
  function handleOpenEditDept(dept) {
    setDeptForm({ code: dept.code, name: dept.name });
    setDeptModal({ isOpen: true, mode: 'EDIT', data: dept, divisionId: dept.divisionId });
  }
  function handleSaveDeptSubmit(e) {
    e.preventDefault();
    if (!deptForm.code.trim() || !deptForm.name.trim()) return;
    if (deptModal.mode === 'ADD') {
      addDepartment({ ...deptForm, divisionId: deptModal.divisionId });
    } else if (deptModal.data) {
      updateDepartment(deptModal.data.id, deptForm);
    }
    setDeptModal({ isOpen: false, mode: 'ADD', data: null, divisionId: null });
  }

  // Sub-Department Handlers
  function handleOpenAddSubDept(deptId) {
    setSubDeptForm({ code: '', name: '' });
    setSubDeptModal({ isOpen: true, mode: 'ADD', data: null, departmentId: deptId });
  }
  function handleOpenEditSubDept(sub) {
    setSubDeptForm({ code: sub.code, name: sub.name });
    setSubDeptModal({ isOpen: true, mode: 'EDIT', data: sub, departmentId: sub.departmentId });
  }
  function handleSaveSubDeptSubmit(e) {
    e.preventDefault();
    if (!subDeptForm.code.trim() || !subDeptForm.name.trim()) return;
    if (subDeptModal.mode === 'ADD') {
      addSubDepartment({ ...subDeptForm, departmentId: subDeptModal.departmentId });
    } else if (subDeptModal.data) {
      updateSubDepartment(subDeptModal.data.id, subDeptForm);
    }
    setSubDeptModal({ isOpen: false, mode: 'ADD', data: null, departmentId: null });
  }

  // Bulk Org Import Handlers
  function handleOpenImportModal() {
    setImportText('');
    setParsedOrgRows([]);
    setImportFeedback(null);
    setImportModal(true);
  }

  function handleDownloadOrgTemplate() {
    const header = 'Division Code,Division Name,Branch (SUPPORTING/OPERATIONS),Department Code,Department Name,Sub-Department Code,Sub-Department Name\n';
    const sampleRows = [
      'CDD,Corporate Development,SUPPORTING,,,,',
      '1018_QN,MM Quy Nhon,OPERATIONS,CS_ST,Customer Service,SUB-FO,Front Office',
      '1018_QN,MM Quy Nhon,OPERATIONS,FF_ST,Fresh Food,,',
    ].join('\n');
    const blob = new Blob([header + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_import_org_structure.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleOrgFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result || '';
      setImportText(text);
      parseOrgImportContent(text);
    };
    reader.readAsText(file);
  }

  // One row = one org path (Division, optionally its Department, optionally its Sub-Department).
  // The same Division/Department code can repeat across rows to add several children under it.
  function parseOrgImportContent(raw) {
    if (!raw.trim()) {
      setParsedOrgRows([]);
      return;
    }

    const trimmed = raw.trim();
    let rows = [];
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        rows = list.map((r) => ({
          divisionCode: r.divisionCode || r.divCode || '',
          divisionName: r.divisionName || r.divName || '',
          branch: (r.branch || 'SUPPORTING').toUpperCase(),
          departmentCode: r.departmentCode || r.deptCode || '',
          departmentName: r.departmentName || r.deptName || '',
          subDepartmentCode: r.subDepartmentCode || r.subDeptCode || '',
          subDepartmentName: r.subDepartmentName || r.subDeptName || '',
        }));
      } catch (err) {
        rows = [];
      }
    } else {
      const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const firstLine = (lines[0] || '').toLowerCase();
      const hasHeader = firstLine.includes('division') || firstLine.includes('code');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      rows = dataLines.map((line) => {
        const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        return {
          divisionCode: cols[0] || '',
          divisionName: cols[1] || '',
          branch: (cols[2] || 'SUPPORTING').toUpperCase(),
          departmentCode: cols[3] || '',
          departmentName: cols[4] || '',
          subDepartmentCode: cols[5] || '',
          subDepartmentName: cols[6] || '',
        };
      });
    }

    // Preview against the org tree as it stands right now, so the admin sees what is
    // actually new before committing — the real import re-checks this at execution time,
    // since two rows in the same file may introduce the same new Division/Department.
    const seenDivisionCodes = new Set();
    const seenDeptKeys = new Set();
    const preview = rows
      .filter((r) => r.divisionCode.trim())
      .map((r) => {
        const divKey = r.divisionCode.toLowerCase();
        const deptKey = `${divKey}::${r.departmentCode.toLowerCase()}`;
        const divisionExists = divisions.some((d) => d.code?.toLowerCase() === divKey) || seenDivisionCodes.has(divKey);
        const departmentExists = !r.departmentCode.trim() || departments.some(
          (d) => d.code?.toLowerCase() === r.departmentCode.toLowerCase()
            && divisions.find((div) => div.id === d.divisionId)?.code?.toLowerCase() === divKey
        ) || seenDeptKeys.has(deptKey);
        seenDivisionCodes.add(divKey);
        if (r.departmentCode.trim()) seenDeptKeys.add(deptKey);

        const actions = [];
        actions.push(divisionExists ? 'Existing Division' : 'New Division');
        if (r.departmentCode.trim()) actions.push(departmentExists ? 'Existing Department' : 'New Department');
        if (r.subDepartmentCode.trim()) actions.push('New Sub-Department');

        return { ...r, actionSummary: actions.join(' + ') };
      });

    setParsedOrgRows(preview);
  }

  function handleExecuteOrgImport() {
    if (parsedOrgRows.length === 0) return;

    // Local working copies so 2 rows sharing the same new Division/Department in this same
    // file resolve to the one record just created, instead of creating it twice.
    const workingDivisions = [...divisions];
    const workingDepartments = [...departments];
    let createdDivisions = 0;
    let createdDepartments = 0;
    let createdSubDepartments = 0;

    parsedOrgRows.forEach((row) => {
      let division = workingDivisions.find((d) => d.code?.toLowerCase() === row.divisionCode.toLowerCase());
      if (!division) {
        division = addDivision({
          code: row.divisionCode,
          name: row.divisionName || row.divisionCode,
          branch: row.branch === 'OPERATIONS' ? 'OPERATIONS' : 'SUPPORTING',
          businessUnitId: 'bu-mmvn',
        });
        workingDivisions.push(division);
        createdDivisions += 1;
      }

      if (!row.departmentCode.trim()) return;
      let department = workingDepartments.find(
        (d) => d.code?.toLowerCase() === row.departmentCode.toLowerCase() && d.divisionId === division.id
      );
      if (!department) {
        department = addDepartment({
          code: row.departmentCode,
          name: row.departmentName || row.departmentCode,
          divisionId: division.id,
        });
        workingDepartments.push(department);
        createdDepartments += 1;
      }

      if (!row.subDepartmentCode.trim()) return;
      addSubDepartment({
        code: row.subDepartmentCode,
        name: row.subDepartmentName || row.subDepartmentCode,
        departmentId: department.id,
      });
      createdSubDepartments += 1;
    });

    setImportFeedback(
      `Imported ${createdDivisions} division(s), ${createdDepartments} department(s) and ${createdSubDepartments} sub-department(s).`
    );
    setTimeout(() => {
      setImportFeedback(null);
      setImportModal(false);
      setImportText('');
      setParsedOrgRows([]);
    }, 1800);
  }

  // Delete Action Confirm
  function handleConfirmDelete() {
    const { type, id } = deleteConfirm;
    if (type === 'BU') deleteBusinessUnit(id);
    if (type === 'DIVISION') deleteDivision(id);
    if (type === 'DEPARTMENT') deleteDepartment(id);
    if (type === 'SUB_DEPARTMENT') deleteSubDepartment(id);
    setDeleteConfirm({ isOpen: false, type: '', id: null, title: '', message: '' });
  }

  // Render a division card
  function renderDivisionCard(div) {
    const depts = departments.filter((d) => d.divisionId === div.id);
    const isOpen = expandedDivisionId === div.id;
    const isOps = div.branch === 'OPERATIONS' || (!div.branch && !isNaN(parseInt(div.code?.charAt(0))));
    const hasDistinctCode = div.code && div.name && div.code !== div.name;

    return (
      <div
        key={div.id}
        style={{
          flexShrink: 0,
          minHeight: 'fit-content',
          border: isOpen ? '1px solid var(--blue)' : '1px solid var(--line)',
          borderRadius: 8,
          background: 'var(--paper-raised)',
          boxShadow: isOpen ? '0 2px 8px rgba(0, 91, 170, 0.08)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            background: isOpen ? (isOps ? 'var(--bigc-green-soft, #E6F7ED)' : 'var(--blue-soft, #E6F0FA)') : 'var(--paper-raised)',
            borderLeft: isOps ? '4px solid var(--bigc-green, #009E49)' : '4px solid var(--blue, #005BAA)',
            gap: 10,
          }}
        >
          {/* Left Title & Code */}
          <div
            onClick={() => toggleDivision(div.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                background: isOpen ? (isOps ? '#C6F6D5' : 'var(--blue-soft)') : 'var(--paper-sunken, #F1F5F9)',
                color: isOpen ? (isOps ? '#006830' : '#003E73') : 'var(--ink-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              <i className={`ti ${isOpen ? 'ti-chevron-down' : 'ti-chevron-right'}`} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
              {hasDistinctCode && (
                <span
                  style={{
                    background: isOps ? 'var(--bigc-green-soft, #E6F7ED)' : 'var(--blue-soft, #E6F0FA)',
                    color: isOps ? 'var(--bigc-green-soft-text, #006830)' : 'var(--blue-soft-text, #003E73)',
                    border: isOps ? '1px solid #BBF7D0' : '1px solid #BFDBFE',
                    padding: '1px 7px',
                    borderRadius: 4,
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {div.code}
                </span>
              )}
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.35 }}>
                {div.name}
              </span>
            </div>
          </div>

          {/* Right Counters & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span
              style={{
                background: depts.length > 0 ? (isOps ? 'var(--bigc-green-soft, #E6F7ED)' : 'var(--blue-soft, #E6F0FA)') : 'var(--paper-sunken, #F1F5F9)',
                color: depts.length > 0 ? (isOps ? 'var(--bigc-green-soft-text, #006830)' : 'var(--blue-soft-text, #003E73)') : 'var(--ink-faint)',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <i className="ti ti-folders" style={{ fontSize: 11 }} />
              {depts.length} departments
            </span>

            <button
              type="button"
              onClick={() => handleOpenEditDiv(div)}
              title="Edit Division"
              style={{
                background: 'var(--paper-sunken, #F8FAFC)',
                border: '1px solid var(--line)',
                cursor: 'pointer',
                color: 'var(--ink-soft)',
                padding: '4px 7px',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <i className="ti ti-edit" style={{ fontSize: 12 }} />
            </button>
            <button
              type="button"
              onClick={() =>
                setDeleteConfirm({
                  isOpen: true,
                  type: 'DIVISION',
                  id: div.id,
                  title: `Delete Division ${div.code}`,
                  message: `Are you sure you want to delete the Division "${div.name}"? Every Department and Sub-Department below it will be deleted too.`,
                })
              }
              title="Delete Division"
              style={{
                background: 'var(--rust-soft)',
                border: '1px solid #FECDD3',
                cursor: 'pointer',
                color: '#E11D48',
                padding: '4px 7px',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <i className="ti ti-trash" style={{ fontSize: 12 }} />
            </button>
          </div>
        </div>

        {/* Expanded Child Departments */}
        {isOpen && (
          <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8, background: '#FAFAFA', borderTop: '1px solid var(--line)' }}>
            {depts.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontStyle: 'italic', padding: '6px 4px' }}>
                This division has no departments yet.
              </div>
            ) : (
              depts.map((d) => {
                const subDepts = subDepartments.filter((s) => s.departmentId === d.id);
                const isDeptOpen = expandedDeptId === d.id;
                return (
                  <div
                    key={d.id}
                    style={{
                      border: isDeptOpen ? '1px solid var(--line-strong)' : '1px solid var(--line)',
                      borderRadius: 6,
                      background: 'var(--paper-raised)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '9px 12px',
                        background: isDeptOpen ? 'var(--paper-sunken, #F8FAFC)' : 'var(--paper-raised)',
                        gap: 8,
                      }}
                    >
                      <div
                        onClick={() => toggleDepartment(d.id)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          minWidth: 0,
                        }}
                      >
                        <i
                          className={`ti ${isDeptOpen ? 'ti-chevron-down' : 'ti-chevron-right'}`}
                          style={{ color: 'var(--ink-faint)', fontSize: 12, flexShrink: 0 }}
                        />
                        <span
                          style={{
                            background: 'var(--slate-soft)',
                            color: 'var(--ink-soft)',
                            border: '1px solid var(--line)',
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: 11,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {d.code}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                          {d.name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span
                          style={{
                            background: subDepts.length > 0 ? 'var(--blue-soft, #EFF6FF)' : 'var(--paper-sunken, #F8FAFC)',
                            color: subDepts.length > 0 ? 'var(--blue, #1D4ED8)' : 'var(--ink-faint)',
                            border: subDepts.length > 0 ? '1px solid #BFDBFE' : '1px solid var(--line)',
                            padding: '1px 7px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          <i className="ti ti-git-branch" style={{ fontSize: 10 }} />
                          {subDepts.length} sub-depts
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditDept(d)}
                          title="Edit Department"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', padding: '2px 4px' }}
                        >
                          <i className="ti ti-edit" style={{ fontSize: 12 }} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirm({
                              isOpen: true,
                              type: 'DEPARTMENT',
                              id: d.id,
                              title: `Delete Department ${d.code}`,
                              message: `Are you sure you want to delete the department "${d.name}"? Every Sub-Department below it will be deleted too.`,
                            })
                          }
                          title="Delete Department"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E11D48', padding: '2px 4px' }}
                        >
                          <i className="ti ti-trash" style={{ fontSize: 12 }} />
                        </button>
                      </div>
                    </div>

                    {/* Sub-departments container */}
                    {isDeptOpen && (
                      <div style={{ padding: '10px 12px 12px 24px', display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px dashed var(--line)', background: 'var(--paper-sunken)' }}>
                        {subDepts.length === 0 ? (
                          <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                            No child Sub-Department yet.
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
                            {subDepts.map((sub) => (
                              <div
                                key={sub.id}
                                style={{
                                  fontSize: 12,
                                  color: 'var(--ink)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '5px 8px',
                                  background: 'var(--paper-raised)',
                                  borderRadius: 4,
                                  border: '1px solid var(--line)',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                                  <i className="ti ti-corner-down-right" style={{ color: 'var(--blue)', fontSize: 12, flexShrink: 0 }} />
                                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, fontWeight: 700, color: 'var(--blue)', background: 'var(--blue-soft)', padding: '1px 4px', borderRadius: 3, flexShrink: 0 }}>
                                    {sub.code}
                                  </span>
                                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sub.name}>
                                    {sub.name}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditSubDept(sub)}
                                    title="Edit Sub-Dept"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', padding: '2px 3px' }}
                                  >
                                    <i className="ti ti-edit" style={{ fontSize: 11 }} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeleteConfirm({
                                        isOpen: true,
                                        type: 'SUB_DEPARTMENT',
                                        id: sub.id,
                                        title: `Delete Sub-Department ${sub.code}`,
                                        message: `Are you sure you want to delete the Sub-Department "${sub.name}"?`,
                                      })
                                    }
                                    title="Delete Sub-Dept"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E11D48', padding: '2px 3px' }}
                                  >
                                    <i className="ti ti-trash" style={{ fontSize: 11 }} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenAddSubDept(d.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--blue)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '4px 0 0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            alignSelf: 'flex-start',
                          }}
                        >
                          <i className="ti ti-plus" style={{ fontSize: 12 }} /> Add Sub-Department
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenAddDept(div.id)}
              style={{ alignSelf: 'flex-start', marginTop: 2, fontSize: 12 }}
            >
              <i className="ti ti-plus" style={{ marginRight: 4 }} /> Add Department
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Filter & Toolbar Card */}
      <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
          {/* BU selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>
              Business Unit (BU):
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setSelectedBuId('ALL')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: selectedBuId === 'ALL' ? '1px solid var(--blue)' : '1px solid var(--line)',
                  background: selectedBuId === 'ALL' ? 'var(--blue-soft)' : 'var(--paper-raised)',
                  color: selectedBuId === 'ALL' ? 'var(--blue)' : 'var(--ink-soft)',
                }}
              >
                All BU ({businessUnits.length})
              </button>
              {businessUnits.map((bu) => {
                const isSelected = selectedBuId === bu.id;
                return (
                  <div
                    key={bu.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: isSelected ? 'var(--blue-soft)' : 'var(--paper-sunken)',
                      border: isSelected ? '1px solid var(--blue)' : '1px solid var(--line)',
                      borderRadius: 20,
                      padding: '3px 8px 3px 12px',
                      gap: 6,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedBuId(bu.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: isSelected ? 'var(--blue)' : 'var(--ink)',
                        padding: 0,
                      }}
                    >
                      {bu.code} &middot; {bu.name}
                    </button>
                    <div style={{ display: 'inline-flex', gap: 2 }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditBu(bu)}
                        title="Edit BU"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: '2px 3px' }}
                      >
                        <i className="ti ti-edit" style={{ fontSize: 12 }} />
                      </button>
                      {businessUnits.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirm({
                              isOpen: true,
                              type: 'BU',
                              id: bu.id,
                              title: `Delete Business Unit ${bu.code}`,
                              message: `Are you sure you want to delete the BU "${bu.name}"? Every Division below it will be affected.`,
                            })
                          }
                          title="Delete BU"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E11D48', padding: '2px 3px' }}
                        >
                          <i className="ti ti-trash" style={{ fontSize: 12 }} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button size="sm" variant="outline" icon="ti-file-import" onClick={handleOpenImportModal}>
              Import File
            </Button>
            <Button size="sm" variant="ghost" icon="ti-plus" onClick={handleOpenAddBu}>
              Add BU
            </Button>
            <Button size="sm" variant="primary" icon="ti-plus" onClick={handleOpenAddDiv}>
              Add Division
            </Button>
          </div>
        </div>

        {/* Branch view tabs & search */}
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => setActiveBranchFilter('ALL')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: activeBranchFilter === 'ALL' ? '1px solid var(--blue)' : '1px solid var(--line)',
                background: activeBranchFilter === 'ALL' ? 'var(--blue)' : 'var(--paper-raised)',
                color: activeBranchFilter === 'ALL' ? '#fff' : 'var(--ink-soft)',
              }}
            >
              All Division ({divisions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveBranchFilter('SUPPORTING')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: activeBranchFilter === 'SUPPORTING' ? '1px solid var(--blue)' : '1px solid var(--line)',
                background: activeBranchFilter === 'SUPPORTING' ? 'var(--blue)' : 'var(--paper-raised)',
                color: activeBranchFilter === 'SUPPORTING' ? '#fff' : 'var(--ink-soft)',
              }}
            >
              🏢 Supporting Functions ({supportingDivisions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveBranchFilter('OPERATIONS')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: activeBranchFilter === 'OPERATIONS' ? '1px solid var(--bigc-green)' : '1px solid var(--line)',
                background: activeBranchFilter === 'OPERATIONS' ? 'var(--bigc-green)' : 'var(--paper-raised)',
                color: activeBranchFilter === 'OPERATIONS' ? '#fff' : 'var(--ink-soft)',
              }}
            >
              🛒 Store Operations ({operationsDivisions.length})
            </button>
          </div>

          <div style={{ position: 'relative', minWidth: 260, flex: 1, maxWidth: 420 }}>
            <i
              className="ti ti-search"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 14 }}
            />
            <input
              type="text"
              className="field-input"
              placeholder="Search by Division, Dept or Sub-Dept name/code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 34, paddingRight: searchTerm ? 32 : 12, height: 38, fontSize: 13, borderRadius: 8 }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14 }}
              >
                <i className="ti ti-x" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Division lists */}
      {activeBranchFilter === 'ALL' ? (
        <div className="grid grid-2" style={{ gap: 16, alignItems: 'start' }}>
          {/* SUPPORTING FUNCTIONS BRANCH */}
          <div className="card card-pad" style={{ background: 'var(--paper-raised)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-building" /> Supporting Functions ({supportingDivisions.length} Division)
              </div>
              <Badge tone="blue" size="sm">Head Office &amp; Functions</Badge>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '680px', overflowY: 'auto', paddingRight: 4 }}>
              {supportingDivisions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--ink-soft)', fontSize: 13 }}>
                  No matching support division found.
                </div>
              ) : (
                supportingDivisions.map(renderDivisionCard)
              )}
            </div>
          </div>

          {/* OPERATIONS BRANCH */}
          <div className="card card-pad" style={{ background: 'var(--paper-raised)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--bigc-green-soft-text, #006830)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-building-store" /> Operations ({operationsDivisions.length} Branches / Depots)
              </div>
              <Badge tone="sage" size="sm">Hypermarkets &amp; Depots</Badge>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '680px', overflowY: 'auto', paddingRight: 4 }}>
              {operationsDivisions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--ink-soft)', fontSize: 13 }}>
                  No matching branch/depot found.
                </div>
              ) : (
                operationsDivisions.map(renderDivisionCard)
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card card-pad" style={{ background: 'var(--paper-raised)' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', marginBottom: 12, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
            {activeBranchFilter === 'SUPPORTING' ? '🏢 Supporting Functions (Head Office)' : '🛒 Store Operations & Depot'} &middot; {filteredDivisions.length} Division
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredDivisions.map(renderDivisionCard)}
          </div>
        </div>
      )}

      {/* MODALS */}
      {buModal.isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 16,
          }}
          onClick={() => setBuModal({ isOpen: false, mode: 'ADD', data: null })}
        >
          <div
            className="card card-pad"
            style={{ width: '100%', maxWidth: 450, background: 'var(--paper-raised)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, color: 'var(--ink)' }}>
              {buModal.mode === 'ADD' ? 'Add New Business Unit' : `Edit BU ${buModal.data.code}`}
            </div>
            <form onSubmit={handleSaveBuSubmit}>
              <div style={{ marginBottom: 10 }}>
                <label className="field-label">BU Code *</label>
                <input
                  className="field-input"
                  placeholder="e.g. MMVN, MMTH..."
                  value={buForm.code}
                  onChange={(e) => setBuForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label className="field-label">Business Unit Name *</label>
                <input
                  className="field-input"
                  placeholder="e.g. MM Mega Market Vietnam"
                  value={buForm.name}
                  onChange={(e) => setBuForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="field-label">Description</label>
                <textarea
                  className="field-input"
                  rows={2}
                  placeholder="Describe the merchandise category..."
                  value={buForm.description}
                  onChange={(e) => setBuForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button variant="ghost" type="button" onClick={() => setBuModal({ isOpen: false, mode: 'ADD', data: null })}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  {buModal.mode === 'ADD' ? 'Create BU' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {divModal.isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 16,
          }}
          onClick={() => setDivModal({ isOpen: false, mode: 'ADD', data: null })}
        >
          <div
            className="card card-pad"
            style={{ width: '100%', maxWidth: 460, background: 'var(--paper-raised)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, color: 'var(--ink)' }}>
              {divModal.mode === 'ADD' ? 'Add New Division' : `Edit Division ${divModal.data.code}`}
            </div>
            <form onSubmit={handleSaveDivSubmit}>
              <div className="grid grid-2" style={{ gap: 10, marginBottom: 10 }}>
                <div>
                  <label className="field-label">Division Code *</label>
                  <input
                    className="field-input"
                    placeholder="e.g. 1010_AP, HRD, OMD..."
                    value={divForm.code}
                    onChange={(e) => setDivForm((p) => ({ ...p, code: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="field-label">Parent Branch *</label>
                  <select
                    className="field-select"
                    value={divForm.branch}
                    onChange={(e) => setDivForm((p) => ({ ...p, branch: e.target.value }))}
                  >
                    <option value="SUPPORTING">Supporting Functions (Head Office)</option>
                    <option value="OPERATIONS">Operations (Store / Depot)</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label className="field-label">Division Name *</label>
                <input
                  className="field-input"
                  placeholder="e.g. MM An Phu or Human Resources"
                  value={divForm.name}
                  onChange={(e) => setDivForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="field-label">Parent Business Unit</label>
                <select
                  className="field-select"
                  value={divForm.businessUnitId}
                  onChange={(e) => setDivForm((p) => ({ ...p, businessUnitId: e.target.value }))}
                >
                  {businessUnits.map((bu) => (
                    <option key={bu.id} value={bu.id}>
                      {bu.code} - {bu.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button variant="ghost" type="button" onClick={() => setDivModal({ isOpen: false, mode: 'ADD', data: null })}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  {divModal.mode === 'ADD' ? 'Create Division' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deptModal.isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 16,
          }}
          onClick={() => setDeptModal({ isOpen: false, mode: 'ADD', data: null, divisionId: null })}
        >
          <div
            className="card card-pad"
            style={{ width: '100%', maxWidth: 440, background: 'var(--paper-raised)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, color: 'var(--ink)' }}>
              {deptModal.mode === 'ADD' ? 'Add Department' : `Edit Department ${deptModal.data.code}`}
            </div>
            <form onSubmit={handleSaveDeptSubmit}>
              <div style={{ marginBottom: 10 }}>
                <label className="field-label">Department Code *</label>
                <input
                  className="field-input"
                  placeholder="e.g. FF_ST, HR_LOD, MCH_DF..."
                  value={deptForm.code}
                  onChange={(e) => setDeptForm((p) => ({ ...p, code: e.target.value }))}
                  required
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="field-label">Department Name *</label>
                <input
                  className="field-input"
                  placeholder="e.g. Fresh Food_ST, Learning & Org Dev..."
                  value={deptForm.name}
                  onChange={(e) => setDeptForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button variant="ghost" type="button" onClick={() => setDeptModal({ isOpen: false, mode: 'ADD', data: null, divisionId: null })}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  {deptModal.mode === 'ADD' ? 'Create Department' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {subDeptModal.isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 16,
          }}
          onClick={() => setSubDeptModal({ isOpen: false, mode: 'ADD', data: null, departmentId: null })}
        >
          <div
            className="card card-pad"
            style={{ width: '100%', maxWidth: 440, background: 'var(--paper-raised)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, color: 'var(--ink)' }}>
              {subDeptModal.mode === 'ADD' ? 'Add Sub-Department' : `Edit Sub-Department ${subDeptModal.data.code}`}
            </div>
            <form onSubmit={handleSaveSubDeptSubmit}>
              <div style={{ marginBottom: 10 }}>
                <label className="field-label">Sub-Department Code *</label>
                <input
                  className="field-input"
                  placeholder="e.g. SUB-BAKERY, SUB-SF-NL..."
                  value={subDeptForm.code}
                  onChange={(e) => setSubDeptForm((p) => ({ ...p, code: e.target.value }))}
                  required
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="field-label">Sub-Department Name *</label>
                <input
                  className="field-input"
                  placeholder="e.g. Bakery, SF National Learning..."
                  value={subDeptForm.name}
                  onChange={(e) => setSubDeptForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button variant="ghost" type="button" onClick={() => setSubDeptModal({ isOpen: false, mode: 'ADD', data: null, departmentId: null })}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  {subDeptModal.mode === 'ADD' ? 'Create Sub-Department' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 16,
          }}
          onClick={() => setImportModal(false)}
        >
          <div
            className="card card-pad"
            style={{ width: '100%', maxWidth: 820, maxHeight: '90vh', overflowY: 'auto', background: 'var(--paper-raised)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>📥 Import The Org Structure</div>
              <button type="button" onClick={() => setImportModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 18 }}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper-sunken)', padding: '12px 16px', borderRadius: 8, marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Download the CSV template</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>One row per org path: Division, its Department (optional) and its Sub-Department (optional). Repeat a Division/Department code across rows to add several children under it.</div>
              </div>
              <Button size="sm" variant="outline" icon="ti-download" onClick={handleDownloadOrgTemplate}>
                Download The CSV Template
              </Button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">Choose A File From Your Computer (.csv, .json)</label>
              <input
                type="file"
                accept=".csv,.json,.txt"
                className="field-input"
                onChange={handleOrgFileUpload}
                style={{ padding: '6px 10px' }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">Or Paste The CSV / JSON Data Directly</label>
              <textarea
                className="field-input"
                rows={4}
                placeholder="Division Code, Division Name, Branch, Department Code, Department Name, Sub-Department Code, Sub-Department Name..."
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  parseOrgImportContent(e.target.value);
                }}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
            </div>

            {parsedOrgRows.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)' }}>
                    🔍 Preview {parsedOrgRows.length} row(s)
                  </div>
                  <Badge tone="green" size="sm">Ready To Load</Badge>
                </div>
                <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 6 }}>
                  <table className="table" style={{ width: '100%', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Division</th>
                        <th>Department</th>
                        <th>Sub-Department</th>
                        <th>What happens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedOrgRows.map((row, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 700 }}>{row.divisionCode} — {row.divisionName || row.divisionCode}</td>
                          <td>{row.departmentCode ? `${row.departmentCode} — ${row.departmentName || row.departmentCode}` : '—'}</td>
                          <td>{row.subDepartmentCode ? `${row.subDepartmentCode} — ${row.subDepartmentName || row.subDepartmentCode}` : '—'}</td>
                          <td style={{ color: 'var(--ink-soft)' }}>{row.actionSummary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importFeedback && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--sage-soft)', color: '#047857', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
                <i className="ti ti-check" style={{ marginRight: 6 }} />{importFeedback}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" type="button" onClick={() => setImportModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                icon="ti-bolt"
                disabled={parsedOrgRows.length === 0}
                onClick={handleExecuteOrgImport}
              >
                Confirm Loading {parsedOrgRows.length} Row(s)
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm.isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: 16,
          }}
          onClick={() => setDeleteConfirm({ isOpen: false, type: '', id: null, title: '', message: '' })}
        >
          <div
            className="card card-pad"
            style={{ width: '100%', maxWidth: 420, background: 'var(--paper-raised)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, color: '#E11D48' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 24 }} />
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{deleteConfirm.title}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 16px', lineHeight: 1.5 }}>
              {deleteConfirm.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" type="button" onClick={() => setDeleteConfirm({ isOpen: false, type: '', id: null, title: '', message: '' })}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="button"
                style={{ background: '#E11D48', borderColor: '#E11D48' }}
                onClick={handleConfirmDelete}
              >
                Confirm Deletion
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
