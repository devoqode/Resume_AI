import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import AIInterviewDialog from "@/components/AIInterviewDialog";
import InterviewResults from "@/components/InterviewResults";
import FileUpload from "@/components/FileUpload";
import { 
  useAuth,
  useResumes,
  useInterviewSessions,
  useUserStats,
  useDeleteResume,
} from "@/hooks/useApi";
import { 
  Mic, 
  FileText, 
  User, 
  Briefcase, 
  Brain, 
  TrendingUp,
  Settings,
  Download,
  Share,
  Star,
  Upload,
  Clock,
  Target,
  Trophy,
  Loader2,
  Plus,
  Eye,
  MoreVertical,
  Calendar,
  LogOut,
  ChevronRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Resume, InterviewSession } from "@/lib/api";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // API calls
  const { data: resumes, isLoading: resumesLoading } = useResumes(user?.id || '');
  const { data: interviewSessions, isLoading: sessionsLoading } = useInterviewSessions(user?.id || '');
  const { data: userStats, isLoading: statsLoading } = useUserStats(user?.id || '');
  const deleteResume = useDeleteResume();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const handleStartInterview = (resume: Resume) => {
    setSelectedResume(resume);
    setShowInterviewDialog(true);
  };

  const handleViewResults = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setShowResultsDialog(true);
  };

  const handleDeleteResume = (resumeId: string) => {
    deleteResume.mutate(resumeId);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src="" alt={user.firstName} />
                <AvatarFallback className="text-lg">
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold">
                  Welcome back, {user.firstName}!
                </h1>
                <p className="text-muted-foreground mt-1">
                  Ready to enhance your job search with AI-powered insights?
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
                <Settings className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Resumes</p>
                <p className="text-3xl font-bold">
                  {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (resumes?.length || 0)}
                </p>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Interviews</p>
                <p className="text-3xl font-bold">
                  {sessionsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (interviewSessions?.length || 0)}
                </p>
              </div>
              <Mic className="w-8 h-8 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                <p className={`text-3xl font-bold ${getScoreColor(userStats?.averageScore || 0)}`}>
                  {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : `${userStats?.averageScore || 0}%`}
                </p>
              </div>
              <Trophy className="w-8 h-8 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Profile Views</p>
                <p className="text-3xl font-bold">
                  {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (userStats?.totalInterviews || 0)}
                </p>
              </div>
              <Eye className="w-8 h-8 text-primary" />
            </div>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="resumes">My Resumes</TabsTrigger>
            <TabsTrigger value="interviews">Interviews</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Upload New Resume</h3>
                    <p className="text-sm text-muted-foreground">
                      Get AI-powered analysis and insights
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowUploadDialog(true)}
                  className="w-full bg-gradient-primary hover:opacity-90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Resume
                </Button>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Mic className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Practice Interview</h3>
                    <p className="text-sm text-muted-foreground">
                      AI-powered interview with voice interaction
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => {
                    if (resumes && resumes.length > 0) {
                      handleStartInterview(resumes[0]);
                    }
                  }}
                  disabled={!resumes || resumes.length === 0}
                  variant="outline"
                  className="w-full"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Practice
                </Button>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {interviewSessions?.slice(0, 3).map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Mic className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">AI Interview Session</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(session.startTime)} • {session.totalQuestions} questions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.overallScore && (
                        <Badge variant="outline" className={getScoreColor(session.overallScore)}>
                          {Math.round(session.overallScore)}%
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewResults(session.id)}
                      >
                        View Results
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity</p>
                    <p className="text-sm">Upload a resume and start practicing interviews!</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Resumes Tab */}
          <TabsContent value="resumes" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">My Resumes</h2>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Upload Resume
              </Button>
            </div>

            {resumesLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 mx-auto animate-spin mb-4" />
                <p className="text-muted-foreground">Loading your resumes...</p>
              </div>
            ) : resumes && resumes.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resumes.map((resume) => (
                  <Card key={resume.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold line-clamp-1">{resume.originalName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(resume.uploadDate)}
                          </p>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStartInterview(resume)}>
                            <Mic className="w-4 h-4 mr-2" />
                            Start Interview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteResume(resume.id)}>
                            Delete Resume
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {resume.parsedData && (
                      <div className="space-y-2 mb-4">
                        {resume.parsedData.name && (
                          <p className="text-sm"><strong>Name:</strong> {resume.parsedData.name}</p>
                        )}
                        {resume.parsedData.email && (
                          <p className="text-sm"><strong>Email:</strong> {resume.parsedData.email}</p>
                        )}
                        {resume.parsedData.skills && resume.parsedData.skills.length > 0 && (
                          <p className="text-sm"><strong>Skills:</strong> {resume.parsedData.skills.slice(0, 3).join(', ')}</p>
                        )}
                      </div>
                    )}

                    <Button 
                      onClick={() => handleStartInterview(resume)}
                      className="w-full bg-gradient-primary hover:opacity-90"
                      size="sm"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Practice Interview
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Resumes Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Upload your first resume to get AI-powered insights and practice interviews
                </p>
                <Button onClick={() => setShowUploadDialog(true)} className="bg-gradient-primary hover:opacity-90">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Your First Resume
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* Interviews Tab */}
          <TabsContent value="interviews" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Interview History</h2>
              <Button 
                onClick={() => {
                  if (resumes && resumes.length > 0) {
                    handleStartInterview(resumes[0]);
                  }
                }}
                disabled={!resumes || resumes.length === 0}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Interview
              </Button>
            </div>

            {sessionsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 mx-auto animate-spin mb-4" />
                <p className="text-muted-foreground">Loading interview history...</p>
              </div>
            ) : interviewSessions && interviewSessions.length > 0 ? (
              <div className="space-y-4">
                {interviewSessions.map((session) => (
                  <Card key={session.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <Mic className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Interview Session</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(session.startTime)} • {session.totalQuestions} questions • 
                            Status: {session.status}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {session.overallScore && (
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${getScoreColor(session.overallScore)}`}>
                              {Math.round(session.overallScore)}%
                            </div>
                            <p className="text-xs text-muted-foreground">Overall Score</p>
                          </div>
                        )}
                        
                        <Button 
                          onClick={() => handleViewResults(session.id)}
                          size="sm"
                        >
                          View Results
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Mic className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Interviews Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start your first AI-powered interview to get personalized feedback
                </p>
                <Button 
                  onClick={() => {
                    if (resumes && resumes.length > 0) {
                      handleStartInterview(resumes[0]);
                    }
                  }}
                  disabled={!resumes || resumes.length === 0}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Start First Interview
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-bold">Performance Analytics</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Interview Performance Trend</h3>
                <div className="space-y-4">
                  {interviewSessions?.slice(0, 5).map((session, index) => (
                    <div key={session.id} className="flex items-center justify-between">
                      <span className="text-sm">Interview {index + 1}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24">
                          <Progress 
                            value={session.overallScore || 0} 
                            className="h-2" 
                          />
                        </div>
                        <span className={`text-sm font-medium ${getScoreColor(session.overallScore || 0)}`}>
                          {Math.round(session.overallScore || 0)}%
                        </span>
                      </div>
                    </div>
                  )) || (
                    <p className="text-muted-foreground">No interview data available</p>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Interviews</span>
                    <span className="font-semibold">{interviewSessions?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Average Score</span>
                    <span className={`font-semibold ${getScoreColor(userStats?.averageScore || 0)}`}>
                      {userStats?.averageScore || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Resumes Uploaded</span>
                    <span className="font-semibold">{resumes?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Last Activity</span>
                    <span className="font-semibold">
                      {userStats?.lastActivity ? formatDate(userStats.lastActivity) : 'Never'}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        {showUploadDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md p-6">
              <h3 className="text-lg font-semibold mb-4">Upload New Resume</h3>
              <FileUpload
                onUploadComplete={() => {
                  setShowUploadDialog(false);
                }}
                autoUpload={true}
              />
              <Button 
                variant="outline" 
                onClick={() => setShowUploadDialog(false)}
                className="mt-4 w-full"
              >
                Cancel
              </Button>
            </Card>
          </div>
        )}

        <AIInterviewDialog
          open={showInterviewDialog}
          onOpenChange={setShowInterviewDialog}
          resume={selectedResume || undefined}
        />

        {showResultsDialog && selectedSessionId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-auto">
            <div className="w-full max-w-6xl max-h-[90vh] overflow-auto">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Interview Results</h2>
                  <Button 
                    variant="outline"
                    onClick={() => setShowResultsDialog(false)}
                  >
                    Close
                  </Button>
                </div>
                <InterviewResults
                  sessionId={selectedSessionId}
                  onClose={() => setShowResultsDialog(false)}
                  onRetakeInterview={() => {
                    setShowResultsDialog(false);
                    if (selectedResume) {
                      handleStartInterview(selectedResume);
                    }
                  }}
                />
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}