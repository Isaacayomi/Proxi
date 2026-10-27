"use client";

import React from "react";
import { AttendanceRecord } from "@/types/database";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { CalendarCheck, MapPin, CheckCircle2 } from "lucide-react";

export function HistoryTable({ records }: { records: AttendanceRecord[] }) {
  if (records.length === 0) {
    return (
      <Card className="border-dashed border-slate-300">
        <CardContent className="text-center py-16">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-proxi-green flex items-center justify-center mx-auto mb-3 shadow-xs">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-proxi-ink">
            No Attendance Records Yet
          </h4>
          <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
            When you check in to active classroom sessions, your verified
            attendance entries and GPS distance logs will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200/90 shadow-card">
      <CardHeader>
        <CardTitle>Verified Attendance History</CardTitle>
        <CardDescription>
          Complete audit trail of authenticated classroom check-ins and server-side geofence records.
        </CardDescription>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80 font-sans">
            <tr>
              <th className="px-6 py-3.5">Course</th>
              <th className="px-6 py-3.5">Classroom Location</th>
              <th className="px-6 py-3.5">Verified Timestamp</th>
              <th className="px-6 py-3.5">Geofence Distance</th>
              <th className="px-6 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {records.map((rec) => (
              <tr
                key={rec.id}
                className="hover:bg-slate-50/70 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="font-bold text-proxi-ink">
                    {rec.session?.course?.code || "Course"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {rec.session?.course?.name || "Attendance Session"}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-proxi-green shrink-0" />
                    <span>{rec.session?.classroom?.name || "Classroom"}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                  {formatDateTime(rec.submitted_at)}
                </td>
                <td className="px-6 py-4 text-xs font-mono font-medium text-emerald-800">
                  {rec.distance_meters != null
                    ? `${rec.distance_meters.toFixed(1)}m from center`
                    : "Verified"}
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant={rec.status === "present" ? "success" : "error"}
                    size="sm"
                  >
                    {rec.status === "present" ? "Present" : "Rejected"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
