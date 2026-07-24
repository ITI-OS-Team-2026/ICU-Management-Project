import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

import PersonalHistorySection from "./Step2/PersonalHistorySection";
import ChiefComplaintSection from "./Step2/ChiefComplaintSection";
import PresentHistorySection from "./Step2/PresentHistorySection";
import PastHistorySection from "./Step2/PastHistorySection";
import FamilyHistorySection from "./Step2/FamilyHistorySection";

function SectionWrapper({ title, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border border-border rounded-lg overflow-hidden bg-card">
      <CollapsibleTrigger 
        className="w-full flex justify-between items-center p-4 h-auto hover:bg-muted/50 rounded-none rounded-t-lg font-medium text-base text-left"
      >
        {title}
        {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="p-4 pt-0">
        <div className="mt-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function Step2HistoryTaking({ form }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold font-display mb-1 text-foreground">Step 2: History Taking</h2>
        <p className="text-muted-foreground mb-6">Complete clinical history covering personal details to family history.</p>
      </div>

      <SectionWrapper title="2.1 Personal History" defaultOpen={true}>
        <PersonalHistorySection form={form} />
      </SectionWrapper>

      <SectionWrapper title="2.2 Chief Complaint">
        <ChiefComplaintSection form={form} />
      </SectionWrapper>

      <SectionWrapper title="2.3 Present History">
        <PresentHistorySection form={form} />
      </SectionWrapper>

      <SectionWrapper title="2.4 Past History">
        <PastHistorySection form={form} />
      </SectionWrapper>

      <SectionWrapper title="2.5 Family History">
        <FamilyHistorySection form={form} />
      </SectionWrapper>
    </div>
  );
}
