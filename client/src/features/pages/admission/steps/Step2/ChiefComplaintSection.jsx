import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MessageSquareOff } from "lucide-react";

const CLINICAL_PRESETS = [
  "Unresponsive / Comatose (GCS < 8)",
  "Intubated & Sedated on Arrival",
  "Post-Cardiac Arrest / CPR Status",
  "Acute Respiratory Failure / ARDS",
  "Altered Mental Status / Aphasic",
  "Severe Polytrauma Presentation",
  "History Provided by EMS / Transfer Team",
];

export default function ChiefComplaintSection({ form }) {
  const isEmergencyUnknown = form.watch("is_emergency_unknown");

  const handleSelectPreset = (presetText) => {
    form.setValue("chief_complaint", presetText, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base font-semibold text-foreground">
            2.2 Chief Complaint & Presenting Problem
          </CardTitle>
          {isEmergencyUnknown && (
            <Badge variant="outline" className="text-[10px] font-sans border-amber-500/30 text-amber-600 bg-amber-500/10">
              Emergency Mode Active
            </Badge>
          )}
        </div>
        <CardDescription className="font-sans text-xs text-muted-foreground">
          Record the patient's own words, or document the presenting emergency condition if the patient is intubated, comatose, or unable to speak.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <FormField
          control={form.control}
          name="chief_complaint"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-sans text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Presenting Complaint / Clinical Reason</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  (Optional if patient is unable to speak)
                </span>
              </FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="e.g., Patient stated 'Severe crushing chest pain for 2 hours', or 'Found unresponsive at scene post-MVA, intubated on arrival'..." 
                  className="resize-none font-sans text-xs bg-background min-h-20"
                  rows={3}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Quick Emergency Presets for Unresponsive / Intubated Patients ──── */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] font-sans font-medium text-muted-foreground">
            <MessageSquareOff className="h-3.5 w-3.5 text-primary" />
            <span>If patient cannot speak, click a clinical presentation preset:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {CLINICAL_PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="xs"
                className="text-[10px] h-6 px-2 font-sans text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                onClick={() => handleSelectPreset(preset)}
              >
                {preset}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
