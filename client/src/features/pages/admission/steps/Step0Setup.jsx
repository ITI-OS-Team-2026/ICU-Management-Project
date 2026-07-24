import { useEffect, useState } from "react";
import { useAuthStore } from "../../../store/authStore";
import api from "../../../../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function Step0Setup({ form }) {
  const user = useAuthStore((s) => s.user);
  const isResident = user?.role === "MEDICAL_RESIDENT";

  const [beds, setBeds] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [bedsRes, docsRes] = await Promise.all([
          api.get("/admin/beds?status=AVAILABLE"),
          isResident ? api.get("/admin/users?role=specialist&status=ACTIVE") : Promise.resolve({ data: { data: [] } })
        ]);
        
        setBeds(bedsRes.data || []);
        setDoctors(isResident ? (docsRes.data?.data || []) : []);
      } catch (error) {
        console.error("Failed to fetch setup data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [isResident]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Setup Admission</CardTitle>
        <CardDescription>Select the bed and attending physician before proceeding.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="bed_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assign Bed</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an available bed" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {beds.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">No beds available</div>
                  ) : (
                    beds.map((bed) => (
                      <SelectItem key={bed.id} value={bed.id}>
                        Bed {bed.bed_number}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {isResident ? (
          <FormField
            control={form.control}
            name="doctor_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Attending ICU Specialist</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select attending specialist" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {doctors.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">No specialists found</div>
                    ) : (
                      doctors.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          Dr. {doc.firstName} {doc.lastName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Attending ICU Specialist
            </label>
            <div className="p-3 border border-border rounded-md bg-muted/50 text-sm font-medium">
              Dr. {user?.firstName} {user?.lastName} <span className="ml-2 text-xs font-normal text-muted-foreground">(Auto-assigned)</span>
            </div>
            {/* Field is already populated by useEffect in parent */}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
