// Tipos TypeScript para chat e IA
// Basados en los esquemas reales del backend

export interface ChatSession {
  id: number;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at?: string;
}

export interface ChatMessage {
  id: number;
  session_id: number;
  content: string;
  sender: 'user' | 'assistant' | 'system';
  message_type: 'text' | 'file' | 'image' | 'code' | 'analysis' | 'recommendation';
  message_metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ChatSessionWithMessages extends ChatSession {
  messages: ChatMessage[];
}

export interface ChatSessionCreate {
  user_id: string;
  title?: string;
}

export interface ChatMessageCreate {
  session_id: number;
  content: string;
  sender: 'user' | 'assistant' | 'system';
  message_type?: 'text' | 'file' | 'image' | 'code' | 'analysis' | 'recommendation';
  message_metadata?: Record<string, unknown>;
}

export interface ChatSessionsResponse {
  sessions: ChatSession[];
  total: number;
  mock_mode?: boolean;
}

export interface ChatMessagesResponse {
  messages: ChatMessage[];
  total: number;
  session_id: number;
}

// Tipos para IA y análisis
export interface AnalysisQuery {
  question: string;
  context?: string;
  development_id?: string;
  provider_name?: string;
}

export interface AnalysisResponse {
  analysis: string;
  confidence?: number;
  sources?: string[];
  timestamp: string;
  model_used: string;
}

export interface Recommendation {
  title: string;
  description: string;
  priority: string;
  category: string;
  confidence: number;
  estimated_impact?: string;
}

export interface RecommendationRequest {
  development_id: string;
  context?: string;
  focus_area?: string;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  development_id: string;
  generated_at: string;
}

export interface RiskAnalysis {
  risk_level: number; // 0-1
  risk_factors: string[];
  mitigation_strategies: string[];
  actions: string[];
  confidence: number;
}

export interface IntelligentDashboardData {
  metrics: unknown;
  ai_insights: string;
  recommendations: Recommendation[];
  risk_analysis: RiskAnalysis;
  trends: unknown;
  generated_at: string;
}

export interface TrendAnalysis {
  trend_type: string;
  trend_direction: 'up' | 'down' | 'stable';
  trend_strength: number;
  description: string;
  implications: string[];
  recommendations: string[];
}

export interface TimelinePrediction {
  development_id: string;
  predicted_completion_date: string;
  confidence: number;
  risk_factors: string[];
  recommendations: string[];
  generated_at: string;
}

export interface ContextualChatRequest {
  message: string;
  context_type: 'development' | 'provider' | 'general';
  context_id?: string;
  session_id?: number;
}

export interface ContextualChatResponse {
  response: string;
  context_used: string[];
  confidence: number;
  suggestions?: string[];
  session_id: number;
  message_id: number;
}

// Tipos para filtros y consultas
export interface ChatSessionFilters {
  user_id: string;
  limit?: number;
  offset?: number;
}

export interface ChatMessageFilters {
  session_id: number;
  limit?: number;
  offset?: number;
  message_type?: string;
  sender?: string;
}

// Tipos para configuración de IA
export interface AIConfiguration {
  model_preference: 'claude' | 'gpt' | 'auto';
  max_tokens: number;
  temperature: number;
  context_window: number;
  enable_analysis: boolean;
  enable_recommendations: boolean;
  enable_risk_detection: boolean;
}

export interface AIConfigurationUpdate {
  model_preference?: 'claude' | 'gpt' | 'auto';
  max_tokens?: number;
  temperature?: number;
  context_window?: number;
  enable_analysis?: boolean;
  enable_recommendations?: boolean;
  enable_risk_detection?: boolean;
}
