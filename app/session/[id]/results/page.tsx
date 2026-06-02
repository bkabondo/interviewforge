import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

async function getSessionSummary(sessionId: string, baseUrl: string, authHeader: string) {
  const res = await fetch(`${baseUrl}/api/session/${sessionId}/summary`, {
    headers: { Cookie: authHeader },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: sessionId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch via API to include AI overall assessment
  const { data: session } = await supabase
    .from('interviewforge_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (!session) redirect('/dashboard')

  const { data: answers } = await supabase
    .from('interviewforge_answers')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  const avgScore =
    answers && answers.length > 0
      ? answers.reduce((sum: number, a: { score: number }) => sum + (a.score || 0), 0) / answers.length
      : 0

  const scoreColor =
    avgScore >= 7
      ? 'text-green-600'
      : avgScore >= 5
        ? 'text-yellow-600'
        : 'text-red-600'

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-xl tracking-tight">
            InterviewForge
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/session/new">
              <Button size="sm">New Session</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="outline" className="capitalize">{session.difficulty}</Badge>
            <Badge variant="secondary">{session.status}</Badge>
          </div>
          <h1 className="text-3xl font-bold mb-1">{session.job_role} Interview</h1>
          <p className="text-muted-foreground">
            {new Date(session.created_at).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Score Summary */}
        <Card className="mb-8 border-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Overall Score</p>
                <p className={cn('text-5xl font-bold', scoreColor)}>
                  {avgScore.toFixed(1)}
                  <span className="text-2xl text-muted-foreground font-normal">/10</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Questions Answered</p>
                <p className="text-2xl font-bold">{answers?.length ?? 0}/{session.questions_count}</p>
              </div>
            </div>
            <Progress value={(avgScore / 10) * 100} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0</span>
              <span>
                {avgScore >= 7 ? 'Strong Performance' : avgScore >= 5 ? 'Moderate Performance' : 'Needs Improvement'}
              </span>
              <span>10</span>
            </div>
          </CardContent>
        </Card>

        {/* AI Assessment — fetched client-side to avoid long server wait */}
        <AIAssessment sessionId={sessionId} />

        {/* Q&A Review */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Detailed Q&A Review</h2>
          <div className="space-y-5">
            {(answers || []).map((answer: {
              id: string
              question: string
              answer: string
              score: number
              feedback: string
              created_at: string
            }, index: number) => (
              <Card key={answer.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">
                        Question {index + 1}
                      </p>
                      <CardTitle className="text-base font-semibold leading-relaxed">
                        {answer.question}
                      </CardTitle>
                    </div>
                    <div className={cn(
                      'shrink-0 text-2xl font-bold',
                      answer.score >= 8
                        ? 'text-green-600'
                        : answer.score >= 5
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    )}>
                      {answer.score}/10
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Your Answer</p>
                    <p className="text-sm leading-relaxed">{answer.answer}</p>
                  </div>
                  <div className={cn(
                    'rounded-lg p-4 border',
                    answer.score >= 8
                      ? 'bg-green-50 border-green-200'
                      : answer.score >= 5
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-red-50 border-red-200'
                  )}>
                    <p className="text-xs font-medium uppercase tracking-wider mb-2 text-muted-foreground">Feedback</p>
                    <p className="text-sm leading-relaxed">{answer.feedback}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-10 flex gap-3 justify-center">
          <Link href="/session/new">
            <Button size="lg">Practice Again</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg">Back to Dashboard</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}

// Client component to fetch AI assessment separately
import AIAssessment from '@/components/AIAssessment'
