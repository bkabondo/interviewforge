'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface AIAssessmentProps {
  sessionId: string
}

export default function AIAssessment({ sessionId }: AIAssessmentProps) {
  const [assessment, setAssessment] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchAssessment() {
      try {
        const res = await fetch(`/api/session/${sessionId}/summary`)
        if (!res.ok) {
          setError(true)
          return
        }
        const data = await res.json()
        setAssessment(data.overall_assessment)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchAssessment()
  }, [sessionId])

  if (error) return null

  return (
    <Card className="border-2 border-foreground/10">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-3">AI Overall Assessment</h2>
        <Separator className="mb-4" />
        {loading ? (
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-4/5" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/5" />
          </div>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
            {assessment}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
