import "../../styles/institution-operations-pages.css";
import { useEffect, useMemo, useState } from "react";
import {
  Users, Search, ShieldCheck, Ban, CheckCircle2, Plus, X, Trash2, Building2,
} from "lucide-react";
import { Card, Button, Badge, Field, Input } from "../../components/ui/primitives.jsx";
import { PageHeader, Loading, EmptyState } from "../../components/ui/states.jsx";
import { api } from "../../lib/api.js";

const STATUS_TONE = { active: "teal", disabled: "rose", locked: "amber" };

// Super Admin portal · User Management. Search anyone on the platform, see and
// edit their roles (with the college/branch/section each grant is scoped to),
// and suspend or reactivate accounts. Every action here is enforced by the auth
// service on granular permissions — the page only reflects that.
export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [trainingCenters, setTrainingCenters] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sel, setSel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState(false);
  const scopeOrganizations = [
    ...colleges.map((item) => ({ ...item, scope_kind: "college" })),
    ...trainingCenters.map((item) => ({ ...item, scope_kind: "training_center" })),
  ];

  async function loadUsers() {
    const rows = await api.adminUsers({ q, status });
    setUsers(rows || []);
    if (sel) setSel((rows || []).find((u) => u.id === sel.id) || null);
  }

  useEffect(() => {
    (async () => {
      try {
        const [r, c, t] = await Promise.all([api.listRoles(), api.colleges().catch(() => []), api.trainingCenters().catch(() => [])]);
        setRoles(r || []); setColleges(c || []); setTrainingCenters(t || []);
        await loadUsers();
      } catch (e) { setErr(e.message || "Failed to load users."); }
      setLoading(false);
    })();
  }, []);

  // debounce search / filter
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => { loadUsers().catch(() => {}); }, 250);
    return () => clearTimeout(t);
  }, [q, status]);

  async function toggleStatus(u) {
    const next = u.status === "active" ? "disabled" : "active";
    if (next === "disabled" && !confirm(`Suspend ${u.email}? Their sessions end immediately.`)) return;
    setBusy(true); setErr("");
    try { await api.setUserStatus(u.id, next); await loadUsers(); }
    catch (e) { setErr(e.message || "Could not change status."); }
    finally { setBusy(false); }
  }

  async function removeRole(u, a) {
    setBusy(true); setErr("");
    try {
      await api.unassignRole({ user_id: u.id, role: a.role, college_id: a.college_id });
      await loadUsers();
    } catch (e) { setErr(e.message || "Could not remove role."); }
    finally { setBusy(false); }
  }

  if (loading) return <Loading />;

  return (
    <div className="page-composition page-composition-institution institution-ops institution-ops-users"><div>
      <PageHeader
        title="User Management"
        subtitle="Everyone on the platform. Assign scoped roles, and suspend or reactivate accounts."
        right={<Button onClick={() => setCreating(true)}><Plus size={16} /> New user</Button>}
      />
      {err && <div className="rounded-md bg-rose-500/10 text-rose-600 text-sm px-3.5 py-2.5 mb-4">{err}</div>}

      {creating && (
        <CreateUserForm roles={roles}
          onCancel={() => setCreating(false)} setErr={setErr}
          onDone={async () => { setCreating(false); await loadUsers(); }} />
      )}

      <section className="people-workspace" aria-label="Platform user directory">
        {/* Users list */}
        <Card className="people-directory p-0 overflow-hidden self-start">
          <header className="people-directory-heading"><div><span>ACCOUNT DIRECTORY</span><h2>People &amp; access</h2><p>Search identities, then inspect their product and scoped grants.</p></div><strong>{users.length}<small>loaded</small></strong></header>
          <div className="p-3 border-b border-slate-100 flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…"
                className="w-full h-10 rounded-lg border border-slate-200 bg-surface pl-9 pr-3 text-sm" />
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-surface px-3 text-sm">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="disabled">Suspended</option>
            </select>
          </div>
          {users.length === 0 ? (
            <EmptyState title="No users found" hint="Try a different search." />
          ) : (
            <div className="max-h-[72vh] overflow-y-auto">
              {users.map((u) => (
                <button key={u.id} onClick={() => setSel(u)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition
                    ${sel?.id === u.id ? "bg-brand-500/5 border-l-2 border-l-brand-500" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink-900 truncate">{u.full_name || u.email}</span>
                    <Badge tone={STATUS_TONE[u.status] || "slate"}>{u.status}</Badge>
                  </div>
                  <div className="text-xs text-slate-500 truncate">{u.email} · <span className="uppercase">{u.product}</span></div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(u.roles || []).map((r) => <Badge key={r} tone="slate">{r}</Badge>)}
                    {(u.roles || []).length === 0 && <span className="text-xs text-slate-400">no roles</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Detail */}
        {!sel ? (
          <EmptyState title="Select a user" hint="Pick someone to manage their roles and account." />
        ) : (
          <main className="people-detail-workspace"><div className="people-detail-heading"><span>SELECTED ACCOUNT</span><p>Review account state and organization scope before changing access.</p></div><UserDetail user={sel} roles={roles} organizations={scopeOrganizations} busy={busy}
            onToggleStatus={() => toggleStatus(sel)} onRemoveRole={(a) => removeRole(sel, a)}
            onChanged={loadUsers} setErr={setErr} /></main>
        )}
      </section>
    </div></div>
  );
}

function CreateUserForm({ roles, onCancel, onDone, setErr }) {
  const [f, setF] = useState({ email: "", full_name: "", product: "learn", password: "", role: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit() {
    if (!f.email || f.password.length < 8) { setErr("Email and an 8+ char password are required."); return; }
    setErr(""); setBusy(true);
    try { await api.createUser({ ...f, role: f.role || null }); await onDone(); }
    catch (e) { setErr(e.message || "Could not create the user."); }
    finally { setBusy(false); }
  }

  return (
    <Card className="p-5 mb-5 border border-brand-500/20">
      <h3 className="font-display font-semibold text-ink-900 mb-4 flex items-center gap-2">
        <Plus size={17} className="text-brand-500" /> Create a user
      </h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Email"><Input value={f.email} onChange={set("email")} type="email" placeholder="name@college.edu" /></Field>
        <Field label="Full name"><Input value={f.full_name} onChange={set("full_name")} placeholder="Full name" /></Field>
        <Field label="Temporary password"><Input value={f.password} onChange={set("password")} type="text" placeholder="8+ characters" /></Field>
        <Field label="Product">
          <select value={f.product} onChange={set("product")}
            className="w-full h-11 rounded-lg border border-slate-200 bg-surface px-3 text-sm">
            <option value="learn">Learn (LMS)</option>
            <option value="hire">Hire (Drive)</option>
          </select>
        </Field>
        <Field label="Initial role (optional)">
          <select value={f.role} onChange={set("role")}
            className="w-full h-11 rounded-lg border border-slate-200 bg-surface px-3 text-sm">
            <option value="">No role</option>
            {roles.filter((r) => r.is_active).map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex items-center justify-end gap-2 mt-4">
        <Button variant="secondary" onClick={onCancel}><X size={15} /> Cancel</Button>
        <Button onClick={submit} disabled={busy}><Plus size={15} /> {busy ? "Creating…" : "Create user"}</Button>
      </div>
    </Card>
  );
}

function UserDetail({ user, roles, organizations, busy, onToggleStatus, onRemoveRole, onChanged, setErr }) {
  const [adding, setAdding] = useState(false);
  return (
    <Card className="p-5 self-start">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display font-semibold text-ink-900 truncate">{user.full_name || "—"}</h2>
          <p className="text-sm text-slate-500 truncate">{user.email}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge tone={STATUS_TONE[user.status] || "slate"}>{user.status}</Badge>
            <Badge tone="slate">{user.product}</Badge>
          </div>
        </div>
        <Button variant="secondary" size="sm" disabled={busy} onClick={onToggleStatus}>
          {user.status === "active" ? <><Ban size={14} /> Suspend</> : <><CheckCircle2 size={14} /> Reactivate</>}
        </Button>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-ink-900 flex items-center gap-1.5">
            <ShieldCheck size={15} className="text-brand-500" /> Roles
          </h3>
          {!adding && <Button size="sm" onClick={() => setAdding(true)}><Plus size={14} /> Assign</Button>}
        </div>

        {(user.assignments || []).length === 0 && !adding && (
          <p className="text-sm text-slate-400 py-2">No roles assigned.</p>
        )}
        <div className="space-y-2">
          {(user.assignments || []).map((a, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
              <div className="min-w-0">
                <span className="text-sm font-medium text-ink-900">{a.role}</span>
                <ScopeLine a={a} organizations={organizations} />
              </div>
              <button onClick={() => onRemoveRole(a)} disabled={busy}
                className="text-slate-300 hover:text-rose-500 shrink-0"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>

        {adding && (
          <AssignForm user={user} roles={roles} organizations={organizations}
            onCancel={() => setAdding(false)} setErr={setErr}
            onDone={async () => { setAdding(false); await onChanged(); }} />
        )}
      </div>
    </Card>
  );
}

function ScopeLine({ a, organizations }) {
  if (!a.college_id)
    return <span className="block text-xs text-slate-400">Platform-wide</span>;
  const organization = organizations.find((item) => item.id === a.college_id);
  const bits = [organization?.name || a.college_id];
  if (a.branch_id) bits.push(organization?.scope_kind === "training_center" ? "program scoped" : "branch scoped");
  if (a.cohort_id) bits.push(organization?.scope_kind === "training_center" ? "batch scoped" : "section scoped");
  return <span className="block text-xs text-slate-400 flex items-center gap-1">
    <Building2 size={11} /> {bits.join(" · ")}</span>;
}

function AssignForm({ user, roles, organizations, onCancel, onDone, setErr }) {
  const [role, setRole] = useState("");
  const [scopeId, setScopeId] = useState("");
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [cohorts, setCohorts] = useState([]);
  const [cohortId, setCohortId] = useState("");
  const [busy, setBusy] = useState(false);

  const roleObj = useMemo(() => roles.find((r) => r.name === role), [roles, role]);
  // How deep the scope pickers go is driven by the role's scope_level.
  const needCollege = roleObj && roleObj.scope_level !== "platform" && roleObj.scope_level !== "self";
  const needBranch = roleObj && (roleObj.scope_level === "branch" || roleObj.scope_level === "section");
  const needCohort = roleObj && roleObj.scope_level === "section";
  const selectedOrganization = organizations.find((item) => item.id === scopeId);

  useEffect(() => {
    if (!selectedOrganization) { setBranches([]); setCohorts([]); return; }
    if (selectedOrganization.scope_kind === "training_center") {
      api.trainingPrograms(scopeId).then((rows) => setBranches(rows || [])).catch(() => setBranches([]));
      setCohorts([]);
    } else {
      api.collegeBranches(scopeId).then((rows) => setBranches(rows || [])).catch(() => setBranches([]));
      api.collegeCohorts(scopeId).then((rows) => setCohorts(rows || [])).catch(() => setCohorts([]));
    }
  }, [scopeId, selectedOrganization?.scope_kind]);

  useEffect(() => {
    if (selectedOrganization?.scope_kind !== "training_center" || !branchId || !needCohort) return;
    api.trainingBatches(scopeId).then((rows) => setCohorts((rows || []).filter((item) => item.program_id === branchId))).catch(() => setCohorts([]));
  }, [branchId, scopeId, selectedOrganization?.scope_kind, needCohort]);

  async function assign() {
    if (!role) return;
    setErr(""); setBusy(true);
    try {
      await api.assignRole({
        user_id: user.id, role,
        college_id: needCollege ? (scopeId || null) : null,
        branch_id: needBranch ? (branchId || null) : null,
        cohort_id: needCohort ? (cohortId || null) : null,
      });
      await onDone();
    } catch (e) { setErr(e.message || "Could not assign role."); }
    finally { setBusy(false); }
  }

  return (
    <div className="mt-3 rounded-lg border border-brand-500/20 bg-brand-500/5 p-3 space-y-3">
      <Field label="Role">
        <select value={role} onChange={(e) => { setRole(e.target.value); setScopeId(""); setBranchId(""); setCohortId(""); }}
          className="w-full h-10 rounded-lg border border-slate-200 bg-surface px-3 text-sm">
          <option value="">Select a role…</option>
          {roles.filter((r) => r.is_active).map((r) => (
            <option key={r.id} value={r.name}>{r.name} · {r.scope_level}</option>
          ))}
        </select>
      </Field>
      {needCollege && (
        <Field label="College / training center">
          <select value={scopeId} onChange={(e) => { setScopeId(e.target.value); setBranchId(""); setCohortId(""); }}
            className="w-full h-10 rounded-lg border border-slate-200 bg-surface px-3 text-sm">
            <option value="">Select organization…</option>
            <optgroup label="Colleges">{organizations.filter((item) => item.scope_kind === "college").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>
            <optgroup label="Training centers">{organizations.filter((item) => item.scope_kind === "training_center").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>
          </select>
        </Field>
      )}
      {needBranch && (
        <Field label={selectedOrganization?.scope_kind === "training_center" ? "Program" : "Branch"}>
          <select value={branchId} onChange={(e) => { setBranchId(e.target.value); setCohortId(""); }} disabled={!scopeId}
            className="w-full h-10 rounded-lg border border-slate-200 bg-surface px-3 text-sm disabled:opacity-50">
            <option value="">Select {selectedOrganization?.scope_kind === "training_center" ? "program" : "branch"}…</option>
            {branches.map((item) => <option key={item.id} value={item.id}>{item.name || item.code}</option>)}
          </select>
        </Field>
      )}
      {needCohort && (
        <Field label={selectedOrganization?.scope_kind === "training_center" ? "Batch" : "Section"}>
          <select value={cohortId} onChange={(e) => setCohortId(e.target.value)} disabled={!scopeId || (selectedOrganization?.scope_kind === "training_center" && !branchId)}
            className="w-full h-10 rounded-lg border border-slate-200 bg-surface px-3 text-sm disabled:opacity-50">
            <option value="">Select {selectedOrganization?.scope_kind === "training_center" ? "batch" : "section"}…</option>
            {cohorts.map((item) => <option key={item.id} value={item.id}>{selectedOrganization?.scope_kind === "training_center" ? item.name : `Year ${item.year_no}${item.section ? ` · Sec ${item.section}` : ""}`}</option>)}
          </select>
        </Field>
      )}
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}><X size={14} /> Cancel</Button>
        <Button size="sm" onClick={assign} disabled={busy || !role || (needCollege && !scopeId) || (needBranch && !branchId) || (needCohort && !cohortId)}><Plus size={14} /> {busy ? "Assigning…" : "Assign role"}</Button>
      </div>
    </div>
  );
}
