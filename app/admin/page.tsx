import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check admin role
  const { data: profile } = await supabase
    .from('interviewforge_users')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Get all users with session counts
  const { data: users } = await supabase
    .from('interviewforge_users')
    .select('*')
    .order('created_at', { ascending: false })

  // Get all sessions
  const { data: sessions } = await supabase
    .from('interviewforge_sessions')
    .select('*, interviewforge_users(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(50)

  const completedSessions = (sessions || []).filter((s) => s.status === 'completed')
  const avgScore =
    completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (Number(s.total_score) || 0), 0) /
        completedSessions.length
      : 0

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-xl tracking-tight">
            InterviewForge
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Admin</Badge>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Admin Panel</h1>
          <p className="text-muted-foreground">
            Platform overview and user management
          </p>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <Card>
            <CardContent className="p-5">
              <div className="text-2xl font-bold">{(users || []).length}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Users</div>
            </CardContent>
          </Card>
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
          <Card>
            <CardContent className="p-5">
              <div className="text-2xl font-bold">{avgScore.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground mt-1">Avg Score</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Users */}
          <div>
            <h2 className="text-xl font-semibold mb-4">All Users</h2>
            <div className="space-y-3">
              {(users || []).map((u) => (
                <Card key={u.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{u.full_name || 'Unnamed'}</p>
                      <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Joined {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={u.role === 'admin' ? 'default' : 'secondary'}
                      className="shrink-0 capitalize"
                    >
                      {u.role}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Sessions */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Sessions</h2>
            <div className="space-y-3">
              {(sessions || []).map((session) => {
                const u = session.interviewforge_users as { full_name: string; email: string } | null
                return (
                  <Card key={session.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{session.job_role}</p>
                          <p className="text-xs text-muted-foreground">
                            {u?.full_name || u?.email || 'Unknown'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {session.difficulty}
                          </Badge>
                          {session.status === 'completed' && session.total_score != null && (
                            <span className="text-sm font-semibold">
                              {Number(session.total_score).toFixed(1)}/10
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.created_at).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={session.status === 'completed' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {session.status === 'completed' ? 'Completed' : 'In Progress'}
                          </Badge>
                          {session.status === 'completed' && (
                            <Link href={`/session/${session.id}/results`}>
                              <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                                View
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
