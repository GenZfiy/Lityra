import "../../styles/institution-operations-pages.css";
import { useState } from "react";
import { FolderTree, Library } from "lucide-react";
import { PageHeader } from "../../components/ui/states.jsx";
import CurriculumStudio from "./CurriculumStudio.jsx";
import ContentStudio from "./ContentStudio.jsx";

// One place to build a course end to end: the Structure tab designs the
// curriculum (years → modules → topics + interactive lessons); the Materials
// tab attaches resources (recordings, PDFs, slides, coding) to those topics —
// which then appear on every eligible student's roadmap.
const TABS = [
  { key: "structure", label: "Structure", icon: FolderTree,
    hint: "Design the programme: years, modules, topics & interactive lessons" },
  { key: "materials", label: "Materials", icon: Library,
    hint: "Attach recordings, notes, slides and coding resources to each topic" },
];

export default function CourseBuilder() {
  const [tab, setTab] = useState("structure");
  const active = TABS.find((t) => t.key === tab);

  return (
    <div className="page-composition page-composition-institution institution-ops institution-ops-course"><div>
      <PageHeader title="Course Builder" subtitle={active.hint} />

      <section className="course-builder-workspace" aria-label="Course authoring workflow">
      <nav className="course-builder-steps" role="tablist" aria-label="Course authoring stages">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={`course-builder-step inline-flex items-center gap-3 h-12 px-4 rounded-lg text-sm font-medium border transition
                ${tab === t.key ? "border-brand-400 bg-brand-500/10 text-brand-700"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
              <span className="course-step-number">{TABS.findIndex((step) => step.key === t.key) + 1}</span><Icon size={17} /><span className="course-step-copy"><strong>{t.label}</strong><small>{t.hint}</small></span>
            </button>
          );
        })}
      </nav>

      <main className="course-builder-stage" role="tabpanel">{tab === "structure" ? <CurriculumStudio embedded /> : <ContentStudio embedded />}</main>
      </section>
    </div></div>
  );
}
