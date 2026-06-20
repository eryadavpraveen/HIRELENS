import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Video, Link2, Hash } from 'lucide-react'
import interviewService from '@/services/interviewService'
import { setCurrentInterview, joinInterview } from '@/features/interview/interviewSlice'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Label } from '@/components/common/Label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/common/Card'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function JoinInterviewPage() {
  const [interviewId, setInterviewId] = useState('')
  const [code, setCode] = useState('')
  const [link, setLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!interviewId && !code && !link) {
      setError('Enter an Interview ID, Code, or Link')
      return
    }

    setLoading(true)
    setError('')
    try {
      const interview = await interviewService.validateJoin({ interviewId, code, link })
      dispatch(setCurrentInterview(interview))
      await dispatch(joinInterview(interview.id)).unwrap()
      // Identity + voice verification is required before entering the room.
      navigate(`/student/interview/${interview.id}/verify`)
    } catch (err) {
      setError(err.message || 'Invalid interview credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Join Interview</h1>
        <p className="text-muted-foreground">Enter your interview details to join the session</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Join Session
          </CardTitle>
          <CardDescription>Use any one of the fields below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="id" className="flex items-center gap-2"><Hash className="h-4 w-4" /> Interview ID</Label>
              <Input id="id" placeholder="e.g. int-001" value={interviewId} onChange={(e) => setInterviewId(e.target.value)} />
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Interview Code</Label>
              <Input id="code" placeholder="e.g. FE2026" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="link" className="flex items-center gap-2"><Link2 className="h-4 w-4" /> Interview Link</Label>
              <Input id="link" placeholder="https://..." value={link} onChange={(e) => setLink(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <LoadingSpinner size="sm" /> : 'Join Interview'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
