import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function FamilyHistorySection({ form }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">2.5 Family History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="consanguinity"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3 space-y-0">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="font-medium cursor-pointer">Consanguinity (Parents are relatives)</FormLabel>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <FormField
            control={form.control}
            name="family_similar_conditions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Similar Conditions in Family</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe if family members had similar conditions..." rows={3} className="resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="inherited_diseases"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inherited Diseases</FormLabel>
                <FormControl>
                  <Textarea placeholder="Known inherited diseases..." rows={3} className="resize-none" {...field} />
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
