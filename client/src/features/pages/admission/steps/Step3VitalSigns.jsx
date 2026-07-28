import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { VITAL_NORMAL_RANGES } from "@/features/utils/vitalStatus";

// Matches server vitalSign.schema.js
export const VITAL_ABSOLUTE_RANGES = {
  temperature: { min: 35.0, max: 45.0 },
  pulse: { min: 20, max: 300 },
  systolic_bp: { min: 40, max: 300 },
  diastolic_bp: { min: 20, max: 200 },
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
      critical.push(`${VITAL_LABELS[key]} (${num} outside ${range.min}–${range.max})`);
    }
  }
  return critical;
}

export default function Step3VitalSigns({ form }) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Step 3: Vital Signs <span className="text-destructive">*</span>
        </CardTitle>
        <CardDescription>
          Enter the initial vital signs. At least one reading is required
          <span className="text-destructive"> *</span>. Values outside normal
          ranges require a clinical override (same rules as the server).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="temperature"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Temperature (°C)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" placeholder="e.g. 37.0" className="font-tnum" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pulse"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Heart Rate (rr)</FormLabel>
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
                <FormLabel>Respiratory Rate (bpm)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g. 16" className="font-tnum" {...field} />
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
                <FormLabel>SpO2 (%)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g. 98" className="font-tnum" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="pt-4 border-t border-border">
          <h3 className="text-sm font-medium mb-4">Blood Pressure</h3>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <FormField
              control={form.control}
              name="systolic_bp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Systolic</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="120" className="font-tnum" {...field} />
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
                  <FormLabel>Diastolic</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="80" className="font-tnum" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {hasCritical && (
          <Alert className="border-destructive/40 bg-destructive/10 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical values detected</AlertTitle>
            <AlertDescription>
              <ul className="mt-1 list-disc pl-4 text-sm">
                {criticalFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {hasCritical && (
          <div className={`space-y-3 rounded-lg border p-4 ${isOverrideChecked ? "border-border" : "border-destructive/40"}`}>
            <FormField
              control={form.control}
              name="is_override"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3 space-y-0">
                  <FormControl>
                    <input
                      id="is_override"
                      type="checkbox"
                      className="mt-1 size-4 cursor-pointer accent-primary"
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  </FormControl>
                  <Label htmlFor="is_override" className="text-sm leading-normal text-muted-foreground cursor-pointer font-normal">
                    Acknowledge critical alerts and authorize entry override. A clinical reason is required.
                  </Label>
                </FormItem>
              )}
            />

            {isOverrideChecked && (
              <FormField
                control={form.control}
                name="override_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Override Reason <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain why these critical values are being recorded..."
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
