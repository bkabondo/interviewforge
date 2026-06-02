import { Pool } from 'pg'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('token') !== process.env.SETUP_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS interviewforge_users (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL UNIQUE, full_name TEXT,
        role TEXT DEFAULT 'user' CHECK (role IN ('admin','user')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      GRANT ALL ON interviewforge_users TO anon, authenticated;
      ALTER TABLE interviewforge_users ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='if_users_self' AND tablename='interviewforge_users') THEN
          CREATE POLICY "if_users_self" ON interviewforge_users FOR ALL USING (auth.uid()=id OR (SELECT role FROM interviewforge_users WHERE id=auth.uid())='admin');
        END IF;
      END $$;
      CREATE TABLE IF NOT EXISTS interviewforge_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES interviewforge_users(id) ON DELETE CASCADE,
        job_role TEXT NOT NULL, difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
        total_score NUMERIC DEFAULT 0, questions_count INTEGER DEFAULT 5,
        status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      GRANT ALL ON interviewforge_sessions TO anon, authenticated;
      ALTER TABLE interviewforge_sessions ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='if_sessions_user' AND tablename='interviewforge_sessions') THEN
          CREATE POLICY "if_sessions_user" ON interviewforge_sessions FOR ALL USING (user_id=auth.uid() OR (SELECT role FROM interviewforge_users WHERE id=auth.uid())='admin');
        END IF;
      END $$;
      CREATE TABLE IF NOT EXISTS interviewforge_answers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES interviewforge_sessions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES interviewforge_users(id) ON DELETE CASCADE,
        question TEXT NOT NULL, answer TEXT NOT NULL,
        score INTEGER CHECK (score BETWEEN 0 AND 10), feedback TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      GRANT ALL ON interviewforge_answers TO anon, authenticated;
      ALTER TABLE interviewforge_answers ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='if_answers_user' AND tablename='interviewforge_answers') THEN
          CREATE POLICY "if_answers_user" ON interviewforge_answers FOR ALL USING (user_id=auth.uid() OR (SELECT role FROM interviewforge_users WHERE id=auth.uid())='admin');
        END IF;
      END $$;
    `)
    return NextResponse.json({ status: 'Migration complete' })
  } catch (e: unknown) {
    const error = e as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
    await pool.end()
  }
}
