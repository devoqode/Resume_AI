import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  authAPI,
  resumeAPI,
  interviewAPI,
  voiceAPI,
  apiClient,
  getCurrentUser,
  isAuthenticated,
  type User,
  type Resume,
  type InterviewSession,
  type Voice,
  type InterviewResponse,
  type AuthResponse,
} from '@/lib/api';

// Auth hooks
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(getCurrentUser);
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: authAPI.login,
    onSuccess: (response) => {
      if (response.success && response.data) {
        const { user, token } = response.data;
        apiClient.setToken(token);
        localStorage.setItem('userId', user.id);
        localStorage.setItem('userData', JSON.stringify(user));
        setUser(user);
        setIsLoggedIn(true);
        toast({
          title: 'Login Successful',
          description: `Welcome back, ${user.firstName}!`,
        });
      } else {
        toast({
          title: 'Login Failed',
          description: response.error || 'Invalid credentials',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Login Error',
        description: error.message || 'Failed to login',
        variant: 'destructive',
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: authAPI.signup,
    onSuccess: (response) => {
      if (response.success && response.data) {
        const { user, token } = response.data;
        apiClient.setToken(token);
        localStorage.setItem('userId', user.id);
        localStorage.setItem('userData', JSON.stringify(user));
        setUser(user);
        setIsLoggedIn(true);
        toast({
          title: 'Account Created',
          description: `Welcome to Job Twin, ${user.firstName}!`,
        });
      } else {
        toast({
          title: 'Signup Failed',
          description: response.error || 'Failed to create account',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Signup Error',
        description: error.message || 'Failed to create account',
        variant: 'destructive',
      });
    },
  });

  const logout = () => {
    authAPI.logout();
    setUser(null);
    setIsLoggedIn(false);
    queryClient.clear(); // Clear all cached data
    toast({
      title: 'Logged Out',
      description: 'You have been logged out successfully',
    });
  };

  return {
    user,
    isLoggedIn,
    login: loginMutation.mutate,
    signup: signupMutation.mutate,
    logout,
    isLoggingIn: loginMutation.isPending,
    isSigningUp: signupMutation.isPending,
  };
};

// Resume hooks
export const useResumes = (userId: string) => {
  return useQuery({
    queryKey: ['resumes', userId],
    queryFn: () => resumeAPI.getAll(userId),
    enabled: !!userId,
    select: (response) => response.success ? response.data : [],
  });
};

export const useResume = (resumeId: string) => {
  return useQuery({
    queryKey: ['resume', resumeId],
    queryFn: () => resumeAPI.getOne(resumeId),
    enabled: !!resumeId,
    select: (response) => response.success ? response.data : null,
  });
};

export const useUploadResume = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, userId }: { file: File; userId: string }) =>
      resumeAPI.upload(file, userId),
    onSuccess: (response, variables) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['resumes', variables.userId] });
        toast({
          title: 'Resume Uploaded',
          description: 'Your resume has been successfully uploaded and parsed',
        });
      } else {
        toast({
          title: 'Upload Failed',
          description: response.error || 'Failed to upload resume',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Upload Error',
        description: error.message || 'Failed to upload resume',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteResume = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resumeAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      toast({
        title: 'Resume Deleted',
        description: 'Resume has been successfully deleted',
      });
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete resume',
        variant: 'destructive',
      });
    },
  });
};

// Interview hooks
export const useInterviewSessions = (userId: string) => {
  return useQuery({
    queryKey: ['interviews', userId],
    queryFn: () => interviewAPI.getAllSessions(userId),
    enabled: !!userId,
    select: (response) => response.success ? response.data : [],
  });
};

export const useInterviewSession = (sessionId: string) => {
  return useQuery({
    queryKey: ['interview', sessionId],
    queryFn: () => interviewAPI.getSession(sessionId),
    enabled: !!sessionId,
    select: (response) => response.success ? response.data : null,
    refetchInterval: (data, query) => {
      // Refetch every 2 seconds if interview is active
      if (data && data.success && data.data?.status === 'active') {
        return 2000;
      }
      return false;
    },
  });
};

export const useStartInterview = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: interviewAPI.start,
    onSuccess: (response) => {
      if (response.success && response.data) {
        queryClient.setQueryData(['interview', response.data.id], response.data);
        toast({
          title: 'Interview Started',
          description: 'Your AI interview session has begun',
        });
      } else {
        toast({
          title: 'Failed to Start',
          description: response.error || 'Failed to start interview',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Start Error',
        description: error.message || 'Failed to start interview',
        variant: 'destructive',
      });
    },
  });
};

export const useSubmitResponse = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: interviewAPI.submitResponse,
    onSuccess: (response, variables) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['interview', variables.sessionId] });
        toast({
          title: 'Response Submitted',
          description: 'Your answer has been recorded and evaluated',
        });
      } else {
        toast({
          title: 'Submit Failed',
          description: response.error || 'Failed to submit response',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Submit Error',
        description: error.message || 'Failed to submit response',
        variant: 'destructive',
      });
    },
  });
};

export const useCompleteInterview = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: interviewAPI.complete,
    onSuccess: (response, sessionId) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['interview', sessionId] });
        queryClient.invalidateQueries({ queryKey: ['interviews'] });
        toast({
          title: 'Interview Completed',
          description: 'Your interview has been completed and evaluated',
        });
      } else {
        toast({
          title: 'Completion Failed',
          description: response.error || 'Failed to complete interview',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Completion Error',
        description: error.message || 'Failed to complete interview',
        variant: 'destructive',
      });
    },
  });
};

// Voice hooks
export const useVoices = () => {
  return useQuery({
    queryKey: ['voices'],
    queryFn: voiceAPI.getVoices,
    select: (response) => response.success ? response.data : [],
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
};

export const useTextToSpeech = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: voiceAPI.textToSpeech,
    onSuccess: (response) => {
      if (!response.success) {
        toast({
          title: 'TTS Failed',
          description: response.error || 'Failed to generate speech',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'TTS Error',
        description: error.message || 'Failed to generate speech',
        variant: 'destructive',
      });
    },
  });
};

export const useSpeechToText = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: voiceAPI.speechToText,
    onError: (error) => {
      toast({
        title: 'STT Error',
        description: error.message || 'Failed to transcribe speech',
        variant: 'destructive',
      });
    },
  });
};

// Type definitions for Speech Recognition API
// Speech Recognition API types
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onstart: () => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    webkitSpeechRecognition: SpeechRecognitionConstructor;
    SpeechRecognition: SpeechRecognitionConstructor;
  }
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

// Real-time transcript hook for interviews
export const useRealTimeTranscript = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if browser supports speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionClass = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognitionInstance = new SpeechRecognitionClass();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript + interimTranscript);
      };

      recognitionInstance.onstart = () => {
        setIsListening(true);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: 'Speech Recognition Error',
          description: 'Failed to capture speech. Please try again.',
          variant: 'destructive',
        });
      };

      recognitionRef.current = recognitionInstance;
    } else {
      toast({
        title: 'Not Supported',
        description: 'Speech recognition is not supported in this browser',
        variant: 'destructive',
      });
    }

    return () => {
      // Cleanup function doesn't need to reference recognition state
      // since it's captured in the closure
    };
  }, [toast]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const resetTranscript = () => {
    setTranscript('');
  };

  return {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: !!recognitionRef.current,
  };
};

// Stats hook
export const useUserStats = (userId: string) => {
  return useQuery({
    queryKey: ['stats', userId],
    queryFn: () => resumeAPI.getStats(userId),
    enabled: !!userId,
    select: (response) => response.success ? response.data : null,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
