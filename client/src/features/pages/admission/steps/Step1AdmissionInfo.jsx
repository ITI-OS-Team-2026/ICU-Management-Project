import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, AlertTriangle, UserCheck, Sparkles } from "lucide-react";

export default function Step1AdmissionInfo({ form }) {
  const isEmergencyUnknown = form.watch("is_emergency_unknown");

  const handleToggleEmergency = (checked) => {
    form.setValue("is_emergency_unknown", checked, { shouldValidate: true, shouldDirty: true });
    if (checked) {
      form.setValue("national_id", "");
      form.clearErrors("national_id");
    }
  };

  const handleQuickName = (name) => {
    form.setValue("name", name, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 1: Admission Info</CardTitle>
        <CardDescription>Basic patient identification and transfer details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* ── Emergency / Unknown Patient ID Toggle Card ──────────────────────── */}
        <div className={`p-4 rounded-lg border transition-colors ${
          isEmergencyUnknown 
            ? "border-amber-500/40 bg-amber-500/10 dark:border-amber-500/30 dark:bg-amber-950/20" 
            : "border-border bg-muted/20"
        }`}>
          <div className="flex items-start gap-3">
            <Checkbox
              id="is_emergency_unknown"
              checked={!!isEmergencyUnknown}
              onCheckedChange={handleToggleEmergency}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label
                htmlFor="is_emergency_unknown"
                className="font-sans text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5"
              >
                <ShieldAlert className={`h-4 w-4 ${isEmergencyUnknown ? "text-amber-500" : "text-muted-foreground"}`} />
                Emergency / Patient ID Unavailable (Unconscious, Trauma, or Physical ID Missing)
              </Label>
              <p className="font-sans text-[11px] text-muted-foreground leading-relaxed">
                Enable for emergency trauma cases or unidentified patients. Bypasses the 14-digit National ID requirement and assigns an Auto-Generated Emergency Identifier for immediate ICU bed assignment.
              </p>
            </div>
          </div>

          {isEmergencyUnknown && (
            <Alert className="mt-3 border-amber-500/30 bg-card text-foreground py-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertTitle className="font-sans text-xs font-bold text-foreground">
                Emergency Admission Mode Active
              </AlertTitle>
              <AlertDescription className="font-sans text-xs text-muted-foreground mt-0.5">
                The patient will be admitted with an Auto-Generated Emergency MRN (<span className="font-mono font-bold text-foreground font-tnum">EMERG-XXXXXX</span>). National ID and verified demographics can be reconciled later once identity documentation is provided.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* ── Patient Identifiers ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="national_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  National ID {!isEmergencyUnknown && <span className="text-destructive">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    maxLength={14}
                    placeholder={isEmergencyUnknown ? "ID Not Available · Emergency Case" : "Enter 14-digit ID"}
                    disabled={isEmergencyUnknown}
                    className="font-tnum"
                    {...field}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 14);
                      field.onChange(digitsOnly);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient Full Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Enter patient name or emergency identifier" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quick helper chips for emergency cases */}
            {isEmergencyUnknown && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="font-sans text-[10px] text-muted-foreground font-medium">Quick suggestions:</span>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="text-[10px] h-6 px-2 font-sans"
                  onClick={() => handleQuickName("Unidentified Male (Trauma)")}
                >
                  Unidentified Male
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="text-[10px] h-6 px-2 font-sans"
                  onClick={() => handleQuickName("Unidentified Female (Trauma)")}
                >
                  Unidentified Female
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="text-[10px] h-6 px-2 font-sans"
                  onClick={() => handleQuickName("Emergency Unknown Patient")}
                >
                  Unknown Patient
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Transfer Details ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="place_of_transfer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Place of Transfer</FormLabel>
                <FormControl>
                  <Input placeholder="Hospital, clinic, or ER Trauma Bay" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="transfer_doctor_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Referring Doctor</FormLabel>
                <FormControl>
                  <Input placeholder="Dr. Name / Paramedic Unit" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="transfer_reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason for Transfer</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe why the patient is being transferred or emergency presentation findings..." 
                  className="resize-none"
                  rows={4}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
