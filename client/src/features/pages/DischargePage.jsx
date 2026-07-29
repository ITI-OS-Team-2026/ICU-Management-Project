import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bed, Clock } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "../store/authStore";

function getInitials(name) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function DischargePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const [admissions, setAdmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success"); // "success" or "error"

  const activeAdmissionId = searchParams.get("admissionId");
  const activeAdmission =
    admissions.find((a) => a.id === activeAdmissionId) || null;

  useEffect(() => {
    async function fetchAdmissions() {
      try {
        setIsLoading(true);
        const { data: adData } = await api.get(
          "/admissions?status=ACTIVE&limit=100",
        );
        const list = adData.data || [];
        setAdmissions(list);
      } catch (err) {
        console.error("Failed to load admissions", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAdmissions();
  }, []);

  useEffect(() => {
    if (!admissions || admissions.length === 0) return;
    const urlAdmissionId = searchParams.get("admissionId");
    if (urlAdmissionId) {
      return;
    }
    setSearchParams({ admissionId: admissions[0].id });
  }, [admissions, searchParams, setSearchParams]);

  const handleSelect = (admission) => {
    setMessage("");
    setSearchParams({ admissionId: admission.id });
  };

  const handleDischarge = async () => {
    if (!activeAdmission) return;
    if (
      !window.confirm(
        `Confirm discharge for ${activeAdmission.patient?.name}? This action cannot be undone.`,
      )
    )
      return;
    try {
      setIsSubmitting(true);
      const admissionId = searchParams.get("admissionId");
      await api.patch(`/admissions/${admissionId}/discharge`);
      setAdmissions((prev) => prev.filter((a) => a.id !== admissionId));
      setMessage("Patient discharged successfully.");
      setMessageType("success");
      setTimeout(() => setMessage(""), 4000);
      const remaining = admissions.filter((a) => a.id !== admissionId);
      if (remaining.length > 0) {
        setSearchParams({ admissionId: remaining[0].id });
      } else {
        setSearchParams({});
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || "Failed to discharge patient.";
      setMessage(errorMsg);
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSpecialist = user?.role === "ICU_SPECIALIST";

  return (
    <div className="w-full min-h-screen bg-background py-4 md:py-6">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-2xl md:text-headline font-bold text-foreground">
            Patient Discharge
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and process patient discharges
          </p>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Patient List - Left Sidebar */}
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Active Patients</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {admissions.length} patient{admissions.length !== 1 ? "s" : ""}
                </p>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden flex flex-col">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : admissions.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground text-center">
                      No active admissions
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                    {admissions.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => handleSelect(a)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          activeAdmission?.id === a.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 hover:bg-muted text-foreground"
                        }`}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs font-bold">
                            {getInitials(a.patient?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {a.patient?.name || "Unknown"}
                          </div>
                          <div className="text-xs opacity-75">
                            {a.bed?.bed_number || "No Bed"}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Patient Details - Right Content */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
              </CardHeader>
              <CardContent>
                {!activeAdmission ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-2 text-4xl">👤</div>
                    <p className="text-sm text-muted-foreground">
                      Select a patient to view details and process discharge
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Patient Header */}
                    <div className="border-b pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="font-bold">
                              {getInitials(activeAdmission.patient?.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h2 className="font-semibold text-lg">
                              {activeAdmission.patient?.name}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                              MRN: {activeAdmission.patient?.mrn || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 text-right">
                          <div className="flex items-center justify-end gap-1.5 text-sm">
                            <Bed className="h-4 w-4" />
                            <span className="font-medium">
                              {activeAdmission.bed?.bed_number || "—"}
                            </span>
                          </div>
                          <div className="flex items-center justify-end gap-1.5 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span className="text-xs">
                              {activeAdmission.admitted_at
                                ? new Date(
                                    activeAdmission.admitted_at,
                                  ).toLocaleString()
                                : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Clinical Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Chief Complaint
                        </p>
                        <p className="text-sm">
                          {activeAdmission.chief_complaint || "—"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Provisional Diagnosis
                        </p>
                        <p className="text-sm">
                          {activeAdmission.provisional_diagnosis || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Discharge Actions */}
                    <div className="border-t pt-4 space-y-4">
                      {message && (
                        <div
                          className={`p-3 rounded-md text-sm ${
                            messageType === "success"
                              ? "bg-green-50 text-green-800 border border-green-200"
                              : "bg-red-50 text-red-800 border border-red-200"
                          }`}
                        >
                          {message}
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row gap-3">
                        {isSpecialist ? (
                          <>
                            <Button
                              variant="destructive"
                              onClick={handleDischarge}
                              disabled={isSubmitting}
                              className="w-full sm:w-auto"
                            >
                              {isSubmitting ? "Processing..." : "Discharge Patient"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setMessage("")}
                              className="w-full sm:w-auto"
                            >
                              Clear
                            </Button>
                          </>
                        ) : (
                          <Button
                            disabled
                            className="w-full"
                            title="Only ICU Specialists can discharge patients"
                          >
                            Discharge (Specialist Only)
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
