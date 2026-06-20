import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import authService from '@/services/authService'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Label } from '@/components/common/Label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/common/Card'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) {
      setError('Reset token is missing or invalid.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const result = await authService.resetPassword(token, password)
      setMessage(result.message || 'Password updated successfully.')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Password reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Set New Password</CardTitle>
        <CardDescription>Enter a new password for your account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
          {message && <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">{message}</div>}
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading || !token}>
            {loading ? <LoadingSpinner size="sm" /> : 'Update Password'}
          </Button>
          <Link to="/login" className="text-sm text-primary hover:underline">Back to Login</Link>
        </CardFooter>
      </form>
    </Card>
  )
}
