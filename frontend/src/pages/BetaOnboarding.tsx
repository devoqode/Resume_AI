import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "@/components/OnboardingLayout";
import FileUpload from "@/components/FileUpload";
import VoiceRecorder from "@/components/VoiceRecorder";
import ProfilePhotoUpload from "@/components/ProfilePhotoUpload";
import ExperienceCard from "@/components/ExperienceCard";
import WorkStyleInterviewDialog from "@/components/WorkStyleInterviewDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Briefcase, Target, ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TOTAL_STEPS = 5;

interface OnboardingData {
  resume?: File;
  voiceRecording?: Blob;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneCountry: string;
    streetAddress: string;
    city: string;
    stateProvince: string;
    zipPostalCode: string;
    country: string;
    linkedinProfile: string;
    githubProfile: string;
    portfolioWebsite: string;
    behanceProfile: string;
    dribbbleProfile: string;
    mediumProfile: string;
    twitterProfile: string;
    stackOverflowProfile: string;
  };
  profilePhoto?: File;
  workStyle: {
    careerGoals: string;
    workPreferences: string[];
    industries: string[];
  };
  skills: string[];
  verificationComplete: boolean;
}

export default function BetaOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [showWorkStyleDialog, setShowWorkStyleDialog] = useState(false);
  const [sortColumn, setSortColumn] = useState<'years' | 'lastUsed' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [data, setData] = useState<OnboardingData>({
    personalInfo: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      phoneCountry: "+1",
      streetAddress: "",
      city: "",
      stateProvince: "",
      zipPostalCode: "",
      country: "United States",
      linkedinProfile: "",
      githubProfile: "",
      portfolioWebsite: "",
      behanceProfile: "",
      dribbbleProfile: "",
      mediumProfile: "",
      twitterProfile: "",
      stackOverflowProfile: "",
    },
    workStyle: {
      careerGoals: "",
      workPreferences: [],
      industries: [],
    },
    skills: [],
    verificationComplete: false,
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Complete onboarding and go to profile page
      toast({
        title: "Onboarding Complete!",
        description: "Welcome to Job Twin. Your voice-enhanced profile is ready.",
      });
      navigate("/profile");
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!data.resume;
      case 2:
        return data.personalInfo.firstName && data.personalInfo.lastName && data.personalInfo.email;
      case 3:
        return true; // Optional step
      case 4:
        return true; // AI interview is optional
      case 5:
        return true; // Skills Intelligence is optional
      default:
        return true;
    }
  };

  const updatePersonalInfo = (field: keyof OnboardingData['personalInfo'], value: string) => {
    setData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value,
      },
    }));
  };

  const updateWorkStyle = (field: keyof OnboardingData['workStyle'], value: any) => {
    setData(prev => ({
      ...prev,
      workStyle: {
        ...prev.workStyle,
        [field]: value,
      },
    }));
  };

  const addSkill = (skill: string) => {
    if (skill && !data.skills.includes(skill)) {
      setData(prev => ({
        ...prev,
        skills: [...prev.skills, skill],
      }));
    }
  };

  const removeSkill = (skill: string) => {
    setData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill),
    }));
  };

  // Skills data for the table
  const skillsData = [
    { name: "Agile Development", type: "skill", years: 1.7, lastUsed: "2020" },
    { name: "ASP.NET", type: "software", years: 1.3, lastUsed: "2020" },
    { name: "AWS Cloud Platform", type: "software", years: 1.5, lastUsed: "2024" },
    { name: "C# .NET", type: "software", years: 1.5, lastUsed: "2020" },
    { name: "C++", type: "skill", years: 0.7, lastUsed: "Current" },
    { name: "Confluence Documentation Tool", type: "software", years: 1.5, lastUsed: "2022" },
    { name: "Cross-functional Leadership", type: "skill", years: 1.5, lastUsed: "2022" },
    { name: "Data Analysis", type: "skill", years: 1.5, lastUsed: "2022" },
    { name: "DO-178C Standards", type: "skill", years: 0.5, lastUsed: "Current" },
    { name: "Docker Software", type: "software", years: 1, lastUsed: "2024" },
    { name: "Embedded Systems", type: "skill", years: 0.7, lastUsed: "Current" },
  ];

  const handleSort = (column: 'years' | 'lastUsed') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedSkills = () => {
    if (!sortColumn) return skillsData;

    return [...skillsData].sort((a, b) => {
      if (sortColumn === 'years') {
        const comparison = a.years - b.years;
        return sortDirection === 'asc' ? comparison : -comparison;
      } else if (sortColumn === 'lastUsed') {
        // Handle "Current" as the most recent
        const aValue = a.lastUsed === 'Current' ? '2025' : a.lastUsed;
        const bValue = b.lastUsed === 'Current' ? '2025' : b.lastUsed;
        const comparison = parseInt(aValue) - parseInt(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      return 0;
    });
  };

  const getSortIcon = (column: 'years' | 'lastUsed') => {
    if (sortColumn !== column) {
      return <ChevronUp className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                <Upload className="w-6 h-6" />
                Resume Upload & AI Parsing
              </h2>
              <p className="text-muted-foreground">
                Upload your resume for AI-powered analysis and enhancement
              </p>
            </div>
            <FileUpload
              onFileSelect={(file) => setData(prev => ({ ...prev, resume: file }))}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Personal Information</h2>
              <p className="text-muted-foreground">
                Complete your profile with detailed information
              </p>
            </div>
            
            <Card className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={data.personalInfo.firstName}
                      onChange={(e) => updatePersonalInfo('firstName', e.target.value)}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={data.personalInfo.lastName}
                      onChange={(e) => updatePersonalInfo('lastName', e.target.value)}
                      placeholder="Enter your last name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={data.personalInfo.email}
                      onChange={(e) => updatePersonalInfo('email', e.target.value)}
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Address</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="streetAddress">Street Address</Label>
                    <Input
                      id="streetAddress"
                      value={data.personalInfo.streetAddress}
                      onChange={(e) => updatePersonalInfo('streetAddress', e.target.value)}
                      placeholder="Street address"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={data.personalInfo.city}
                        onChange={(e) => updatePersonalInfo('city', e.target.value)}
                        placeholder="City"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stateProvince">State/Province</Label>
                      <Input
                        id="stateProvince"
                        value={data.personalInfo.stateProvince}
                        onChange={(e) => updatePersonalInfo('stateProvince', e.target.value)}
                        placeholder="State/Province"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipPostalCode">ZIP/Postal Code</Label>
                      <Input
                        id="zipPostalCode"
                        value={data.personalInfo.zipPostalCode}
                        onChange={(e) => updatePersonalInfo('zipPostalCode', e.target.value)}
                        placeholder="ZIP/Postal Code"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select
                      value={data.personalInfo.country}
                      onValueChange={(value) => updatePersonalInfo('country', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                        <SelectItem value="Australia">Australia</SelectItem>
                        <SelectItem value="Germany">Germany</SelectItem>
                        <SelectItem value="France">France</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Phone Number */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Phone Number</h3>
                <div className="flex gap-2">
                  <div className="w-24">
                    <Select
                      value={data.personalInfo.phoneCountry}
                      onValueChange={(value) => updatePersonalInfo('phoneCountry', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+1">🇺🇸 +1</SelectItem>
                        <SelectItem value="+44">🇬🇧 +44</SelectItem>
                        <SelectItem value="+49">🇩🇪 +49</SelectItem>
                        <SelectItem value="+33">🇫🇷 +33</SelectItem>
                        <SelectItem value="+61">🇦🇺 +61</SelectItem>
                        <SelectItem value="+1">🇨🇦 +1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Input
                      value={data.personalInfo.phone}
                      onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Online Presence */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Online Presence (Optional)</h3>
                  <p className="text-sm text-muted-foreground">Add your professional profiles and portfolios</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkedinProfile">LinkedIn Profile</Label>
                    <Input
                      id="linkedinProfile"
                      value={data.personalInfo.linkedinProfile}
                      onChange={(e) => updatePersonalInfo('linkedinProfile', e.target.value)}
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="githubProfile">GitHub Profile</Label>
                    <Input
                      id="githubProfile"
                      value={data.personalInfo.githubProfile}
                      onChange={(e) => updatePersonalInfo('githubProfile', e.target.value)}
                      placeholder="https://github.com/yourusername"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="portfolioWebsite">Portfolio/Website</Label>
                    <Input
                      id="portfolioWebsite"
                      value={data.personalInfo.portfolioWebsite}
                      onChange={(e) => updatePersonalInfo('portfolioWebsite', e.target.value)}
                      placeholder="https://yourportfolio.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="behanceProfile">Behance (Designers)</Label>
                    <Input
                      id="behanceProfile"
                      value={data.personalInfo.behanceProfile}
                      onChange={(e) => updatePersonalInfo('behanceProfile', e.target.value)}
                      placeholder="https://behance.net/yourprofile"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dribbbleProfile">Dribbble (Designers)</Label>
                    <Input
                      id="dribbbleProfile"
                      value={data.personalInfo.dribbbleProfile}
                      onChange={(e) => updatePersonalInfo('dribbbleProfile', e.target.value)}
                      placeholder="https://dribbble.com/yourprofile"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mediumProfile">Medium (Writers)</Label>
                    <Input
                      id="mediumProfile"
                      value={data.personalInfo.mediumProfile}
                      onChange={(e) => updatePersonalInfo('mediumProfile', e.target.value)}
                      placeholder="https://medium.com/@yourusername"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitterProfile">Twitter/X</Label>
                    <Input
                      id="twitterProfile"
                      value={data.personalInfo.twitterProfile}
                      onChange={(e) => updatePersonalInfo('twitterProfile', e.target.value)}
                      placeholder="https://twitter.com/yourusername"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stackOverflowProfile">Stack Overflow (Developers)</Label>
                    <Input
                      id="stackOverflowProfile"
                      value={data.personalInfo.stackOverflowProfile}
                      onChange={(e) => updatePersonalInfo('stackOverflowProfile', e.target.value)}
                      placeholder="https://stackoverflow.com/users/yourprofile"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Profile Photo */}
              <div className="space-y-4">
                <ProfilePhotoUpload
                  onPhotoSelect={(file) => setData(prev => ({ ...prev, profilePhoto: file }))}
                  currentPhoto={data.profilePhoto}
                />
              </div>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Experience Enhancement</h2>
              <p className="text-muted-foreground">
                Experience the future of resume processing with AI-powered skills extraction, contextual job analysis, and intelligent career insights.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-6">
                <FileText className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Experience Enhancement</h3>
              </div>

              {/* Experience Cards */}
              <div className="space-y-4">
                {[
                  {
                    title: "Senior Software Engineer",
                    company: "AeroSpace Dynamics",
                    duration: "2024 - Present",
                    location: "Denver, CO",
                    description: "Leading development of mission-critical flight control software systems for commercial and military aircraft. Architecting real-time embedded systems using C++ and Python for avionics platforms. Implementing safety-critical software following DO-178C aviation standards and conducting comprehensive testing protocols. Collaborating with systems engineers and hardware teams to integrate software with flight hardware. Managing technical documentation and regulatory compliance for FAA certification processes.",
                    skills: ["C++", "Python", "Embedded Systems", "Real-time Systems", "DO-178C Standards", "MATLAB", "Linux Operating System"],
                    software: ["Git Version Control Tool", "AI Suggested Software", "Excel", "PowerPoint", "Slack", "Trello", "Asana", "Monday.com", "Tableau", "Power BI", "Salesforce", "HubSpot", "Zoom", "Teams"],
                    aiSuggestedSkills: ["Leadership", "Communication", "Problem Solving", "Team Collaboration", "Strategic Planning", "Project Management", "Data Analysis", "Quality Assurance", "Budget Management", "Risk Management", "Change Management", "Training"],
                    aiSuggestedSoftware: []
                  },
                  {
                    title: "Senior Software Engineer",
                    company: "TechCorp Inc.",
                    duration: "2022 - 2024",
                    location: "San Francisco, CA",
                    description: "Developed scalable web applications using modern JavaScript frameworks and cloud technologies. Led a team of 5 engineers in delivering high-quality software solutions. Implemented microservices architecture and improved system performance by 40%.",
                    skills: ["JavaScript", "React", "Node.js", "AWS", "Docker", "Kubernetes", "TypeScript"],
                    software: ["Git", "Jira", "Slack", "VS Code", "Docker Desktop", "AWS Console"],
                    aiSuggestedSkills: ["Team Leadership", "Agile Methodology", "System Design"],
                    aiSuggestedSoftware: ["Jenkins", "Terraform", "New Relic"]
                  },
                  {
                    title: "Product Manager",
                    company: "StartupX",
                    duration: "2020 - 2022",
                    location: "Austin, TX",
                    description: "Managed product roadmap and strategy for B2B SaaS platform. Collaborated with cross-functional teams to define requirements and prioritize features. Increased user engagement by 60% through data-driven product decisions.",
                    skills: ["Product Strategy", "Data Analysis", "User Research", "Agile", "Scrum"],
                    software: ["Figma", "Mixpanel", "Amplitude", "Notion", "Slack"],
                    aiSuggestedSkills: ["Market Research", "Competitive Analysis", "Stakeholder Management"],
                    aiSuggestedSoftware: ["ProductBoard", "Miro", "Confluence"]
                  },
                  {
                    title: "Software Developer",
                    company: "SecureLife Insurance",
                    duration: "2018 - 2020",
                    location: "Chicago, IL",
                    description: "Built and maintained insurance management systems using Java and Spring framework. Developed RESTful APIs and integrated with third-party services. Improved application security and implemented automated testing.",
                    skills: ["Java", "Spring Framework", "SQL", "REST APIs", "JUnit"],
                    software: ["IntelliJ IDEA", "Maven", "Jenkins", "Oracle Database"],
                    aiSuggestedSkills: ["Software Architecture", "Database Design", "API Design"],
                    aiSuggestedSoftware: ["SonarQube", "Postman", "Swagger"]
                  }
                ].map((job, index) => (
                  <ExperienceCard
                    key={index}
                    job={job}
                    isExpanded={expandedCard === index}
                    onToggle={() => setExpandedCard(expandedCard === index ? null : index)}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Work Style & Career Goals</h2>
              <p className="text-muted-foreground">
                Experience the future of resume processing with AI-powered skills extraction, contextual job analysis, and intelligent career insights.
              </p>
            </div>
            
            <div className="flex justify-center">
              <Card className="p-8 max-w-md w-full text-center space-y-6">
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Briefcase className="w-8 h-8 text-primary" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="inline-block bg-muted px-3 py-1 rounded-full text-sm font-medium">
                      Work Style & Career Goals
                    </div>
                    <p className="text-muted-foreground">
                      This interview will focus on your work type and career objectives
                    </p>
                  </div>
                </div>
                
                <Button 
                  onClick={() => setShowWorkStyleDialog(true)}
                  className="w-full bg-gradient-primary hover:opacity-90"
                  size="lg"
                >
                  Start Interview
                </Button>
              </Card>
            </div>
            
            <WorkStyleInterviewDialog 
              isOpen={showWorkStyleDialog}
              onClose={() => setShowWorkStyleDialog(false)}
            />
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Skills Intelligence & Context Analysis</h2>
              <p className="text-muted-foreground">
                AI-powered analysis of your skills and experience extracted from your resume
              </p>
            </div>
            
            <Card className="p-6">
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="by-job">By Job</TabsTrigger>
                  <TabsTrigger value="by-industry">By Industry</TabsTrigger>
                </TabsList>
                
                <TabsContent value="summary" className="mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="w-5 h-5" />
                      <h3 className="text-lg font-semibold">Skills & Software Summary</h3>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Skill/Software</TableHead>
                          <TableHead 
                            className="cursor-pointer select-none group hover:bg-muted/50 transition-colors"
                            onClick={() => handleSort('years')}
                          >
                            <div className="flex items-center gap-1">
                              Years Experience
                              {getSortIcon('years')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer select-none group hover:bg-muted/50 transition-colors"
                            onClick={() => handleSort('lastUsed')}
                          >
                            <div className="flex items-center gap-1">
                              Last Used
                              {getSortIcon('lastUsed')}
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getSortedSkills().map((skill, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Badge 
                                variant="secondary" 
                                className={skill.type === 'skill' 
                                  ? "bg-blue-50 text-blue-700 border-blue-200" 
                                  : "bg-green-50 text-green-700 border-green-200"
                                }
                              >
                                {skill.name}
                              </Badge>
                            </TableCell>
                            <TableCell>{skill.years}</TableCell>
                            <TableCell className={skill.lastUsed === 'Current' ? 'text-success font-medium' : ''}>
                              {skill.lastUsed}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                
                <TabsContent value="by-job" className="mt-6">
                  <div className="space-y-4">
                    <p className="text-muted-foreground">Skills and software organized by job position</p>
                    <div className="text-center py-8 text-muted-foreground">
                      Content will be populated based on job analysis
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="by-industry" className="mt-6">
                  <div className="space-y-4">
                    <p className="text-muted-foreground">Skills and software categorized by industry relevance</p>
                    <div className="text-center py-8 text-muted-foreground">
                      Content will be populated based on industry analysis
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <OnboardingLayout
      currentStep={currentStep}
      totalSteps={TOTAL_STEPS}
      title="Job Twin - Transform Your Resume with Voice"
      subtitle="AI-Powered Resume Enhancement"
    >
      {renderStepContent()}
      
      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-6 border-t">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={!canProceed()}
          className="bg-gradient-primary hover:opacity-90"
        >
          {currentStep === TOTAL_STEPS ? "Complete Setup" : "Next"}
        </Button>
      </div>
    </OnboardingLayout>
  );
}