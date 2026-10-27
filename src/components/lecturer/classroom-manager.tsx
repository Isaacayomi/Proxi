"use client";

import React, { useState, useEffect } from "react";
import { Classroom } from "@/types/database";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Building2, Navigation, CheckCircle2 } from "lucide-react";

interface ClassroomManagerProps {
  initialClassrooms: Classroom[];
}

export function ClassroomManager({ initialClassrooms }: ClassroomManagerProps) {
  const [classrooms, setClassrooms] = useState<Classroom[]>(initialClassrooms);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [building, setBuilding] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("50");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setClassrooms(initialClassrooms);
  }, [initialClassrooms]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setIsCapturing(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setIsCapturing(false);
      },
      () => {
        setError("Unable to fetch current GPS coordinates. Please enter coordinates manually.");
        setIsCapturing(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          building: building.trim(),
          room_number: roomNumber.trim() || null,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          default_radius_meters: parseInt(radius, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to add classroom");
      }

      setClassrooms([data.classroom, ...classrooms]);
      setName("");
      setBuilding("");
      setRoomNumber("");
      setLatitude("");
      setLongitude("");
      setRadius("50");
      setShowAddForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving classroom");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-slate-200/90 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-proxi-green uppercase tracking-wider font-mono">
              Campus Infrastructure
            </span>
            <Badge variant="neutral">{classrooms.length} Halls</Badge>
          </div>
          <h1 className="text-2xl font-bold text-proxi-ink tracking-tight font-sans mt-0.5">
            Classrooms & GPS Geofences
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Configure physical lecture theatres and anchor coordinates for proximity roll calls.
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} size="sm">
          <Plus className="w-4 h-4" />
          {showAddForm ? "Cancel" : "Add Classroom"}
        </Button>
      </div>

      {showAddForm && (
        <Card className="border-emerald-200/90 bg-emerald-50/20 shadow-card">
          <CardHeader>
            <CardTitle>Register New Classroom Hall</CardTitle>
            <CardDescription>
              Set physical center coordinates for geofence enforcement.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreate}>
            <CardContent className="space-y-4 pt-4">
              {error && <Alert variant="error">{error}</Alert>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Classroom Name"
                  placeholder="e.g. Computer Building LT 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="Building / Department"
                  placeholder="e.g. Faculty of Technology"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Room Number / Wing"
                  placeholder="e.g. Room 101"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
                <Input
                  label="Latitude (WGS-84)"
                  placeholder="7.518820"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  required
                />
                <Input
                  label="Longitude (WGS-84)"
                  placeholder="4.527350"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentLocation}
                  isLoading={isCapturing}
                >
                  <Navigation className="w-3.5 h-3.5 text-proxi-green" />
                  Capture My Current GPS Coordinates
                </Button>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600 font-sans">
                    Default Radius (m):
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    className="w-20 px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200 bg-white"
                    required
                  />
                </div>
              </div>
            </CardContent>
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isSubmitting}>
                Save Classroom
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Classrooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {classrooms.map((room) => (
          <Card key={room.id} className="border border-slate-200/90 shadow-card hover:border-emerald-300 transition-all">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-proxi-ink text-sm font-sans tracking-tight">
                    {room.name}
                  </h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 font-sans">
                    <Building2 className="w-3.5 h-3.5 text-proxi-green shrink-0" />
                    <span>{room.building}{room.room_number ? ` • ${room.room_number}` : ""}</span>
                  </p>
                </div>
                <Badge variant="success" size="sm">
                  {room.default_radius_meters}m
                </Badge>
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-proxi-green" />
                  {room.latitude.toFixed(5)}, {room.longitude.toFixed(5)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
