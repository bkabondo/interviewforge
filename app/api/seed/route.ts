import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SEED_USERS = [
  {
    email: 'kabondobenjamin1@gmail.com',
    password: 'Admin@Kabondo123!',
    full_name: 'Benjamin Kabondo',
    role: 'admin',
  },
  {
    email: 'testuser1@proj.com',
    password: 'TestUser1@123',
    full_name: 'Alice Johnson',
    role: 'user',
  },
  {
    email: 'testuser2@proj.com',
    password: 'TestUser2@123',
    full_name: 'Bob Smith',
    role: 'user',
  },
  {
    email: 'testuser3@proj.com',
    password: 'TestUser3@123',
    full_name: 'Carol Davis',
    role: 'user',
  },
]

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('token') !== process.env.SETUP_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const results: { email: string; status: string; error?: string }[] = []

  for (const user of SEED_USERS) {
    try {
      // Check if user already exists in interviewforge_users
      const { data: existing } = await admin
        .from('interviewforge_users')
        .select('id')
        .eq('email', user.email)
        .single()

      if (existing) {
        results.push({ email: user.email, status: 'already exists' })
        continue
      }

      // Create auth user
      const { data: authData, error: authError } =
        await admin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
        })

      if (authError) {
        // If user already exists in auth, try to find them
        const { data: listData } = await admin.auth.admin.listUsers()
        const existingAuthUser = listData?.users?.find(
          (u) => u.email === user.email
        )
        if (existingAuthUser) {
          // Insert into interviewforge_users
          const { error: insertError } = await admin
            .from('interviewforge_users')
            .upsert({
              id: existingAuthUser.id,
              email: user.email,
              full_name: user.full_name,
              role: user.role,
            })
          if (insertError) {
            results.push({
              email: user.email,
              status: 'error',
              error: insertError.message,
            })
          } else {
            results.push({ email: user.email, status: 'profile created' })
          }
        } else {
          results.push({
            email: user.email,
            status: 'error',
            error: authError.message,
          })
        }
        continue
      }

      // Insert into interviewforge_users
      const { error: profileError } = await admin
        .from('interviewforge_users')
        .insert({
          id: authData.user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        })

      if (profileError) {
        results.push({
          email: user.email,
          status: 'error',
          error: profileError.message,
        })
      } else {
        results.push({ email: user.email, status: 'created' })
      }
    } catch (e: unknown) {
      const error = e as Error
      results.push({ email: user.email, status: 'error', error: error.message })
    }
  }

  return NextResponse.json({ results })
}
