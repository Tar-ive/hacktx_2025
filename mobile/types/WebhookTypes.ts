export interface PostCallTranscription {
  type: 'post_call_transcription';
  event_timestamp: number;
  data: {
    agent_id: string;
    conversation_id: string;
    status: string;
    user_id: string;
    transcript: TranscriptTurn[];
    metadata: CallMetadata;
    analysis: CallAnalysis;
    conversation_initiation_client_data: any;
  };
}

export interface TranscriptTurn {
  role: 'agent' | 'user';
  message: string;
  tool_calls: any;
  tool_results: any;
  feedback: any;
  time_in_call_secs: number;
  conversation_turn_metrics: any;
}

export interface CallMetadata {
  start_time_unix_secs: number;
  call_duration_secs: number;
  cost: number;
  deletion_settings: any;
  feedback: {
    overall_score: number | null;
    likes: number;
    dislikes: number;
  };
  authorization_method: string;
  charging: any;
  termination_reason: string;
}

export interface CallAnalysis {
  evaluation_criteria_results: any;
  data_collection_results: any;
  call_successful: string;
  transcript_summary: string;
}

export interface SummaryKeyMetric {
  label: string;
  value: number;
  unit?: string;
  delta?: string;
}

export interface SummaryVisualization {
  type: string;
  title: string;
  data_tool: string;
  data?: Record<string, number> | Record<string, unknown>;
}

export interface SummaryAudio {
  url: string;
  expires_at?: string;
  codec?: string;
}

export interface SummaryToolRun {
  tool: string;
  latency_ms?: number | null;
  cached?: boolean;
}

export interface SummaryCallMetrics {
  call_count?: number;
  total_spent?: number | null;
  avg_call_cost?: number | null;
}

export interface SummaryBundle {
  session_id?: string;
  agent?: string | null;
  highlights: string[];
  key_metrics: SummaryKeyMetric[];
  follow_ups: string[];
  visualizations: SummaryVisualization[];
  audio?: SummaryAudio | null;
  tool_runs: SummaryToolRun[];
  call_metrics?: SummaryCallMetrics;
}

export interface ConversationSummaryReady {
  type: 'conversation_summary_ready';
  session_id: string;
  summary: any;
  summary_bundle?: SummaryBundle;
  agent_metadata?: Record<string, any>;
}

export type WebhookEvent = PostCallTranscription | ConversationSummaryReady;
export type WebhookEventType = WebhookEvent['type'];
