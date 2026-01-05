import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JIRA_BASE_URL = "https://sejaefi.atlassian.net";
const JIRA_PROJECT_KEY = "MAR";

interface SubtaskInput {
  area_id: string;
  area_label: string;
  subtask_names: string[];
}

interface CreateTaskRequest {
  title: string;
  description?: string;
  jira_okr_id?: string;
  sprint_label?: string;
  areas: string[];
  subtasks: SubtaskInput[];
  user_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const JIRA_API_TOKEN = Deno.env.get("JIRA_API_TOKEN");
    if (!JIRA_API_TOKEN) {
      throw new Error("JIRA_API_TOKEN não configurado");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CreateTaskRequest = await req.json();
    console.log("Received request:", JSON.stringify(body, null, 2));

    const { title, description, jira_okr_id, sprint_label, areas, subtasks, user_id } = body;

    if (!title || !areas?.length || !subtasks?.length) {
      throw new Error("Dados incompletos: título, áreas e subtarefas são obrigatórios");
    }

    // Get epic key if OKR is provided
    let epicKey: string | null = null;
    if (jira_okr_id) {
      const { data: okr, error: okrError } = await supabase
        .from("jira_okrs")
        .select("jira_epic_key")
        .eq("id", jira_okr_id)
        .single();

      if (okrError) {
        console.error("Error fetching OKR:", okrError);
      } else {
        epicKey = okr?.jira_epic_key;
      }
    }

    // Create main task in Jira
    console.log("Creating main task in Jira...");
    
    const taskPayload: Record<string, unknown> = {
      fields: {
        project: { key: JIRA_PROJECT_KEY },
        summary: title,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: description || "Tarefa criada via Efi Tools" }],
            },
          ],
        },
        issuetype: { name: "Task" },
        labels: sprint_label ? [sprint_label] : [],
      },
    };

    // Link to epic if available
    if (epicKey) {
      taskPayload.fields = {
        ...taskPayload.fields as object,
        parent: { key: epicKey },
      };
    }

    const taskResponse = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`fabio.leme@gerencianet.com.br:${JIRA_API_TOKEN}`)}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(taskPayload),
    });

    if (!taskResponse.ok) {
      const errorText = await taskResponse.text();
      console.error("Jira API error creating task:", errorText);
      throw new Error(`Erro ao criar tarefa no Jira: ${errorText}`);
    }

    const taskData = await taskResponse.json();
    const taskKey = taskData.key;
    console.log("Task created:", taskKey);

    // Save task to database
    const { data: savedTask, error: saveError } = await supabase
      .from("jira_tasks")
      .insert({
        title,
        description,
        jira_task_key: taskKey,
        jira_okr_id: jira_okr_id || null,
        sprint_label,
        areas,
        status: "created",
        created_by: user_id,
        jira_response: taskData,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving task to database:", saveError);
      throw new Error("Tarefa criada no Jira mas erro ao salvar no banco de dados");
    }

    // Create subtasks
    const createdSubtasks: Array<{ name: string; key: string; area: string }> = [];
    const failedSubtasks: Array<{ name: string; error: string }> = [];

    for (const areaSubtasks of subtasks) {
      const { area_id, area_label, subtask_names } = areaSubtasks;

      for (const subtaskName of subtask_names) {
        console.log(`Creating subtask: ${subtaskName} for area ${area_label}`);

        const subtaskPayload = {
          fields: {
            project: { key: JIRA_PROJECT_KEY },
            parent: { key: taskKey },
            summary: subtaskName,
            description: {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: `Subtarefa da área ${area_label}` }],
                },
              ],
            },
            issuetype: { name: "Sub-task" },
            labels: [area_label, ...(sprint_label ? [sprint_label] : [])],
          },
        };

        try {
          const subtaskResponse = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue`, {
            method: "POST",
            headers: {
              "Authorization": `Basic ${btoa(`fabio.leme@gerencianet.com.br:${JIRA_API_TOKEN}`)}`,
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: JSON.stringify(subtaskPayload),
          });

          if (!subtaskResponse.ok) {
            const errorText = await subtaskResponse.text();
            console.error(`Error creating subtask ${subtaskName}:`, errorText);
            failedSubtasks.push({ name: subtaskName, error: errorText });

            // Save failed subtask to database
            await supabase.from("jira_task_subtasks").insert({
              jira_task_id: savedTask.id,
              area_id,
              subtask_name: subtaskName,
              status: "failed",
            });

            continue;
          }

          const subtaskData = await subtaskResponse.json();
          console.log(`Subtask created: ${subtaskData.key}`);

          createdSubtasks.push({
            name: subtaskName,
            key: subtaskData.key,
            area: area_label,
          });

          // Save subtask to database
          await supabase.from("jira_task_subtasks").insert({
            jira_task_id: savedTask.id,
            area_id,
            subtask_name: subtaskName,
            jira_subtask_key: subtaskData.key,
            status: "created",
          });
        } catch (subtaskError) {
          console.error(`Exception creating subtask ${subtaskName}:`, subtaskError);
          failedSubtasks.push({ 
            name: subtaskName, 
            error: subtaskError instanceof Error ? subtaskError.message : "Erro desconhecido" 
          });
        }
      }
    }

    const response = {
      success: true,
      task: {
        id: savedTask.id,
        key: taskKey,
        url: `${JIRA_BASE_URL}/browse/${taskKey}`,
      },
      subtasks: {
        created: createdSubtasks,
        failed: failedSubtasks,
      },
    };

    console.log("Final response:", JSON.stringify(response, null, 2));

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in create-jira-task:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
