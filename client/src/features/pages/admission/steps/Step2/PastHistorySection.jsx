import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import { useFieldArray } from "react-hook-form";

export default function PastHistorySection({ form }) {
  const hasSimilar = form.watch("similar_conditions");

  // We use form.watch for past_diseases since it's an array of strings

  const { 
    fields: customFields, 
    append: appendCustom, 
    remove: removeCustom 
  } = useFieldArray({
    control: form.control,
    name: "custom_fields"
  });

  // The allergy switch on its own records nothing a prescriber can be warned
  // about — the allergen list is what the medication safety check reads.
  const hasAllergies = form.watch("has_allergies");
  const {
    fields: allergyFields,
    append: appendAllergy,
    remove: removeAllergy,
  } = useFieldArray({
    control: form.control,
    name: "allergies",
  });

  // Since past_diseases is an array of strings but react-hook-form useFieldArray works best with objects,
  // we will map them slightly differently or just store them as objects with a "value" key for the form.
  // Wait, in schema past_diseases is z.array(z.string()). useFieldArray requires objects.
  // I will just use standard array manipulation instead of useFieldArray for past_diseases to keep it simple,
  // or I can change the schema in AdmitPatientPage.jsx to z.array(z.object({ value: z.string() })).
  // Let's use simple array state management tied to the form value.
  const pastDiseases = form.watch("past_diseases") || [];
  
  const handleAddDisease = () => {
    form.setValue("past_diseases", [...pastDiseases, ""]);
  };

  const handleDiseaseChange = (index, val) => {
    const newArr = [...pastDiseases];
    newArr[index] = val;
    form.setValue("past_diseases", newArr);
  };

  const handleRemoveDisease = (index) => {
    const newArr = [...pastDiseases];
    newArr.splice(index, 1);
    form.setValue("past_diseases", newArr);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">2.4 Past History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="past_history_paragraph"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Summary</FormLabel>
              <FormControl>
                <Textarea placeholder="Summary..." rows={4} className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-border">
          <FormField
            control={form.control}
            name="previous_operations"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-2">
                <FormLabel>Previous Operations</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="has_allergies"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-2">
                <FormLabel>Allergies</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="traveled_abroad"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-2">
                <FormLabel>Traveled Abroad</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="blood_transfusion"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-2">
                <FormLabel>Blood Transfusion</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {hasAllergies && (
          <div className="animate-in fade-in slide-in-from-top-2 space-y-3 border-t border-border pt-4">
            <div className="flex flex-col gap-1">
              <FormLabel>Known allergens</FormLabel>
              <p className="text-xs text-muted-foreground">
                Each allergen recorded here blocks a conflicting drug order later. Leaving this
                empty means the prescribing safety check has nothing to match against.
              </p>
            </div>

            {allergyFields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-3">
                <FormField
                  control={form.control}
                  name={`allergies.${index}.allergen`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="e.g. Penicillin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`allergies.${index}.severity`}
                  render={({ field }) => (
                    <FormItem className="w-40">
                      <FormControl>
                        <Input placeholder="Severity" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAllergy(index)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendAllergy({ allergen: "", severity: "" })}
              className="border-dashed"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add allergen
            </Button>
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <FormField
            control={form.control}
            name="similar_conditions"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0 mb-4">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-medium cursor-pointer">Similar Conditions in Past</FormLabel>
              </FormItem>
            )}
          />
          
          {hasSimilar && (
            <FormField
              control={form.control}
              name="similar_conditions_detail"
              render={({ field }) => (
                <FormItem className="animate-in fade-in slide-in-from-top-2">
                  <FormControl>
                    <Input placeholder="Describe similar conditions..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="pt-4 border-t border-border">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-4 block">Past Diseases</label>
          <div className="space-y-3">
            {pastDiseases.map((disease, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input 
                  value={disease}
                  onChange={(e) => handleDiseaseChange(idx, e.target.value)}
                  placeholder="e.g. Asthma" 
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleRemoveDisease(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={handleAddDisease}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Disease
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-4 block">Custom Fields</label>
          <div className="space-y-3">
            {customFields.map((field, idx) => (
              <div key={field.id} className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name={`custom_fields.${idx}.label`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="Field Label (e.g. Smoking)" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`custom_fields.${idx}.value`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="Value (e.g. 10 cigs/day)" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeCustom(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => appendCustom({ label: "", value: "" })}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Field
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
