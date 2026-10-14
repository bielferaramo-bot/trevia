// Service for broadcasting new orders in real-time to active providers (Uber-style)
import EventEmitter from 'node:events';

class RadarEmitter extends EventEmitter {}
export const radarEvents = new RadarEmitter();

// Active SSE client connections
const activeClients = new Set();

// Joinville Neighborhood approximate geographic coordinates for realistic distance calculation
export const JOINVILLE_COORDINATES = {
  'centro': { lat: -26.3045, lon: -48.8487 },
  'américa': { lat: -26.2942, lon: -48.8540 },
  'america': { lat: -26.2942, lon: -48.8540 },
  'glória': { lat: -26.2915, lon: -48.8710 },
  'gloria': { lat: -26.2915, lon: -48.8710 },
  'costa e silva': { lat: -26.2730, lon: -48.8680 },
  'anita garibaldi': { lat: -26.3210, lon: -48.8550 },
  'saguaçu': { lat: -26.2840, lon: -48.8410 },
  'saguacu': { lat: -26.2840, lon: -48.8410 },
  'bucarein': { lat: -26.3150, lon: -48.8450 },
  'bom retiro': { lat: -26.2650, lon: -48.8430 },
  'aventureiro': { lat: -26.2520, lon: -48.8150 },
  'vila nova': { lat: -26.2950, lon: -48.9100 },
  'pirabeiraba': { lat: -26.2160, lon: -48.8950 },
  'iririú': { lat: -26.2750, lon: -48.8250 },
  'iririu': { lat: -26.2750, lon: -48.8250 },
  'boa vista': { lat: -26.3020, lon: -48.8280 },
  'floresta': { lat: -26.3350, lon: -48.8580 },
  'santo antônio': { lat: -26.2750, lon: -48.8550 },
  'santo antonio': { lat: -26.2750, lon: -48.8550 },
  'paranaguamirim': { lat: -26.3680, lon: -48.8200 },
  'itaum': { lat: -26.3330, lon: -48.8420 },
  'petrópolis': { lat: -26.3380, lon: -48.8320 },
  'petropolis': { lat: -26.3380, lon: -48.8320 },
  'espinheiros': { lat: -26.2980, lon: -48.7850 }
};

// Calculate Haversine distance in kilometers
export function calculateDistanceKm(fromNeighborhood, toNeighborhood) {
  if (!fromNeighborhood || !toNeighborhood) return 3.5;
  const n1 = fromNeighborhood.toString().toLowerCase().trim();
  const n2 = toNeighborhood.toString().toLowerCase().trim();

  if (n1 === n2) return 0.8; // Mesmo bairro

  const c1 = JOINVILLE_COORDINATES[n1] || JOINVILLE_COORDINATES['centro'];
  const c2 = JOINVILLE_COORDINATES[n2] || JOINVILLE_COORDINATES['centro'];

  const R = 6371; // Earth radius in km
  const dLat = (c2.lat - c1.lat) * Math.PI / 180;
  const dLon = (c2.lon - c1.lon) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(c1.lat * Math.PI / 180) * Math.cos(c2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.max(0.5, Math.round(d * 10) / 10);
}

// In-memory buffer of latest orders for fast polling or missed events
const latestOrdersBuffer = [];

export const radarBroadcaster = {
  addClient(res, userId) {
    activeClients.add(res);
    res.on('close', () => {
      activeClients.delete(res);
    });
  },

  broadcastNewOrder(order) {
    latestOrdersBuffer.unshift(order);
    if (latestOrdersBuffer.length > 50) latestOrdersBuffer.pop();

    const data = JSON.stringify(order);
    for (const client of activeClients) {
      try {
        client.write(`event: new_order\ndata: ${data}\n\n`);
      } catch (err) {
        activeClients.delete(client);
      }
    }
    radarEvents.emit('new_order', order);
  },

  getRecentOrders(sinceTimestamp) {
    if (!sinceTimestamp) return latestOrdersBuffer.slice(0, 10);
    return latestOrdersBuffer.filter(o => new Date(o.created_at) > new Date(sinceTimestamp));
  }
};
