
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  has_seen_tutorial BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'User'));
  
  IF NEW.email = 'studyspacerankers@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  
  INSERT INTO public.study_streaks (user_id) VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  test_type TEXT NOT NULL CHECK (test_type IN ('admin_uploaded', 'ai_generated', 'user_custom')),
  exam_type TEXT CHECK (exam_type IN ('JEE', 'NEET')),
  subject TEXT,
  chapter TEXT,
  class_level TEXT CHECK (class_level IN ('11', '12')),
  duration_minutes INTEGER NOT NULL DEFAULT 180,
  total_marks INTEGER NOT NULL DEFAULT 300,
  correct_marks NUMERIC NOT NULL DEFAULT 4,
  wrong_marks NUMERIC NOT NULL DEFAULT -1,
  unattempted_marks NUMERIC NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT false,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published tests viewable by authenticated" ON public.tests FOR SELECT TO authenticated USING (is_published = true OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert tests" ON public.tests FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR (auth.uid() = created_by AND test_type = 'user_custom'));
CREATE POLICY "Admins can update tests" ON public.tests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR (auth.uid() = created_by AND test_type = 'user_custom'));
CREATE POLICY "Admins can delete tests" ON public.tests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR (auth.uid() = created_by AND test_type = 'user_custom'));
CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON public.tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  explanation TEXT DEFAULT '',
  subject TEXT,
  topic TEXT,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questions viewable by authenticated" ON public.test_questions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND (t.is_published = true OR t.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Questions manageable by admins" ON public.test_questions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.created_by = auth.uid() AND t.test_type = 'user_custom'));
CREATE POLICY "Questions updatable" ON public.test_questions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.created_by = auth.uid() AND t.test_type = 'user_custom'));
CREATE POLICY "Questions deletable" ON public.test_questions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.created_by = auth.uid() AND t.test_type = 'user_custom'));

CREATE TABLE public.test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  total_score NUMERIC DEFAULT 0,
  positive_marks NUMERIC DEFAULT 0,
  negative_marks NUMERIC DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  unattempted_count INTEGER DEFAULT 0,
  marked_for_review_count INTEGER DEFAULT 0,
  accuracy_percentage NUMERIC DEFAULT 0,
  time_taken_seconds INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own attempts" ON public.test_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create attempts" ON public.test_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attempts" ON public.test_attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all attempts" ON public.test_attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.test_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES public.test_attempts(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.test_questions(id) ON DELETE CASCADE NOT NULL,
  selected_answer TEXT CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
  is_marked_for_review BOOLEAN DEFAULT false,
  time_spent_seconds INTEGER DEFAULT 0,
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.test_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own responses" ON public.test_responses FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.test_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid())
);
CREATE POLICY "Users can insert own responses" ON public.test_responses FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.test_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid())
);
CREATE POLICY "Users can update own responses" ON public.test_responses FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.test_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid())
);
CREATE POLICY "Admins can view all responses" ON public.test_responses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_responses_updated_at BEFORE UPDATE ON public.test_responses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own chats" ON public.chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chats" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chats" ON public.chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.study_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own streaks" ON public.study_streaks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own streaks" ON public.study_streaks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streaks" ON public.study_streaks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_streaks_updated_at BEFORE UPDATE ON public.study_streaks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('test-pdfs', 'test-pdfs', false);
CREATE POLICY "Authenticated users can upload PDFs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'test-pdfs');
CREATE POLICY "Authenticated users can view PDFs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'test-pdfs');
CREATE POLICY "Admins can delete PDFs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'test-pdfs' AND public.has_role(auth.uid(), 'admin'));
