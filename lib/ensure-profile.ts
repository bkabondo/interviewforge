import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Creates this app's profile row for a signed-in user, if it is missing.
 *
 * auth.users is shared by all ten apps in this Supabase project, but each app
 * keeps its own <app>_users table and the user-owned tables have foreign keys
 * to it. So an account created in any other app — or through an OAuth provider,
 * or before this app's signup form existed — authenticates perfectly well and
 * then fails on the first write with a foreign key violation.
 *
 * Called at the point of the first write, not at sign-in: a InterviewForge profile
 * should come into being because someone did something in InterviewForge, not because
 * they signed up for a different app. Backfilling every shared auth user would
 * create accounts here for other apps' users and seed data.
 *
 * ignoreDuplicates, NOT a plain upsert: an upsert would rewrite role on every
 * call and silently demote an admin. This only ever fills a gap.
 */
export async function ensureProfile(user: User): Promise<boolean> {
  const email = user.email
  if (!email) return false

  const fullName =
    (user.user_metadata?.full_name as string | undefined)?.trim() || email.split('@')[0]

  const { error } = await createAdminClient()
    .from('interviewforge_users')
    .upsert(
      { id: user.id, email, full_name: fullName, role: 'user' },
      { onConflict: 'id', ignoreDuplicates: true }
    )

  if (error) {
    console.error('ensureProfile failed:', `${error.code ?? '?'}: ${error.message ?? '?'}`)
    return false
  }
  return true
}
