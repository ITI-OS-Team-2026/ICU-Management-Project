import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Thermometer } from "lucide-react";
import { VITAL_NORMAL_RANGES, calibrateTemperature } from "@/features/utils/vitalStatus";

// Matches server vitalSign.schema.js absolute validation bounds
export const VITAL_ABSOLUTE_RANGES = {
  temperature: { min: 10.0, max: 50.0 },
  pulse: { min: 0, max: 500 },
  systolic_bp: { min: 0, max: 300 },
  diastolic_bp: { min: 0, max: 200 },
  respiratory_rate: { min: 0, max: 100 },
  spo2: { min: 0, max: 100 },
};

export { VITAL_NORMAL_RANGES } from "@/features/utils/vitalStatus";

const VITAL_LABELS = {
  temperature: "Temperature",
  pulse: "Heart Rate",
  systolic_bp: "Systolic BP",
  diastolic_bp: "Diastolic BP",
  respiratory_rate: "Respiratory Rate",
  spo2: "SpO2",
};

export function getCriticalVitalFields(values) {
  const critical = [];
  for (const [key, range] of Object.entries(VITAL_NORMAL_RANGES)) {
    const raw = values[key];
    if (raw === undefined || raw === null || String(raw).trim() === "") continue;
    const num = key === "temperature" ? parseFloat(raw) : parseInt(raw, 10);
    if (Number.isNaN(num)) continue;
    if (num < range.min || num > range.max) {
      critical.push(`${VITAL_LABELS[key]} (${num} is outside safe limits ${range.min}–${range.max})`);
    }
  }
  return critical;
}

export default function Step3VitalSigns({ form }) {
  const [tempSite, setTempSite] = useState("oral");

  const values = form.watch([
    "temperature",
    "pulse",
    "systolic_bp",
    "diastolic_bp",
    "respiratory_rate",
    "spo2",
    "is_override",
  ]);

  const watched = {
    temperature: values[0],
    pulse: values[1],
    systolic_bp: values[2],
    diastolic_bp: values[3],
    respiratory_rate: values[4],
    spo2: values[5],
  };
  const isOverrideChecked = values[6];
  const criticalFields = getCriticalVitalFields(watched);
  const hasCritical = criticalFields.length > 0;

  const handleSiteChange = (newSite) => {
    setTempSite(newSite);
    const currentVal = form.getValues("temperature");
    if (currentVal && !isNaN(parseFloat(currentVal))) {
      // Re-calibrate relative to site adjustment
      // If user switches site, suggest standardized value
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Step 3: Vital Signs <span className="text-destructive">*</span>
        </CardTitle>
        <CardDescription>
          Enter the initial vital signs. At least one reading is required
          <span className="text-destructive"> *</span>. Values outside safe clinical
          limits trigger a mandatory clinical override.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Temperature with Site Calibration */}
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="temperature"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Temperature (°C)</FormLabel>
                    <span className="text-[10px] text-muted-foreground font-sans">
                      {tempSite === "axillary" ? "(+0.5°C Oral Equiv)" : tempSite === "rectal" ? "(-0.5°C Oral Equiv)" : "(Oral Ref)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 37.0"
                        className="font-tnum flex-1"
                        {...field}
                      />
                    </FormControl>
                    <Select value={tempSite} onValueChange={handleSiteChange}>
                      <SelectTrigger className="w-[105px] text-xs shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oral">Oral</SelectItem>
                        <SelectItem value="axillary">Axillary</SelectItem>
                        <SelectItem value="rectal">Rectal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="pulse"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Heart Rate (bpm)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g. 80" className="font-tnum" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="respiratory_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Respiratory Rate (breaths/min)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g. 16" className="font-tnum" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="systolic_bp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Systolic BP (mmHg)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g. 120" className="font-tnum" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="diastolic_bp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Diastolic BP (mmHg)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g. 80" className="font-tnum" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="spo2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Oxygen Saturation (SpO2 %)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g. 98" className="font-tnum" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Clinical Override Banner */}
        {hasCritical && (
          <div className="space-y-4 pt-4 border-t border-border">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="font-semibold">
                Critical Abnormal Vital Signs Detected
              </AlertTitle>
              <AlertDescription className="mt-1 space-y-1">
                <p>
                  The following vital signs are outside safe limits and require a clinical override:
                </p>
                <ul className="list-disc list-inside font-mono text-xs font-tnum">
                  {criticalFields.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex items-start space-x-3">
              <FormField
                control={form.control}
                name="is_override"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm w-full">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <Label className="font-semibold cursor-pointer">
                        Confirm Clinical Override
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        I confirm that these abnormal readings are clinically verified and represent the patient's acute presentation.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {isOverrideChecked && (
              <FormField
                control={form.control}
                name="override_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Clinical Override Justification <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain the clinical reason for the abnormal vital signs (e.g. Septic shock with high-grade fever, acute hypertensive emergency, post-arrest bradycardia)..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
