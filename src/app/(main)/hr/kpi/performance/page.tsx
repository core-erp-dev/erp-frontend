"use client";

import { useState, useEffect } from "react";
import {
  ProgressCircle,
  Skeleton,
  Card,
  Select,
  ListBox,
  Button,
  Alert,
} from "@heroui/react";
import { Target, TrendUp, FileC, Clock, ArrowLeft } from "@phosphor-icons/react";
import { usePermission } from "@/hooks/use-permission";
import { PERM } from "@/constants/permissions";
import { useRouter } from "next/navigation";
import { kpiReportApi } from "@/modules/hr/kpi/services/report-api";
import { PerformanceSummaryResponse } from "@/modules/hr/kpi/types";

function SummaryCardSkeleton() {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <Skeleton className="h-4 w-24 rounded" />
      <Skeleton className="h-8 w-20 rounded" />
    </Card>
  );
}

export default function KpiPerformancePage() {
  const { hasPerm } = usePermission();
  const router = useRouter();
  const [data, setData] = useState<PerformanceSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  if (!hasPerm(PERM.PERFORMANCE_READ)) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Title>Akses Ditolak</Alert.Title></Alert.Content></Alert>
        <Button variant="secondary" onPress={() => router.back()}><ArrowLeft className="h-4 w-4" />Kembali</Button>
      </div>
    );
  }

  useEffect
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await kpiReportApi.getPerformance({ year: selectedYear });
        setData(result);
      } catch {
        // Error handled in API layer
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedYear]);

  const persentase = data?.achievementPercentage ?? 0;
  const progressColor = persentase >= 80 ? "success" : persentase >= 60 ? "warning" : "danger";

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">
          Ringkasan Capaian KPI
        </h1>
        <Select
          className="w-40"
          selectedKey={String(selectedYear)}
          onSelectionChange={(key) => setSelectedYear(Number(key))}
          aria-label="Pilih tahun"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {[2025, 2026, 2027].map((y) => (
                <ListBox.Item key={y} id={String(y)} textValue={`Tahun ${y}`}>
                  Tahun {y}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {/* Total Target */}
            <Card className="flex flex-col gap-1 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                Total Target
              </div>
              <span className="text-2xl font-bold text-foreground">
                {data?.totalTarget?.toLocaleString("id-ID") ?? "0"}
              </span>
            </Card>

            {/* Total Realisasi */}
            <Card className="flex flex-col gap-1 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendUp className="h-4 w-4" />
                Total Realisasi
              </div>
              <span className="text-2xl font-bold text-foreground">
                {data?.totalRealization?.toLocaleString("id-ID", { minimumFractionDigits: 2 }) ?? "0,00"}
              </span>
            </Card>

            {/* Laporan Disetujui */}
            <Card className="flex flex-col gap-1 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileC className="h-4 w-4" />
                Laporan Disetujui
              </div>
              <span className="text-2xl font-bold text-foreground">
                {data?.totalReportsApproved ?? 0}
              </span>
            </Card>

            {/* Menunggu Persetujuan */}
            <Card className="flex flex-col gap-1 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Menunggu Persetujuan
              </div>
              <span className="text-2xl font-bold text-foreground">
                {data?.totalReportsPending ?? 0}
              </span>
            </Card>
          </div>

          {/* Gauge Chart */}
          <Card className="flex flex-col items-center gap-6 p-8">
            <h2 className="text-lg font-semibold text-foreground">
              Persentase Capaian Tahunan
            </h2>

            <div className="relative">
              <ProgressCircle
                aria-label="Persentase capaian KPI"
                value={Math.min(persentase, 100)}
                size="lg"
                color={progressColor}
                className="size-52"
              >
                <ProgressCircle.Track strokeWidth={8} viewBox="0 0 120 120">
                  <ProgressCircle.TrackCircle cx={60} cy={60} r={52} strokeWidth={8} />
                  <ProgressCircle.FillCircle cx={60} cy={60} r={52} strokeWidth={8} />
                </ProgressCircle.Track>
              </ProgressCircle>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-foreground">
                  {persentase.toFixed(1)}%
                </span>
                <span className="text-sm text-muted-foreground">
                  {persentase >= 80 ? "Sangat Baik" : persentase >= 60 ? "Cukup" : "Perlu Peningkatan"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-success" />
                {"≥ 80% (Baik)"}
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-warning" />
                {"60-79% (Cukup)"}
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-danger" />
                {"< 60% (Kurang)"}
              </div>
            </div>
          </Card>

          {/* Employee Info */}
          {data?.employeeName && (
            <Card className="p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pegawai:</span>
                <span className="font-medium text-foreground">{data.employeeName}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Periode:</span>
                <span className="font-medium text-foreground">Tahun {selectedYear}</span>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
