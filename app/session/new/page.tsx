'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const JOB_ROLES = [
  'Software Engineer',
  'Frontend Engineer',
  'Backend Engineer',
  'Full Stack Engineer',
  'Product Manager',
  'Data Scientist',
  'Machine Learning Engineer',
  'DevOps Engineer',
  'Site Reliability Engineer',
  'UX Designer',
  'Business Analyst',
  'Marketing Manager',
  'Sales Manager',
  'Project Manager',
]

const DIFFICULTIES = [
  {
    value: 'easy',
    label: 'Easy',
    description: 'Foundational concepts, entry-level',
    color: 'border-blue-300 bg-blue-50 text-blue-700',
    selectedColor: 'border-blue-500 bg-blue-100',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'Practical experience required',
    color: 'border-orange-300 bg-orange-50 text-orange-700',
    selectedColor: 'border-orange-500 bg-orange-100',
  },
  {
    value: 'hard',
    label: 'Hard',
    description: 'Advanced, senior-level depth',
    color: 'border-red-300 bg-red-50 text-red-700',
    selectedColor: 'border-red-500 bg-red-100',
  },
]

export default function NewSessionPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState('')
  const [customRole, setCustomRole] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [loading, setLoading] = useState(false)

  const jobRole = selectedRole === '__custom__' ? customRole : selectedRole

  async function handleStart() {
    if (!jobRole.trim()) {
      toast.error('Please select or enter a job role')
      return
    }
    if (!selectedDifficulty) {
      toast.error('Please select a difficulty level')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_role: jobRole.trim(), difficulty: selectedDifficulty }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to start session')
        return
      }
      router.push(`/session/${data.session.id}?q=${encodeURIComponent(data.question)}&qn=1`)
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-xl tracking-tight">
            InterviewForge
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">Dashboard</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Start New Session</h1>
          <p className="text-muted-foreground">
            Choose your target role and difficulty to get personalized interview questions.
          </p>
        </div>

        {/* Job Role */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">
            1. Select Job Role
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-3">
            {JOB_ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={cn(
                  'text-left px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                  selectedRole === role
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border hover:border-foreground/40 bg-background'
                )}
              >
                {role}
              </button>
            ))}
            <button
              onClick={() => setSelectedRole('__custom__')}
              className={cn(
                'text-left px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                selectedRole === '__custom__'
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border hover:border-foreground/40 bg-background border-dashed'
              )}
            >
              + Custom Role
            </button>
          </div>
          {selectedRole === '__custom__' && (
            <input
              type="text"
              placeholder="e.g. Cloud Architect"
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 rounded-lg border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          )}
        </div>

        {/* Difficulty */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4">2. Select Difficulty</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                onClick={() => setSelectedDifficulty(d.value)}
                className={cn(
                  'p-5 rounded-xl border-2 text-left transition-all',
                  selectedDifficulty === d.value
                    ? 'border-foreground shadow-sm'
                    : 'border-border hover:border-foreground/30'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={cn('text-xs', d.color)}>{d.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{d.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Summary & Start */}
        {jobRole && selectedDifficulty && (
          <Card className="mb-8 border-foreground/20">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{jobRole}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {selectedDifficulty} difficulty · 5 questions
                </p>
              </div>
              <Button onClick={handleStart} disabled={loading} size="lg">
                {loading ? 'Starting...' : 'Start Interview'}
              </Button>
            </CardContent>
          </Card>
        )}

        {(!jobRole || !selectedDifficulty) && (
          <p className="text-muted-foreground text-sm">
            Select a role and difficulty to begin.
          </p>
        )}
      </main>
    </div>
  )
}
