import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Play, Pause, FileText, Clock, Target, TrendingUp, Briefcase } from "lucide-react";

interface WorkStyleInterviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type InterviewStage = 'initial' | 'recording' | 'brief';

export default function WorkStyleInterviewDialog({ isOpen, onClose }: WorkStyleInterviewDialogProps) {
  const [stage, setStage] = useState<InterviewStage>('initial');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Mock transcript data for work style interview
  const mockTranscript = [
    "AI: Hello! I'm here to learn about your work style and career goals. Let's start with what motivates you most in your work environment?",
    "You: I'm really motivated by challenging problems and the opportunity to make a meaningful impact. I thrive when I can see how my work contributes to the bigger picture.",
    "AI: That's great! How do you prefer to collaborate with your team members? Do you work better independently or in group settings?",
    "You: I enjoy a mix of both. I like having focused time for deep work, but I also value regular collaboration and brainstorming sessions with my team.",
    "AI: What are your long-term career aspirations? Where do you see yourself in the next 3-5 years?",
    "You: I'd love to grow into a technical leadership role where I can mentor others while still staying hands-on with interesting technical challenges. Eventually, I'd like to lead a team of engineers working on cutting-edge projects."
  ];

  // Timer effect for recording
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Mock transcript update during recording
  useEffect(() => {
    if (isRecording && transcript.length < mockTranscript.length) {
      const timer = setTimeout(() => {
        setTranscript(prev => [...prev, mockTranscript[prev.length]]);
      }, 3000 + Math.random() * 2000);
      return () => clearTimeout(timer);
    }
  }, [isRecording, transcript.length]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartInterview = () => {
    setStage('recording');
    setIsRecording(true);
    setTranscript([]);
    setCurrentTime(0);
  };

  const handleCompleteInterview = () => {
    setIsRecording(false);
    setStage('brief');
  };

  const handleClose = () => {
    setStage('initial');
    setIsRecording(false);
    setTranscript([]);
    setCurrentTime(0);
    onClose();
  };

  const renderInitialStage = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Briefcase className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">Work Style & Career Goals</h3>
          <p className="text-muted-foreground">This interview will focus on your work type and career objectives</p>
        </div>
      </div>

      <Card className="p-4 bg-muted/50">
        <h4 className="font-medium mb-2">What to expect:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• 5-7 minute conversation about your work preferences</li>
          <li>• Questions about your career aspirations and goals</li>
          <li>• Discussion of your ideal work environment</li>
          <li>• Exploration of what motivates you professionally</li>
        </ul>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={handleClose} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleStartInterview} className="flex-1 bg-gradient-primary">
          Start Interview
        </Button>
      </div>
    </div>
  );

  const renderRecordingStage = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-colors ${
          isRecording ? 'bg-red-100 animate-pulse' : 'bg-muted'
        }`}>
          {isRecording ? (
            <Mic className="w-8 h-8 text-red-600" />
          ) : (
            <MicOff className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <div>
          <h3 className="text-xl font-semibold">AI Interview in Progress</h3>
          <p className="text-lg font-mono">{formatTime(currentTime)}</p>
        </div>
      </div>

      <Card className="p-4 max-h-80 overflow-y-auto">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Live Transcript
        </h4>
        <div className="space-y-3">
          {transcript.map((message, index) => (
            <div key={index} className={`text-sm ${
              message.startsWith('AI:') ? 'text-primary' : 'text-foreground'
            }`}>
              {message}
            </div>
          ))}
          {isRecording && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
              <span className="text-sm">Listening...</span>
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={() => setIsRecording(!isRecording)}
          className="flex-1"
        >
          {isRecording ? (
            <>
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Resume
            </>
          )}
        </Button>
        <Button 
          onClick={handleCompleteInterview}
          className="flex-1 bg-gradient-primary"
          disabled={transcript.length < 3}
        >
          Complete Interview
        </Button>
      </div>
    </div>
  );

  const renderBriefStage = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Target className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">Interview Complete!</h3>
          <p className="text-muted-foreground">Here's what we learned about your work style and goals</p>
        </div>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h4 className="font-medium">Career Goals Identified</h4>
          </div>
          <ul className="text-sm space-y-1">
            <li>• Aspires to technical leadership role with hands-on involvement</li>
            <li>• Wants to mentor and guide other engineers</li>
            <li>• Interested in working on cutting-edge, impactful projects</li>
            <li>• Values meaningful work that contributes to bigger picture</li>
          </ul>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary" />
            <h4 className="font-medium">Interview Summary</h4>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Duration:</span>
              <p className="font-medium">{formatTime(currentTime)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Questions Asked:</span>
              <p className="font-medium">6</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={() => setShowTranscriptDialog(true)}
          className="flex-1"
        >
          View Transcript
        </Button>
        <Button onClick={handleClose} className="flex-1 bg-gradient-primary">
          Done
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Work Style & Career Goals Interview</DialogTitle>
          </DialogHeader>
          {stage === 'initial' && renderInitialStage()}
          {stage === 'recording' && renderRecordingStage()}
          {stage === 'brief' && renderBriefStage()}
        </DialogContent>
      </Dialog>

      {/* Transcript Dialog */}
      <Dialog open={showTranscriptDialog} onOpenChange={setShowTranscriptDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Interview Transcript</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Duration: {formatTime(currentTime)}</span>
              <Separator orientation="vertical" className="h-4" />
              <span>Work Style & Career Goals Interview</span>
            </div>
            <Separator />
            <div className="space-y-4">
              {transcript.map((message, index) => (
                <div key={index} className={`p-3 rounded-lg ${
                  message.startsWith('AI:') 
                    ? 'bg-primary/5 border-l-4 border-primary' 
                    : 'bg-muted/50 border-l-4 border-muted-foreground'
                }`}>
                  <div className="text-sm font-medium mb-1">
                    {message.startsWith('AI:') ? 'AI Interviewer' : 'You'}
                  </div>
                  <div className="text-sm">
                    {message.replace(/^(AI:|You:)\s*/, '')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}