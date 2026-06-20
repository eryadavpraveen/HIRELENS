import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import authService from '@/services/authService'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Label } from '@/components/common/Label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/common/Card'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ROLES } from '@/utils/constants'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: ROLES.STUDENT })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await authService.register(form)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create Account</CardTitle>
        <CardDescription>Join HIRELENS as a student or recruiter</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
          {success && <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">Account created! Redirecting...</div>}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" value={form.password} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <div className="grid grid-cols-2 gap-2">
              {[ROLES.STUDENT, ROLES.RECRUITER].map((r) => (
                <Button key={r} type="button" variant={form.role === r ? 'default' : 'outline'} size="sm" onClick={() => setForm({ ...form, role: r })} className="capitalize">{r}</Button>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>{loading ? <LoadingSpinner size="sm" /> : 'Register'}</Button>
          <p className="text-sm text-muted-foreground">Already have an account? <Link to="/login" className="text-primary hover:underline">Login</Link></p>
        </CardFooter>
      </form>
    </Card>
  )
}
