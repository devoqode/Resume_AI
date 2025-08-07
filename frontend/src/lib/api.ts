// API Configuration and Base Client
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Types for API responses
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Resume {
  id: string;
  userId: string;
  filename: string;
  filePath: string;
  originalText: string;
  parsedData: ParsedResumeData;
  uploadedAt: Date | string;
}

export interface ParsedResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  workExperience: WorkExperience[];
  education: Education[];
  skills: string[];
  summary?: string;
}

export interface WorkExperience {
  title: string;
  company: string;
  duration: string;
  location?: string;
  description: string;
  skills: string[];
  startDate?: string;
  endDate?: string;
  software?: string[];
  aiSuggestedSkills?: string[];
  aiSuggestedSoftware?: string[];
}

export interface Education {
  degree: string;
  institution: string;
  graduationYear?: string;
  gpa?: string;
  relevantCoursework?: string[];
}

export interface InterviewSession {
  id: string;
  userId: string;
  resumeId: string;
  questions: InterviewQuestion[];
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  startedAt?: Date | string;
  completedAt?: Date | string;
  overallScore?: number;
  feedback?: string;
  createdAt: Date | string;
}

export interface InterviewQuestion {
  id: string;
  sessionId: string;
  questionText: string;
  questionType: 'experience' | 'technical' | 'behavioral' | 'situational';
  orderIndex: number;
  response?: InterviewResponse;
  isRequired: boolean;
}

export interface InterviewResponse {
  id: string;
  questionId: string;
  responseText: string;
  audioFilePath?: string;
  responseTimeMs: number;
  score?: number;
  feedback?: string;
  aiEvaluation?: AIEvaluation;
  createdAt: Date | string;
}

export interface AIEvaluation {
  relevance: number; // 0-10
  clarity: number; // 0-10
  completeness: number; // 0-10
  technicalAccuracy?: number; // 0-10
  overallScore: number; // 0-10
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
}

export interface Voice {
  voiceId: string;
  name: string;
  category: string;
  labels: {
    accent?: string;
    description?: string;
    age?: string;
    gender?: string;
    use_case?: string;
  };
  previewUrl?: string;
}

// HTTP client utility
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = this.getStoredToken();
  }

  private getStoredToken(): string | null {
    return localStorage.getItem('authToken');
  }

  public setToken(token: string): void {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  public clearToken(): void {
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private getMultipartHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  public async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: unknown;
      isMultipart?: boolean;
    } = {}
  ): Promise<ApiResponse<T>> {
    const { method = 'GET', body, isMultipart = false } = options;

    try {
      const config: RequestInit = {
        method,
        headers: isMultipart ? this.getMultipartHeaders() : this.getHeaders(),
      };

      if (body) {
        if (isMultipart) {
          config.body = body; // FormData
        } else {
          config.body = JSON.stringify(body);
        }
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      // Handle different response types
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        return data as ApiResponse<T>;
      } else if (contentType?.includes('audio/')) {
        // For audio responses, return blob
        const audioBlob = await response.blob();
        return {
          success: response.ok,
          data: audioBlob as unknown as T,
        };
      } else {
        // For other content types, try to parse as text
        const text = await response.text();
        return {
          success: response.ok,
          data: text as unknown as T,
        };
      }
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Convenience methods
  public get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  public post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  public put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  public delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  public postMultipart<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body: formData, isMultipart: true });
  }
}

// Create singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

// Auth API
export const authAPI = {
  async signup(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<AuthResponse>('/api/auth/signup', userData);
  },

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<AuthResponse>('/api/auth/login', credentials);
  },

  async createTestUser(): Promise<ApiResponse<User>> {
    return apiClient.post<User>('/api/auth/create-test-user');
  },

  logout() {
    apiClient.clearToken();
  },
};

// Resume API
export const resumeAPI = {
  async upload(file: File, userId: string): Promise<ApiResponse<Resume>> {
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('userId', userId);
    
    return apiClient.postMultipart<Resume>('/api/resume/upload', formData);
  },

  async getAll(userId: string): Promise<ApiResponse<Resume[]>> {
    return apiClient.get<Resume[]>(`/api/resume/user/${userId}`);
  },

  async getOne(resumeId: string): Promise<ApiResponse<Resume>> {
    return apiClient.get<Resume>(`/api/resume/${resumeId}`);
  },

  async delete(resumeId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>(`/api/resume/${resumeId}`);
  },

  async reparse(resumeId: string): Promise<ApiResponse<Resume>> {
    return apiClient.post<Resume>(`/api/resume/${resumeId}/reparse`);
  },

  async getStats(userId: string): Promise<ApiResponse<{
    totalResumes: number;
    totalInterviews: number;
    averageScore: number;
    lastActivity: string;
  }>> {
    return apiClient.get(`/api/resume/user/${userId}/stats`);
  },
};

// Interview API
export const interviewAPI = {
  async start(data: {
    userId: string;
    resumeId: string;
    voiceId?: string;
  }): Promise<ApiResponse<InterviewSession>> {
    return apiClient.post<InterviewSession>('/api/interview/start', data);
  },

  async submitResponse(data: {
    sessionId: string;
    questionId: string;
    audioFile?: File;
    responseText: string;
  }): Promise<ApiResponse<InterviewResponse>> {
    if (data.audioFile) {
      const formData = new FormData();
      formData.append('sessionId', data.sessionId);
      formData.append('questionId', data.questionId);
      formData.append('audio', data.audioFile);
      formData.append('responseText', data.responseText);
      
      return apiClient.postMultipart<InterviewResponse>('/api/interview/response', formData);
    } else {
      return apiClient.post<InterviewResponse>('/api/interview/response', {
        sessionId: data.sessionId,
        questionId: data.questionId,
        responseText: data.responseText,
      });
    }
  },

  async complete(sessionId: string): Promise<ApiResponse<InterviewSession>> {
    return apiClient.post<InterviewSession>(`/api/interview/${sessionId}/complete`);
  },

  async getSession(sessionId: string): Promise<ApiResponse<InterviewSession>> {
    return apiClient.get<InterviewSession>(`/api/interview/${sessionId}`);
  },

  async getAllSessions(userId: string): Promise<ApiResponse<InterviewSession[]>> {
    return apiClient.get<InterviewSession[]>(`/api/interview/user/${userId}`);
  },

  async delete(sessionId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>(`/api/interview/${sessionId}`);
  },

  async generateQuestions(data: {
    workExperience: any[];
    questionType?: 'technical' | 'behavioral' | 'all';
  }): Promise<ApiResponse<InterviewQuestion[]>> {
    return apiClient.post<InterviewQuestion[]>('/api/interview/generate-questions', data);
  },
};

// Voice API
export const voiceAPI = {
  async textToSpeech(data: {
    text: string;
    voiceId?: string;
    options?: {
      stability?: number;
      similarityBoost?: number;
      style?: number;
      useSpeakerBoost?: boolean;
    };
  }): Promise<ApiResponse<Blob>> {
    return apiClient.post<Blob>('/api/voice/tts', data);
  },

  async textToSpeechFile(data: {
    text: string;
    voiceId?: string;
    options?: {
      stability?: number;
      similarityBoost?: number;
      style?: number;
      useSpeakerBoost?: boolean;
    };
  }): Promise<ApiResponse<{ audioUrl: string; filename: string }>> {
    return apiClient.post<{ audioUrl: string; filename: string }>('/api/voice/tts/file', data);
  },

  async speechToText(audioFile: File): Promise<ApiResponse<{ transcription: string }>> {
    const formData = new FormData();
    formData.append('audio', audioFile);
    
    return apiClient.postMultipart<{ transcription: string }>('/api/voice/stt', formData);
  },

  async speechToTextVerbose(audioFile: File): Promise<ApiResponse<{
    transcription: string;
    confidence: number;
    words?: Array<{
      word: string;
      start: number;
      end: number;
      confidence: number;
    }>;
  }>> {
    const formData = new FormData();
    formData.append('audio', audioFile);
    
    return apiClient.postMultipart<{
      transcription: string;
      confidence: number;
      words?: Array<{
        word: string;
        start: number;
        end: number;
        confidence: number;
      }>;
    }>('/api/voice/stt/verbose', formData);
  },

  async getVoices(): Promise<ApiResponse<Voice[]>> {
    return apiClient.get<Voice[]>('/api/voice/voices');
  },

  async getVoice(voiceId: string): Promise<ApiResponse<Voice>> {
    return apiClient.get<Voice>(`/api/voice/voices/${voiceId}`);
  },

  getAudioUrl(filename: string): string {
    return `${API_BASE_URL}/api/voice/audio/${filename}`;
  },
};

// Utility functions
export const getCurrentUser = (): User | null => {
  const token = localStorage.getItem('authToken');
  const userId = localStorage.getItem('userId');
  
  if (!token || !userId) return null;
  
  // In a real app, you'd decode the JWT token to get user info
  // For now, we'll use stored data or make an API call
  const userData = localStorage.getItem('userData');
  
  if (userData) {
    return JSON.parse(userData) as User;
  }
  
  return null;
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('authToken');
};
