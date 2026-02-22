/**
 * Configuration for the OpenClaw HTTP client.
 */
export interface OpenClawConfig {
  /** Base URL of the OpenClaw gateway, e.g. "http://100.88.203.92:18789" */
  gatewayUrl: string;
  /** Bearer token for authentication */
  token: string;
  /** Default session key, e.g. "agent:main:main". Defaults to "agent:main:main" */
  sessionKey?: string;
  /** Model identifier. Defaults to "openclaw:main" */
  model?: string;
}

/**
 * Context bundle sent to an agent when dispatching a Kanbu task.
 */
export interface KanbuTaskContext {
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  projectName: string;
  workspaceName: string;
  /** Role or specialisation of the assigned agent, e.g. "developer" */
  assignedAgentRole?: string;
  /** Relevant wiki page contents to inject as context */
  wikiContext?: string[];
  /** Graphiti 1-hop snapshot (JSON string) */
  graphitiContext?: string;
  /** Additional instructions specific to this dispatch */
  customInstructions?: string;
}

/**
 * A human approval request raised by an agent mid-execution.
 */
export interface PendingApproval {
  approvalId: string;
  runId: string;
  /** The command or action requiring approval */
  command: string;
  /** Why the agent is asking for approval */
  reason: string;
  requestedAt: Date;
  /** Auto-reject after this many milliseconds */
  timeoutMs: number;
}

export type ApprovalDecision = 'approved' | 'rejected';

/**
 * OpenAI-compatible chat completion response from the OpenClaw gateway.
 */
export interface OpenClawChatResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}
