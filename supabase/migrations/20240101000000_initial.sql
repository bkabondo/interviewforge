CREATE TABLE IF NOT EXISTS interviewforge_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT ALL ON interviewforge_users TO anon, authenticated;
ALTER TABLE interviewforge_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "if_users_select" ON interviewforge_users;
CREATE POLICY "if_users_select" ON interviewforge_users FOR SELECT USING (auth.uid()=id OR EXISTS(SELECT 1 FROM interviewforge_users u WHERE u.id=auth.uid() AND u.role='admin'));
DROP POLICY IF EXISTS "if_users_insert" ON interviewforge_users;
CREATE POLICY "if_users_insert" ON interviewforge_users FOR INSERT WITH CHECK (auth.uid()=id);
DROP POLICY IF EXISTS "if_users_update" ON interviewforge_users;
CREATE POLICY "if_users_update" ON interviewforge_users FOR UPDATE USING (auth.uid()=id);

CREATE TABLE IF NOT EXISTS interviewforge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  level TEXT DEFAULT 'mid',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT ALL ON interviewforge_templates TO anon, authenticated;
ALTER TABLE interviewforge_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "if_templates_select" ON interviewforge_templates;
CREATE POLICY "if_templates_select" ON interviewforge_templates FOR SELECT USING (TRUE);

CREATE TABLE IF NOT EXISTS interviewforge_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES interviewforge_users(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  job_level TEXT DEFAULT 'mid',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed')),
  overall_score REAL,
  total_questions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
GRANT ALL ON interviewforge_sessions TO anon, authenticated;
ALTER TABLE interviewforge_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "if_sessions_all" ON interviewforge_sessions;
CREATE POLICY "if_sessions_all" ON interviewforge_sessions FOR ALL USING (user_id=auth.uid() OR EXISTS(SELECT 1 FROM interviewforge_users WHERE id=auth.uid() AND role='admin'));

CREATE TABLE IF NOT EXISTS interviewforge_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES interviewforge_sessions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  user_answer TEXT,
  ai_feedback TEXT,
  score REAL,
  feedback_json JSONB,
  asked_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT ALL ON interviewforge_questions TO anon, authenticated;
ALTER TABLE interviewforge_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "if_questions_all" ON interviewforge_questions;
CREATE POLICY "if_questions_all" ON interviewforge_questions FOR ALL USING (
  EXISTS(SELECT 1 FROM interviewforge_sessions WHERE id=session_id AND user_id=auth.uid())
);

INSERT INTO interviewforge_templates (title,level,description) VALUES
  ('Software Engineer','mid','Full-stack engineering role'),
  ('Product Manager','mid','Product strategy and roadmap'),
  ('Data Scientist','mid','ML and analytics role'),
  ('UX Designer','mid','Product design role')
ON CONFLICT DO NOTHING;
