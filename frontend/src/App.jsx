import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth.jsx";
import { accessGrant } from "./lib/api.js";
import { AppShell } from "./components/layout/AppShell.jsx";

const AccessGate = lazy(() => import("./pages/AccessGate.jsx"));
const DriveAccessGate = lazy(() => import("./pages/DriveAccessGate.jsx"));
const Landing = lazy(() => import("./pages/Landing.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const AttendDrive = lazy(() => import("./pages/AttendDrive.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const MyLearning = lazy(() => import("./pages/MyLearning.jsx"));
const Achievements = lazy(() => import("./pages/Achievements.jsx"));
const ExamPortal = lazy(() => import("./pages/ExamPortal.jsx"));
const Drives = lazy(() => import("./pages/Drives.jsx"));
const SkillMap = lazy(() => import("./pages/SkillMap.jsx"));
const CodingPractice = lazy(() => import("./pages/CodingPractice.jsx"));
const CareerReadiness = lazy(() => import("./pages/CareerReadiness.jsx"));
const MatchedOpportunities = lazy(() => import("./pages/MatchedOpportunities.jsx"));
const KeepSharp = lazy(() => import("./pages/KeepSharp.jsx"));
const Wallet = lazy(() => import("./pages/Wallet.jsx"));
const WalletVerify = lazy(() => import("./pages/WalletVerify.jsx"));
const CertificateVerify = lazy(() => import("./pages/CertificateVerify.jsx"));
const AdaptiveDrill = lazy(() => import("./pages/AdaptiveDrill.jsx"));
const PeerMesh = lazy(() => import("./pages/PeerMesh.jsx"));
const Lessons = lazy(() => import("./pages/Lessons.jsx"));
const PracticeWorlds = lazy(() => import("./pages/PracticeWorlds.jsx"));
const LessonViewer = lazy(() => import("./pages/LessonViewer.jsx"));
const Notifications = lazy(() => import("./pages/Notifications.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const LearnProfile = lazy(() => import("./pages/LearnProfile.jsx"));
const RecruiterDrives = lazy(() => import("./pages/recruiter/RecruiterDrives.jsx"));
const DriveConsole = lazy(() => import("./pages/recruiter/DriveConsole.jsx"));
const QuestionBank = lazy(() => import("./pages/recruiter/QuestionBank.jsx"));
const DriveAccessCodes = lazy(() => import("./pages/recruiter/DriveAccessCodes.jsx"));
const Assessments = lazy(() => import("./pages/Assessments.jsx"));
const Certificates = lazy(() => import("./pages/Certificates.jsx"));
const Tutor = lazy(() => import("./pages/Tutor.jsx"));
const AdminConsole = lazy(() => import("./pages/admin/AdminConsole.jsx"));
const CurriculumStudio = lazy(() => import("./pages/admin/CurriculumStudio.jsx"));
const TrainerConsole = lazy(() => import("./pages/admin/TrainerConsole.jsx"));
const TrainingCenterStudio = lazy(() => import("./pages/admin/TrainingCenterStudio.jsx"));
const AccessCodes = lazy(() => import("./pages/admin/AccessCodes.jsx"));
const RolesPermissions = lazy(() => import("./pages/admin/RolesPermissions.jsx"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement.jsx"));
const AnalyticsExplorer = lazy(() => import("./pages/admin/AnalyticsExplorer.jsx"));
const AuditLog = lazy(() => import("./pages/admin/AuditLog.jsx"));
const StudentHome = lazy(() => import("./pages/StudentHome.jsx"));
const ContentStudio = lazy(() => import("./pages/admin/ContentStudio.jsx"));
const CourseBuilder = lazy(() => import("./pages/admin/CourseBuilder.jsx"));
const PlacementAnalytics = lazy(() => import("./pages/admin/PlacementAnalytics.jsx"));

// Auth guard. `product` selects which app shell wraps the page; `bare` renders
// without a shell (the app chooser). LMS and Drive never share a shell.
// `roles` restricts a page to those roles — hiding a link in the nav is not a
// guard, so staff pages must reject a student who types the URL directly.
function Protected({ children, product, bare, roles, skipGate }) {
  const { user, loading } = useAuth();
  if (loading)
    return <div className="min-h-screen grid place-items-center text-slate-400">Loading…</div>;
  // Separate logins per product — bounce to the matching one.
  if (!user) return <Navigate to={product === "drive" ? "/hire/login" : "/learn/login"} replace />;
  if (roles?.length && !(user.roles || []).some((r) => roles.includes(r)))
    return <Navigate to={product === "lms" ? "/lms" : "/drive"} replace />;
  // LMS Access Gate — a student must present their class Access ID this session
  // before entering the learning environment. Staff/admins are exempt.
  if (product === "lms" && !skipGate) {
    const isStudent = (user.roles || []).includes("student");
    const isStaff = (user.roles || []).some((r) => LMS_STAFF.includes(r));
    if (isStudent && !isStaff && !accessGrant.value)
      return <Navigate to="/lms/access-gate" replace />;
  }
  // Drive Access Gate — a candidate must present their Drive Access ID.
  if (product === "drive" && !skipGate) {
    const isStudent = (user.roles || []).includes("student");
    const isStaff = (user.roles || []).some((r) => DRIVE_STAFF.includes(r));
    if (isStudent && !isStaff && !accessGrant.value)
      return <Navigate to="/drive/access-gate" replace />;
  }
  if (bare) return children;
  return <AppShell product={product}>{children}</AppShell>;
}

// Staff role sets — the same ones the backend enforces on the matching routes.
const DRIVE_STAFF = ["super_admin", "company_admin", "recruiter", "college_admin"];
const LMS_STAFF = ["super_admin", "college_admin", "trainer", "content_manager"];

// Platform administration (RBAC, and later the Super Admin portal). The backend
// enforces the actual capability via granular permissions; this is the coarse
// route gate on top of that.
const PLATFORM_ADMIN = ["super_admin", "company_admin"];

const lms = (el) => <Protected product="lms">{el}</Protected>;
const lmsStaff = (el) => (
  <Protected product="lms" roles={LMS_STAFF}>{el}</Protected>
);
const platformAdmin = (el) => (
  <Protected product="lms" roles={PLATFORM_ADMIN}>{el}</Protected>
);
// Institution analytics — leadership & academic roles. The backend clips every
// rollup to the caller's scope, so the same page serves each role's own view.
const ANALYTICS_ROLES = ["super_admin", "company_admin", "college_admin",
  "principal", "dean", "hod", "tpo", "faculty", "trainer"];
const analyticsView = (el) => (
  <Protected product="lms" roles={ANALYTICS_ROLES}>{el}</Protected>
);
// Content authoring — admins, trainers and faculty (backend enforces the
// academic.course.manage / lms.curriculum.manage permission).
const CONTENT_AUTHORS = ["super_admin", "company_admin", "college_admin", "trainer", "faculty", "hod"];
const contentAuthor = (el) => (
  <Protected product="lms" roles={CONTENT_AUTHORS}>{el}</Protected>
);
const TRAINING_CENTER_ROLES = ["super_admin", "company_admin", "college_admin", "principal", "dean", "hod", "trainer", "faculty"];
const trainingCenterAccess = (el) => (
  <Protected product="lms" roles={TRAINING_CENTER_ROLES}>{el}</Protected>
);
const drive = (el) => <Protected product="drive">{el}</Protected>;
const driveStaff = (el) => (
  <Protected product="drive" roles={DRIVE_STAFF}>{el}</Protected>
);

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-slate-500">Loading Lityra…</div>}>
      <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      {/* Separate logins per product (separate accounts). /login & /register keep
          working as the Learn defaults. */}
      <Route path="/login" element={<Login product="learn" />} />
      <Route path="/register" element={<Register product="learn" />} />
      <Route path="/learn/login" element={<Login product="learn" />} />
      <Route path="/trainer/login" element={<Login product="learn" audience="trainer" />} />
      <Route path="/learn/register" element={<Register product="learn" />} />
      <Route path="/hire/login" element={<Login product="hire" />} />
      <Route path="/hire/register" element={<Register product="hire" />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      {/* Public, no-login Drive registration */}
      <Route path="/drive/attend" element={<AttendDrive />} />
      <Route path="/verify/wallet/:verifyId" element={<WalletVerify />} />
      <Route path="/verify/:verifyId" element={<CertificateVerify />} />

      {/* ================= Lityra Learn (LMS) ================= */}
      {/* Access Gate — students validate their class Access ID before entry. */}
      <Route path="/lms/access-gate" element={<Protected product="lms" bare skipGate><AccessGate /></Protected>} />
      <Route path="/lms" element={lms(<Dashboard />)} />
      <Route path="/lms/roadmap" element={lms(<StudentHome />)} />
      <Route path="/lms/learning" element={lms(<MyLearning />)} />
      <Route path="/lms/assessments" element={lms(<Assessments />)} />
      <Route path="/lms/skill-map" element={lms(<SkillMap />)} />
      <Route path="/lms/practice" element={lms(<CodingPractice />)} />
      <Route path="/lms/careers" element={lms(<CareerReadiness />)} />
      <Route path="/lms/keep-sharp" element={lms(<KeepSharp />)} />
      <Route path="/lms/wallet" element={lms(<Wallet />)} />
      <Route path="/lms/drill" element={lms(<AdaptiveDrill />)} />
      <Route path="/lms/mesh" element={lms(<PeerMesh />)} />
      <Route path="/lms/lessons" element={lms(<Lessons />)} />
      <Route path="/lms/lesson/:lid" element={lms(<LessonViewer />)} />
      <Route path="/lms/worlds" element={lms(<PracticeWorlds />)} />
      <Route path="/lms/achievements" element={lms(<Achievements />)} />
      <Route path="/lms/tutor" element={lms(<Tutor />)} />
      <Route path="/lms/certificates" element={lms(<Certificates />)} />
      <Route path="/lms/admin" element={lmsStaff(<AdminConsole />)} />
      <Route path="/lms/training-centers" element={trainingCenterAccess(<TrainingCenterStudio />)} />
      <Route path="/lms/curriculum" element={lmsStaff(<CurriculumStudio />)} />
      <Route path="/lms/trainer" element={lmsStaff(<TrainerConsole />)} />
      <Route path="/lms/access-codes" element={lmsStaff(<AccessCodes />)} />
      <Route path="/lms/roles" element={platformAdmin(<RolesPermissions />)} />
      <Route path="/lms/users" element={platformAdmin(<UserManagement />)} />
      <Route path="/lms/institution-analytics" element={analyticsView(<AnalyticsExplorer />)} />
      <Route path="/lms/placement" element={analyticsView(<PlacementAnalytics />)} />
      <Route path="/lms/audit" element={platformAdmin(<AuditLog />)} />
      <Route path="/lms/course-builder" element={contentAuthor(<CourseBuilder />)} />
      {/* Deep links to the individual studios still resolve; the nav uses Course Builder. */}
      <Route path="/lms/content-studio" element={contentAuthor(<ContentStudio />)} />
      <Route path="/lms/notifications" element={lms(<Notifications />)} />
      <Route path="/lms/profile" element={lms(<LearnProfile />)} />
      <Route path="/lms/settings" element={lms(<Settings />)} />

      {/* ================= Lityra Hire (Drive) ================= */}
      {/* Access Gate — candidates validate their Drive Access ID before entry. */}
      <Route path="/drive/access-gate" element={<Protected product="drive" bare skipGate><DriveAccessGate /></Protected>} />
      <Route path="/drive" element={drive(<Drives />)} />
      <Route path="/drive/opportunities" element={drive(<MatchedOpportunities />)} />
      <Route path="/drive/test/:examId" element={drive(<ExamPortal />)} />
      <Route path="/drive/recruiter/drives" element={driveStaff(<RecruiterDrives />)} />
      <Route path="/drive/recruiter/drives/:id" element={driveStaff(<DriveConsole />)} />
      <Route path="/drive/recruiter/questions" element={driveStaff(<QuestionBank />)} />
      <Route path="/drive/recruiter/access-codes" element={driveStaff(<DriveAccessCodes />)} />
      <Route path="/drive/notifications" element={drive(<Notifications />)} />
      <Route path="/drive/profile" element={drive(<Profile />)} />
      <Route path="/drive/settings" element={drive(<Settings />)} />

      {/* Back-compat: the old chooser is gone — send to the home page. */}
      <Route path="/apps" element={<Navigate to="/" replace />} />
      <Route path="/app/*" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
