import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

export default function Step8TreatmentPlan({ form }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "medications",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 8: Treatment Plan</CardTitle>
        <CardDescription>Initial medications and treatment orders upon admission.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-4 p-4 border border-border rounded-md bg-muted/20">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name={`medications.${index}.drug_name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Drug Name <span className="text-destructive">*</span></FormLabel>
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
                      <FormLabel>Dosage <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 500mg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`medications.${index}.frequency`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. TDS, PRN" {...field} />
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
          ))}
          
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => append({ drug_name: "", dosage: "", frequency: "" })}
            className="w-full border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Medication
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
