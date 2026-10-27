/**
 * Earth's mean radius in meters according to WGS-84 / IUGG standard
 */
export const EARTH_RADIUS_METERS = 6371000;

/**
 * Standard maximum permitted GPS accuracy (radius of uncertainty) in meters.
 * If the device reports accuracy > 50m, it is considered too coarse (e.g. cell tower triangulation).
 */
export const DEFAULT_MAX_ACCURACY_METERS = 50;

/**
 * Default geofence radius for classrooms if not explicitly overridden.
 */
export const DEFAULT_GEOFENCE_RADIUS_METERS = 50;

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface GeofenceEvaluation {
  distanceMeters: number;
  isWithinRadius: boolean;
  accuracyAcceptable: boolean;
  effectiveRadiusMeters: number;
  accuracyMeters: number;
  reason?: string;
}

/**
 * Validates that latitude is in [-90, 90] and longitude is in [-180, 180]
 */
export function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Calculates Great-Circle distance between two points on Earth using the Haversine formula.
 *
 * @param coord1 First location (e.g., student device coordinates)
 * @param coord2 Second location (e.g., classroom anchor coordinates)
 * @returns Distance in meters rounded to two decimal places
 */
export function calculateHaversineDistance(
  coord1: GeoCoordinates,
  coord2: GeoCoordinates,
): number {
  if (
    !isValidCoordinate(coord1.latitude, coord1.longitude) ||
    !isValidCoordinate(coord2.latitude, coord2.longitude)
  ) {
    throw new Error(
      "Invalid latitude or longitude supplied for distance calculation.",
    );
  }

  // Exact match optimization
  if (
    coord1.latitude === coord2.latitude &&
    coord1.longitude === coord2.longitude
  ) {
    return 0;
  }

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const phi1 = toRadians(coord1.latitude);
  const phi2 = toRadians(coord2.latitude);
  const deltaPhi = toRadians(coord2.latitude - coord1.latitude);
  const deltaLambda = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);

  // Clamp 'a' to [0, 1] to guard against floating point rounding issues
  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  const distance = EARTH_RADIUS_METERS * c;
  return Math.round(distance * 100) / 100;
}

/**
 * Evaluates whether a reported client location satisfies the classroom geofence.
 *
 * @param studentCoord Coordinates reported by the student's browser Geolocation API
 * @param classroomCoord Coordinates of the designated classroom
 * @param radiusMeters Allowed geofence boundary in meters
 * @param reportedAccuracy GPS accuracy radius reported by the browser (in meters)
 * @param maxAccuracyThreshold Maximum allowed accuracy radius (defaults to 50m)
 */
export function evaluateGeofence(
  studentCoord: GeoCoordinates,
  classroomCoord: GeoCoordinates,
  radiusMeters: number = DEFAULT_GEOFENCE_RADIUS_METERS,
  reportedAccuracy: number = 20,
  maxAccuracyThreshold: number = DEFAULT_MAX_ACCURACY_METERS,
): GeofenceEvaluation {
  const accuracyMeters = Math.max(0, reportedAccuracy);
  const accuracyAcceptable = accuracyMeters <= maxAccuracyThreshold;

  if (!accuracyAcceptable) {
    return {
      distanceMeters: 0,
      isWithinRadius: false,
      accuracyAcceptable: false,
      effectiveRadiusMeters: radiusMeters,
      accuracyMeters,
      reason: `Location accuracy (±${accuracyMeters.toFixed(1)}m) is too low. Required accuracy is ±${maxAccuracyThreshold}m. Please step outdoors or ensure high-accuracy location is enabled.`,
    };
  }

  const distanceMeters = calculateHaversineDistance(
    studentCoord,
    classroomCoord,
  );
  const isWithinRadius = distanceMeters <= radiusMeters;

  let reason: string | undefined;
  if (!isWithinRadius) {
    reason = `You are ${distanceMeters.toFixed(1)}m away from the classroom. The allowed radius is ${radiusMeters}m.`;
  }

  return {
    distanceMeters,
    isWithinRadius,
    accuracyAcceptable: true,
    effectiveRadiusMeters: radiusMeters,
    accuracyMeters,
    reason,
  };
}
