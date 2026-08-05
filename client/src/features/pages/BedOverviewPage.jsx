/* Hallmark · macrostructure: Catalogue · genre: modern-minimal · theme: system-managed */
import { RefreshCcw, Activity, Droplet } from "lucide-react";
import { useBeds } from "../hooks/useBeds";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const BEDS_PER_PAGE = 8;

export default function BedOverviewPage() {
  // Paging, and the ward-wide status counts, both come from the server.
  const { beds, meta, stats, page, setPage, isLoading, error, refetch } = useBeds(
    undefined,
    { pageSize: BEDS_PER_PAGE },
  );

  const totalPages = Math.max(1, meta.totalPages || 1);
  const safePage = Math.min(page, totalPages);
  const pagedBeds = beds;

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-destructive font-sans">
          Error loading beds: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 bg-background min-h-[calc(100vh-4rem)]">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-sm font-sans text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
            Clinical Overview
          </p>
          <h1 className="font-display text-headline text-foreground tracking-tight">
            Bed Inventory
          </h1>
        </div>
        <Button
          onClick={refetch}
          variant="outline"
          className="shrink-0"
          disabled={isLoading}
        >
          <RefreshCcw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Occupied"
          value={isLoading ? "-" : stats.occupied}
          total={stats.total}
          progressColor="bg-status-occupied"
        />
        <SummaryCard
          title="Available"
          value={isLoading ? "-" : stats.available}
          total={stats.total}
          progressColor="bg-status-available"
        />
        <SummaryCard
          title="Maintenance"
          value={isLoading ? "-" : stats.maintenance}
          total={stats.total}
          progressColor="bg-status-maintenance"
        />
      </div>

      {/* Bed Grid - Catalogue Structure */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {isLoading
          ? Array.from({ length: BEDS_PER_PAGE }).map((_, i) => (
              <BedCardSkeleton key={i} />
            ))
          : pagedBeds.map((bed) => <BedCard key={bed.id} bed={bed} />)}
      </div>

      {!isLoading && totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={
                  safePage === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>

            <div className="flex items-center justify-center px-4 text-sm font-sans text-muted-foreground">
              Page {safePage} of {totalPages}
              <span className="ml-2 hidden sm:inline">
                ({beds.length} bed{beds.length === 1 ? "" : "s"})
              </span>
            </div>

            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={
                  safePage === totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

function SummaryCard({ title, value, total, progressColor }) {
  const percentage = total > 0 && value !== "-" ? (value / total) * 100 : 0;

  return (
    <Card className="shadow-sm border-border bg-card">
      <CardHeader className="pb-2 pt-5 px-6">
        <CardTitle className="font-sans text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-6 pt-0 px-6">
        <div className="font-tnum text-3xl font-bold leading-none mb-4 text-foreground">
          {value}
        </div>
        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full ${progressColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function BedCard({ bed }) {
  const isOccupied = bed.status === "OCCUPIED";
  const isAvailable = bed.status === "AVAILABLE";
  const isMaintenance = bed.status === "MAINTENANCE";

  // Visual alert condition
  const isAlert = isOccupied && (bed.heartRate > 100 || bed.spo2 < 95);

  const getBadge = () => {
    if (isOccupied)
      return (
        <Badge className="bg-status-occupied hover:bg-status-occupied text-primary-foreground uppercase text-[10px] tracking-wider">
          Occupied
        </Badge>
      );
    if (isAvailable)
      return (
        <Badge
          variant="outline"
          className="text-status-available border-status-available uppercase text-[10px] tracking-wider"
        >
          Available
        </Badge>
      );
    if (isMaintenance)
      return (
        <Badge
          variant="secondary"
          className="text-status-maintenance uppercase text-[10px] tracking-wider"
        >
          Maintenance
        </Badge>
      );
    return null;
  };

  const getInitials = (name) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const formatName = (fullName) => {
    if (!fullName) return "";
    const parts = fullName.split(" ");
    if (parts.length === 1) return parts[0];
    return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
  };

  return (
    <Card
      className={`flex flex-col min-h-[200px] shadow-sm border-border bg-card transition-shadow hover:shadow-md ${isAlert ? "border-destructive ring-1 ring-destructive" : ""}`}
    >
      <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-center justify-between">
        <CardTitle className="font-sans text-sm font-bold text-foreground">
          Bed {bed.bed_number}
        </CardTitle>
        {getBadge()}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col px-5 pb-5 pt-0">
        {isOccupied && bed.patientName ? (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarFallback className="bg-muted text-foreground font-sans font-bold text-xs">
                  {getInitials(bed.patientName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <p className="font-sans font-semibold text-foreground text-sm truncate">
                  {formatName(bed.patientName)}
                </p>
                <p className="font-sans text-xs text-muted-foreground truncate">
                  {bed.diagnosis || "No active diagnosis"}
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="mt-auto grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Activity className="w-3.5 h-3.5" />
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-wider">
                    HR
                  </span>
                </div>
                <div className="flex items-end gap-1">
                  <span
                    className={`font-tnum text-2xl font-bold leading-none ${bed.heartRate > 100 ? "text-destructive" : "text-foreground"}`}
                  >
                    {bed.heartRate || "-"}
                  </span>
                  <span className="font-sans text-[10px] text-muted-foreground mb-0.5">
                    bpm
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Droplet className="w-3.5 h-3.5" />
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-wider">
                    SpO₂
                  </span>
                </div>
                <div className="flex items-end gap-1">
                  <span
                    className={`font-tnum text-2xl font-bold leading-none ${bed.spo2 < 95 ? "text-destructive" : "text-foreground"}`}
                  >
                    {bed.spo2 || "-"}
                  </span>
                  <span className="font-sans text-[10px] text-muted-foreground mb-0.5">
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
              <span className="font-sans text-xs font-semibold uppercase tracking-wider opacity-50">
                Empty
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BedCardSkeleton() {
  return (
    <Card className="min-h-[200px] flex flex-col shadow-sm bg-card border-border">
      <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-center justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </CardHeader>
      <CardContent className="space-y-4 flex-1 px-5 pb-5 pt-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Separator className="my-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-6 w-12" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
