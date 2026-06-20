import { useState } from 'react'
import { Link } from 'react-router-dom'
import authService from '@/services/authService'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Label } from '@/components/common/Label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/common/Card'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const result = await authService.forgotPassword(email)
      setMessage(result.message)
    } catch (err) {
      setError(err.response?.data?.detail || 'Request failed')
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>Enter your email to receive a reset link</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {message && <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">{message}</div>}
          {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full">Send Reset Link</Button>
          <Link to="/login" className="text-sm text-primary hover:underline">Back to Login</Link>
        </CardFooter>
      </form>
    </Card>
  )
}
