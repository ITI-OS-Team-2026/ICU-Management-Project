import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Step1AdmissionInfo({ form }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 1: Admission Info</CardTitle>
        <CardDescription>Basic patient identification and transfer details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="national_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>National ID <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    maxLength={14}
                    placeholder="Enter 14-digit ID"
                    {...field}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 14);
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patient Full Name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Enter patient name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="place_of_transfer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Place of Transfer</FormLabel>
                <FormControl>
                  <Input placeholder="Hospital or clinic name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="transfer_doctor_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Referring Doctor</FormLabel>
                <FormControl>
                  <Input placeholder="Dr. Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="transfer_reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason for Transfer</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe why the patient is being transferred..." 
                  className="resize-none"
                  rows={4}
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
