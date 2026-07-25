import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const generalExamFields = [
  { name: "appearance_consciousness", label: "Appearance and Consciousness" },
  { name: "built_nutrition", label: "Built and Nutrition" },
  { name: "complexion", label: "Complexion" },
  { name: "decubitus_attitude", label: "Decubitus and Attitude" },
  { name: "head_neck", label: "Head and Neck" },
  { name: "upper_lower_limbs", label: "Upper and Lower Limbs" },
  { name: "skin_lymph_nodes", label: "Skin and Lymph Nodes" },
  { name: "other_systems", label: "Other Systems" },
];

export default function Step4GeneralExamination({ form }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 4: General Examination</CardTitle>
        <CardDescription>Document the findings of the general clinical examination.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {generalExamFields.map((fieldObj) => (
            <div key={fieldObj.name} className="flex flex-col gap-2 p-4 border border-border rounded-md bg-muted/20">
              <h4 className="font-semibold text-sm">{fieldObj.label}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <FormField
                  control={form.control}
                  name={`general_exam.${fieldObj.name}.result`}
                  render={({ field }) => (
                    <FormItem className="sm:col-span-1">
                      <FormLabel className="sr-only">Result</FormLabel>
                      <Select
                        value={field.value || null}
                        onValueChange={(val) => field.onChange(val ?? "")}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Result" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="negative">Negative / Normal</SelectItem>
                          <SelectItem value="positive">Positive / Abnormal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`general_exam.${fieldObj.name}.notes`}
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="sr-only">Notes</FormLabel>
                      <FormControl>
                        <Input placeholder="Details (if any)..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
