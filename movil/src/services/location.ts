import * as Location from 'expo-location';
import { LatLng } from '../types';

export async function requestLocationPermissions(): Promise<boolean> {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    return false;
  }
  return true;
}

export async function getCurrentLocation(): Promise<LatLng | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch {
    return null;
  }
}

export function watchLocation(
  callback: (location: LatLng) => void,
  options?: {
    distanceInterval?: number;
    timeInterval?: number;
  }
): Promise<Location.LocationSubscription> {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: options?.distanceInterval ?? 5,
      timeInterval: options?.timeInterval ?? 3000,
    },
    (location) => {
      callback({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    }
  );
}
