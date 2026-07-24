import { Progress } from "@/components/ui/progress";

export default function AdmissionProgress({ steps, currentStep }) {
  const progressValue = (currentStep / (steps.length - 1)) * 100;

  return (
    <div className="md:hidden flex flex-col gap-2 mb-6">
      <div className="flex justify-between items-center text-sm font-sans">
        <span className="font-semibold text-foreground">
          Step {currentStep}: {steps[currentStep]?.title}
        </span>
        <span className="text-muted-foreground">
          {currentStep} of {steps.length - 1}
        </span>
      </div>
      <Progress value={progressValue} className="h-2" />
    </div>
  );
}
