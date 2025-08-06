import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

// Import Multer types for file uploads
import 'multer';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Resume {
  id: string;
  userId: string;
  filename: string;
  filePath: string;
  originalText: string;
  parsedData: ParsedResumeData;
  uploadedAt: Date;
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
  startedAt?: Date;
  completedAt?: Date;
  overallScore?: number;
  feedback?: string;
  createdAt: Date;
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
  createdAt: Date;
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

export interface VoiceProfile {
  id: string;
  userId: string;
  voiceId: string; // ElevenLabs voice ID
  voiceSettings: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  createdAt: Date;
}

// API Request/Response Types
export interface ResumeUploadRequest {
  userId: string;
}

export interface ResumeParseResponse {
  success: boolean;
  data?: ParsedResumeData;
  error?: string;
}

export interface StartInterviewRequest {
  userId: string;
  resumeId: string;
}

export interface StartInterviewResponse {
  success: boolean;
  sessionId?: string;
  questions?: InterviewQuestion[];
  error?: string;
}

export interface SubmitResponseRequest {
  sessionId: string;
  questionId: string;
  responseText: string;
  audioFile?: Express.Multer.File;
}

export interface SubmitResponseResponse {
  success: boolean;
  evaluation?: AIEvaluation;
  nextQuestion?: InterviewQuestion;
  error?: string;
}

export interface InterviewResultsResponse {
  success: boolean;
  results?: {
    sessionId: string;
    overallScore: number;
    questionResults: {
      question: string;
      response: string;
      score: number;
      feedback: string;
    }[];
    overallFeedback: string;
    strengths: string[];
    improvementAreas: string[];
  };
  error?: string;
}

export interface TTSRequest {
  text: string;
  voiceId?: string;
}

export interface STTRequest {
  audioFile: Express.Multer.File;
}

export interface STTResponse {
  success: boolean;
  transcription?: string;
  error?: string;
}
