import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { PublicLayout, AuthLayout } from '@/layouts/AuthLayout'
import { DashboardLayout, InterviewRoomLayout } from '@/layouts/DashboardLayout'
import { ProtectedRoute, RoleRoute, GuestRoute } from '@/routes/ProtectedRoute'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { ROLES } from '@/utils/constants'

// Lazy-loaded route components -> automatic code splitting per page.
const LandingPage = lazy(() => import('@/pages/Landing/LandingPage'))
const LoginPage = lazy(() => import('@/pages/Auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/Auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/Auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/Auth/ResetPasswordPage'))

const StudentDashboard = lazy(() => import('@/pages/Student/StudentDashboard'))
const JoinInterview = lazy(() => import('@/pages/Student/JoinInterview'))
const InterviewHistory = lazy(() => import('@/pages/Student/InterviewHistory'))
const StudentProfile = lazy(() => import('@/pages/Student/StudentProfile'))
const StudentInterviewRoom = lazy(() => import('@/pages/Student/StudentInterviewRoom'))
const VerificationPage = lazy(() => import('@/pages/Student/VerificationPage'))

const RecruiterDashboard = lazy(() => import('@/pages/Recruiter/RecruiterDashboard'))
const CreateInterview = lazy(() => import('@/pages/Recruiter/CreateInterview'))
const ActiveInterviews = lazy(() => import('@/pages/Recruiter/ActiveInterviews'))
const Candidates = lazy(() => import('@/pages/Recruiter/Candidates'))
const RecruiterProfile = lazy(() => import('@/pages/Recruiter/RecruiterProfile'))
const RecruiterInterviewRoom = lazy(() => import('@/pages/Recruiter/RecruiterInterviewRoom'))

const StudentReports = lazy(() => import('@/pages/Reports/StudentReports'))
const RecruiterReports = lazy(() => import('@/pages/Reports/RecruiterReports'))
const ReportDetail = lazy(() => import('@/pages/Reports/ReportDetail'))

function PlaceholderPage({ title }) {
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted-foreground">Content coming soon.</p>
    </div>
  )
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy" element={<PlaceholderPage title="Privacy Policy" />} />
          <Route path="/terms" element={<PlaceholderPage title="Terms & Conditions" />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
          <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
        </Route>

        {/* Student Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowedRoles={[ROLES.STUDENT]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/join" element={<JoinInterview />} />
              <Route path="/student/history" element={<InterviewHistory />} />
              <Route path="/student/reports" element={<StudentReports />} />
              <Route path="/student/profile" element={<StudentProfile />} />
              <Route path="/student/reports/:id" element={<ReportDetail role="student" />} />
            </Route>
            <Route element={<InterviewRoomLayout />}>
              <Route path="/student/interview/:id/verify" element={<VerificationPage />} />
              <Route path="/student/interview/:id" element={<StudentInterviewRoom />} />
            </Route>
          </Route>
        </Route>

        {/* Recruiter Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowedRoles={[ROLES.RECRUITER]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
              <Route path="/recruiter/create" element={<CreateInterview />} />
              <Route path="/recruiter/active" element={<ActiveInterviews />} />
              <Route path="/recruiter/candidates" element={<Candidates />} />
              <Route path="/recruiter/reports" element={<RecruiterReports />} />
              <Route path="/recruiter/profile" element={<RecruiterProfile />} />
              <Route path="/recruiter/reports/:id" element={<ReportDetail role="recruiter" />} />
            </Route>
            <Route element={<InterviewRoomLayout />}>
              <Route path="/recruiter/interview/:id" element={<RecruiterInterviewRoom />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
