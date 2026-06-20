import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { hydrateSession } from '@/features/auth/authSlice'
import { PageLoader } from '@/components/common/LoadingSpinner'

export function AuthBootstrap({ children }) {
  const dispatch = useDispatch()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('hirelens_token')
    if (!token) {
      setReady(true)
      return
    }
    dispatch(hydrateSession()).finally(() => setReady(true))
  }, [dispatch])

  if (!ready) return <PageLoader />
  return children
}

export default AuthBootstrap
