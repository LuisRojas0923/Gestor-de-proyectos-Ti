import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { LatLng, Zone, LocationState } from '../types';
import { requestLocationPermissions, watchLocation } from '../services/location';
import { isPointInZone, findNearestZone } from '../utils/geo';
import { sendLocalNotification } from '../services/notifications';

export function useLocation(zones: Zone[]) {
  const [state, setState] = useState<LocationState>({
    currentLocation: null,
    isInZone: false,
    distanceToZone: null,
    nearestZone: null,
    isTracking: false,
    error: null,
  });

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const zonesRef = useRef(zones);

  // Mantener la referencia de zonas actualizada y re-evaluar si ya tenemos ubicación
  useEffect(() => {
    zonesRef.current = zones;
    
    // Si la app cargó el GPS antes que las zonas, re-evaluamos al recibir las zonas
    setState((prev) => {
      if (!prev.currentLocation) return prev;
      
      const { zone, distance } = findNearestZone(prev.currentLocation, zones);
      const inZone = zone ? isPointInZone(prev.currentLocation, zone) : false;
      
      // Evitar updates innecesarios si no cambió nada
      if (
        prev.nearestZone?.id === zone?.id &&
        prev.isInZone === inZone &&
        prev.distanceToZone === distance
      ) {
        return prev;
      }
      
      return {
        ...prev,
        nearestZone: zone,
        isInZone: inZone,
        distanceToZone: distance,
      };
    });
  }, [zones]);

  const updateLocation = useCallback(
    (location: LatLng) => {
      const currentZones = zonesRef.current;
      const { zone, distance } = findNearestZone(location, currentZones);
      const inZone = zone ? isPointInZone(location, zone) : false;

      setState((prev) => {
        // Disparar notificación si acaba de entrar a la zona
        if (!prev.isInZone && inZone && zone) {
          sendLocalNotification(
            'Llegada a Zona',
            `📍 Has llegado a: ${zone.name}. ¡No olvides registrar tu asistencia!`
          ).catch(() => {});
        }

        return {
          currentLocation: location,
          isInZone: inZone,
          distanceToZone: distance,
          nearestZone: zone,
          isTracking: true,
          error: null,
        };
      });
    },
    []
  );

  const startTracking = useCallback(async () => {
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
      setState((prev) => ({
        ...prev,
        error: 'Permiso de ubicación denegado',
        isTracking: false,
      }));
      return;
    }

    try {
      const subscription = await watchLocation(updateLocation);
      subscriptionRef.current = subscription;
      setState((prev) => ({ ...prev, isTracking: true, error: null }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: 'Error al iniciar tracking de ubicación',
        isTracking: false,
      }));
    }
  }, [updateLocation]);

  const stopTracking = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setState((prev) => ({ ...prev, isTracking: false }));
  }, []);

  useEffect(() => {
    startTracking();
    return () => {
      stopTracking();
    };
  }, [startTracking, stopTracking]);

  return {
    ...state,
    startTracking,
    stopTracking,
  };
}
