import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Mic, MicOff, Play, Pause, FileText, Clock, Target, TrendingUp, User, Volume2, StopCircle, ChevronDown, Building, Briefcase } from "lucide-react";

interface ProfileVoiceInterviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type InterviewStage = 'initial' | 'recording' | 'brief';

export default function ProfileVoiceInterviewDialog({ isOpen, onClose }: ProfileVoiceInterviewDialogProps) {
  const [stage, setStage] = useState<InterviewStage>('initial');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isContextOpen, setIsContextOpen] = useState(false);
  
  // Recruiter context state
  const [recruiterContext, setRecruiterContext] = useState({
    recruiterName: "",
    recruiterTitle: "",
    company: "",
    position: "",
    jobDescription: ""
  });

  // Enhanced mock transcript for profile interview
  const mockTranscript = [
    "AI: Hello Sarah! I'm excited to learn more about your experience as a Senior Frontend Developer. Can you tell me what draws you to frontend development?",
    "You: I love the intersection of creativity and technical problem-solving. There's something incredibly satisfying about building user interfaces that are both beautiful and performant.",
    "AI: That's wonderful! I see you've led teams on high-impact projects. Can you share an example of a challenging project you've worked on recently?",
    "You: Absolutely! I recently led the redesign of our main application's dashboard. We had over 100,000 daily users experiencing slow load times, so I implemented a comprehensive optimization strategy.",
    "AI: Impressive! What specific techniques did you use to achieve that 60% performance improvement?",
    "You: We implemented lazy loading for components, optimized our bundle splitting, and introduced efficient caching strategies. I also worked closely with the backend team to optimize our API calls.",
    "AI: Excellent! How do you approach mentoring junior developers on your team?",
    "You: I believe in hands-on mentoring. I pair program with them regularly, conduct code reviews focused on learning, and encourage them to take ownership of features while providing guidance."
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
      }, 2500 + Math.random() * 2000);
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
    setIsContextOpen(false);
    setRecruiterContext({
      recruiterName: "",
      recruiterTitle: "",
      company: "",
      position: "",
      jobDescription: ""
    });
    onClose();
  };

  const updateRecruiterContext = (field: keyof typeof recruiterContext, value: string) => {
    setRecruiterContext(prev => ({ ...prev, [field]: value }));
  };

  const renderInitialStage = () => (
    <div className="space-y-6">
      <div className="text-center space-y-6">
        {/* Profile Avatar */}
        <div className="flex justify-center">
          <Avatar className="w-20 h-20 border-4 border-primary/20">
            <AvatarImage src="" alt="Sarah Johnson" />
            <AvatarFallback className="text-2xl font-semibold bg-gradient-primary text-white">
              SJ
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div>
          <h3 className="text-2xl font-bold mb-2">Interactive Voice Screening</h3>
          <p className="text-lg text-muted-foreground">Sarah Johnson • Senior Frontend Developer</p>
          <p className="text-sm text-muted-foreground mt-2">San Francisco, CA</p>
        </div>
      </div>

      <Card className="p-6 bg-gradient-to-br from-primary/5 to-blue-500/5 border-primary/20">
        <div className="space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <Volume2 className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-primary">AI-Powered Conversation</h4>
          </div>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Natural conversation about experience and skills</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Intelligent follow-up questions based on responses</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Real-time analysis of qualifications and fit</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Professional insights and recommendations</span>
            </li>
          </ul>
        </div>
      </Card>

      {/* Recruiter Context Form */}
      <Collapsible open={isContextOpen} onOpenChange={setIsContextOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between"
          >
            <span>Interview Context (Optional)</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isContextOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recruiterName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Recruiter Name
                </Label>
                <Input
                  id="recruiterName"
                  value={recruiterContext.recruiterName}
                  onChange={(e) => updateRecruiterContext('recruiterName', e.target.value)}
                  placeholder="Enter your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recruiterTitle" className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Your Title
                </Label>
                <Input
                  id="recruiterTitle"
                  value={recruiterContext.recruiterTitle}
                  onChange={(e) => updateRecruiterContext('recruiterTitle', e.target.value)}
                  placeholder="e.g., Senior Recruiter"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company" className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Company
                </Label>
                <Input
                  id="company"
                  value={recruiterContext.company}
                  onChange={(e) => updateRecruiterContext('company', e.target.value)}
                  placeholder="Company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position" className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Position Looking For
                </Label>
                <Input
                  id="position"
                  value={recruiterContext.position}
                  onChange={(e) => updateRecruiterContext('position', e.target.value)}
                  placeholder="e.g., Senior Frontend Developer"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobDescription">Job Description</Label>
              <Textarea
                id="jobDescription"
                value={recruiterContext.jobDescription}
                onChange={(e) => updateRecruiterContext('jobDescription', e.target.value)}
                placeholder="Provide a brief description of the role, requirements, and what you're looking for in a candidate..."
                rows={3}
              />
            </div>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex gap-3">
        <Button variant="outline" onClick={handleClose} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleStartInterview} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90">
          <Mic className="w-4 h-4 mr-2" />
          Start Voice Screening
        </Button>
      </div>
    </div>
  );

  const renderRecordingStage = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all duration-500 ${
            isRecording ? 'bg-gradient-to-br from-red-400 to-red-600 animate-pulse shadow-lg shadow-red-500/30' : 'bg-muted'
          }`}>
            {isRecording ? (
              <Mic className="w-10 h-10 text-white" />
            ) : (
              <MicOff className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          {isRecording && (
            <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-red-400 animate-ping mx-auto"></div>
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">
            {isRecording ? "AI Interview in Progress" : "Interview Paused"}
          </h3>
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            <p className="text-2xl font-mono font-bold text-primary">{formatTime(currentTime)}</p>
          </div>
        </div>
      </div>

      <Card className="p-4 max-h-80 overflow-y-auto bg-muted/30">
        <h4 className="font-medium mb-3 flex items-center gap-2 sticky top-0 bg-background/80 backdrop-blur-sm pb-2">
          <FileText className="w-4 h-4" />
          Live Conversation
        </h4>
        <div className="space-y-4">
          {transcript.map((message, index) => (
            <div key={index} className={`flex gap-3 ${
              message.startsWith('AI:') ? 'justify-start' : 'justify-end'
            }`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${
                message.startsWith('AI:') 
                  ? 'bg-primary/10 border border-primary/20' 
                  : 'bg-blue-500 text-white'
              }`}>
                <div className="text-xs font-medium mb-1 opacity-80">
                  {message.startsWith('AI:') ? 'AI Interviewer' : 'You'}
                </div>
                <div className="text-sm">
                  {message.replace(/^(AI:|You:)\s*/, '')}
                </div>
              </div>
            </div>
          ))}
          {isRecording && (
            <div className="flex justify-start">
              <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-primary">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
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
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90"
          disabled={transcript.length < 3}
        >
          <StopCircle className="w-4 h-4 mr-2" />
          Complete Interview
        </Button>
      </div>
    </div>
  );

  const renderBriefStage = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
          <Target className="w-10 h-10 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-green-600">Interview Completed Successfully!</h3>
          <p className="text-muted-foreground">Here's a comprehensive analysis of the conversation</p>
        </div>
      </div>

      <div className="space-y-4">
        <Card className="p-4 border-green-200 bg-green-50/50">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <h4 className="font-medium text-green-800">Key Strengths Identified</h4>
          </div>
          <ul className="text-sm space-y-1 text-green-700">
            <li>• Strong technical leadership with proven team management experience</li>
            <li>• Exceptional performance optimization skills (60% improvement achieved)</li>
            <li>• Effective mentoring approach with hands-on guidance methodology</li>
            <li>• Strategic thinking in both frontend architecture and user experience</li>
          </ul>
        </Card>

        <Card className="p-4 border-blue-200 bg-blue-50/50">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-blue-600" />
            <h4 className="font-medium text-blue-800">Technical Expertise Highlighted</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-blue-100 text-blue-800 border-blue-300">React Optimization</Badge>
            <Badge className="bg-blue-100 text-blue-800 border-blue-300">Performance Engineering</Badge>
            <Badge className="bg-blue-100 text-blue-800 border-blue-300">Team Leadership</Badge>
            <Badge className="bg-blue-100 text-blue-800 border-blue-300">Mentoring</Badge>
            <Badge className="bg-blue-100 text-blue-800 border-blue-300">Bundle Optimization</Badge>
            <Badge className="bg-blue-100 text-blue-800 border-blue-300">Code Reviews</Badge>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary" />
            <h4 className="font-medium">Interview Analytics</h4>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{formatTime(currentTime)}</p>
              <p className="text-muted-foreground">Duration</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{Math.floor(transcript.length / 2)}</p>
              <p className="text-muted-foreground">Exchanges</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">95%</p>
              <p className="text-muted-foreground">Match Score</p>
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
          <FileText className="w-4 h-4 mr-2" />
          View Full Transcript
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Voice Screening Interview</DialogTitle>
          </DialogHeader>
          {stage === 'initial' && renderInitialStage()}
          {stage === 'recording' && renderRecordingStage()}
          {stage === 'brief' && renderBriefStage()}
        </DialogContent>
      </Dialog>

      {/* Enhanced Transcript Dialog */}
      <Dialog open={showTranscriptDialog} onOpenChange={setShowTranscriptDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Complete Interview Transcript</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto max-h-[70vh]">
            <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Duration: {formatTime(currentTime)}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <span>Sarah Johnson • Senior Frontend Developer</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-green-600 font-medium">95% Match Score</span>
            </div>
            <Separator />
            <div className="space-y-6">
              {transcript.map((message, index) => (
                <div key={index} className={`flex gap-4 ${
                  message.startsWith('AI:') ? 'justify-start' : 'justify-end'
                }`}>
                  <div className={`max-w-[85%] ${message.startsWith('AI:') ? 'order-2' : 'order-1'}`}>
                    <div className={`p-4 rounded-xl ${
                      message.startsWith('AI:') 
                        ? 'bg-primary/5 border-l-4 border-primary' 
                        : 'bg-blue-50 border-l-4 border-blue-500'
                    }`}>
                      <div className="text-sm font-medium mb-2 flex items-center gap-2">
                        {message.startsWith('AI:') ? (
                          <>
                            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-xs text-white font-bold">AI</span>
                            </div>
                            <span className="text-primary">AI Interviewer</span>
                          </>
                        ) : (
                          <>
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs bg-blue-500 text-white">SJ</AvatarFallback>
                            </Avatar>
                            <span className="text-blue-600">Sarah Johnson</span>
                          </>
                        )}
                      </div>
                      <div className="text-sm leading-relaxed">
                        {message.replace(/^(AI:|You:)\s*/, '')}
                      </div>
                    </div>
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