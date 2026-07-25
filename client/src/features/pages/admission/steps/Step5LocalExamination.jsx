import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

export default function Step5LocalExamination({ form }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 5: Local Examination</CardTitle>
        <CardDescription>Document findings for the specific system or area related to the chief complaint.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="local_exam.inspection"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inspection</FormLabel>
                <FormControl>
                  <Textarea placeholder="Visual findings..." rows={3} className="resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="local_exam.palpation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Palpation</FormLabel>
                <FormControl>
                  <Textarea placeholder="Tactile findings (tenderness, masses)..." rows={3} className="resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="local_exam.percussion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Percussion</FormLabel>
                <FormControl>
                  <Textarea placeholder="Resonance, dullness..." rows={3} className="resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="local_exam.auscultation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Auscultation</FormLabel>
                <FormControl>
                  <Textarea placeholder="Breath sounds, heart sounds, bowel sounds..." rows={3} className="resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
