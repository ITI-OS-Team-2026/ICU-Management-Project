import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function MenstrualHistorySection({ form }) {
  const hasDysmenorrhea = form.watch("menstrual_history.dysmenorrhea");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">2.6 Menstrual History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="menstrual_history.menarche"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Menarche (Age)</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    inputMode="numeric" 
                    placeholder="e.g., 12" 
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 2);
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
            name="menstrual_history.cycle_rhythm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cycle Rhythm</FormLabel>
                <Select
                  value={field.value || null}
                  onValueChange={(val) => field.onChange(val ?? "")}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="REGULAR">Regular</SelectItem>
                    <SelectItem value="IRREGULAR">Irregular</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="menstrual_history.cycle_length"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cycle Length (Days)</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    inputMode="numeric" 
                    placeholder="e.g., 28" 
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
            name="menstrual_history.duration_of_flow"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration of Flow (Days)</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    inputMode="numeric" 
                    placeholder="e.g., 5" 
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

        <FormField
          control={form.control}
          name="menstrual_history.character_of_flow"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Character of Flow</FormLabel>
              <FormControl>
                <Input placeholder="Amount, color, odor..." {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-4 border-t border-border">
          <FormField
            control={form.control}
            name="menstrual_history.dysmenorrhea"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0 mb-4">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-medium cursor-pointer">Dysmenorrhea (Pain with flow)</FormLabel>
              </FormItem>
            )}
          />
          
          {hasDysmenorrhea && (
            <FormField
              control={form.control}
              name="menstrual_history.dysmenorrhea_details"
              render={({ field }) => (
                <FormItem className="animate-in fade-in slide-in-from-top-2">
                  <FormControl>
                    <Input placeholder="Describe pain interference with daily activity..." {...field} value={field.value || ""} />
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
            name="menstrual_history.inter_menstrual_period"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inter-menstrual Period (IMP)</FormLabel>
                <FormControl>
                  <Input placeholder="Pain, bleeding or discharge..." {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="menstrual_history.contraception"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Contraception Use</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., IUD, Pills, None..." {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="menstrual_history.lnmp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>1st Day of Last Menstrual Period (LNMP)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} />
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
