import React, { useState } from 'react';
import {
  divisions, departments, subDepartments, operationsAreas, storeTypes, clusters, retailStores,
  storeDepartments, storeSections,
} from '../data/mockData';
import { Badge, Button } from './ui';

function storeTypeFor(typeId) {
  return storeTypes.find((t) => t.id === typeId);
}

export default function OrgHierarchyBrowser() {
  const [expandedDivisionId, setExpandedDivisionId] = useState(null);
  const [expandedDeptId, setExpandedDeptId] = useState(null);
  const [expandedAreaId, setExpandedAreaId] = useState(null);
  const [expandedClusterId, setExpandedClusterId] = useState(null);

  const [localDepartments, setLocalDepartments] = useState(departments);
  const [localSubDepartments, setLocalSubDepartments] = useState(subDepartments);
  const [localStores, setLocalStores] = useState(retailStores);

  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [addingDeptForDivisionId, setAddingDeptForDivisionId] = useState(null);

  const [newSubDeptCode, setNewSubDeptCode] = useState('');
  const [newSubDeptName, setNewSubDeptName] = useState('');
  const [addingSubDeptForDeptId, setAddingSubDeptForDeptId] = useState(null);

  const [newStoreCode, setNewStoreCode] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [addingStoreForClusterId, setAddingStoreForClusterId] = useState(null);

  function toggleDivision(id) {
    setExpandedDivisionId((cur) => (cur === id ? null : id));
  }
  function toggleDepartment(id) {
    setExpandedDeptId((cur) => (cur === id ? null : id));
  }
  function toggleArea(id) {
    setExpandedAreaId((cur) => (cur === id ? null : id));
    setExpandedClusterId(null);
  }
  function toggleCluster(id) {
    setExpandedClusterId((cur) => (cur === id ? null : id));
  }

  function submitNewDepartment(e, divisionId) {
    e.preventDefault();
    if (!newDeptCode.trim() || !newDeptName.trim()) return;
    setLocalDepartments((prev) => [
      ...prev,
      { id: `dept-${Date.now()}`, divisionId, code: newDeptCode.trim().toUpperCase(), name: newDeptName.trim() },
    ]);
    setNewDeptCode('');
    setNewDeptName('');
    setAddingDeptForDivisionId(null);
  }

  function submitNewSubDepartment(e, departmentId) {
    e.preventDefault();
    if (!newSubDeptCode.trim() || !newSubDeptName.trim()) return;
    setLocalSubDepartments((prev) => [
      ...prev,
      { id: `sub-${Date.now()}`, departmentId, code: newSubDeptCode.trim().toUpperCase(), name: newSubDeptName.trim() },
    ]);
    setNewSubDeptCode('');
    setNewSubDeptName('');
    setAddingSubDeptForDeptId(null);
  }

  function submitNewStore(e, clusterId, areaId) {
    e.preventDefault();
    if (!newStoreCode.trim() || !newStoreName.trim()) return;
    setLocalStores((prev) => [
      ...prev,
      {
        id: `store-${Date.now()}`, clusterId, areaId, typeId: storeTypes[0].id,
        code: newStoreCode.trim().toUpperCase(), name: newStoreName.trim(), address: '',
      },
    ]);
    setNewStoreCode('');
    setNewStoreName('');
    setAddingStoreForClusterId(null);
  }

  return (
    <div className="grid grid-2" style={{ gap: 16, alignItems: 'start' }}>
      {/* SUPPORTING FUNCTIONS BRANCH */}
      <div className="card card-pad">
        <div className="section-label" style={{ margin: '0 0 12px' }}>
          Supporting Functions Branch (Head Office) &middot; {divisions.length} Divisions
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {divisions.map((div) => {
            const depts = localDepartments.filter((d) => d.divisionId === div.id);
            const isOpen = expandedDivisionId === div.id;
            return (
              <div key={div.id} style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                <button
                  onClick={() => toggleDivision(div.id)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', background: isOpen ? 'var(--paper-sunken)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 13 }}>
                    <i className={`ti ${isOpen ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ marginRight: 8, color: 'var(--ink-faint)' }} />
                    {div.code} &middot; {div.name}
                  </span>
                  <Badge tone="slate" size="sm">{depts.length} depts</Badge>
                </button>
                {isOpen && (
                  <div style={{ padding: '8px 12px 12px 24px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--line)' }}>
                    {depts.map((d) => {
                      const subDepts = localSubDepartments.filter((s) => s.departmentId === d.id);
                      const isDeptOpen = expandedDeptId === d.id;
                      return (
                        <div key={d.id} style={{ border: '1px solid var(--line-subtle, var(--line))', borderRadius: 6, background: 'var(--paper-raised, #fff)' }}>
                          <button
                            onClick={() => toggleDepartment(d.id)}
                            style={{
                              width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                            }}
                          >
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
                              <i className={`ti ${isDeptOpen ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ marginRight: 6, color: 'var(--ink-faint)', fontSize: 11 }} />
                              {d.code} &middot; {d.name}
                            </span>
                            <Badge tone={subDepts.length > 0 ? 'blue' : 'slate'} size="sm">
                              {subDepts.length} sub-depts
                            </Badge>
                          </button>

                          {isDeptOpen && (
                            <div style={{ padding: '4px 10px 10px 24px', display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px dashed var(--line)' }}>
                              {subDepts.map((sub) => (
                                <div key={sub.id} style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <i className="ti ti-corner-down-right" style={{ color: 'var(--rail)', fontSize: 12 }} />
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>
                                    {sub.code}
                                  </span>
                                  <span>&middot;</span>
                                  <span>{sub.name}</span>
                                </div>
                              ))}

                              {addingSubDeptForDeptId === d.id ? (
                                <form onSubmit={(e) => submitNewSubDepartment(e, d.id)} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                  <input
                                    className="field-input"
                                    placeholder="Sub-Code (e.g. SUB-XXX)"
                                    value={newSubDeptCode}
                                    onChange={(e) => setNewSubDeptCode(e.target.value)}
                                    style={{ width: 110, fontSize: 11.5, height: 30 }}
                                    required
                                  />
                                  <input
                                    className="field-input"
                                    placeholder="Tên Sub-Department / Vị trí trực thuộc"
                                    value={newSubDeptName}
                                    onChange={(e) => setNewSubDeptName(e.target.value)}
                                    style={{ flex: 1, fontSize: 11.5, height: 30 }}
                                    required
                                  />
                                  <Button size="sm" type="submit" variant="primary">Lưu</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setAddingSubDeptForDeptId(null)}>Hủy</Button>
                                </form>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setAddingSubDeptForDeptId(d.id)}
                                  style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: '4px 0', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}
                                >
                                  <i className="ti ti-plus" /> Thêm sub-department cho {d.code}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {addingDeptForDivisionId === div.id ? (
                      <form onSubmit={(e) => submitNewDepartment(e, div.id)} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <input className="field-input" placeholder="Code" value={newDeptCode} onChange={(e) => setNewDeptCode(e.target.value)} style={{ width: 80, fontSize: 12 }} />
                        <input className="field-input" placeholder="Department name" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} style={{ flex: 1, fontSize: 12 }} />
                        <Button size="sm" type="submit" variant="primary">Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => setAddingDeptForDivisionId(null)}>Cancel</Button>
                      </form>
                    ) : (
                      <button
                        onClick={() => setAddingDeptForDivisionId(div.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--rail)', fontSize: 12, cursor: 'pointer', textAlign: 'left', padding: 0, marginTop: 4 }}
                      >
                        <i className="ti ti-plus" style={{ marginRight: 4 }} />+ Add department
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* OPERATIONS BRANCH */}
      <div className="card card-pad">
        <div className="section-label" style={{ margin: '0 0 12px' }}>
          Operations Branch (Stores) &middot; {operationsAreas.length} Areas &middot; {localStores.length} Stores
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {operationsAreas.map((area) => {
            const areaClusters = clusters.filter((c) => c.areaId === area.id);
            const isAreaOpen = expandedAreaId === area.id;
            return (
              <div key={area.id} style={{ border: '1px solid var(--line)', borderRadius: 8 }}>
                <button
                  onClick={() => toggleArea(area.id)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 13 }}>
                    <i className={`ti ${isAreaOpen ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ marginRight: 8, color: 'var(--ink-faint)' }} />
                    {area.name}
                  </span>
                  <Badge tone="slate" size="sm">{areaClusters.length} clusters</Badge>
                </button>
                {isAreaOpen && (
                  <div style={{ padding: '0 12px 12px 34px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {areaClusters.map((cluster) => {
                      const clusterStores = localStores.filter((s) => s.clusterId === cluster.id);
                      const isClusterOpen = expandedClusterId === cluster.id;
                      return (
                        <div key={cluster.id}>
                          <button
                            onClick={() => toggleCluster(cluster.id)}
                            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}
                          >
                            <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                              <i className={`ti ${isClusterOpen ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ marginRight: 6, color: 'var(--ink-faint)' }} />
                              {cluster.name}
                            </span>
                            <Badge tone="slate" size="sm">{clusterStores.length} stores</Badge>
                          </button>
                          {isClusterOpen && (
                            <div style={{ paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                              {clusterStores.map((store) => (
                                <div key={store.id} style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <i className="ti ti-building-store" style={{ color: 'var(--ink-faint)' }} />
                                  {store.name}
                                  <Badge tone="blue" size="sm">{storeTypeFor(store.typeId)?.code}</Badge>
                                </div>
                              ))}
                              {addingStoreForClusterId === cluster.id ? (
                                <form onSubmit={(e) => submitNewStore(e, cluster.id, area.id)} style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                  <input className="field-input" placeholder="Code" value={newStoreCode} onChange={(e) => setNewStoreCode(e.target.value)} style={{ width: 80, fontSize: 12 }} />
                                  <input className="field-input" placeholder="Store name" value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} style={{ flex: 1, fontSize: 12 }} />
                                  <Button size="sm" type="submit" variant="primary">Add</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setAddingStoreForClusterId(null)}>Cancel</Button>
                                </form>
                              ) : (
                                <button
                                  onClick={() => setAddingStoreForClusterId(cluster.id)}
                                  style={{ background: 'none', border: 'none', color: 'var(--rail)', fontSize: 12, cursor: 'pointer', textAlign: 'left', padding: 0, marginTop: 2 }}
                                >
                                  <i className="ti ti-plus" style={{ marginRight: 4 }} />Add store
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SHARED DEPARTMENT/SECTION/POSITION TEMPLATE */}
      <div className="card card-pad" style={{ gridColumn: '1 / -1' }}>
        <div className="section-label" style={{ margin: '0 0 12px' }}>
          In-Store Department &amp; Section Template (applied under every store above)
        </div>
        <div className="grid grid-3" style={{ gap: 10 }}>
          {storeDepartments.map((dept) => (
            <div key={dept.id} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 12.5 }}>{dept.name}</div>
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {storeSections.filter((s) => s.departmentId === dept.id).map((s) => (
                  <div key={s.id} style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                    <i className="ti ti-corner-down-right" style={{ marginRight: 4, color: 'var(--ink-faint)' }} />{s.name}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
