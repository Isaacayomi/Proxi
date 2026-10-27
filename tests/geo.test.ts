import { describe, it, expect } from "vitest";
import {
  calculateHaversineDistance,
  evaluateGeofence,
  isValidCoordinate,
  DEFAULT_MAX_ACCURACY_METERS,
} from "@/lib/geo/distance";

describe("Geospatial & Haversine Distance Calculations", () => {
  it("validates coordinate ranges properly", () => {
    expect(isValidCoordinate(0, 0)).toBe(true);
    expect(isValidCoordinate(90, 180)).toBe(true);
    expect(isValidCoordinate(-90, -180)).toBe(true);
    expect(isValidCoordinate(7.51882, 4.52735)).toBe(true);

    expect(isValidCoordinate(91, 0)).toBe(false);
    expect(isValidCoordinate(-91, 0)).toBe(false);
    expect(isValidCoordinate(0, 181)).toBe(false);
    expect(isValidCoordinate(0, -181)).toBe(false);
    expect(isValidCoordinate(NaN, 0)).toBe(false);
  });

  it("returns zero meters for identical points", () => {
    const point = { latitude: 7.51882, longitude: 4.52735 };
    const dist = calculateHaversineDistance(point, point);
    expect(dist).toBe(0);
  });

  it("calculates accurate distance between OAU campus landmarks", () => {
    // Computer Building LT 1: 7.51882, 4.52735
    // Civil Lecture Theatre: 7.51954, 4.52812
    const lt1 = { latitude: 7.51882, longitude: 4.52735 };
    const clt = { latitude: 7.51954, longitude: 4.52812 };

    const distance = calculateHaversineDistance(lt1, clt);
    // Real physical distance is approx 117-118 meters
    expect(distance).toBeGreaterThan(110);
    expect(distance).toBeLessThan(125);
  });

  it("calculates short classroom walking distances (< 30m)", () => {
    // A point inside the classroom vs 15m outside
    const center = { latitude: 7.51882, longitude: 4.52735 };
    // Small delta in latitude: ~0.0001 degrees lat is ~11.1 meters
    const pointNear = { latitude: 7.51892, longitude: 4.52735 };

    const distance = calculateHaversineDistance(center, pointNear);
    expect(distance).toBeGreaterThan(10);
    expect(distance).toBeLessThan(12);
  });

  it("throws an error for invalid coordinates", () => {
    expect(() =>
      calculateHaversineDistance(
        { latitude: 95, longitude: 0 },
        { latitude: 0, longitude: 0 },
      ),
    ).toThrow("Invalid latitude or longitude");
  });
});

describe("Geofence Evaluation & GPS Accuracy Policy", () => {
  const classroomCoord = { latitude: 7.51882, longitude: 4.52735 }; // LT 1
  const radius = 50; // 50m geofence

  it("approves check-in when student is well inside the radius with good GPS accuracy", () => {
    const studentCoord = { latitude: 7.51885, longitude: 4.52738 }; // ~4.6m away
    const evaluation = evaluateGeofence(
      studentCoord,
      classroomCoord,
      radius,
      12,
    );

    expect(evaluation.accuracyAcceptable).toBe(true);
    expect(evaluation.isWithinRadius).toBe(true);
    expect(evaluation.distanceMeters).toBeLessThan(10);
    expect(evaluation.reason).toBeUndefined();
  });

  it("rejects check-in when student is outside the geofence radius", () => {
    // Student is ~117m away at Civil LT
    const studentCoord = { latitude: 7.51954, longitude: 4.52812 };
    const evaluation = evaluateGeofence(
      studentCoord,
      classroomCoord,
      radius,
      10,
    );

    expect(evaluation.accuracyAcceptable).toBe(true);
    expect(evaluation.isWithinRadius).toBe(false);
    expect(evaluation.distanceMeters).toBeGreaterThan(radius);
    expect(evaluation.reason).toContain("away from the classroom");
    expect(evaluation.reason).toContain(`allowed radius is ${radius}m`);
  });

  it("rejects check-in when GPS accuracy exceeds the permitted threshold (> 50m)", () => {
    const studentCoord = { latitude: 7.51882, longitude: 4.52735 }; // Same location
    const coarseAccuracy = 65; // e.g. 65m cell tower accuracy

    const evaluation = evaluateGeofence(
      studentCoord,
      classroomCoord,
      radius,
      coarseAccuracy,
      DEFAULT_MAX_ACCURACY_METERS,
    );

    expect(evaluation.accuracyAcceptable).toBe(false);
    expect(evaluation.isWithinRadius).toBe(false);
    expect(evaluation.reason).toContain(
      "Location accuracy (±65.0m) is too low",
    );
    expect(evaluation.reason).toContain("±50m");
  });

  it("accepts location at the boundary of accuracy threshold (<= 50m)", () => {
    const studentCoord = { latitude: 7.51882, longitude: 4.52735 };
    const exactAccuracy = 50;

    const evaluation = evaluateGeofence(
      studentCoord,
      classroomCoord,
      radius,
      exactAccuracy,
      50,
    );

    expect(evaluation.accuracyAcceptable).toBe(true);
    expect(evaluation.isWithinRadius).toBe(true);
  });
});
