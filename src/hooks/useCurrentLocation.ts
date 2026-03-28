import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

type LocationState = {
  status: 'idle' | 'loading' | 'granted' | 'denied' | 'error';
  coordsLabel: string;
  message: string;
  coords: {
    latitude: number;
    longitude: number;
  } | null;
};

const initialState: LocationState = {
  status: 'idle',
  coordsLabel: 'Location not requested',
  message: 'Enable GPS to show nearby vendors in real time.',
  coords: null,
};

export function useCurrentLocation() {
  const [locationState, setLocationState] = useState<LocationState>(initialState);

  useEffect(() => {
    let isMounted = true;

    async function loadLocation() {
      try {
        setLocationState({
          status: 'loading',
          coordsLabel: 'Checking permission',
          message: 'Requesting location access for nearby vendor discovery.',
          coords: null,
        });

        const { status } = await Location.requestForegroundPermissionsAsync();

        if (!isMounted) {
          return;
        }

        if (status !== 'granted') {
          setLocationState({
            status: 'denied',
            coordsLabel: 'Permission denied',
            message: 'Grant location access to unlock live map distance and nearby alerts.',
            coords: null,
          });
          return;
        }

        const currentPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!isMounted) {
          return;
        }

        setLocationState({
          status: 'granted',
          coordsLabel: `${currentPosition.coords.latitude.toFixed(3)}, ${currentPosition.coords.longitude.toFixed(3)}`,
          message: 'Location ready for nearby vendor queries and live tracking.',
          coords: {
            latitude: currentPosition.coords.latitude,
            longitude: currentPosition.coords.longitude,
          },
        });
      } catch {
        if (!isMounted) {
          return;
        }

        setLocationState({
          status: 'error',
          coordsLabel: 'Location unavailable',
          message: 'We can continue with mock data until maps and permissions are fully configured.',
          coords: null,
        });
      }
    }

    void loadLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  return locationState;
}
