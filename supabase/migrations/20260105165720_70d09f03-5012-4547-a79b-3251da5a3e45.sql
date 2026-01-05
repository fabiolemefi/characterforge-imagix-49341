-- Tabela para cadastrar OKRs/Épicos manualmente
CREATE TABLE public.jira_okrs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  jira_epic_key TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para áreas de trabalho com subtarefas típicas
CREATE TABLE public.jira_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  default_subtasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para histórico de tarefas criadas
CREATE TABLE public.jira_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  jira_task_key TEXT,
  jira_okr_id UUID REFERENCES public.jira_okrs(id),
  sprint_label TEXT,
  areas TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  jira_response JSONB
);

-- Tabela para subtarefas criadas
CREATE TABLE public.jira_task_subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jira_task_id UUID NOT NULL REFERENCES public.jira_tasks(id) ON DELETE CASCADE,
  area_id UUID REFERENCES public.jira_areas(id),
  subtask_name TEXT NOT NULL,
  jira_subtask_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jira_okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_task_subtasks ENABLE ROW LEVEL SECURITY;

-- Policies para jira_okrs
CREATE POLICY "Authenticated users can view OKRs" ON public.jira_okrs
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create OKRs" ON public.jira_okrs
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update OKRs" ON public.jira_okrs
  FOR UPDATE USING (true);

CREATE POLICY "Admins can delete OKRs" ON public.jira_okrs
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies para jira_areas
CREATE POLICY "Anyone can view active areas" ON public.jira_areas
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage areas" ON public.jira_areas
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies para jira_tasks
CREATE POLICY "Authenticated users can view tasks" ON public.jira_tasks
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create tasks" ON public.jira_tasks
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update tasks" ON public.jira_tasks
  FOR UPDATE USING (true);

-- Policies para jira_task_subtasks
CREATE POLICY "Authenticated users can view subtasks" ON public.jira_task_subtasks
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage subtasks" ON public.jira_task_subtasks
  FOR ALL USING (true);

-- Triggers para updated_at
CREATE TRIGGER update_jira_okrs_updated_at
  BEFORE UPDATE ON public.jira_okrs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jira_areas_updated_at
  BEFORE UPDATE ON public.jira_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jira_tasks_updated_at
  BEFORE UPDATE ON public.jira_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed das áreas iniciais
INSERT INTO public.jira_areas (name, label, default_subtasks, display_order) VALUES
  ('Conteúdo', 'em-conteudo', '["Briefing de conteúdo", "Redação", "Revisão"]'::jsonb, 1),
  ('Design', 'em-design', '["Criação visual", "Ajustes de layout", "Aprovação visual"]'::jsonb, 2),
  ('CRM', 'em-crm', '["Configuração de disparo", "Segmentação", "Testes A/B"]'::jsonb, 3);