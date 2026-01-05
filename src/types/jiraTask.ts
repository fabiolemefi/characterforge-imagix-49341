export interface JiraOkr {
  id: string;
  name: string;
  jira_epic_key: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface JiraArea {
  id: string;
  name: string;
  label: string;
  default_subtasks: string[];
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JiraTask {
  id: string;
  title: string;
  description: string | null;
  jira_task_key: string | null;
  jira_okr_id: string | null;
  sprint_label: string | null;
  areas: string[];
  status: 'pending' | 'created' | 'failed';
  created_by: string;
  created_at: string;
  updated_at: string;
  jira_response: Record<string, unknown> | null;
  jira_okr?: JiraOkr | null;
}

export interface JiraTaskSubtask {
  id: string;
  jira_task_id: string;
  area_id: string | null;
  subtask_name: string;
  jira_subtask_key: string | null;
  status: 'pending' | 'created' | 'failed';
  created_at: string;
  jira_area?: JiraArea | null;
}

export interface CreateJiraTaskInput {
  title: string;
  description?: string;
  jira_okr_id?: string;
  sprint_label?: string;
  areas: string[];
  subtasks: {
    area_id: string;
    area_label: string;
    subtask_names: string[];
  }[];
}

export interface CreateJiraOkrInput {
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
}

// Sprint label helper - generates labels like "jan-s3"
export function generateSprintLabel(date: Date = new Date()): string {
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const month = months[date.getMonth()];
  const weekOfMonth = Math.ceil(date.getDate() / 7);
  return `${month}-s${weekOfMonth}`;
}

// Get available sprint options for current and next weeks
export function getSprintOptions(): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = [];
  const today = new Date();
  
  for (let i = -1; i <= 4; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + (i * 7));
    const label = generateSprintLabel(date);
    const displayLabel = i === 0 ? `${label} (atual)` : label;
    
    if (!options.find(o => o.value === label)) {
      options.push({ label: displayLabel, value: label });
    }
  }
  
  return options;
}
