import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Trophy, 
  TrendingUp, 
  MessageCircle, 
  Volume2, 
  Clock, 
  Target,
  CheckCircle,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  Download
} from "lucide-react";
import { useInterviewSession } from "@/hooks/useApi";
import type { InterviewSession } from "@/lib/api";

interface InterviewResultsProps {
  sessionId: string;
  onClose?: () => void;
  onRetakeInterview?: () => void;
}

interface ScoreBreakdown {
  truthfulness: number;
  relevance: number;
  completeness: number;
  communication: number;
  overall: number;
}

export default function InterviewResults({ 
  sessionId, 
  onClose, 
  onRetakeInterview 
}: InterviewResultsProps) {
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const { data: session, isLoading } = useInterviewSession(sessionId);

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading interview results...</p>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Results Not Found</h3>
        <p className="text-muted-foreground">Unable to load interview results.</p>
      </Card>
    );
  }

  // Calculate score breakdown
  const calculateScoreBreakdown = (): ScoreBreakdown => {
    const responses = session.responses || [];
    const validResponses = responses.filter(r => r.evaluation);
    
    if (validResponses.length === 0) {
      return {
        truthfulness: 0,
        relevance: 0,
        completeness: 0,
        communication: 0,
        overall: 0
      };
    }

    const avgTruthfulness = validResponses.reduce((sum, r) => sum + (r.evaluation?.truthfulness || 0), 0) / validResponses.length;
    const avgRelevance = validResponses.reduce((sum, r) => sum + (r.evaluation?.relevance || 0), 0) / validResponses.length;
    const avgCompleteness = validResponses.reduce((sum, r) => sum + (r.evaluation?.completeness || 0), 0) / validResponses.length;
    const avgCommunication = (avgTruthfulness + avgRelevance + avgCompleteness) / 3;
    
    return {
      truthfulness: Math.round(avgTruthfulness * 100),
      relevance: Math.round(avgRelevance * 100),
      completeness: Math.round(avgCompleteness * 100),
      communication: Math.round(avgCommunication * 100),
      overall: session.overallScore || Math.round(avgCommunication * 100)
    };
  };

  const scoreBreakdown = calculateScoreBreakdown();
  const selectedQuestion = session.questions?.[selectedQuestionIndex];
  const selectedResponse = session.responses?.find(r => r.questionId === selectedQuestion?.id);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  const formatDuration = (start: string, end?: string) => {
    if (!end) return "In Progress";
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const duration = Math.round((endTime - startTime) / 1000 / 60);
    return `${duration} min${duration !== 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Interview Results</h2>
              <p className="text-muted-foreground">
                Completed on {new Date(session.startTime).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(scoreBreakdown.overall)}`}>
              {scoreBreakdown.overall}%
            </div>
            <p className="text-sm text-muted-foreground">Overall Score</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <MessageCircle className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-lg font-semibold">{session.totalQuestions}</div>
            <div className="text-xs text-muted-foreground">Questions</div>
          </div>
          
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-lg font-semibold">
              {formatDuration(session.startTime, session.endTime)}
            </div>
            <div className="text-xs text-muted-foreground">Duration</div>
          </div>
          
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <Target className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-lg font-semibold">{scoreBreakdown.relevance}%</div>
            <div className="text-xs text-muted-foreground">Relevance</div>
          </div>
          
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <CheckCircle className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-lg font-semibold">{scoreBreakdown.truthfulness}%</div>
            <div className="text-xs text-muted-foreground">Accuracy</div>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="questions">Question Review</TabsTrigger>
          <TabsTrigger value="feedback">Detailed Feedback</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Score Breakdown */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Score Breakdown
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Truthfulness</span>
                    <span className={`font-semibold ${getScoreColor(scoreBreakdown.truthfulness)}`}>
                      {scoreBreakdown.truthfulness}%
                    </span>
                  </div>
                  <Progress value={scoreBreakdown.truthfulness} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Relevance</span>
                    <span className={`font-semibold ${getScoreColor(scoreBreakdown.relevance)}`}>
                      {scoreBreakdown.relevance}%
                    </span>
                  </div>
                  <Progress value={scoreBreakdown.relevance} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Completeness</span>
                    <span className={`font-semibold ${getScoreColor(scoreBreakdown.completeness)}`}>
                      {scoreBreakdown.completeness}%
                    </span>
                  </div>
                  <Progress value={scoreBreakdown.completeness} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Communication</span>
                    <span className={`font-semibold ${getScoreColor(scoreBreakdown.communication)}`}>
                      {scoreBreakdown.communication}%
                    </span>
                  </div>
                  <Progress value={scoreBreakdown.communication} className="h-2" />
                </div>
              </div>
            </Card>

            {/* Performance Insights */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Key Insights
              </h3>
              
              <div className="space-y-4">
                {scoreBreakdown.overall >= 80 && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <ThumbsUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800">Excellent Performance</p>
                      <p className="text-sm text-green-700">
                        You demonstrated strong communication skills and provided comprehensive answers.
                      </p>
                    </div>
                  </div>
                )}
                
                {scoreBreakdown.relevance < 70 && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Area for Improvement</p>
                      <p className="text-sm text-yellow-700">
                        Focus on providing more specific examples that directly relate to the questions asked.
                      </p>
                    </div>
                  </div>
                )}
                
                {scoreBreakdown.completeness < 70 && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Target className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800">Expand Your Answers</p>
                      <p className="text-sm text-blue-700">
                        Try to provide more detailed responses that fully address all aspects of the question.
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <Trophy className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Overall Assessment</p>
                    <p className="text-sm text-muted-foreground">
                      {scoreBreakdown.overall >= 80 
                        ? "You're well-prepared for interviews in this field."
                        : scoreBreakdown.overall >= 60
                        ? "With some improvement, you'll be even more competitive."
                        : "Consider practicing more and refining your responses."
                      }
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Overall Feedback */}
          {session.feedback && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">AI Feedback Summary</h3>
              <p className="text-muted-foreground leading-relaxed">
                {session.feedback}
              </p>
            </Card>
          )}
        </TabsContent>

        {/* Questions Review Tab */}
        <TabsContent value="questions" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Question List */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Questions ({session.questions?.length || 0})</h3>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {session.questions?.map((question, index) => {
                    const response = session.responses?.find(r => r.questionId === question.id);
                    const score = response?.evaluation?.score || 0;
                    
                    return (
                      <button
                        key={question.id}
                        onClick={() => setSelectedQuestionIndex(index)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedQuestionIndex === index 
                            ? 'border-primary bg-primary/5' 
                            : 'border-muted hover:border-muted-foreground/25'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">Question {index + 1}</span>
                          <Badge variant={getScoreBadgeVariant(score * 100)} size="sm">
                            {Math.round(score * 100)}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {question.questionText}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </Card>

            {/* Selected Question Details */}
            <Card className="p-6 md:col-span-2">
              {selectedQuestion && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Question {selectedQuestionIndex + 1}
                    </h3>
                    {selectedResponse?.evaluation && (
                      <Badge 
                        variant={getScoreBadgeVariant((selectedResponse.evaluation.score || 0) * 100)}
                        className="text-sm"
                      >
                        {Math.round((selectedResponse.evaluation.score || 0) * 100)}% Score
                      </Badge>
                    )}
                  </div>
                  
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Question:</p>
                    <p className="leading-relaxed">{selectedQuestion.questionText}</p>
                  </div>
                  
                  {selectedResponse && (
                    <>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-700 mb-2">Your Response:</p>
                        <p className="leading-relaxed text-blue-800">
                          {selectedResponse.transcription}
                        </p>
                      </div>
                      
                      {selectedResponse.evaluation && (
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div className="text-center p-3 bg-muted/30 rounded-lg">
                            <div className={`text-lg font-semibold ${getScoreColor(selectedResponse.evaluation.truthfulness * 100)}`}>
                              {Math.round(selectedResponse.evaluation.truthfulness * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Truthfulness</div>
                          </div>
                          <div className="text-center p-3 bg-muted/30 rounded-lg">
                            <div className={`text-lg font-semibold ${getScoreColor(selectedResponse.evaluation.relevance * 100)}`}>
                              {Math.round(selectedResponse.evaluation.relevance * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Relevance</div>
                          </div>
                          <div className="text-center p-3 bg-muted/30 rounded-lg">
                            <div className={`text-lg font-semibold ${getScoreColor(selectedResponse.evaluation.completeness * 100)}`}>
                              {Math.round(selectedResponse.evaluation.completeness * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Completeness</div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Detailed Feedback Tab */}
        <TabsContent value="feedback" className="space-y-6">
          <div className="space-y-4">
            {session.responses?.map((response, index) => {
              const question = session.questions?.find(q => q.id === response.questionId);
              
              return (
                <Card key={response.id} className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Question {index + 1}</h3>
                      {response.evaluation && (
                        <Badge variant={getScoreBadgeVariant((response.evaluation.score || 0) * 100)}>
                          {Math.round((response.evaluation.score || 0) * 100)}% Score
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-muted-foreground">{question?.questionText}</p>
                    
                    {response.evaluation?.feedback && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm font-medium text-yellow-800 mb-2">AI Feedback:</p>
                        <p className="text-yellow-700 leading-relaxed">
                          {response.evaluation.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Interview completed on {new Date(session.startTime).toLocaleDateString()} at {new Date(session.startTime).toLocaleTimeString()}
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
            
            {onRetakeInterview && (
              <Button onClick={onRetakeInterview} className="bg-gradient-primary hover:opacity-90">
                Retake Interview
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
