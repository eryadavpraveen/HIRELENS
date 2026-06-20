import { useDispatch, useSelector } from 'react-redux'

export const useAppDispatch = () => useDispatch()
export const useAppSelector = useSelector

export function useAuth() {
  const { user, role, token, isAuthenticated, loading, error } = useAppSelector(
    (state) => state.auth
  )
  return { user, role, token, isAuthenticated, loading, error }
}

export function useMonitoring() {
  const { liveEvents, statuses, warnings, connected } = useAppSelector(
    (state) => state.monitoring
  )
  return { liveEvents, statuses, warnings, connected }
}
