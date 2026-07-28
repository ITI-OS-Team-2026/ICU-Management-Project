import { useEffect, useState } from "react";
import { useFormState } from "react-hook-form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

import PersonalHistorySection from "./Step2/PersonalHistorySection";
import ChiefComplaintSection from "./Step2/ChiefComplaintSection";
import PresentHistorySection from "./Step2/PresentHistorySection";
import PastHistorySection from "./Step2/PastHistorySection";
import FamilyHistorySection from "./Step2/FamilyHistorySection";
import MenstrualHistorySection from "./Step2/MenstrualHistorySection";
import ObstetricHistorySection from "./Step2/ObstetricHistorySection";

const SECTION_ERROR_FIELDS = {
  personal: ["age", "gender", "marital_status", "handedness", "residence", "occupation"],
  chief: ["chief_complaint"],
  present: [
    "complaint_analysis",
    "related_system_symptoms",
    "other_system_symptoms",
    "previous_investigations",
    "previous_treatments",
    "dm",
    "htn",
  ],
  past: [
    "past_history_paragraph",
    "similar_conditions",
    "similar_conditions_detail",
    "past_diseases",
    "previous_operations",
    "has_allergies",
    "traveled_abroad",
    "custom_fields",
  ],
  family: ["consanguinity", "family_similar_conditions", "inherited_diseases"],
  menstrual: ["menstrual_history"],
  obstetric: ["obstetric_history"],
};

function sectionHasErrors(errors, fields) {
  return fields.some((name) => {
    const parts = name.split(".");
    let cur = errors;
    for (const part of parts) {
      if (!cur?.[part]) return false;
      cur = cur[part];
    }
    return Boolean(cur);
  });
}

function SectionWrapper({ title, defaultOpen = false, forceOpen = false, hasError = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (forceOpen) setIsOpen(true);
  }, [forceOpen]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={`border rounded-lg overflow-hidden bg-card ${
        hasError ? "border-destructive/50" : "border-border"
      }`}
    >
      <CollapsibleTrigger className="w-full flex justify-between items-center p-4 h-auto hover:bg-muted/50 rounded-none rounded-t-lg font-medium text-base text-left cursor-pointer">
        <span className="flex items-center gap-2">
          {title}
          {hasError && !isOpen && (
            <span className="text-xs font-medium text-destructive">Has errors</span>
          )}
        </span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="p-4 pt-0">
        <div className="mt-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function Step2HistoryTaking({ form }) {
  const { errors } = useFormState({ control: form.control });

  const personalError = sectionHasErrors(errors, SECTION_ERROR_FIELDS.personal);
  const chiefError = sectionHasErrors(errors, SECTION_ERROR_FIELDS.chief);
  const presentError = sectionHasErrors(errors, SECTION_ERROR_FIELDS.present);
  const pastError = sectionHasErrors(errors, SECTION_ERROR_FIELDS.past);
  const familyError = sectionHasErrors(errors, SECTION_ERROR_FIELDS.family);
  const menstrualError = sectionHasErrors(errors, SECTION_ERROR_FIELDS.menstrual);
  const obstetricError = sectionHasErrors(errors, SECTION_ERROR_FIELDS.obstetric);

  const isFemale = form.watch("gender") === "FEMALE";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold font-display mb-1 text-foreground">Step 2: History Taking</h2>
        <p className="text-muted-foreground mb-6">
          Complete clinical history covering personal details to family history.
        </p>
      </div>

      <SectionWrapper
        title="2.1 Personal History"
        defaultOpen
        forceOpen={personalError}
        hasError={personalError}
      >
        <PersonalHistorySection form={form} />
      </SectionWrapper>

      <SectionWrapper
        title="2.2 Chief Complaint"
        defaultOpen
        forceOpen={chiefError}
        hasError={chiefError}
      >
        <ChiefComplaintSection form={form} />
      </SectionWrapper>

      <SectionWrapper
        title="2.3 Present History"
        forceOpen={presentError}
        hasError={presentError}
      >
        <PresentHistorySection form={form} />
      </SectionWrapper>

      <SectionWrapper
        title="2.4 Past History"
        forceOpen={pastError}
        hasError={pastError}
      >
        <PastHistorySection form={form} />
      </SectionWrapper>

      <SectionWrapper
        title="2.5 Family History"
        forceOpen={familyError}
        hasError={familyError}
      >
        <FamilyHistorySection form={form} />
      </SectionWrapper>

      {isFemale && (
        <>
          <SectionWrapper
            title="2.6 Menstrual History"
            forceOpen={menstrualError}
            hasError={menstrualError}
          >
            <MenstrualHistorySection form={form} />
          </SectionWrapper>

          <SectionWrapper
            title="2.7 Obstetric History"
            forceOpen={obstetricError}
            hasError={obstetricError}
          >
            <ObstetricHistorySection form={form} />
          </SectionWrapper>
        </>
      )}
    </div>
  );
}
