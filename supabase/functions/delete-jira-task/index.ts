import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JIRA_BASE_URL = "https://efisa.atlassian.net";

interface DeleteRequest {
  taskId?: string;
  subtaskId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const jiraEmail = Deno.env.get("JIRA_USER_EMAIL");
    const jiraApiToken = Deno.env.get("JIRA_API_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!jiraEmail || !jiraApiToken) {
      console.error("Missing Jira credentials");
      throw new Error("Jira credentials not configured");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { taskId, subtaskId }: DeleteRequest = await req.json();

    console.log("Delete request received:", { taskId, subtaskId });

    const jiraAuth = btoa(`${jiraEmail}:${jiraApiToken}`);
    const jiraHeaders = {
      Authorization: `Basic ${jiraAuth}`,
      "Content-Type": "application/json",
    };

    // Helper function to delete issue from Jira
    async function deleteJiraIssue(issueKey: string): Promise<boolean> {
      if (!issueKey) {
        console.log("No Jira issue key provided, skipping Jira deletion");
        return true;
      }

      console.log(`Attempting to delete Jira issue: ${issueKey}`);
      
      const response = await fetch(
        `${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}?deleteSubtasks=true`,
        {
          method: "DELETE",
          headers: jiraHeaders,
        }
      );

      if (response.status === 204) {
        console.log(`Successfully deleted Jira issue: ${issueKey}`);
        return true;
      } else if (response.status === 404) {
        console.log(`Jira issue not found (already deleted?): ${issueKey}`);
        return true; // Continue with DB deletion
      } else {
        const errorText = await response.text();
        console.error(`Failed to delete Jira issue ${issueKey}:`, response.status, errorText);
        throw new Error(`Failed to delete Jira issue: ${response.status}`);
      }
    }

    // Delete a single subtask
    if (subtaskId) {
      console.log(`Deleting subtask: ${subtaskId}`);

      // Get subtask info
      const { data: subtask, error: fetchError } = await supabase
        .from("jira_task_subtasks")
        .select("jira_subtask_key")
        .eq("id", subtaskId)
        .single();

      if (fetchError) {
        console.error("Error fetching subtask:", fetchError);
        throw new Error(`Subtask not found: ${fetchError.message}`);
      }

      // Delete from Jira if has key
      if (subtask?.jira_subtask_key) {
        await deleteJiraIssue(subtask.jira_subtask_key);
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from("jira_task_subtasks")
        .delete()
        .eq("id", subtaskId);

      if (deleteError) {
        console.error("Error deleting subtask from DB:", deleteError);
        throw new Error(`Failed to delete subtask from database: ${deleteError.message}`);
      }

      console.log("Subtask deleted successfully");
      return new Response(
        JSON.stringify({ success: true, message: "Subtask deleted successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete a task and all its subtasks
    if (taskId) {
      console.log(`Deleting task: ${taskId}`);

      // Get task info
      const { data: task, error: taskFetchError } = await supabase
        .from("jira_tasks")
        .select("jira_task_key")
        .eq("id", taskId)
        .single();

      if (taskFetchError) {
        console.error("Error fetching task:", taskFetchError);
        throw new Error(`Task not found: ${taskFetchError.message}`);
      }

      // Get all subtasks
      const { data: subtasks, error: subtasksFetchError } = await supabase
        .from("jira_task_subtasks")
        .select("id, jira_subtask_key")
        .eq("jira_task_id", taskId);

      if (subtasksFetchError) {
        console.error("Error fetching subtasks:", subtasksFetchError);
      }

      // Delete subtasks from Jira first
      if (subtasks && subtasks.length > 0) {
        console.log(`Found ${subtasks.length} subtasks to delete`);
        for (const subtask of subtasks) {
          if (subtask.jira_subtask_key) {
            try {
              await deleteJiraIssue(subtask.jira_subtask_key);
            } catch (error) {
              console.error(`Failed to delete subtask ${subtask.jira_subtask_key}:`, error);
              // Continue with other deletions
            }
          }
        }
      }

      // Delete main task from Jira (with deleteSubtasks=true as fallback)
      if (task?.jira_task_key) {
        await deleteJiraIssue(task.jira_task_key);
      }

      // Delete subtasks from database
      const { error: subtasksDeleteError } = await supabase
        .from("jira_task_subtasks")
        .delete()
        .eq("jira_task_id", taskId);

      if (subtasksDeleteError) {
        console.error("Error deleting subtasks from DB:", subtasksDeleteError);
      }

      // Delete task from database
      const { error: taskDeleteError } = await supabase
        .from("jira_tasks")
        .delete()
        .eq("id", taskId);

      if (taskDeleteError) {
        console.error("Error deleting task from DB:", taskDeleteError);
        throw new Error(`Failed to delete task from database: ${taskDeleteError.message}`);
      }

      console.log("Task and subtasks deleted successfully");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Task and subtasks deleted successfully",
          deletedSubtasks: subtasks?.length || 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Either taskId or subtaskId must be provided");

  } catch (error) {
    console.error("Error in delete-jira-task:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
