import "../../styles/institution-operations-pages.css";
import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, GraduationCap, Plus, Users, BookOpen, BriefcaseBusiness, MapPin } from "lucide-react";
import { Badge, Button, Card, Field, Input } from "../../components/ui/primitives.jsx";
import { EmptyState, Loading } from "../../components/ui/states.jsx";
import { api } from "../../lib/api.js";
import { useAuth } from "../../lib/auth.jsx";

const PROGRAM_EMPTY = { name: "", code: "", summary: "", duration_months: 3, audience: "both", delivery_mode: "hybrid" };
const BATCH_EMPTY = { program_id: "", name: "", code: "", starts_on: new Date().toISOString().slice(0, 10), capacity: 30, audience: "students", organization_name: "", trainer_user_id: "" };
const PERSON_EMPTY = { full_name: "", email: "", participant_type: "student", organization_name: "" };

const dateLabel = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
const friendlyError = (error, context = "load") => {
  if (error?.status === 401) return "Your session has expired. Sign in again to continue.";
  if (error?.status === 403) return "Your account is not assigned to this training workspace. Ask an administrator to review your access.";
  if (error?.status === 404) return "The training service is not available yet. Restart the API Gateway and Institution service, then refresh this page.";
  if (context === "save") return "We could not save this change. Check the form and try again.";
  return "We could not load training workspace data. Check that the services are running, then try again.";
};

export default function TrainingCenterStudio() {
  const { user } = useAuth();
  const roles = user?.roles || [];
  const canCreateCenter = roles.some((role) => ["super_admin", "company_admin"].includes(role));
  const canManagePrograms = roles.some((role) => ["super_admin", "company_admin", "college_admin", "principal", "dean"].includes(role));
  const canManageBatches = canManagePrograms || roles.includes("hod");
  const canEnroll = canManageBatches;
  const [centers, setCenters] = useState([]);
  const [centerId, setCenterId] = useState("");
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [centerForm, setCenterForm] = useState({ name: "", code: "", city: "", focus: "" });
  const [programForm, setProgramForm] = useState(PROGRAM_EMPTY);
  const [batchForm, setBatchForm] = useState(BATCH_EMPTY);
  const [personForm, setPersonForm] = useState(PERSON_EMPTY);

  const center = centers.find((item) => item.id === centerId);
  const selectedBatch = batches.find((item) => item.id === batchId);
  const selectedProgram = programs.find((item) => item.id === batchForm.program_id);
  const activeBatches = batches.filter((item) => item.status === "enrolling" || item.status === "active").length;

  async function loadCenters(preferred = "") {
    const rows = await api.trainingCenters();
    setCenters(rows || []);
    const nextId = preferred || (rows || []).some((item) => item.id === centerId) && centerId || rows?.[0]?.id || "";
    setCenterId(nextId);
  }

  async function loadCenterData(id) {
    if (!id) { setPrograms([]); setBatches([]); setBatchId(""); setParticipants([]); return; }
    const [programRows, batchRows] = await Promise.all([api.trainingPrograms(id), api.trainingBatches(id)]);
    setPrograms(programRows || []);
    setBatches(batchRows || []);
    setBatchId((current) => (batchRows || []).some((item) => item.id === current) ? current : "");
  }

  useEffect(() => {
    let live = true;
    api.trainingCenters()
      .then((rows) => { if (live) { setCenters(rows || []); setCenterId(rows?.[0]?.id || ""); } })
      .catch((e) => { if (live) setError(friendlyError(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    let live = true;
    if (!centerId) { setPrograms([]); setBatches([]); setBatchId(""); setParticipants([]); return undefined; }
    Promise.all([api.trainingPrograms(centerId), api.trainingBatches(centerId)])
      .then(([programRows, batchRows]) => {
        if (!live) return;
        setPrograms(programRows || []);
        setBatches(batchRows || []);
        setBatchId("");
        setParticipants([]);
      })
      .catch((e) => { if (live) setError(friendlyError(e)); });
    return () => { live = false; };
  }, [centerId]);

  useEffect(() => {
    let live = true;
    if (!batchId) { setParticipants([]); return undefined; }
    api.trainingParticipants(batchId)
      .then((rows) => { if (live) setParticipants(rows || []); })
      .catch((e) => { if (live) setError(friendlyError(e)); });
    return () => { live = false; };
  }, [batchId]);

  async function submit(action, success) {
    setBusy(true); setError("");
    try { await action(); await success(); }
    catch (e) { setError(friendlyError(e, "save")); }
    finally { setBusy(false); }
  }

  function createCenter(e) {
    e.preventDefault();
    submit(async () => {
      const created = await api.createTrainingCenter(centerForm);
      setCenterForm({ name: "", code: "", city: "", focus: "" });
      await loadCenters(created.id);
    }, async () => {});
  }

  function createProgram(e) {
    e.preventDefault();
    if (!centerId) return;
    submit(async () => {
      const created = await api.createTrainingProgram(centerId, { ...programForm, duration_months: Number(programForm.duration_months) });
      setPrograms((rows) => [created, ...rows]);
      setProgramForm(PROGRAM_EMPTY);
      setBatchForm((form) => ({ ...form, program_id: form.program_id || created.id }));
    }, async () => {});
  }

  function createBatch(e) {
    e.preventDefault();
    if (!centerId) return;
    submit(async () => {
      const created = await api.createTrainingBatch(centerId, { ...batchForm, capacity: Number(batchForm.capacity) });
      setBatches((rows) => [created, ...rows]);
      setBatchId(created.id);
      setBatchForm({ ...BATCH_EMPTY, program_id: batchForm.program_id });
    }, async () => {});
  }

  function addParticipant(e) {
    e.preventDefault();
    if (!batchId) return;
    submit(async () => {
      const created = await api.addTrainingParticipant(batchId, {
        ...personForm,
        participant_type: selectedBatch?.audience === "corporate" ? "corporate_employee" : "student",
        organization_name: personForm.organization_name || selectedBatch?.organization_name || null,
      });
      setParticipants((rows) => [...rows, created].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      setPersonForm({ ...PERSON_EMPTY, participant_type: selectedBatch?.audience === "corporate" ? "corporate_employee" : "student", organization_name: selectedBatch?.organization_name || "" });
    }, async () => {});
  }

  const matchingPrograms = useMemo(() => programs.filter((item) => item.status === "active"), [programs]);
  const scopedStaff = !roles.some((role) => ["super_admin", "company_admin"].includes(role));

  if (loading) return <Loading />;

  return (
    <div className="page-composition page-composition-institution institution-ops training-center-studio">
      <header className="training-page-heading"><div><span>LEARNING WORKSPACE</span><h1>Training Center Network</h1><p>Run short, outcome-focused upskilling programs for learners and corporate teams.</p></div><div className="training-heading-mark" aria-hidden="true"><GraduationCap size={23} /></div></header>
      {error ? <section role="alert" className="training-error training-error-state"><span className="training-error-icon" aria-hidden="true">!</span><div><strong>Training workspace unavailable</strong><p>{error}</p><Button type="button" variant="secondary" className="mt-3" onClick={() => window.location.reload()}>Try again</Button></div></section> : scopedStaff && centers.length === 0 ? <section className="training-assignment-state"><div className="training-assignment-emblem"><Building2 size={26} /></div><div className="training-assignment-copy"><span>WORKSPACE ACCESS</span><h2>No training center assigned yet</h2><p>Your trainer workspace will appear here after an administrator assigns you to a training center and, when applicable, a program or batch.</p><div className="training-assignment-steps"><span><i>1</i>Choose your organization</span><span><i>2</i>Assign your program or batch</span><span><i>3</i>Open your workspace</span></div></div></section> : <>
      <section className="training-network-brief" aria-label="Training center overview">
        <div className="training-network-copy"><span>TRAINING OPERATIONS</span><h2>{center?.name || "Build skills that move work forward"}</h2><p>Design focused programs, launch cohorts, and follow learner progress from enrollment to completion.</p></div>
        <dl className="training-network-stats"><div><dt>Centers</dt><dd>{centers.length}</dd></div><div><dt>Programs</dt><dd>{programs.length}</dd></div><div><dt>Live batches</dt><dd>{activeBatches}</dd></div></dl>
      </section>

      <div className="grid xl:grid-cols-[300px_minmax(0,1fr)] gap-5 items-start">
        <aside className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3"><Building2 size={18} className="text-brand-600" /><h2 className="font-display font-semibold text-ink-900">Training centers</h2></div>
            {centers.length ? <div className="space-y-2" role="list" aria-label="Your training centers">
              {centers.map((item) => <button key={item.id} type="button" onClick={() => setCenterId(item.id)} className={`w-full rounded-xl border p-3 text-left transition-colors ${item.id === centerId ? "border-brand-500/40 bg-brand-500/[.07]" : "border-slate-200 hover:bg-slate-50"}`}>
                <span className="block font-semibold text-ink-900">{item.name}</span><span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><MapPin size={12} />{[item.city, item.code].filter(Boolean).join(" · ")}</span>
              </button>)}
            </div> : <EmptyState title="No center assigned" hint={canCreateCenter ? "Create the first center below." : "Ask your platform administrator to assign you to a training center."} />}
          </Card>

          {canCreateCenter && <Card className="p-4">
            <h3 className="mb-3 flex items-center gap-2 font-display font-semibold text-ink-900"><Plus size={17} className="text-brand-600" />Add a center</h3>
            <form onSubmit={createCenter} className="space-y-3">
              <Field label="Center name"><Input required minLength={2} value={centerForm.name} onChange={(e) => setCenterForm({ ...centerForm, name: e.target.value })} placeholder="e.g. Northstar Skills Lab" /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Center code"><Input required value={centerForm.code} onChange={(e) => setCenterForm({ ...centerForm, code: e.target.value })} placeholder="NSL" /></Field><Field label="City"><Input value={centerForm.city} onChange={(e) => setCenterForm({ ...centerForm, city: e.target.value })} placeholder="City" /></Field></div>
              <Field label="Training focus"><Input value={centerForm.focus} onChange={(e) => setCenterForm({ ...centerForm, focus: e.target.value })} placeholder="Cloud, data, digital skills…" /></Field>
              <Button type="submit" disabled={busy} className="w-full justify-center">{busy ? "Saving…" : "Create training center"}</Button>
            </form>
          </Card>}
        </aside>

        <div className="min-w-0 space-y-5">
          {!center ? <Card className="p-8"><EmptyState title="Select a training center" hint="Choose a center from the left to manage its programs and cohorts." /></Card> : <>
            <Card className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-[.14em] text-amber-600">{center.code} · {center.focus || "Upskilling center"}</p><h2 className="mt-1 font-display text-2xl font-bold text-ink-900">{center.name}</h2><p className="mt-1 text-sm text-slate-500">{center.city || "Location not set"}</p></div>
                <Badge tone="teal">{center.status}</Badge>
              </div>
            </Card>

            <div className="grid lg:grid-cols-2 gap-5 items-start">
              {canManagePrograms && <Card className="p-5">
                <h3 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-ink-900"><BookOpen size={18} className="text-brand-600" />Create a program</h3>
                <p className="mb-4 text-sm text-slate-500">Choose a practical duration and who the program serves.</p>
                <form onSubmit={createProgram} className="space-y-3">
                  <div className="grid sm:grid-cols-[1fr_130px] gap-3"><Field label="Program name"><Input required value={programForm.name} onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })} placeholder="Full-stack development" /></Field><Field label="Code"><Input required value={programForm.code} onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })} placeholder="FSD-03" /></Field></div>
                  <Field label="What participants will learn"><textarea value={programForm.summary} onChange={(e) => setProgramForm({ ...programForm, summary: e.target.value })} className="w-full min-h-20 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm" placeholder="Core skills, projects and outcomes" /></Field>
                  <div className="grid sm:grid-cols-3 gap-3"><Field label="Duration"><select value={programForm.duration_months} onChange={(e) => setProgramForm({ ...programForm, duration_months: Number(e.target.value) })} className="h-11 w-full rounded-lg border border-slate-200 bg-surface px-3 text-sm"><option value={2}>2 months</option><option value={3}>3 months</option><option value={6}>6 months</option></select></Field><Field label="Audience"><select value={programForm.audience} onChange={(e) => setProgramForm({ ...programForm, audience: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 bg-surface px-3 text-sm"><option value="both">Students + corporate</option><option value="students">Students</option><option value="corporate">Corporate</option></select></Field><Field label="Delivery"><select value={programForm.delivery_mode} onChange={(e) => setProgramForm({ ...programForm, delivery_mode: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 bg-surface px-3 text-sm"><option value="hybrid">Hybrid</option><option value="onsite">On-site</option><option value="online">Online</option></select></Field></div>
                  <Button type="submit" disabled={busy} className="w-full justify-center"><Plus size={16} />Add program</Button>
                </form>
              </Card>}

              {canManageBatches && <Card className="p-5">
                <h3 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-ink-900"><CalendarDays size={18} className="text-amber-600" />Launch a batch</h3>
                <p className="mb-4 text-sm text-slate-500">Batch end dates follow the selected program duration.</p>
                <form onSubmit={createBatch} className="space-y-3">
                  <Field label="Program"><select required value={batchForm.program_id} onChange={(e) => { const program = matchingPrograms.find((item) => item.id === e.target.value); setBatchForm({ ...batchForm, program_id: e.target.value, audience: program?.audience === "corporate" ? "corporate" : "students" }); }} className="h-11 w-full rounded-lg border border-slate-200 bg-surface px-3 text-sm"><option value="">Select program…</option>{matchingPrograms.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.duration_months} months</option>)}</select></Field>
                  <div className="grid sm:grid-cols-2 gap-3"><Field label="Batch name"><Input required value={batchForm.name} onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })} placeholder="July 2027 cohort" /></Field><Field label="Batch code"><Input required value={batchForm.code} onChange={(e) => setBatchForm({ ...batchForm, code: e.target.value })} placeholder="FSD-JUL27" /></Field></div>
                  <div className="grid sm:grid-cols-3 gap-3"><Field label="Starts on"><Input required type="date" value={batchForm.starts_on} onChange={(e) => setBatchForm({ ...batchForm, starts_on: e.target.value })} /></Field><Field label="Capacity"><Input required type="number" min="1" max="10000" value={batchForm.capacity} onChange={(e) => setBatchForm({ ...batchForm, capacity: e.target.value })} /></Field><Field label="Participant group"><select value={batchForm.audience} onChange={(e) => setBatchForm({ ...batchForm, audience: e.target.value, organization_name: e.target.value === "corporate" ? batchForm.organization_name : "" })} className="h-11 w-full rounded-lg border border-slate-200 bg-surface px-3 text-sm"><option value="students" disabled={selectedProgram?.audience === "corporate"}>Students</option><option value="corporate" disabled={selectedProgram?.audience === "students"}>Corporate employees</option></select></Field></div>
                  {batchForm.audience === "corporate" && <Field label="Company / employer"><Input required value={batchForm.organization_name} onChange={(e) => setBatchForm({ ...batchForm, organization_name: e.target.value })} placeholder="Company name" /></Field>}
                  <Button type="submit" disabled={busy || !matchingPrograms.length} variant="amber" className="w-full justify-center"><Plus size={16} />Create batch</Button>
                </form>
              </Card>}
            </div>

            <Card className="overflow-hidden p-0">
              <div className="border-b border-slate-100 p-5"><h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900"><BookOpen size={18} className="text-brand-600" />Programs at {center.name}</h3></div>
              {programs.length ? <div className="grid md:grid-cols-2 gap-3 p-4">{programs.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-bold tracking-wide text-slate-500">{item.code}</p><h4 className="mt-1 font-semibold text-ink-900">{item.name}</h4></div><Badge tone={item.audience === "corporate" ? "amber" : "brand"}>{item.audience === "both" ? "All learners" : item.audience}</Badge></div><p className="mt-3 text-sm text-slate-500">{item.summary || "Outcome-focused upskilling program."}</p><div className="mt-4 flex flex-wrap gap-2"><Badge tone="slate">{item.duration_months} months</Badge><Badge tone="slate">{item.delivery_mode}</Badge></div></article>)}</div> : <div className="p-8"><EmptyState title="No programs yet" hint="Create a two, three, or six-month program above." /></div>}
            </Card>

            <Card className="overflow-hidden p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900"><Users size={18} className="text-brand-600" />Batches and participants</h3><p className="mt-1 text-sm text-slate-500">Student cohorts and employer-sponsored employee groups.</p></div><Badge tone="teal">{batches.length} batches</Badge></div>
              {batches.length ? <div className="grid lg:grid-cols-[minmax(0,.9fr)_minmax(300px,1.1fr)] divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                <div className="divide-y divide-slate-100">{batches.map((item) => <button key={item.id} type="button" onClick={() => setBatchId(item.id)} className={`w-full p-4 text-left transition-colors ${batchId === item.id ? "bg-brand-500/[.06]" : "hover:bg-slate-50"}`}><div className="flex items-center justify-between gap-2"><span className="font-semibold text-ink-900">{item.name}</span><Badge tone={item.audience === "corporate" ? "amber" : "brand"}>{item.audience === "corporate" ? "Corporate" : "Students"}</Badge></div><p className="mt-1 text-xs text-slate-500">{item.code} · {dateLabel(item.starts_on)}–{dateLabel(item.ends_on)}</p><p className="mt-1 text-xs text-slate-500">{item.organization_name || "Open enrollment"} · {item.capacity} seats</p></button>)}</div>
                <div className="min-w-0 p-4 sm:p-5">{selectedBatch ? <>
                  <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Selected batch</p><h4 className="font-display text-lg font-semibold text-ink-900">{selectedBatch.name}</h4></div><Badge tone="slate">{participants.length}/{selectedBatch.capacity}</Badge></div>
                  {canEnroll && <form onSubmit={addParticipant} className="mb-5 grid sm:grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3"><Field label="Participant name"><Input required value={personForm.full_name} onChange={(e) => setPersonForm({ ...personForm, full_name: e.target.value })} placeholder="Full name" /></Field><Field label="Email"><Input required type="email" value={personForm.email} onChange={(e) => setPersonForm({ ...personForm, email: e.target.value })} placeholder="name@example.com" /></Field>{selectedBatch.audience === "corporate" && <Field label="Employer"><Input value={personForm.organization_name || selectedBatch.organization_name || ""} onChange={(e) => setPersonForm({ ...personForm, organization_name: e.target.value })} placeholder="Company" /></Field>}<Button type="submit" disabled={busy} className="self-end justify-center"><Plus size={15} />Enroll participant</Button></form>}
                  {participants.length ? <div className="divide-y divide-slate-100">{participants.map((person) => <div key={person.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-ink-900">{person.full_name}</p><p className="truncate text-xs text-slate-500">{person.email}{person.organization_name ? ` · ${person.organization_name}` : ""}</p></div><Badge tone={person.status === "completed" ? "teal" : "slate"}>{person.participant_type === "corporate_employee" ? "Employee" : "Student"}</Badge></div>)}</div> : <EmptyState title="No participants yet" hint="Enroll the first learner or employee above." />}
                </> : <EmptyState title="Choose a batch" hint="Select a batch to manage its roster." />}</div>
              </div> : <div className="p-8"><EmptyState title="No batches launched" hint="Create a program first, then open a student or corporate batch." /></div>}
            </Card>
          </>}
        </div>
      </div>
      </>}
    </div>
  );
}
