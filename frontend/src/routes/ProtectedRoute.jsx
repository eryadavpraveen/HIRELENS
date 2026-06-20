import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated && !localStorage.getItem('hirelens_token')) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

export function RoleRoute({ allowedRoles }) {
  const { role, isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated && !localStorage.getItem('hirelens_token')) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (role && !allowedRoles.includes(role)) {
    const redirect = role === 'recruiter' ? '/recruiter/dashboard' : '/student/dashboard'
    return <Navigate to={redirect} replace />
  }

  return <Outlet />
}

export function GuestRoute({ children }) {
  const { isAuthenticated, role } = useAuth()

  if (isAuthenticated || localStorage.getItem('hirelens_token')) {
    const redirect = role === 'recruiter' ? '/recruiter/dashboard' : '/student/dashboard'
    return <Navigate to={redirect} replace />
  }

  return children
}
