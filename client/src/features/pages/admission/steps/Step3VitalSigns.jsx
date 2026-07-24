import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export default function Step3VitalSigns({ form }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 3: Vital Signs</CardTitle>
        <CardDescription>Enter the initial vital signs. At least one reading is required to proceed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="temperature"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Temperature (°C)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" placeholder="e.g. 37.0" className="font-tnum" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pulse"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Heart Rate (bpm)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g. 80" className="font-tnum" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="respiratory_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Respiratory Rate (bpm)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g. 16" className="font-tnum" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="spo2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SpO2 (%)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g. 98" className="font-tnum" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="pt-4 border-t border-border">
          <h3 className="text-sm font-medium mb-4">Blood Pressure</h3>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <FormField
              control={form.control}
              name="systolic_bp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Systolic</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="120" className="font-tnum" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="diastolic_bp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diastolic</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="80" className="font-tnum" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
