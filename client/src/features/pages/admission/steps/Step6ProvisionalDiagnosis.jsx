import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  COMMON_DIAGNOSES,
  DIAGNOSIS_STATUSES,
  DIAGNOSIS_TYPES,
  INITIAL_STATUSES,
} from "../../../services/diagnosesService";

export default function Step6ProvisionalDiagnosis({ form }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "diagnoses",
  });

  const diagnoses = useWatch({ control: form.control, name: "diagnoses" }) || [];

  const primaryCount = diagnoses.filter((d) => d?.type === "PRIMARY").length;
  const duplicateNames = diagnoses
    .map((d) => d?.condition_name?.trim().toLowerCase())
    .filter(Boolean)
    .filter((name, index, all) => all.indexOf(name) !== index);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 6: Provisional Diagnosis</CardTitle>
        <CardDescription>
          Based on the history and examinations, record the working diagnoses. These become the
          patient&apos;s problem list — suspected entries stay in the differential until confirmed or
          ruled out on a ward round.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {primaryCount > 1 && (
          <Alert className="border-amber-500/40 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-700 dark:text-amber-400">
              More than one primary
            </AlertTitle>
            <AlertDescription className="text-sm">
              Only one condition can be the reason for admission. The first will be kept as primary
              and the rest recorded as secondary.
            </AlertDescription>
          </Alert>
        )}

        {duplicateNames.length > 0 && (
          <Alert className="border-amber-500/40 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-700 dark:text-amber-400">
              Duplicate condition
            </AlertTitle>
            <AlertDescription className="text-sm">
              The same condition is listed more than once. Combine the entries unless this is
              deliberate.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {fields.map((field, index) => {
            const query = diagnoses[index]?.condition_name?.trim().toLowerCase() || "";
            const suggestions =
              query.length >= 2 && !COMMON_DIAGNOSES.some((name) => name.toLowerCase() === query)
                ? COMMON_DIAGNOSES.filter((name) => name.toLowerCase().includes(query)).slice(0, 5)
                : [];

            return (
              <div
                key={field.id}
                className="flex items-start gap-4 rounded-md border border-border bg-muted/20 p-4"
              >
                <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name={`diagnoses.${index}.condition_name`}
                    render={({ field }) => (
                      <FormItem className="md:col-span-3">
                        <FormLabel>
                          Condition <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Community-acquired pneumonia"
                            autoComplete="off"
                            {...field}
                          />
                        </FormControl>
                        {suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {suggestions.map((name) => (
                              <button
                                key={name}
                                type="button"
                                onClick={() =>
                                  form.setValue(`diagnoses.${index}.condition_name`, name, {
                                    shouldValidate: true,
                                  })
                                }
                                className="rounded-md border border-border bg-card px-2 py-1 font-sans text-xs text-foreground transition-colors hover:bg-muted"
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`diagnoses.${index}.type`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Classification <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DIAGNOSIS_TYPES.map((opt) => (
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
                    name={`diagnoses.${index}.status`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Certainty <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {INITIAL_STATUSES.map((value) => (
                              <SelectItem key={value} value={value}>
                                {DIAGNOSIS_STATUSES[value].label}
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
                    name={`diagnoses.${index}.clinical_notes`}
                    render={({ field }) => (
                      <FormItem className="md:col-span-3">
                        <FormLabel>Clinical reasoning</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="What supports this? What else is still in the differential?"
                            className="min-h-16 resize-none"
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
                condition_name: "",
                // The first condition entered is almost always the reason for
                // admission; anything after it defaults to secondary.
                type: fields.length === 0 ? "PRIMARY" : "SECONDARY",
                status: "SUSPECTED",
                clinical_notes: "",
              })
            }
            className="w-full border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Diagnosis
          </Button>
        </div>

        <FormField
          control={form.control}
          name="provisional_diagnosis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Diagnostic summary</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Overall impression and how the differential was reached. The structured list above drives the problem list — this is the narrative around it."
                  rows={4}
                  className="resize-none text-base"
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
