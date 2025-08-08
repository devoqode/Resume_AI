import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useStartInterview, 
  useSubmitResponse, 
  useCompleteInterview,
  useInterviewSession,
  useRealTimeTranscript,
  useTextToSpeech,
  useAuth,
} from "@/hooks/useApi";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Square, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Loader2
} from "lucide-react";
import type { Resume } from "@/lib/api";

interface AIInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resume?: Resume;
  voiceId?: string;
}

type InterviewStage = 'initial' | 'recording' | 'processing' | 'completed';

export default function AIInterviewDialog({ 
  open, 
  onOpenChange, 
  resume,
  voiceId = 'pNInz6obpgDQGcFmaJgB' // Default voice
}: AIInterviewDialogProps) {
  
  // Debug logging for props
  useEffect(() => {
    console.log('AIInterviewDialog - Props updated:');
    console.log('- open:', open);
    console.log('- resume:', resume);
    console.log('- stage:', stage);
    console.log('- user:', user);
  }, [open, resume, stage, user]);
  const [stage, setStage] = useState<InterviewStage>('initial');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [audioVolume, setAudioVolume] = useState(true);

  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();
  
  const { user } = useAuth();
  const startInterview = useStartInterview();
  const submitResponse = useSubmitResponse();
  const completeInterview = useCompleteInterview();
  const generateSpeech = useTextToSpeech();
  
  // Get interview session data
  const { data: session, isLoading: sessionLoading } = useInterviewSession(sessionId || '');
  
  // Real-time transcript
  const {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: speechSupported
  } = useRealTimeTranscript();

  // Timer effect with cleanup
  useEffect(() => {
    if (stage === 'recording') {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [stage]);

  // Audio playback handling with proper cleanup
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      setAudioPlaying(false);
    };

    const handleCanPlay = () => {
      if (audioPlaying) {
        audio.play().catch(console.error);
      }
    };

    const handleError = () => {
      setAudioPlaying(false);
      console.error('Audio playback error');
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [audioPlaying]);

  // Cleanup effect when component unmounts or dialog closes
  useEffect(() => {
    return () => {
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
      
      // Stop listening
      if (isListening) {
        stopListening();
      }

      // Clean up audio URL to prevent memory leaks
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
      }

      // Pause audio
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [currentAudioUrl, isListening, stopListening]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start interview
  const handleStartInterview = async () => {
    console.log('handleStartInterview called');
    console.log('- user:', user);
    console.log('- resume:', resume);
    
    if (!resume || !user) {
      console.log('Cannot start interview: missing resume or user');
      return;
    }

    startInterview.mutate({
      userId: user.id,
      resumeId: resume.id,
      voiceId
    }, {
      onSuccess: (response) => {
        if (response.success && response.data) {
          setSessionId(response.data.id);
          setStage('recording');
          // Generate speech for first question
          generateFirstQuestionSpeech(response.data.questions[0].questionText);
        }
      }
    });
  };

  // Generate speech for question
  const generateFirstQuestionSpeech = async (questionText: string) => {
    generateSpeech.mutate({
      text: questionText,
      voiceId
    }, {
      onSuccess: (response) => {
        if (response.success && response.data) {
          const audioBlob = response.data as Blob;
          const audioUrl = URL.createObjectURL(audioBlob);
          setCurrentAudioUrl(audioUrl);
          setAudioPlaying(true);
        }
      }
    });
  };

  // Handle audio control
  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio || !currentAudioUrl) return;

    if (audioPlaying) {
      audio.pause();
      setAudioPlaying(false);
    } else {
      audio.play();
      setAudioPlaying(true);
    }
  };

  // Start recording response
  const handleStartRecording = () => {
    resetTranscript();
    setTimeElapsed(0);
    startListening();
  };

  // Stop recording and submit response
  const handleStopRecording = async () => {
    stopListening();
    
    if (!sessionId || !session || !transcript.trim()) return;

    setStage('processing');
    
    const currentQuestion = session.questions[currentQuestionIndex];
    
    submitResponse.mutate({
      sessionId,
      questionId: currentQuestion.id,
      transcription: transcript.trim()
    }, {
      onSuccess: () => {
        // Move to next question or complete
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < session.totalQuestions) {
          setCurrentQuestionIndex(nextIndex);
          setStage('recording');
          setTimeElapsed(0);
          // Generate speech for next question
          generateFirstQuestionSpeech(session.questions[nextIndex].questionText);
        } else {
          // Interview complete
          completeInterview.mutate(sessionId, {
            onSuccess: () => {
              setStage('completed');
            }
          });
        }
      }
    });
  };

  // Close dialog and reset
  const handleClose = () => {
    setStage('initial');
    setCurrentQuestionIndex(0);
    setSessionId(null);
    setCurrentAudioUrl(null);
    setAudioPlaying(false);
    setTimeElapsed(0);
    resetTranscript();
    stopListening();
    onOpenChange(false);
  };

  // Get current question
  const currentQuestion = session?.questions[currentQuestionIndex];
  const progress = session ? ((currentQuestionIndex + 1) / session.totalQuestions) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            AI Interview Session
          </DialogTitle>
          <DialogDescription>
            {stage === 'initial' && 'AI will ask you 5 questions based on your resume. Answer naturally.'}
            {stage === 'recording' && 'Listen to the question and provide your answer when ready.'}
            {stage === 'processing' && 'Processing your response and generating feedback...'}
            {stage === 'completed' && 'Interview completed! View your results below.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-6">
          {/* Progress */}
          {session && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  Question {currentQuestionIndex + 1} of {session.totalQuestions}
                </span>
                <Badge variant="outline">
                  {formatTime(timeElapsed)}
                </Badge>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Initial Stage */}
          {stage === 'initial' && (
            <Card className="p-6 text-center space-y-4">
              <div className="space-y-2">
                <Mic className="w-12 h-12 mx-auto text-primary" />
                <h3 className="text-lg font-semibold">Ready to Start Your Interview?</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  The AI will analyze your resume and ask personalized questions. 
                  Make sure your microphone is working and you're in a quiet environment.
                </p>
              </div>

              {!speechSupported && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">
                      Speech recognition not supported in this browser. You'll need to type your responses.
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={handleClose}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleStartInterview}
                  disabled={startInterview.isPending}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  {startInterview.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    'Start Interview'
                  )}
                </Button>
              </div>
            </Card>
          )}

          {/* Recording Stage */}
          {stage === 'recording' && currentQuestion && (
            <div className="space-y-6">
              {/* Question Card */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Current Question</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAudioVolume(!audioVolume)}
                      >
                        {audioVolume ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      </Button>
                      
                      {currentAudioUrl && (
                        <Button
                          size="sm"
                          onClick={toggleAudio}
                          disabled={generateSpeech.isPending}
                        >
                          {generateSpeech.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : audioPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-lg leading-relaxed">{currentQuestion.questionText}</p>
                  
                  {currentAudioUrl && (
                    <audio 
                      ref={audioRef}
                      src={currentAudioUrl}
                      muted={!audioVolume}
                      preload="auto"
                    />
                  )}
                </div>
              </Card>

              {/* Response Area */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Your Response</h3>
                    <div className="flex items-center gap-2">
                      {isListening && (
                        <Badge variant="destructive" className="animate-pulse">
                          <Mic className="w-3 h-3 mr-1" />
                          Recording...
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Transcript Display */}
                  <ScrollArea className="h-32 border rounded-lg p-4 bg-muted/30">
                    {transcript ? (
                      <p className="text-sm leading-relaxed">{transcript}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        {isListening ? 'Listening... Speak clearly into your microphone.' : 'Click "Start Recording" to begin your response.'}
                      </p>
                    )}
                  </ScrollArea>

                  {/* Recording Controls */}
                  <div className="flex gap-3 justify-center">
                    {!isListening ? (
                      <Button 
                        onClick={handleStartRecording}
                        className="bg-red-500 hover:bg-red-600 text-white"
                        disabled={!speechSupported}
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        Start Recording
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleStopRecording}
                        disabled={!transcript.trim() || submitResponse.isPending}
                        className="bg-gradient-primary hover:opacity-90"
                      >
                        {submitResponse.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Square className="w-4 h-4 mr-2" />
                            Submit Answer
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Processing Stage */}
          {stage === 'processing' && (
            <Card className="p-8 text-center space-y-4">
              <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
              <div>
                <h3 className="text-lg font-semibold">Analyzing Your Response</h3>
                <p className="text-muted-foreground">
                  Our AI is evaluating your answer and preparing the next question...
                </p>
              </div>
            </Card>
          )}

          {/* Completed Stage */}
          {stage === 'completed' && session && (
            <Card className="p-6 text-center space-y-4">
              <CheckCircle className="w-12 h-12 mx-auto text-success" />
              <div>
                <h3 className="text-lg font-semibold">Interview Completed!</h3>
                <p className="text-muted-foreground">
                  You've successfully completed all {session.totalQuestions} questions.
                </p>
                {session.overallScore && (
                  <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {Math.round(session.overallScore)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Overall Score</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 justify-center">
                <Button onClick={handleClose}>
                  Close
                </Button>
                <Button 
                  onClick={() => {/* Navigate to results */}}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  View Detailed Results
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Loading overlay */}
        {(sessionLoading || startInterview.isPending) && stage !== 'initial' && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center space-y-2">
              <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Loading interview session...</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}