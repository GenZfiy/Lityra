import "../../styles/institution-operations-pages.css";
import { useEffect, useState } from "react";
import {
  ScrollText, ShieldCheck, ShieldAlert, RefreshCw, Search, Filter,
} from "lucide-react";
import { Card, Button, Badge, Field, Input } from "../../components/ui/primitives.jsx";
import { PageHeader, Loading, EmptyState } from "../../components/ui/states.jsx";
import { api } from "../../lib/api.js";

// Super Admin · Audit trail. Every administrative action (role changes,
// suspensions, permission edits) is appended to a hash-chained, tamper-evident
// log. This page reads and filters it, and can verify the chain is unbroken.
const ACTION_TONE = (a) =>
  a.includes("deleted") || a.includes("status") ? "rose"
  : a.includes("created") || a.includes("assigned") ? "teal"
  : a.includes("updated") || a.includes("cloned") ? "amber" : "slate";

function prettyAction(a) {
  return a.replace(/^admin\./, "").replace(/[._]/g, " ");
}

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [verify, setVerify] = useState(null);
  const [filters, setFilters] = useState({ action: "", actor_id: "", entity_type: "", limit: 200 });

  async function load() {
    setLoading(true); setErr("");
    try {
      setRows(await api.auditLogs({ partition_key: "platform", ...filters }));
    } catch (e) { setErr(e.message || "Could not load the audit log."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function checkIntegrity() {
    setVerify(null);
    try { setVerify(await api.auditVerify("platform")); }
    catch (e) { setErr(e.message || "Verification failed."); }
  }

  return (
    <div className="page-composition page-composition-institution institution-ops institution-ops-audit"><div>
      <PageHeader
        title="Audit Trail"
        subtitle="A tamper-evident record of every administrative action across the platform."
        right={
          <div className="flex items-center gap-2">
            {verify && (
              <Badge tone={verify.valid ? "teal" : "rose"}>
                {verify.valid
                  ? <><ShieldCheck size={13} /> chain intact · {verify.records}</>
                  : <><ShieldAlert size={13} /> broken @ seq {verify.broken_at_seq}</>}
              </Badge>
            )}
            <Button variant="secondary" size="sm" onClick={checkIntegrity}>
              <ShieldCheck size={14} /> Verify integrity
            </Button>
            <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={14} /> Refresh</Button>
          </div>
        }
      />

      <section className="audit-workbench" aria-label="Audit event explorer">
      <aside className="audit-filter-rail">
        <div className="audit-snapshot"><span>LOADED EVENTS</span><strong>{loading ? "…" : rows.length}</strong><small>{rows.length ? `Sequence ${rows[rows.length - 1]?.seq ?? "—"} through ${rows[0]?.seq ?? "—"}` : "No matching records"}</small></div>
      {/* Filters */}
      <Card className="audit-filters p-4">
        <h2 className="text-sm font-semibold text-ink-900 mb-3">Narrow the record</h2>
        <div className="grid gap-3 items-end">
          <Field label="Action">
            <select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full h-10 rounded-lg border border-slate-200 bg-surface px-3 text-sm">
              <option value="">All actions</option>
              <option value="admin.role.assigned">Role assigned</option>
              <option value="admin.role.unassigned">Role unassigned</option>
              <option value="admin.role.created">Role created</option>
              <option value="admin.role.updated">Role updated</option>
              <option value="admin.role.deleted">Role deleted</option>
              <option value="admin.user.status_changed">User suspended / reactivated</option>
            </select>
          </Field>
          <Field label="Actor (user id)">
            <Input value={filters.actor_id} onChange={(e) => setFilters({ ...filters, actor_id: e.target.value })}
              placeholder="Any admin" />
          </Field>
          <Field label="Entity type">
            <select value={filters.entity_type} onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
              className="w-full h-10 rounded-lg border border-slate-200 bg-surface px-3 text-sm">
              <option value="">All</option>
              <option value="user">User</option>
              <option value="role">Role</option>
            </select>
          </Field>
          <Button onClick={load}><Filter size={15} /> Apply</Button>
        </div>
      </Card>
      </aside>

      {err && <div className="rounded-md bg-rose-500/10 text-rose-600 text-sm px-3.5 py-2.5 mb-4">{err}</div>}

      <main className="audit-ledger-area">
      <div className="audit-ledger-title"><span>IMMUTABLE EVENT STREAM</span><strong>{verify ? (verify.valid ? "CHAIN VERIFIED" : "INTEGRITY ISSUE") : "VERIFICATION NOT RUN"}</strong></div>
      {loading ? <Loading /> : rows.length === 0 ? (
        <EmptyState title="No audit records" hint="Administrative actions will appear here as they happen." />
      ) : (
        <Card className="audit-timeline-card p-0 overflow-hidden">
          <ol className="audit-timeline">
            {rows.map((r) => (
              <li key={r.id} className="audit-event">
                <span className="audit-event-marker" aria-hidden="true" />
                <article>
                  <header><time>{r.ts ? new Date(r.ts).toLocaleString() : "—"}</time><span className="audit-event-seq">SEQ {r.seq}</span></header>
                  <div className="audit-event-body"><div><Badge tone={ACTION_TONE(r.action)}>{prettyAction(r.action)}</Badge><p className="audit-event-actor">{r.actor_id?.slice(0, 8) || "system"} <span>· {r.actor_type}</span></p></div><div className="audit-event-target"><span>{r.entity_type}</span>{r.entity_id && <code>{r.entity_id.slice(0, 12)}</code>}</div></div>
                  <div className="audit-event-details"><MetaSummary meta={r.meta} /></div>
                </article>
              </li>
            ))}
          </ol>
        </Card>
      )}
      </main>
      </section>
    </div></div>
  );
}

function MetaSummary({ meta }) {
  const skip = new Set(["actor_id", "actor_type", "entity_type", "entity_id"]);
  const entries = Object.entries(meta || {}).filter(([k, v]) => !skip.has(k) && v != null && v !== "");
  if (!entries.length) return <span className="text-slate-300">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
          <span className="text-slate-400">{k}:</span>
          {Array.isArray(v) ? `${v.length} items` : String(v).slice(0, 24)}
        </span>
      ))}
    </div>
  );
}
