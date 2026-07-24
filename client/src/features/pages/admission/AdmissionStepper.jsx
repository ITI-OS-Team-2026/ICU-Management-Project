import { CheckCircle2, Circle } from "lucide-react";

export default function AdmissionStepper({ steps, currentStep, onStepClick }) {
  return (
    <div className="hidden md:flex flex-col gap-1 w-64 shrink-0 border-r border-border pr-6">
      {steps.map((step, index) => {
        const isCompleted = currentStep > index;
        const isActive = currentStep === index;
        
        return (
          <button
            key={index}
            type="button"
            onClick={() => {
              if (isCompleted || isActive) {
                onStepClick(index);
              }
            }}
            disabled={!isCompleted && !isActive}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : isCompleted
                ? "hover:bg-muted text-foreground cursor-pointer"
                : "text-muted-foreground opacity-50 cursor-not-allowed"
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            ) : isActive ? (
              <div className="relative flex items-center justify-center w-5 h-5">
                <Circle className="w-5 h-5 text-primary absolute" />
                <div className="w-2.5 h-2.5 bg-primary rounded-full absolute" />
              </div>
            ) : (
              <Circle className="w-5 h-5" />
            )}
            <span className="text-sm font-sans">
              Step {index}: {step.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}
