import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

function ScoreBadge({ score }: { score: number }) {
  const pct = (score / 10) * 100
  const color =
    pct >= 75
      ? 'bg-green-100 text-green-800 border-green-200'
      : pct >= 50
        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
        : 'bg-red-100 text-red-800 border-red-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${color}`}>
      {score.toFixed(1)}/10
    </span>
  )
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const styles: Record<string, string> = {
    easy: 'bg-blue-50 text-blue-700 border-blue-200',
    medium: 'bg-orange-50 text-orange-700 border-orange-200',
    hard: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${styles[difficulty] || ''}`}>
      {difficulty}
    </span>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('interviewforge_users')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  const { data: sessions } = await supabase
    .from('interviewforge_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const completedSessions = (sessions || []).filter((s) => s.status === 'completed')
  const avgScore =
    completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.total_score || 0), 0) /
        completedSessions.length
      : null

  async function handleSignOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Nav */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-xl tracking-tight">
            InterviewForge
          </Link>
          <div className="flex items-center gap-3">
            {profile?.role === 'admin' && (
              <Link href="/admin">
                <Button variant="ghost" size="sm">Admin</Button>
              </Link>
            )}
            <Link href="/session/new">
              <Button size="sm">New Session</Button>
            </Link>
            <form action={handleSignOut}>
              <Button variant="ghost" size="sm" type="submit">Sign Out</Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-1">
            Welcome back, {profile?.full_name?.split(' ')[0] ?? 'there'}
          </h1>
          <p className="text-muted-foreground">
            Track your interview prep progress and start new sessions.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          <Card>
            <CardContent className="p-5">
              <div className="text-2xl font-bold">{(sessions || []).length}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Sessions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-2xl font-bold">{completedSessions.length}</div>
              <div className="text-sm text-muted-foreground mt-1">Completed</div>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-5">
              <div className="text-2xl font-bold">
                {avgScore != null ? `${avgScore.toFixed(1)}/10` : '—'}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Avg Score</div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Sessions</h2>
          <Link href="/session/new">
            <Button size="sm">Start New Session</Button>
          </Link>
        </div>

        {!sessions || sessions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center">
              <p className="text-muted-foreground mb-4">No sessions yet. Start your first interview!</p>
              <Link href="/session/new">
                <Button>Start First Session</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Card key={session.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium truncate">{session.job_role}</span>
                      <DifficultyBadge difficulty={session.difficulty} />
                      {session.status === 'in_progress' && (
                        <Badge variant="outline" className="text-xs">In Progress</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(session.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {' · '}
                      {session.questions_count} questions
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {session.status === 'completed' && session.total_score != null && (
                      <ScoreBadge score={Number(session.total_score)} />
                    )}
                    {session.status === 'completed' ? (
                      <Link href={`/session/${session.id}/results`}>
                        <Button variant="outline" size="sm">Results</Button>
                      </Link>
                    ) : (
                      <Link href={`/session/${session.id}`}>
                        <Button size="sm">Continue</Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
