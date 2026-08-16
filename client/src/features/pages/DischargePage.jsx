import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Bed,
  Clock,
  Search,
  X,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  History,
  Calendar,
  Stethoscope,
  FileText,
} from "lucide-react";
import api from "@/lib/api";
import { patientsService } from "../services/patientsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "../store/authStore";

const PAGE_SIZE = 8;
const SEARCH_DEBOUNCE_MS = 350;

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
  const isSpecialist = user?.role === "ICU_SPECIALIST";

  const activeAdmissionId = searchParams.get("admissionId");

  // ── Patient list (server-paginated + searched) ──────────────────────────
  const [admissions, setAdmissions] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: PAGE_SIZE });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isListLoading, setIsListLoading] = useState(true);
  const [listError, setListError] = useState(null);

  const [dischargedAdmissions, setDischargedAdmissions] = useState([]);
  const [dischargedMeta, setDischargedMeta] = useState({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
  });
  const [dischargedPage, setDischargedPage] = useState(1);
  const [dischargedSearchInput, setDischargedSearchInput] = useState("");
  const [dischargedDebouncedSearch, setDischargedDebouncedSearch] =
    useState("");
  const [isDischargedListLoading, setIsDischargedListLoading] = useState(true);
  const [dischargedListError, setDischargedListError] = useState(null);

  // Which panel mode: 'active' shows discharge detail, 'discharged' shows readmit detail
  const [panelMode, setPanelMode] = useState("active");
  const [selectedDischargedAdmission, setSelectedDischargedAdmission] =
    useState(null);
  const [dischargedPatientHistory, setDischargedPatientHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // ── Selected patient detail (fetched independently of the list page) ────
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // ── Discharge action feedback ────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / PAGE_SIZE));
  const totalDischargedPages = Math.max(
    1,
    Math.ceil((dischargedMeta.total || 0) / PAGE_SIZE),
  );

  const navigate = useNavigate();

  // Debounce free-text search input before hitting the server
  useEffect(() => {
    const handle = setTimeout(() => {
      const next = searchInput.trim();
      // Batched together so `page` and `debouncedSearch` never update across
      // two separate renders — otherwise fetchList can fire once with the
      // new search term but the stale page number before the reset lands.
      setDebouncedSearch((prev) => {
        if (prev !== next) setPage(1);
        return next;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    const handle = setTimeout(() => {
      const next = dischargedSearchInput.trim();
      setDischargedDebouncedSearch((prev) => {
        if (prev !== next) setDischargedPage(1);
        return next;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [dischargedSearchInput]);

  // Guards against out-of-order responses (e.g. a slow page-2 request
  // resolving after a faster page-1 request) clobbering fresher state.
  const requestIdRef = useRef(0);
  const dischargedRequestIdRef = useRef(0);

  const fetchList = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setIsListLoading(true);
      setListError(null);
      const params = { page, limit: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await patientsService.getActiveAdmissionsPaginated(params);
      if (requestId !== requestIdRef.current) return [];
      const list = res?.data || [];
      setAdmissions(list);
      setMeta(res?.meta || { total: list.length, page, limit: PAGE_SIZE });
      return list;
    } catch (err) {
      if (requestId !== requestIdRef.current) return [];
      console.error("Failed to load admissions", err);
      setListError(
        err.response?.data?.message || "Failed to load active patients.",
      );
      setAdmissions([]);
      return [];
    } finally {
      if (requestId === requestIdRef.current) setIsListLoading(false);
    }
  }, [page, debouncedSearch]);

  const fetchDischargedList = useCallback(async () => {
    const requestId = ++dischargedRequestIdRef.current;
    try {
      setIsDischargedListLoading(true);
      setDischargedListError(null);
      const params = { page: dischargedPage, limit: PAGE_SIZE };
      if (dischargedDebouncedSearch) params.search = dischargedDebouncedSearch;
      const res =
        await patientsService.getDischargedAdmissionsPaginated(params);
      if (requestId !== dischargedRequestIdRef.current) return [];
      const list = res?.data || [];
      setDischargedAdmissions(list);
      setDischargedMeta(
        res?.meta || {
          total: list.length,
          page: dischargedPage,
          limit: PAGE_SIZE,
        },
      );
      return list;
    } catch (err) {
      if (requestId !== dischargedRequestIdRef.current) return [];
      console.error("Failed to load discharged admissions", err);
      setDischargedListError(
        err.response?.data?.message || "Failed to load discharged patients.",
      );
      setDischargedAdmissions([]);
      return [];
    } finally {
      if (requestId === dischargedRequestIdRef.current)
        setIsDischargedListLoading(false);
    }
  }, [dischargedPage, dischargedDebouncedSearch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDischargedList();
  }, [fetchDischargedList]);

  const refreshAll = () => {
    fetchList();
    fetchDischargedList();
  };

  // Auto-select the first visible patient whenever nothing is selected yet
  useEffect(() => {
    if (isListLoading) return;
    if (activeAdmissionId) return;
    if (admissions.length > 0) {
      setSearchParams({ admissionId: admissions[0].id });
    }
  }, [admissions, isListLoading, activeAdmissionId, setSearchParams]);

  // Fetch full details for the selected patient independently of the
  // current list page — keeps deep links / cross-page selection correct.
  useEffect(() => {
    if (!activeAdmissionId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedAdmission(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    async function loadDetail() {
      try {
        setIsDetailLoading(true);
        setDetailError(null);
        const data = await patientsService.getAdmissionById(activeAdmissionId);
        if (!cancelled) setSelectedAdmission(data);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load admission detail", err);
        setDetailError(
          err.response?.data?.message || "Failed to load patient details.",
        );
        setSelectedAdmission(null);
      } finally {
        if (!cancelled) setIsDetailLoading(false);
      }
    }
    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [activeAdmissionId]);

  useEffect(() => {
    if (!selectedDischargedAdmission) {
      setDischargedPatientHistory([]);
      return;
    }
    const targetPatientId =
      selectedDischargedAdmission.patient_id ||
      selectedDischargedAdmission.patient?.id;
    if (!targetPatientId) {
      setDischargedPatientHistory([selectedDischargedAdmission]);
      return;
    }

    let cancelled = false;
    async function loadHistory() {
      try {
        setIsHistoryLoading(true);
        const history =
          await patientsService.getPatientAdmissions(targetPatientId);
        if (!cancelled) {
          setDischargedPatientHistory(
            history && history.length > 0
              ? history
              : [selectedDischargedAdmission],
          );
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load patient admissions history", err);
          setDischargedPatientHistory([selectedDischargedAdmission]);
        }
      } finally {
        if (!cancelled) setIsHistoryLoading(false);
      }
    }
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [selectedDischargedAdmission]);

  const handleSelect = (admission) => {
    setMessage("");
    setSelectedDischargedAdmission(null);
    setPanelMode("active");
    setSearchParams({ admissionId: admission.id });
  };

  const handleSelectDischarged = (admission) => {
    setMessage("");
    setSelectedDischargedAdmission(admission);
    setPanelMode("discharged");
    setSearchParams({});
  };

  const handleReadmit = (admission) => {
    // Refresh the discharged list after navigating so the patient disappears
    // from the list when the user returns (the server now excludes patients
    // who already have an active admission).
    navigate(`/patients/admit?readmitId=${admission.id}`);
  };

  const handleDischarge = async () => {
    if (!selectedAdmission) return;
    if (
      !window.confirm(
        `Confirm discharge for ${selectedAdmission.patient?.name}? This action cannot be undone.`,
      )
    )
      return;
    try {
      setIsSubmitting(true);
      setMessage("");
      await api.patch(`/admissions/${selectedAdmission.id}/discharge`);

      setMessage(
        `${selectedAdmission.patient?.name || "Patient"} discharged successfully.`,
      );
      setMessageType("success");
      setTimeout(() => setMessage(""), 4000);

      // Clear selection first so stale details don't linger while we resync
      setSearchParams({});
      const refreshed = await fetchList();
      // If we discharged the last patient on a page beyond the first, step back
      if (refreshed.length === 0 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      }
      // Refresh the discharged list too — the newly discharged patient should
      // appear there immediately, and the readmitEligible filter should now
      // exclude them if they had a prior readmission pending.
      fetchDischargedList();
      setPanelMode("active");
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Failed to discharge patient.");
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background py-4 md:py-6">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-headline font-bold text-foreground">
              Patient Discharge
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and process patient discharges
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={refreshAll}
            disabled={isListLoading || isDischargedListLoading}
            className="h-9 w-9 shrink-0"
            title="Refresh lists"
          >
            <RefreshCcw
              className={`h-4 w-4 ${isListLoading || isDischargedListLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 items-start">
          {/* Patient List - Left Sidebar */}
          <div className="lg:col-span-1">
            <Card className="flex flex-col">
              <CardHeader className="pb-3 gap-3">
                <div>
                  <CardTitle className="text-base">Active Patients</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {meta.total} patient{meta.total !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search name or MRN..."
                    className="pl-8 h-9 text-sm pr-8"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col pt-0">
                {isListLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : listError ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                    <p className="text-sm text-destructive">{listError}</p>
                    <Button variant="outline" size="sm" onClick={fetchList}>
                      Try again
                    </Button>
                  </div>
                ) : admissions.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground text-center">
                      {debouncedSearch
                        ? "No patients match your search."
                        : "No active admissions."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 lg:max-h-[55vh] overflow-y-auto pr-1">
                    {admissions.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => handleSelect(a)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          activeAdmissionId === a.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 hover:bg-muted text-foreground"
                        }`}
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="text-xs font-bold">
                            {getInitials(a.patient?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {a.patient?.name || "Unknown"}
                          </div>
                          <div className="text-xs opacity-75 truncate">
                            {a.bed?.bed_number || "No Bed"}
                            {a.patient?.mrn ? ` · ${a.patient.mrn}` : ""}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
              {!isListLoading && !listError && totalPages > 1 && (
                <CardFooter className="flex items-center justify-between pt-3 border-t">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground font-medium">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              )}
            </Card>

          </div>

          {/* Patient Details - Right Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>
                  {panelMode === "discharged"
                    ? "Discharged Patient — Readmission"
                    : "Patient Information"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* ── Discharged patient detail + Readmit action ── */}
                {panelMode === "discharged" ? (
                  !selectedDischargedAdmission ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-2 text-4xl">📋</div>
                      <p className="text-sm text-muted-foreground">
                        Select a discharged patient to view details and readmit
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="border-b pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="font-bold">
                                {getInitials(selectedDischargedAdmission.patient?.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h2 className="font-semibold text-lg">
                                {selectedDischargedAdmission.patient?.name}
                              </h2>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-0.5">
                                <span>MRN: <span className="font-mono font-tnum font-medium text-foreground">{selectedDischargedAdmission.patient?.mrn || "—"}</span></span>
                                {selectedDischargedAdmission.patient?.age !== undefined && selectedDischargedAdmission.patient?.age !== null && (
                                  <>
                                    <span>·</span>
                                    <span>Age: <span className="font-tnum font-medium text-foreground">{selectedDischargedAdmission.patient.age}</span></span>
                                  </>
                                )}
                                {selectedDischargedAdmission.patient?.gender && (
                                  <>
                                    <span>·</span>
                                    <span className="capitalize font-medium text-foreground">{selectedDischargedAdmission.patient.gender.toLowerCase()}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 text-right">
                            <div className="flex items-center justify-end gap-1.5 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span className="text-xs">
                                Latest Discharge:{" "}
                                {selectedDischargedAdmission.discharged_at
                                  ? new Date(
                                      selectedDischargedAdmission.discharged_at,
                                    ).toLocaleString()
                                  : "—"}
                              </span>
                            </div>
                            <div className="flex justify-end">
                              <Badge variant="secondary" className="font-sans text-[11px] uppercase">
                                {selectedDischargedAdmission.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 p-3 rounded-lg border border-border bg-muted/20">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Latest Chief Complaint
                          </p>
                          <p className="text-sm text-foreground">
                            {selectedDischargedAdmission.chief_complaint || "—"}
                          </p>
                        </div>
                        <div className="space-y-1.5 p-3 rounded-lg border border-border bg-muted/20">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Latest Provisional Diagnosis
                          </p>
                          <p className="text-sm text-foreground">
                            {selectedDischargedAdmission.provisional_diagnosis || "—"}
                          </p>
                        </div>
                      </div>

                      {/* Previous Admissions History */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                            <History className="h-4 w-4 text-primary" />
                            <span>Previous ICU Admissions History</span>
                          </h3>
                          <Badge variant="outline" className="font-sans text-[11px]">
                            {dischargedPatientHistory.length} Total Stay{dischargedPatientHistory.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>

                        {isHistoryLoading ? (
                          <div className="space-y-2">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                          </div>
                        ) : dischargedPatientHistory.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No prior admissions recorded.</p>
                        ) : (
                          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                            {dischargedPatientHistory.map((adm, idx) => (
                              <div
                                key={adm.id || idx}
                                className="p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors text-xs space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-tnum">
                                      {adm.admitted_at
                                        ? new Date(adm.admitted_at).toLocaleDateString()
                                        : "—"}
                                      {adm.discharged_at
                                        ? ` · Discharged: ${new Date(adm.discharged_at).toLocaleDateString()}`
                                        : ""}
                                    </span>
                                  </div>
                                  <Badge
                                    variant={adm.status === "ACTIVE" ? "default" : "outline"}
                                    className="text-[10px] uppercase font-sans"
                                  >
                                    {adm.status}
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
                                  {adm.doctor && (
                                    <div className="flex items-center gap-1.5">
                                      <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                                      <span>Dr. {adm.doctor.first_name} {adm.doctor.last_name}</span>
                                    </div>
                                  )}
                                  {adm.bed?.bed_number && (
                                    <div className="flex items-center gap-1.5">
                                      <Bed className="h-3.5 w-3.5 shrink-0" />
                                      <span>Bed {adm.bed.bed_number}</span>
                                    </div>
                                  )}
                                </div>

                                {adm.provisional_diagnosis && (
                                  <div className="pt-0.5 text-foreground">
                                    <span className="text-muted-foreground font-medium">Diagnosis: </span>
                                    <span>{adm.provisional_diagnosis}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Readmit action — prominently placed in the detail panel */}
                      <div className="border-t pt-4 space-y-3">
                        <p className="text-sm text-muted-foreground">
                          This patient is eligible for readmission. Clicking below will open the Admission form
                          pre-filled with their clinical and demographic history. A new admission record will be created.
                        </p>
                        <Button
                          onClick={() =>
                            handleReadmit(selectedDischargedAdmission)
                          }
                          className="w-full sm:w-auto"
                        >
                          Readmit Patient
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  /* ── Active patient detail + Discharge action ── */
                  isDetailLoading ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : detailError ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                      <p className="text-sm text-destructive">{detailError}</p>
                    </div>
                  ) : !selectedAdmission ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-2 text-4xl">👤</div>
                      <p className="text-sm text-muted-foreground">
                        Select an active patient to discharge, or a discharged
                        patient to readmit
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="border-b pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="font-bold">
                                {getInitials(selectedAdmission.patient?.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h2 className="font-semibold text-lg">
                                {selectedAdmission.patient?.name}
                              </h2>
                              <p className="text-sm text-muted-foreground">
                                MRN: {selectedAdmission.patient?.mrn || "—"}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 text-right">
                            <div className="flex items-center justify-end gap-1.5 text-sm">
                              <Bed className="h-4 w-4" />
                              <span className="font-medium">
                                {selectedAdmission.bed?.bed_number || "—"}
                              </span>
                            </div>
                            <div className="flex items-center justify-end gap-1.5 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span className="text-xs">
                                {selectedAdmission.admitted_at
                                  ? new Date(
                                      selectedAdmission.admitted_at,
                                    ).toLocaleString()
                                  : "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Chief Complaint
                          </p>
                          <p className="text-sm">
                            {selectedAdmission.chief_complaint || "—"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Provisional Diagnosis
                          </p>
                          <p className="text-sm">
                            {selectedAdmission.provisional_diagnosis || "—"}
                          </p>
                        </div>
                      </div>

                      <div className="border-t pt-4 space-y-4">
                        {message && (
                          <div
                            className={`flex items-start justify-between gap-3 p-3 rounded-md text-sm border ${
                              messageType === "success"
                                ? "bg-status-available/10 text-status-available border-status-available/30"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                            }`}
                          >
                            <span>{message}</span>
                            <button
                              type="button"
                              onClick={() => setMessage("")}
                              className="shrink-0 opacity-70 hover:opacity-100"
                              aria-label="Dismiss message"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        {isSpecialist ? (
                          <Button
                            variant="destructive"
                            onClick={handleDischarge}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto"
                          >
                            {isSubmitting ? "Processing..." : "Discharge Patient"}
                          </Button>
                        ) : (
                          <Button
                            disabled
                            className="w-full sm:w-auto"
                            title="Only ICU Specialists can discharge patients"
                          >
                            Discharge (Specialist Only)
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
            <Card className="flex flex-col mt-4">
              <CardHeader className="pb-3 gap-3">
                <div>
                  <CardTitle className="text-base">
                    Discharged Patients
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dischargedMeta.total} patient
                    {dischargedMeta.total !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={dischargedSearchInput}
                    onChange={(e) => setDischargedSearchInput(e.target.value)}
                    placeholder="Search name or MRN..."
                    className="pl-8 h-9 text-sm pr-8"
                  />
                  {dischargedSearchInput && (
                    <button
                      type="button"
                      onClick={() => setDischargedSearchInput("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col pt-0">
                {isDischargedListLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : dischargedListError ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                    <p className="text-sm text-destructive">
                      {dischargedListError}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchDischargedList}
                    >
                      Try again
                    </Button>
                  </div>
                ) : dischargedAdmissions.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground text-center">
                      {dischargedDebouncedSearch
                        ? "No discharged patients match your search."
                        : "No discharged admissions."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 lg:max-h-[55vh] overflow-y-auto pr-1">
                    {dischargedAdmissions.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => handleSelectDischarged(a)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          selectedDischargedAdmission?.id === a.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 hover:bg-muted text-foreground"
                        }`}
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="text-xs font-bold">
                            {getInitials(a.patient?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {a.patient?.name || "Unknown"}
                          </div>
                          <div className="text-xs opacity-75 truncate">
                            {a.patient?.mrn ? `${a.patient.mrn} · ` : ""}
                            {a.discharged_at
                              ? new Date(a.discharged_at).toLocaleDateString()
                              : "Discharged"}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
              {!isDischargedListLoading &&
                !dischargedListError &&
                totalDischargedPages > 1 && (
                  <CardFooter className="flex items-center justify-between pt-3 border-t">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setDischargedPage((p) => Math.max(1, p - 1))
                      }
                      disabled={dischargedPage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground font-medium">
                      Page {dischargedPage} of {totalDischargedPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setDischargedPage((p) =>
                          Math.min(totalDischargedPages, p + 1),
                        )
                      }
                      disabled={dischargedPage === totalDischargedPages}
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
