"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { ArrowLeftRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTransfers, type TransferRecord } from "@/lib/employee-store";
import { TransferModal } from "@/components/transfer-modal";

function formatDate(date: any) {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(date);
  }
}

// ----- Main Page -----
export default function TransfersPage() {
  const [transferModalOpen, setTransferModalOpen] = React.useState(false);
  const [transfers, setTransfers] = React.useState<TransferRecord[]>([]);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    setTransfers(getTransfers());
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <BackButton />

      <div>
        <h2 className="text-3xl font-bold tracking-tight">Transfers</h2>
        <p className="text-muted-foreground mt-1">
          Manage employee transfers across counties and facilities
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => setTransferModalOpen(true)}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeftRight className="h-4 w-4" />
          Transfer Employee
        </Button>
      </div>

      {/* Transfers Record */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Transfer Records</CardTitle>
          </div>
          <CardDescription>
            {transfers.length === 0
              ? "No transfers have been recorded yet"
              : `${transfers.length} transfer${transfers.length !== 1 ? "s" : ""} recorded`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/30 py-12">
              <ArrowLeftRight className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No transfers yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Transfer Employee" to record a transfer
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        {t.employeeName}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium text-amber-700">
                            {t.fromCounty || "-"}
                          </span>
                          {t.fromFacility && (
                            <span className="text-xs text-muted-foreground">
                              {t.fromFacility}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium text-blue-700">
                            {t.toCounty || "-"}
                          </span>
                          {t.toFacility && (
                            <span className="text-xs text-muted-foreground">
                              {t.toFacility}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(t.transferDate)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.reason || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Modal */}
      <TransferModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        onSuccess={refresh}
      />
    </div>
  );
}
