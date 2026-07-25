import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

export default function Step6ProvisionalDiagnosis({ form }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 6: Provisional Diagnosis</CardTitle>
        <CardDescription>Based on the history and examinations, record the initial working diagnosis.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormField
          control={form.control}
          name="provisional_diagnosis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Provisional Diagnosis</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="E.g. Acute exacerbation of COPD, suspected community-acquired pneumonia..." 
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
