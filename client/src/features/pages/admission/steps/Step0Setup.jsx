import { useEffect, useState } from "react";
import { useAuthStore } from "../../../store/authStore";
import api from "../../../../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export default function Step0Setup({ form }) {
  const user = useAuthStore((s) => s.user);
  const isResident = user?.role === "MEDICAL_RESIDENT";
  const isSpecialist = user?.role === "ICU_SPECIALIST";

  const [beds, setBeds] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoadError(null);
      try {
        const [bedsRes, docsRes] = await Promise.all([
          api.get("/admin/beds", { params: { status: "AVAILABLE" } }),
          isResident
            ? api.get("/admin/users", { params: { role: "specialist", status: "ACTIVE", limit: 100 } })
            : Promise.resolve({ data: { data: [] } }),
        ]);

        if (cancelled) return;
        setBeds(unwrapList(bedsRes.data));
        setDoctors(unwrapList(docsRes.data));
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to fetch setup data:", error);
        setLoadError(error?.response?.data?.message || "Failed to load beds or specialists.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [isResident]);

  // Auto-assign attending specialist for ICU specialists
  useEffect(() => {
    if (isSpecialist && user?.id) {
      form.setValue("doctor_id", user.id, { shouldValidate: true, shouldDirty: false });
    }
  }, [isSpecialist, user?.id, form]);

  const specialistName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "You";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Setup Admission</CardTitle>
        <CardDescription>Select the bed and attending physician before proceeding.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-card/70">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {loadError && (
          <p className="text-sm font-medium text-destructive">{loadError}</p>
        )}

        <FormField
          control={form.control}
          name="bed_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assign Bed <span className="text-destructive">*</span></FormLabel>
              <Select
                value={field.value || null}
                onValueChange={(val) => field.onChange(val ?? "")}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an available bed" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {beds.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {loading ? "Loading beds..." : "No beds available"}
                    </div>
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
                <FormLabel>Attending ICU Specialist <span className="text-destructive">*</span></FormLabel>
                <Select
                  value={field.value || null}
                  onValueChange={(val) => field.onChange(val ?? "")}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select attending specialist" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {doctors.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        {loading ? "Loading specialists..." : "No specialists found"}
                      </div>
                    ) : (
                      doctors.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          Dr. {doc.first_name} {doc.last_name}
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
            <label className="text-sm font-medium leading-none">
              Attending ICU Specialist
            </label>
            <div className="p-3 border border-border rounded-md bg-muted/50 text-sm font-medium">
              Dr. {specialistName}{" "}
              <span className="ml-2 text-xs font-normal text-muted-foreground">(Auto-assigned)</span>
            </div>
            <FormField
              control={form.control}
              name="doctor_id"
              render={() => (
                <FormItem>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
