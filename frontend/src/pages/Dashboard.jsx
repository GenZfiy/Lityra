import "../styles/learner-candidate-pages.css";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Code2,
  Compass,
  Flame,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { Badge, Button, Card, XPBar } from "../components/ui/primitives.jsx";
import { Loading } from "../components/ui/states.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { api, withFallback } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { emptyGame, emptyScorecard } from "../lib/demo.js";

const QUICK_ACTIONS = [
  { to: "/lms/learning", icon: BookOpen, number: "01", title: "Continue learning", description: "Pick up a lesson or explore your learning path.", tone: "learn" },
  { to: "/lms/practice", icon: Code2, number: "02", title: "Practice a skill", description: "Work through coding challenges and build fluency.", tone: "practice" },
  { to: "/lms/assessments", icon: Target, number: "03", title: "Check your progress", description: "Take an assessment and see what to focus on next.", tone: "assess" },
  { to: "/lms/careers", icon: Compass, number: "04", title: "Explore career paths", description: "Connect your skills to possible next steps.", tone: "career" },
];

const DIMS = [
  { key: "communication", label: "Communication", color: "#06b6d4" },
  { key: "coding", label: "Coding", color: "#3b82a1" },
  { key: "aptitude", label: "Aptitude", color: "#c68b25" },
  { key: "project", label: "Projects", color: "#71934b" },
];

const BADGE_META = {
  streak_7: { icon: Flame, name: "7-day streak" },
  dsa_i: { icon: Code2, name: "DSA I" },
  aptitude_ace: { icon: Target, name: "Aptitude Ace" },
};

export default function Dashboard() {
  const { user } = useAuth();
  const learnerId = user?.id;
  const first = (user?.full_name || "there").split(" ")[0];
  const reduceMotion = useReducedMotion();
  const game = useAsync(
    () => (learnerId ? withFallback(api.game(learnerId), emptyGame) : Promise.resolve({ data: emptyGame, live: false })),
    [learnerId],
  );
  const scores = useAsync(
    () => (learnerId ? withFallback(api.scorecard(learnerId), emptyScorecard) : Promise.resolve({ data: emptyScorecard, live: false })),
    [learnerId],
  );

  if (game.loading) return <Loading label="Loading your learning overview…" />;
  const progress = game.data || emptyGame;
  const scorecard = (scores.data || [])[0] || {};
  const badges = progress.badges || [];
  const hasStarted = (progress.total_xp || 0) > 0;

  return (
    <div className="page-composition page-composition-learning"><div className="lms-home space-y-9">
      <header className="lms-home-heading">
        <div>
          <p className="lms-kicker"><Sparkles size={14} /> Your learning space</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-normal text-ink-900 sm:text-4xl">
            {hasStarted ? `Welcome back, ${first}.` : `Welcome, ${first}.`}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            {hasStarted
              ? "Keep your momentum going. Choose a next step that feels useful today."
              : "Start wherever you are. A lesson, a practice challenge, or a quick assessment will help you find your rhythm."}
          </p>
        </div>
        <Badge tone="teal"><CheckCircle2 size={14} /> Your pace, your path</Badge>
      </header>

      <section className="lms-next-panel" aria-labelledby="next-step-title">
        <div className="lms-next-copy">
          <p className="lms-kicker lms-kicker-light">A good place to start</p>
          <h2 id="next-step-title">{hasStarted ? "One more step forward." : "Make your first move."}</h2>
          <p>{hasStarted ? "Continue a lesson and keep building on what you already know." : "Explore a lesson and start building skills one step at a time."}</p>
          <div className="lms-next-actions">
            <Button as={Link} to="/lms/learning" variant="amber" size="md">
              {hasStarted ? "Continue learning" : "Explore learning"} <ArrowRight size={17} />
            </Button>
            {hasStarted && (
              <span className="lms-xp-note"><Trophy size={14} /> {progress.total_xp || 0} XP earned</span>
            )}
          </div>
        </div>
        <div className="lms-level-panel">
          <div className="lms-level-top">
            <span className="lms-level-icon"><Trophy size={19} /></span>
            <span className="text-xs font-semibold text-white/70">YOUR MOMENTUM</span>
          </div>
          <p className="lms-level-number">Level {progress.level || 1}</p>
          <XPBar value={progress.total_xp || 0} max={progress.next_level_at || 1000} label="Progress to next level" />
        </div>
      </section>

      <section aria-labelledby="actions-title">
        <div className="lms-section-heading">
          <div>
            <p className="lms-kicker">Keep moving</p>
            <h2 id="actions-title">What would you like to do?</h2>
          </div>
          <Link className="lms-all-link" to="/lms/roadmap">View my roadmap <ArrowRight size={15} /></Link>
        </div>
        <div className="lms-action-grid">
          {QUICK_ACTIONS.map(({ to, icon: Icon, number, title, description, tone }, index) => (
            <motion.div
              key={to}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : index * 0.045 }}
            >
              <Link className={`lms-action-item lms-action-${tone}`} to={to}>
                <div className="flex items-center justify-between">
                  <span className="lms-action-icon"><Icon size={19} strokeWidth={1.8} /></span>
                  <span className="lms-action-number">{number}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="lms-action-arrow" aria-hidden="true"><ArrowRight size={17} /></span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="lms-progress-grid" aria-label="Progress and achievements">
        <Card className="lms-progress-card">
          <div className="lms-section-heading lms-section-heading-tight">
            <div>
              <p className="lms-kicker">Your progress</p>
              <h2>Skill snapshot</h2>
            </div>
            <Link className="lms-icon-link" to="/lms/skill-map" aria-label="Open my skill map"><ArrowRight size={18} /></Link>
          </div>
          <p className="-mt-2 mb-6 text-sm text-slate-500">Your scorecard updates as you learn and practice.</p>
          <div className="space-y-5">
            {DIMS.map((dimension) => {
              const value = Math.max(0, Math.min(100, Math.round(scorecard[dimension.key] ?? 0)));
              return (
                <div key={dimension.key}>
                  <div className="mb-2 flex justify-between gap-3 text-sm">
                    <span className="font-medium text-ink-900">{dimension.label}</span>
                    <span className="tabular-nums text-slate-500">{value}%</span>
                  </div>
                  <div className="lms-skill-track" role="progressbar" aria-label={`${dimension.label} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
                    <motion.div
                      className="lms-skill-fill"
                      style={{ backgroundColor: dimension.color }}
                      initial={reduceMotion ? false : { width: 0 }}
                      animate={{ width: `${value}%` }}
                      transition={{ duration: reduceMotion ? 0 : 0.65, ease: "easeOut" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {!hasStarted && <p className="mt-5 text-xs leading-5 text-slate-400">No progress yet. It will appear here as you complete activities.</p>}
        </Card>

        <Card className="lms-badges-card">
          <div className="lms-section-heading lms-section-heading-tight">
            <div>
              <p className="lms-kicker">Milestones</p>
              <h2>Achievements</h2>
            </div>
            <Link className="lms-icon-link" to="/lms/achievements" aria-label="View all achievements"><ArrowRight size={18} /></Link>
          </div>
          {badges.length ? (
            <ul className="lms-badge-list">
              {badges.slice(0, 4).map((code) => {
                const achievement = BADGE_META[code] || { icon: Award, name: code };
                const Icon = achievement.icon;
                return <li key={code}><span><Icon size={17} /></span>{achievement.name}</li>;
              })}
            </ul>
          ) : (
            <div className="lms-achievement-empty">
              <span><Award size={21} /></span>
              <p>Your first milestone is waiting.</p>
              <Link to="/lms/achievements">See how to earn badges <ArrowRight size={14} /></Link>
            </div>
          )}
          <div className="lms-streak-row">
            <span><Flame size={16} /> Learning streak</span>
            <strong>{progress.streak?.current ?? 0} days</strong>
          </div>
        </Card>
      </section>

      <div className="lms-help-note"><span><Sparkles size={16} /></span><p>Not sure what to focus on? <Link to="/lms/tutor">Ask your AI tutor for a study plan.</Link></p></div>
    </div></div>
  );
}
