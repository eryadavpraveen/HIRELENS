import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Copy, Check, PlusCircle } from 'lucide-react'
import { createInterview, clearCreatedInterview } from '@/features/interview/interviewSlice'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Label } from '@/components/common/Label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/common/Card'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { copyToClipboard } from '@/utils/helpers'

export default function CreateInterviewPage() {
  const dispatch = useDispatch()
  const { createdInterview, loading } = useSelector((state) => state.interview)
  const [copied, setCopied] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: '60',
    candidate_emails: '',
  })

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const start = new Date(`${form.date}T${form.time}`)
    const end = new Date(start.getTime() + parseInt(form.duration, 10) * 60000)
    await dispatch(createInterview({
      title: form.title,
      description: form.description,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration: parseInt(form.duration, 10),
      candidate_emails: form.candidate_emails.split(',').map((e) => e.trim()).filter(Boolean),
    }))
  }

  const handleReset = () => {
    setForm({ title: '', description: '', date: '', time: '', duration: '60', candidate_emails: '' })
    dispatch(clearCreatedInterview())
  }

  const handleCopy = async (field, value) => {
    await copyToClipboard(value)
    setCopied(field)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Create Interview</h1>
        <p className="text-muted-foreground">Set up a new interview session</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            Interview Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Interview Title</Label>
              <Input id="title" name="title" value={form.title} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" value={form.description} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" value={form.date} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input id="time" name="time" type="time" value={form.time} onChange={handleChange} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input id="duration" name="duration" type="number" min="15" value={form.duration} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="candidate_emails">Candidate Emails (comma-separated)</Label>
              <Input id="candidate_emails" name="candidate_emails" placeholder="student1@edu.com, student2@edu.com" value={form.candidate_emails} onChange={handleChange} />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? <LoadingSpinner size="sm" /> : 'Create Interview'}
              </Button>
              <Button type="button" variant="outline" onClick={handleReset}>Reset</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {createdInterview && (
        <Card className="border-success/30 animate-slide-up">
          <CardHeader>
            <CardTitle className="text-success">Interview Created!</CardTitle>
            <CardDescription>Share these details with your candidates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyField label="Interview ID" value={createdInterview.id} field="id" copied={copied} onCopy={handleCopy} />
            <CopyField label="Interview Code" value={createdInterview.code} field="code" copied={copied} onCopy={handleCopy} />
            <CopyField label="Interview Link" value={createdInterview.link} field="link" copied={copied} onCopy={handleCopy} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function CopyField({ label, value, field, copied, onCopy }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/5 p-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-mono">{value}</p>
      </div>
      <Button type="button" variant="outline" size="icon" onClick={() => onCopy(field, value)}>
        {copied === field ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  )
}
