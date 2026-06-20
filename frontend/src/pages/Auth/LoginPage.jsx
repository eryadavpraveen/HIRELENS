import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Eye, EyeOff } from 'lucide-react'
import { loginUser, clearError } from '@/features/auth/authSlice'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Label } from '@/components/common/Label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/common/Card'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ROLES } from '@/utils/constants'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [roleHint, setRoleHint] = useState(ROLES.STUDENT)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    dispatch(clearError())
    const result = await dispatch(loginUser({ email, password, role: roleHint }))
    if (loginUser.fulfilled.match(result)) {
      const userRole = result.payload.role
      navigate(userRole === ROLES.RECRUITER ? '/recruiter/dashboard' : '/student/dashboard')
    }
  }

  return (
    <Card className="border-white/10">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome Back</CardTitle>
        <CardDescription>Sign in to your HIRELENS account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {typeof error === 'string' ? error : 'Login failed'}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Login as</Label>
            <div className="grid grid-cols-2 gap-2">
              {[ROLES.STUDENT, ROLES.RECRUITER].map((r) => (
                <Button
                  key={r}
                  type="button"
                  variant={roleHint === r ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleHint(r)}
                  className="capitalize"
                >
                  {r}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <LoadingSpinner size="sm" /> : 'Login'}
          </Button>
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot Password?
          </Link>
          <p className="text-sm text-muted-foreground">
            No account?{' '}
            <Link to="/register" className="text-primary hover:underline">Register</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
