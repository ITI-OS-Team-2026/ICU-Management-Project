import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function ObstetricHistorySection({ form }) {
  const hasCesarean = form.watch("obstetric_history.cesarean_section");
  const hasAbortions = form.watch("obstetric_history.abortions");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">2.7 Obstetric History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="obstetric_history.gravidity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gravidity (Total Pregnancies)</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    inputMode="numeric" 
                    placeholder="e.g., 2" 
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "");
                      field.onChange(digitsOnly);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="obstetric_history.parity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parity (Deliveries &gt; 20w)</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    inputMode="numeric" 
                    placeholder="e.g., 2" 
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "");
                      field.onChange(digitsOnly);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
          <FormField
            control={form.control}
            name="obstetric_history.full_term_normal_deliveries"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Term Normal Deliveries</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    inputMode="numeric" 
                    placeholder="Number of full term normal deliveries" 
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "");
                      field.onChange(digitsOnly);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="obstetric_history.pre_term"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pre-term Deliveries</FormLabel>
                <FormControl>
                  <Input placeholder="Number, duration & mood..." {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="obstetric_history.still_birth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Still Birth</FormLabel>
                <FormControl>
                  <Input placeholder="Results in dead fetus after 20w..." {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="obstetric_history.difficult_labors"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Difficult Labors</FormLabel>
                <FormControl>
                  <Input placeholder="Twins, breech, or prolonged..." {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="pt-4 border-t border-border">
          <FormField
            control={form.control}
            name="obstetric_history.cesarean_section"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0 mb-4">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-medium cursor-pointer">Cesarean Section (C.S.)</FormLabel>
              </FormItem>
            )}
          />
          
          {hasCesarean && (
            <FormField
              control={form.control}
              name="obstetric_history.cesarean_details"
              render={({ field }) => (
                <FormItem className="animate-in fade-in slide-in-from-top-2">
                  <FormControl>
                    <Input placeholder="Why? Where? When? How many? How?" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
          <FormField
            control={form.control}
            name="obstetric_history.last_delivery_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Delivery Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="pt-4 border-t border-border">
          <FormField
            control={form.control}
            name="obstetric_history.abortions"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0 mb-4">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-medium cursor-pointer">Abortions</FormLabel>
              </FormItem>
            )}
          />
          
          {hasAbortions && (
            <FormField
              control={form.control}
              name="obstetric_history.abortions_details"
              render={({ field }) => (
                <FormItem className="animate-in fade-in slide-in-from-top-2">
                  <FormControl>
                    <Input placeholder="Number, Time (trimester), Onset (spontaneous/induced), Mode..." {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
          <FormField
            control={form.control}
            name="obstetric_history.previous_pregnancies_complications"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Previous Pregnancies Complications</FormLabel>
                <FormControl>
                  <Textarea placeholder="Bleeding, pain, ROM..." className="resize-none" rows={3} {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="obstetric_history.previous_puerperal_complications"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Previous Puerperal Complications</FormLabel>
                <FormControl>
                  <Textarea placeholder="Sepsis, PPH..." className="resize-none" rows={3} {...field} value={field.value || ""} />
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
