import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getCoordinates,
  calculateHaversineDistance,
  formatDistanceString,
  findClosestNeighborhood,
  CITIES_COORDINATES
} from './data/geoCoordinates.js';

const LocationContext = createContext();

const STORAGE_KEY = 'trevia_user_location';

const DEFAULT_LOCATION = {
  city: 'Joinville',
  neighborhood: '',
  label: 'Joinville e Região',
  lat: -26.3045,
  lng: -48.8487,
  isGps: false
};

export function LocationProvider({ children }) {
  const [userLocation, setUserLocationState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Erro ao ler localização salva:', e);
    }
    return DEFAULT_LOCATION;
  });

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  const openLocationModal = () => setIsLocationModalOpen(true);
  const closeLocationModal = () => {
    setIsLocationModalOpen(false);
    setGpsError('');
  };

  const setLocation = (loc) => {
    let coords = loc.lat && loc.lng ? { lat: loc.lat, lng: loc.lng } : getCoordinates(loc.city, loc.neighborhood);

    let label = 'Joinville e Região';
    if (loc.neighborhood && loc.city) {
      label = `${loc.neighborhood}, ${loc.city}`;
    } else if (loc.city) {
      label = `${loc.city} - SC`;
    }

    const updated = {
      city: loc.city || 'Joinville',
      neighborhood: loc.neighborhood || '',
      label,
      lat: coords.lat,
      lng: coords.lng,
      isGps: !!loc.isGps
    };

    setUserLocationState(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao persistir localização:', e);
    }
    closeLocationModal();
  };

  // Solicita GPS nativo do celular / navegador
  const requestGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocalização não suportada pelo seu navegador.');
      return;
    }

    setGpsLoading(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const closest = findClosestNeighborhood(latitude, longitude);

        const updated = {
          city: closest.city,
          neighborhood: closest.neighborhood,
          label: `${closest.neighborhood}, Joinville (GPS)`,
          lat: latitude,
          lng: longitude,
          isGps: true
        };

        setUserLocationState(updated);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {}

        setGpsLoading(false);
        closeLocationModal();
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) {
          setGpsError('Permissão de localização negada. Escolha seu bairro na lista abaixo.');
        } else {
          setGpsError('Não foi possível obter sua localização exata.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Calcula a distância do usuário até um pedido
  const getDistanceTo = (city, neighborhood) => {
    if (!userLocation || !userLocation.lat || !userLocation.lng) return null;

    const targetCoords = getCoordinates(city, neighborhood);
    const distanceKm = calculateHaversineDistance(
      userLocation.lat,
      userLocation.lng,
      targetCoords.lat,
      targetCoords.lng
    );

    return {
      distanceKm,
      formattedText: formatDistanceString(distanceKm)
    };
  };

  return (
    <LocationContext.Provider
      value={{
        userLocation,
        setLocation,
        requestGpsLocation,
        gpsLoading,
        gpsError,
        isLocationModalOpen,
        openLocationModal,
        closeLocationModal,
        getDistanceTo
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
