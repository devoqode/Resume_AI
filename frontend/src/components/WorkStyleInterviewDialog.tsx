import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Play, Pause, Volume2, RotateCcw, Brain, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGenerateTechnicalQuestions } from "@/hooks/useApi";

interface WorkStyleInterviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workExperience?: any[];
}

const INTERVIEW_QUESTIONS = [
  {
    id: 1,
    question: "What type of work environment do you thrive in?",
    category: "Work Environment",
    suggestions: ["Remote", "Hybrid", "In-office", "Collaborative", "Independent", "Fast-paced", "Structured"]
  },
  {
    id: 2,
    question: "What are your primary career goals for the next 2-3 years?",
    category: "Career Goals",
    suggestions: ["Leadership", "Technical Growth", "Industry Change", "Entrepreneurship", "Specialization", "Management"]
  },
  {
    id: 3,
    question: "What industries or sectors most interest you?",
    category: "Industry Preference",
    suggestions: ["Technology", "Healthcare", "Finance", "Education", "Manufacturing", "Consulting", "Startup", "Enterprise"]
  },
  {
    id: 4,
    question: "How do you prefer to work with teams and collaborate?",
    category: "Collaboration Style",
    suggestions: ["Lead Projects", "Team Member", "Cross-functional", "Mentoring", "Independent Contributor", "Agile Teams"]
  }
];

export default function WorkStyleInterviewDialog({ isOpen, onClose, workExperience = [] }: WorkStyleInterviewDialogProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [responses, setResponses] = useState<Record<number, string[]>>({});
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [allQuestions, setAllQuestions] = useState(INTERVIEW_QUESTIONS);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  
  const generateTechnicalQuestions = useGenerateTechnicalQuestions();
  
  const currentQuestion = allQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === allQuestions.length - 1;

  // Generate technical questions when dialog opens if work experience is available
  useEffect(() => {
    if (isOpen && workExperience.length > 0 && allQuestions.length === INTERVIEW_QUESTIONS.length) {
      setIsLoadingQuestions(true);
      generateTechnicalQuestions.mutate(workExperience, {
        onSuccess: (response) => {
          if (response.success && response.data) {
            // Convert backend questions to match our interface
            const technicalQuestions = response.data.map((q, index) => ({
              id: INTERVIEW_QUESTIONS.length + index + 1,
              question: q.questionText,
              category: "Technical Experience",
              suggestions: [] // Technical questions don't need quick selections
            }));
            
            setAllQuestions([...INTERVIEW_QUESTIONS, ...technicalQuestions]);
          }
          setIsLoadingQuestions(false);
        },
        onError: () => {
          setIsLoadingQuestions(false);
        }
      });
    }
  }, [isOpen, workExperience]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };
      
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };
      
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not start recording. Please ensure microphone access is granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSuggestionClick = (suggestion: string) => {
    const questionId = currentQuestion.id;
    const currentResponses = responses[questionId] || [];
    
    if (currentResponses.includes(suggestion)) {
      // Remove suggestion if already selected
      setResponses(prev => ({
        ...prev,
        [questionId]: currentResponses.filter(r => r !== suggestion)
      }));
    } else {
      // Add suggestion
      setResponses(prev => ({
        ...prev,
        [questionId]: [...currentResponses, suggestion]
      }));
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Complete interview
      console.log('Interview completed with responses:', responses);
      onClose();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setAudioChunks([]);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setAudioChunks([]);
    }
  };

  const resetCurrentRecording = () => {
    setAudioChunks([]);
    setRecordingDuration(0);
    if (mediaRecorder) {
      stopRecording();
    }
  };

  const handleClose = () => {
    if (mediaRecorder) {
      stopRecording();
    }
    setCurrentQuestionIndex(0);
    setResponses({});
    setAudioChunks([]);
    setAllQuestions(INTERVIEW_QUESTIONS); // Reset to original questions
    setIsLoadingQuestions(false);
    onClose();
  };

  const currentResponses = responses[currentQuestion.id] || [];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {isLoadingQuestions ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Personalized Questions
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {currentQuestion?.category === "Technical Experience" ? (
                  <Brain className="w-4 h-4" />
                ) : null}
                Enhanced Interview
              </div>
            )}
            <Badge variant="secondary">
              {currentQuestionIndex + 1} of {allQuestions.length}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {isLoadingQuestions 
              ? "AI is creating personalized technical questions based on your experience..."
              : "Answer work style questions and personalized technical questions based on your resume"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / allQuestions.length) * 100}%` }}
            />
          </div>

          {/* Current Question */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Badge variant="outline" className="mb-2">
                  {currentQuestion.category}
                </Badge>
                <h3 className="text-lg font-semibold">
                  {currentQuestion.question}
                </h3>
              </div>

              {/* Voice Recording Section */}
              <div className="border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Voice Response</span>
                  </div>
                  {recordingDuration > 0 && (
                    <div className="text-sm font-mono">
                      {formatDuration(recordingDuration)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant={isRecording ? "destructive" : "default"}
                    size="sm"
                    onClick={isRecording ? stopRecording : startRecording}
                    className="flex items-center gap-2"
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-4 h-4" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        Start Recording
                      </>
                    )}
                  </Button>

                  {audioChunks.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPlaying(!isPlaying)}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetCurrentRecording}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>

                {isRecording && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm text-muted-foreground">Recording...</span>
                  </div>
                )}
              </div>

              {/* Quick Selection Suggestions */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Quick selections (optional):
                </h4>
                <div className="flex flex-wrap gap-2">
                  {currentQuestion.suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={cn(
                        "transition-all",
                        currentResponses.includes(suggestion) 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "hover:border-primary/50"
                      )}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Selected Items Display */}
              {currentResponses.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Selected:</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentResponses.map((response) => (
                      <Badge key={response} variant="secondary">
                        {response}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleClose}>
                Skip Interview
              </Button>
              <Button onClick={handleNext}>
                {isLastQuestion ? "Complete Interview" : "Next Question"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}