import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function PresentHistorySection({ form }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">2.3 Present History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="complaint_analysis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Analysis of Complaint</FormLabel>
              <FormControl>
                <Textarea placeholder="Detailed analysis..." rows={3} className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="related_system_symptoms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Related System Symptoms</FormLabel>
                <FormControl>
                  <Textarea placeholder="Symptoms of the related system..." rows={3} className="resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="other_system_symptoms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Other System Symptoms</FormLabel>
                <FormControl>
                  <Textarea placeholder="Symptoms of other systems..." rows={3} className="resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="pt-4 border-t border-border">
          <h3 className="font-medium mb-4">Investigations & Treatment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="previous_investigations.labs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Previous Labs</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Previous lab results..." rows={3} className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="previous_investigations.radiology"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Previous Radiology</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Previous radiology findings..." rows={3} className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="mt-6">
            <FormField
              control={form.control}
              name="previous_treatments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Previous Medications</FormLabel>
                  <FormControl>
                    <Textarea placeholder="List previous treatments..." rows={3} className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <h3 className="font-medium mb-4">Comorbidities</h3>
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-12">
            <FormField
              control={form.control}
              name="dm"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-medium cursor-pointer">Diabetes Mellitus (DM)</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="htn"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-medium cursor-pointer">Hypertension (HTN)</FormLabel>
                </FormItem>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
