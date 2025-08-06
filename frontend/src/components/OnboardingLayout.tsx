import { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";

interface OnboardingLayoutProps {
  children: ReactNode;
  currentStep: number;
  totalSteps: number;
  title: string;
  subtitle: string;
}

const stepNames = [
  "Resume Upload",
  "Personal Information", 
  "Experience Enhancement",
  "Work Style & Career Goals",
  "Skills Intelligence"
];

const stepIcons = [
  "📄", "👤", "📈", "🎯", "🧠"
];

export default function OnboardingLayout({ 
  children, 
  currentStep, 
  totalSteps, 
  title, 
  subtitle 
}: OnboardingLayoutProps) {
  const progressPercentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Onboarding
            </span>{" "}
            and{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Enhanced Resume Intelligence
            </span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Experience the future of resume processing with AI-powered skills 
            extraction, contextual job analysis, and intelligent career insights.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {progressPercentage}% Complete
            </span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        {/* Step Icons */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4 md:space-x-8">
            {stepNames.map((step, index) => (
              <div key={step} className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-lg mb-2 transition-all ${
                    index + 1 === currentStep
                      ? "bg-gradient-primary text-white shadow-lg scale-110"
                      : index + 1 < currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {stepIcons[index]}
                </div>
                <span className={`text-xs text-center max-w-20 ${
                  index + 1 === currentStep ? "text-primary font-medium" : "text-muted-foreground"
                }`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-card rounded-2xl shadow-xl border p-8">
          {children}
        </div>
      </div>
    </div>
  );
}