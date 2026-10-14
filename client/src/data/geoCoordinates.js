/**
 * Base de Georreferenciamento de Joinville e Região
 * Coordenadas reais (Latitude e Longitude) dos 32 bairros de Joinville e cidades vizinhas
 * Utilizado para cálculo de distância em metros/km estilo OLX/Uber
 */

export const JOINVILLE_COORDINATES = {
  // Joinville Centro & Bairros
  'Centro': { lat: -26.3045, lng: -48.8487 },
  'América': { lat: -26.2941, lng: -48.8526 },
  'Glória': { lat: -26.2905, lng: -48.8712 },
  'Atiradores': { lat: -26.3090, lng: -48.8615 },
  'Anita Garibaldi': { lat: -26.3195, lng: -48.8520 },
  'Saguaçu': { lat: -26.2820, lng: -48.8450 },
  'Bom Retiro': { lat: -26.2670, lng: -48.8510 },
  'Costa e Silva': { lat: -26.2690, lng: -48.8750 },
  'Santo Antônio': { lat: -26.2750, lng: -48.8580 },
  'Vila Nova': { lat: -26.2950, lng: -48.9150 },
  'Aventureiro': { lat: -26.2550, lng: -48.8150 },
  'Bucarein': { lat: -26.3180, lng: -48.8410 },
  'Guanabara': { lat: -26.3280, lng: -48.8350 },
  'Fátima': { lat: -26.3400, lng: -48.8250 },
  'Itaum': { lat: -26.3350, lng: -48.8450 },
  'Petrópolis': { lat: -26.3500, lng: -48.8350 },
  'Boa Vista': { lat: -26.3050, lng: -48.8250 },
  'Comasa': { lat: -26.2950, lng: -48.8100 },
  'Espinheiros': { lat: -26.2850, lng: -48.7800 },
  'Iririú': { lat: -26.2750, lng: -48.8250 },
  'Jardim Paraíso': { lat: -26.2250, lng: -48.8100 },
  'Jardim Sofia': { lat: -26.2400, lng: -48.8350 },
  'Pirabeiraba': { lat: -26.2150, lng: -48.9100 },
  'Zona Industrial Norte': { lat: -26.2350, lng: -48.8700 },
  'Paranaguamirim': { lat: -26.3650, lng: -48.8250 },
  'Itinga': { lat: -26.3600, lng: -48.8550 },
  'Profipo': { lat: -26.3750, lng: -48.8650 },
  'Santa Catarina': { lat: -26.3450, lng: -48.8600 },
  'São Marcos': { lat: -26.3250, lng: -48.8950 },
  'Ulysses Guimarães': { lat: -26.3550, lng: -48.8100 },
  'Vila Cubatão': { lat: -26.2200, lng: -48.7850 },
  'Morro do Meio': { lat: -26.3200, lng: -48.9300 }
};

export const CITIES_COORDINATES = {
  'Joinville': { lat: -26.3045, lng: -48.8487 },
  'Araquari': { lat: -26.3705, lng: -48.7214 },
  'Jaraguá do Sul': { lat: -26.4851, lng: -49.0768 },
  'São Francisco do Sul': { lat: -26.2425, lng: -48.6381 },
  'Guaramirim': { lat: -26.4719, lng: -49.0033 },
  'Barra Velha': { lat: -26.6322, lng: -48.6842 }
};

/**
 * Fórmula de Haversine para calcular a distância geodésica em quilômetros
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;

  const R = 6371; // Raio da Terra em KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distância em KM
}

/**
 * Retorna as coordenadas de uma cidade e bairro
 */
export function getCoordinates(city = 'Joinville', neighborhood = '') {
  if (neighborhood && JOINVILLE_COORDINATES[neighborhood]) {
    return JOINVILLE_COORDINATES[neighborhood];
  }

  // Tenta busca case-insensitive de bairro
  if (neighborhood) {
    const cleanBairro = neighborhood.trim().toLowerCase();
    for (const [key, coords] of Object.entries(JOINVILLE_COORDINATES)) {
      if (key.toLowerCase() === cleanBairro) {
        return coords;
      }
    }
  }

  // Fallback para cidade
  if (city && CITIES_COORDINATES[city]) {
    return CITIES_COORDINATES[city];
  }

  return CITIES_COORDINATES['Joinville'];
}

/**
 * Formata a distância para exibição amigável:
 * - Menos de 1 km: "a 450m de você"
 * - 1 km ou mais: "a 2,4 km de você"
 */
export function formatDistanceString(distanceKm) {
  if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm)) {
    return null;
  }

  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `a ${meters}m de você`;
  }

  if (distanceKm < 10) {
    return `a ${distanceKm.toFixed(1).replace('.', ',')} km de você`;
  }

  return `a ${Math.round(distanceKm)} km de você`;
}

/**
 * Encontra o bairro de Joinville mais próximo de uma coordenada de GPS
 */
export function findClosestNeighborhood(lat, lng) {
  let closestNeighborhood = 'Centro';
  let minDistance = Infinity;

  for (const [bairro, coords] of Object.entries(JOINVILLE_COORDINATES)) {
    const dist = calculateHaversineDistance(lat, lng, coords.lat, coords.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestNeighborhood = bairro;
    }
  }

  return {
    neighborhood: closestNeighborhood,
    city: 'Joinville',
    distanceKm: minDistance
  };
}
