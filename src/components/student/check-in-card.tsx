"use client";

import React, { useState } from "react";
import { AttendanceSession, VerificationResult } from "@/types/database";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatTime } from "@/lib/utils";
import {
  MapPin,
  Navigation,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Radio,
} from "lucide-react";

interface CheckInCardProps {
  session: AttendanceSession;
  studentId: string;
  onSuccess?: () => void;
}

export function CheckInCard({
  session,
  studentId,
  onSuccess,
}: CheckInCardProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCheckIn = () => {
    setErrorMsg(null);
    setResult(null);

    if (!navigator.geolocation) {
      setErrorMsg(
        "Geolocation is not supported by your browser. Please use a modern browser on your mobile phone or laptop.",
      );
      return;
    }

    setIsLocating(true);
    setLocationStatus("Acquiring GPS fix (engaging satellite sensors)...");

    let bestCoords: GeolocationCoordinates | null = null;
    let watchId: number | null = null;
    let submitted = false;

    const finalizeCheckIn = async (coords: GeolocationCoordinates) => {
      if (submitted) return;
      submitted = true;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }

      const { latitude, longitude, accuracy } = coords;
      setLocationStatus(
        `GPS acquired (±${accuracy.toFixed(1)}m). Validating geofence server-side...`,
      );

      try {
        const res = await fetch("/api/attendance/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            studentId,
            latitude,
            longitude,
            accuracy,
          }),
        });

        const data: VerificationResult = await res.json();
        setResult(data);

        if (data.success) {
          onSuccess?.();
        }
      } catch {
        setErrorMsg(
          "Network error connecting to verification server. Please ensure you are online and retry.",
        );
      } finally {
        setIsLocating(false);
        setLocationStatus(null);
      }
    };

    // Watch position to refine accuracy across multiple satellite fixes
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = pos.coords.accuracy;
        if (!bestCoords || acc < bestCoords.accuracy) {
          bestCoords = pos.coords;
        }

        setLocationStatus(
          `Refining GPS lock... accuracy ±${acc.toFixed(0)}m`,
        );

        // If sharp precision (under 40m) achieved, submit immediately
        if (acc <= 40) {
          finalizeCheckIn(pos.coords);
        }
      },
      (geoError) => {
        if (bestCoords) {
          finalizeCheckIn(bestCoords);
        } else {
          setIsLocating(false);
          setLocationStatus(null);
          switch (geoError.code) {
            case geoError.PERMISSION_DENIED:
              setErrorMsg(
                "Location access was denied. Please allow location permissions in your browser address bar to verify attendance.",
              );
              break;
            case geoError.POSITION_UNAVAILABLE:
              setErrorMsg(
                "GPS position unavailable. Please ensure device location/GPS is toggled ON.",
              );
              break;
            case geoError.TIMEOUT:
              setErrorMsg(
                "Location acquisition timed out. Please step nearer to a window or outdoors and retry.",
              );
              break;
            default:
              setErrorMsg(
                "An unexpected location error occurred. Please try again.",
              );
              break;
          }
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );

    // Timeout fallback: after 3.5 seconds, submit the best GPS reading acquired
    setTimeout(() => {
      if (!submitted && bestCoords) {
        finalizeCheckIn(bestCoords);
      }
    }, 3500);
  };

  const isCheckedIn = result?.success || false;

  return (
    <Card className="border border-slate-200/90 shadow-card hover:border-emerald-300/80 hover:shadow-cardHover transition-all duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider text-proxi-green uppercase font-mono">
                {session.course?.code}
              </span>
              <Badge variant="success" size="sm">
                <span className="flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
                  Active Session
                </span>
              </Badge>
            </div>
            <CardTitle>{session.course?.name}</CardTitle>
            <CardDescription className="flex items-center gap-1.5 mt-1 font-sans">
              <MapPin className="w-3.5 h-3.5 text-proxi-green shrink-0" />
              <span>{session.classroom?.name} • {session.classroom?.building}</span>
            </CardDescription>
          </div>

          <div className="flex flex-col items-end text-xs text-slate-500 font-sans shrink-0">
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Closes {formatTime(session.ends_at)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
              Max radius: {session.radius_meters}m
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Verification Success Feedback */}
        {result?.success && (
          <Alert variant="success" title="Attendance Successfully Verified">
            <p>
              Your physical presence was verified at{" "}
              <strong className="font-mono">{result.distance_meters?.toFixed(1)}m</strong> from the
              classroom center. Attendance permanently recorded at{" "}
              {formatTime(result.submitted_at || new Date().toISOString())}.
            </p>
          </Alert>
        )}

        {/* Verification Error Feedback */}
        {result && !result.success && (
          <Alert variant="error" title="Verification Unsuccessful">
            <p>{result.message}</p>
            {result.distance_meters != null && result.radius_meters != null && (
              <p className="mt-1.5 font-mono text-xs text-rose-800">
                Calculated Distance: {result.distance_meters.toFixed(1)}m (Maximum permitted: {result.radius_meters}m)
              </p>
            )}
            {result.accuracy_meters != null &&
              result.required_accuracy_meters != null && (
                <p className="mt-1 font-mono text-xs text-rose-800">
                  GPS Accuracy: ±{result.accuracy_meters.toFixed(1)}m (Required: ±{result.required_accuracy_meters}m or tighter)
                </p>
              )}
          </Alert>
        )}

        {errorMsg && (
          <Alert variant="error" title="GPS Location Notice">
            <p>{errorMsg}</p>
          </Alert>
        )}

        {/* Live locating indicator */}
        {isLocating && (
          <div className="flex items-center gap-3 p-3 bg-emerald-50/80 rounded-xl text-xs font-semibold text-proxi-darkGreen animate-pulse border border-emerald-200/60 font-sans">
            <Navigation className="w-4 h-4 animate-spin text-proxi-green shrink-0" />
            <span>{locationStatus}</span>
          </div>
        )}

        {/* Geolocation disclaimer & security note */}
        <div className="flex items-start gap-2.5 text-xs text-slate-500 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60 font-sans">
          <ShieldCheck className="w-4 h-4 text-proxi-green shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            One-time GPS reading is verified cryptographically against classroom coordinates via server-side Haversine calculation. Personal movement tracking is never enabled.
          </p>
        </div>
      </CardContent>

      <CardFooter className="bg-slate-50/50">
        <div className="text-xs text-slate-500 font-sans">
          Session Code:{" "}
          <span className="font-mono font-bold text-proxi-ink">
            {session.session_code}
          </span>
        </div>
        <Button
          onClick={handleCheckIn}
          isLoading={isLocating}
          disabled={isCheckedIn}
          variant={isCheckedIn ? "secondary" : "primary"}
        >
          {isCheckedIn ? (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Verified Present ✓
            </span>
          ) : (
            "Verify GPS & Check In"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
