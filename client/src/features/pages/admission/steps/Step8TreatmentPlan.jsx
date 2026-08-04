import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFieldArray, useWatch } from "react-hook-form";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import {
  FREQUENCY_OPTIONS,
  ROUTE_OPTIONS,
  UNSCHEDULED_FREQUENCIES,
} from "../../../services/medicationsService";

// <input type="datetime-local"> works in local wall-clock time, which is how the
// ward reads a dose chart. The value is converted to ISO on submit.
const DATE_INPUT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs";

export default function Step8TreatmentPlan({ form }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "medications",
  });

  const medications = useWatch({ control: form.control, name: "medications" }) || [];

  // Two live orders for the same drug is almost always a mistake, and it is far
  // cheaper to catch here than on the ward.
  const duplicateNames = medications
    .map((m) => m?.drug_name?.trim().toLowerCase())
    .filter(Boolean)
    .filter((name, index, all) => all.indexOf(name) !== index);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 8: Treatment Plan</CardTitle>
        <CardDescription>
          Initial medication orders. These go live on the nurse&apos;s administration record as soon
          as the admission is saved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {duplicateNames.length > 0 && (
          <Alert className="border-amber-500/40 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-700 dark:text-amber-400">Duplicate drug</AlertTitle>
            <AlertDescription className="text-sm">
              The same drug is ordered more than once. Combine the orders unless this is deliberate.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {fields.map((field, index) => {
            const frequency = medications[index]?.frequency;
            const selectedFrequency = FREQUENCY_OPTIONS.find((f) => f.value === frequency);
            const isUnscheduled = UNSCHEDULED_FREQUENCIES.includes(frequency);

            return (
              <div
                key={field.id}
                className="flex items-start gap-4 rounded-md border border-border bg-muted/20 p-4"
              >
                <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name={`medications.${index}.drug_name`}
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>
                          Drug Name <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Paracetamol" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`medications.${index}.dosage`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Dosage <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 500mg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`medications.${index}.route`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Route <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select route" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ROUTE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`medications.${index}.frequency`}
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>
                          Frequency <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FREQUENCY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedFrequency && (
                          <p className="text-xs text-muted-foreground">
                            {isUnscheduled
                              ? "No fixed dose times — the nurse records each dose as it is given."
                              : `Due at ${selectedFrequency.doses}.`}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {frequency === "OTHER" && (
                    <FormField
                      control={form.control}
                      name={`medications.${index}.frequency_text`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-3">
                          <FormLabel>
                            Describe the schedule <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. alternate days" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name={`medications.${index}.start_date`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start</FormLabel>
                        <FormControl>
                          <input
                            type="datetime-local"
                            className={DATE_INPUT_CLASS}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">Defaults to admission time.</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`medications.${index}.end_date`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End</FormLabel>
                        <FormControl>
                          <input
                            type="datetime-local"
                            className={DATE_INPUT_CLASS}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">Empty means ongoing.</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`medications.${index}.instructions`}
                    render={({ field }) => (
                      <FormItem className="md:col-span-3">
                        <FormLabel>Instructions for the nurse</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g. Hold if systolic BP < 100 mmHg"
                            className="min-h-16"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-8">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({
                drug_name: "",
                dosage: "",
                frequency: "",
                frequency_text: "",
                route: "",
                instructions: "",
                start_date: "",
                end_date: "",
              })
            }
            className="w-full border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Medication
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
