import { LatLng, Zone } from '../types';

// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(point1: LatLng, point2: LatLng): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

// Check if a point is inside a zone
export function isPointInZone(point: LatLng, zone: Zone): boolean {
  const distance = calculateDistance(point, zone.center);
  return distance <= zone.radius;
}

// Find the nearest zone and distance
export function findNearestZone(
  point: LatLng,
  zones: Zone[]
): { zone: Zone | null; distance: number | null } {
  if (zones.length === 0) return { zone: null, distance: null };

  let nearestZone = zones[0];
  let minDistance = calculateDistance(point, zones[0].center);

  for (let i = 1; i < zones.length; i++) {
    const distance = calculateDistance(point, zones[i].center);
    if (distance < minDistance) {
      minDistance = distance;
      nearestZone = zones[i];
    }
  }

  return { zone: nearestZone, distance: minDistance };
}

// Format distance for display
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
