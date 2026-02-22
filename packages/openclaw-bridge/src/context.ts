import type { KanbuTaskContext } from './types.js';

/**
 * Build a structured prompt from a KanbuTaskContext.
 * This is the message sent to the agent when a task is dispatched.
 */
export function buildTaskMessage(task: KanbuTaskContext): string {
  const lines: string[] = [];

  lines.push(`# Task Assignment`);
  lines.push(``);
  lines.push(`**Workspace:** ${task.workspaceName}`);
  lines.push(`**Project:** ${task.projectName}`);
  if (task.assignedAgentRole) {
    lines.push(`**Your role:** ${task.assignedAgentRole}`);
  }
  lines.push(``);
  lines.push(`## Task`);
  lines.push(``);
  lines.push(`**ID:** ${task.taskId}`);
  lines.push(`**Title:** ${task.taskTitle}`);

  if (task.taskDescription) {
    lines.push(``);
    lines.push(`**Description:**`);
    lines.push(task.taskDescription);
  }

  if (task.wikiContext && task.wikiContext.length > 0) {
    lines.push(``);
    lines.push(`## Relevant Knowledge`);
    lines.push(``);
    for (const page of task.wikiContext) {
      lines.push(page);
      lines.push(``);
    }
  }

  if (task.graphitiContext) {
    lines.push(``);
    lines.push(`## Knowledge Graph Context`);
    lines.push(``);
    lines.push(task.graphitiContext);
  }

  if (task.customInstructions) {
    lines.push(``);
    lines.push(`## Instructions`);
    lines.push(``);
    lines.push(task.customInstructions);
  }

  lines.push(``);
  lines.push(`---`);
  lines.push(`*Task dispatched by Kanbu. Update task status via MCP tools as you work.*`);

  return lines.join('\n');
}
