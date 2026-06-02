import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const steps = [
    {
      step: '01',
      title: 'Choose Your Role',
      description:
        'Select your target job role and difficulty level — from Junior to Senior positions across Software Engineering, Product Management, Data Science, and more.',
    },
    {
      step: '02',
      title: 'Answer AI Questions',
      description:
        'Claude generates tailored interview questions specific to your role. Answer them just like you would in a real interview.',
    },
    {
      step: '03',
      title: 'Get Instant Feedback',
      description:
        'Each answer is scored 0–10 with detailed, actionable feedback. Understand exactly what to improve.',
    },
    {
      step: '04',
      title: 'Review Your Performance',
      description:
        'Get a comprehensive session summary with an AI overall assessment of your strengths and areas for improvement.',
    },
  ]

  const roles = [
    'Software Engineer',
    'Product Manager',
    'Data Scientist',
    'DevOps Engineer',
    'UX Designer',
    'Marketing Manager',
    'Business Analyst',
    'Machine Learning Engineer',
  ]

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-xl tracking-tight">
            InterviewForge
          </Link>
          <nav className="flex items-center gap-3">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    Dashboard
                  </Button>
                </Link>
                <Link href="/session/new">
                  <Button size="sm">Start Interview</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <Badge variant="secondary" className="mb-6 text-sm px-4 py-1.5">
            Powered by Claude AI
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Ace Your Next Interview with{' '}
            <span className="underline decoration-2 underline-offset-4">
              AI Coaching
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            InterviewForge generates real interview questions for your target
            role, scores your answers instantly, and gives you the feedback you
            need to land the job.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={user ? '/session/new' : '/signup'}>
              <Button size="lg" className="w-full sm:w-auto px-8">
                Start Practicing Free
              </Button>
            </Link>
            <Link href={user ? '/dashboard' : '/login'}>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto px-8"
              >
                {user ? 'Go to Dashboard' : 'Sign In'}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-12 px-4 border-t bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-muted-foreground mb-4 uppercase tracking-widest font-medium">
            Interview prep for every role
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {roles.map((role) => (
              <Badge key={role} variant="outline" className="text-sm px-3 py-1">
                {role}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-muted-foreground text-lg">
              Four steps to a more confident interview performance
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {steps.map((s) => (
              <Card key={s.step} className="border">
                <CardContent className="p-6">
                  <div className="text-4xl font-bold text-muted-foreground/30 mb-3">
                    {s.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {s.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 border-t bg-foreground text-background">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-background/70 text-lg mb-8">
            Join thousands of candidates who have sharpened their interview
            skills with InterviewForge.
          </p>
          <Link href={user ? '/session/new' : '/signup'}>
            <Button
              size="lg"
              variant="secondary"
              className="px-10"
            >
              {user ? 'Start a New Session' : 'Create Free Account'}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span>InterviewForge &copy; {new Date().getFullYear()}</span>
          <span>Built with Next.js &amp; Claude AI</span>
        </div>
      </footer>
    </div>
  )
}
