import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useWhaleSightings } from '../hooks/useWhaleSightings';
import { useShips } from '../hooks/useShips';
import { useVoyages } from '../hooks/useVoyages';
import { getVoyageRoute, LogEntry, WhaleSighting } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import Loading from '../components/Loading';
import { formatDate, formatCoordinates } from '../lib/utils';
import { Ship, Route, Wind, Thermometer, Calendar } from 'lucide-react';

// Fix for default marker icon in react-leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Component to fit map bounds to route
function FitBounds({ positions }: { positions: LatLngExpression[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [50, 50] });
    }
  }, [map, positions]);
  
  return null;
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate speed between two points (km/day)
function calculateSpeed(lat1: number, lon1: number, date1: string, lat2: number, lon2: number, date2: string): number {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  const timeDiff = (new Date(date2).getTime() - new Date(date1).getTime()) / (1000 * 60 * 60 * 24); // days
  return timeDiff > 0 ? distance / timeDiff : 0;
}

export default function MapView() {
  const [showCaught, setShowCaught] = useState(true);
  const [showSeen, setShowSeen] = useState(true);
  const [selectedShipId, setSelectedShipId] = useState<number | null>(null);
  const [selectedVoyageId, setSelectedVoyageId] = useState<number | null>(null);
  const [routeData, setRouteData] = useState<{ route: LogEntry[]; whaleSightings: WhaleSighting[] } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  
  const { data: ships, loading: shipsLoading } = useShips();
  const { data: voyages, loading: voyagesLoading } = useVoyages(selectedShipId || undefined);
  const { data: allSightings, loading: sightingsLoading } = useWhaleSightings();

  // Load route data when voyage is selected
  useEffect(() => {
    if (selectedVoyageId) {
      setRouteLoading(true);
      getVoyageRoute(selectedVoyageId)
        .then(data => {
          setRouteData(data);
        })
        .catch(err => {
          console.error('Error loading route:', err);
        })
        .finally(() => {
          setRouteLoading(false);
        });
    } else {
      setRouteData(null);
    }
  }, [selectedVoyageId]);

  // Reset voyage when ship changes
  useEffect(() => {
    setSelectedVoyageId(null);
    setRouteData(null);
  }, [selectedShipId]);

  // Calculate route statistics
  const routeStats = useMemo(() => {
    if (!routeData || routeData.route.length < 2) return null;

    const route = routeData.route;
    let totalDistance = 0;
    const speeds: number[] = [];
    const weatherConditions: Record<string, number> = {};
    const temperatures: number[] = [];

    for (let i = 1; i < route.length; i++) {
      const prev = route[i - 1];
      const curr = route[i];
      
      if (prev.latitude && prev.longitude && curr.latitude && curr.longitude) {
        const dist = calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
        totalDistance += dist;
        
        const speed = calculateSpeed(
          prev.latitude, prev.longitude, prev.date,
          curr.latitude, curr.longitude, curr.date
        );
        if (speed > 0 && speed < 1000) { // Filter out unrealistic speeds
          speeds.push(speed);
        }
      }

      if (curr.weather) {
        weatherConditions[curr.weather] = (weatherConditions[curr.weather] || 0) + 1;
      }

      if (curr.temperature !== null && curr.temperature !== undefined) {
        temperatures.push(curr.temperature);
      }
    }

    const avgSpeed = speeds.length > 0 
      ? speeds.reduce((a, b) => a + b, 0) / speeds.length 
      : 0;
    
    const avgTemp = temperatures.length > 0
      ? temperatures.reduce((a, b) => a + b, 0) / temperatures.length
      : null;

    const mostCommonWeather = Object.entries(weatherConditions)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    return {
      totalDistance: Math.round(totalDistance),
      avgSpeed: Math.round(avgSpeed * 10) / 10,
      avgTemp: avgTemp ? Math.round(avgTemp * 10) / 10 : null,
      mostCommonWeather,
      routePoints: route.length,
      whaleSightings: routeData.whaleSightings.length,
      catches: routeData.whaleSightings.filter(w => w.caught).length,
    };
  }, [routeData]);

  // Prepare route coordinates
  const routeCoordinates = useMemo(() => {
    if (!routeData) return [];
    return routeData.route
      .filter(entry => entry.latitude !== null && entry.longitude !== null)
      .map(entry => [entry.latitude!, entry.longitude!] as LatLngExpression);
  }, [routeData]);

  // Filter sightings based on selected voyage
  const filteredSightings = useMemo(() => {
    if (selectedVoyageId && routeData) {
      // Show only sightings from selected voyage
      return routeData.whaleSightings.filter(sighting => {
        if (!sighting.latitude || !sighting.longitude) return false;
        if (sighting.caught && !showCaught) return false;
        if (!sighting.caught && !showSeen) return false;
        return true;
      });
    } else {
      // Show all sightings
      return allSightings.filter(sighting => {
        if (!sighting.latitude || !sighting.longitude) return false;
        if (sighting.caught && !showCaught) return false;
        if (!sighting.caught && !showSeen) return false;
        return true;
      });
    }
  }, [allSightings, routeData, selectedVoyageId, showCaught, showSeen]);

  // Calculate map center
  const mapCenter = useMemo(() => {
    if (routeCoordinates.length > 0) {
      const avgLat = routeCoordinates.reduce((sum, coord) => sum + (coord[0] as number), 0) / routeCoordinates.length;
      const avgLon = routeCoordinates.reduce((sum, coord) => sum + (coord[1] as number), 0) / routeCoordinates.length;
      return [avgLat, avgLon] as [number, number];
    }
    
    const validSightings = filteredSightings.filter(s => s.latitude && s.longitude);
    if (validSightings.length > 0) {
      const avgLat = validSightings.reduce((sum, s) => sum + (s.latitude || 0), 0) / validSightings.length;
      const avgLon = validSightings.reduce((sum, s) => sum + (s.longitude || 0), 0) / validSightings.length;
      return [avgLat, avgLon] as [number, number];
    }
    
    return [60, 0] as [number, number];
  }, [routeCoordinates, filteredSightings]);

  const loading = shipsLoading || voyagesLoading || sightingsLoading || routeLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Kaart Weergave</h1>
        <p className="text-muted-foreground">
          Volg schepen op hun reizen en bekijk walvis waarnemingen langs de route
        </p>
      </div>

      {/* Ship and Voyage Selectors */}
      <Card>
        <CardHeader>
          <CardTitle>Schip Selectie</CardTitle>
          <CardDescription>Selecteer een schip en reis om de route te volgen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Schip</label>
              <select
                value={selectedShipId || ''}
                onChange={(e) => setSelectedShipId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="">-- Alle schepen --</option>
                {ships.map(ship => (
                  <option key={ship.id} value={ship.id}>{ship.name}</option>
                ))}
              </select>
            </div>
            
            {selectedShipId && (
              <div>
                <label className="block text-sm font-medium mb-2">Reis</label>
                <select
                  value={selectedVoyageId || ''}
                  onChange={(e) => setSelectedVoyageId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  disabled={voyagesLoading}
                >
                  <option value="">-- Selecteer reis --</option>
                  {voyages.map(voyage => (
                    <option key={voyage.id} value={voyage.id}>
                      {formatDate(voyage.start_date)} - {voyage.end_date ? formatDate(voyage.end_date) : 'Lopend'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Route Statistics */}
      {routeStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Route className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Afstand</span>
              </div>
              <p className="text-2xl font-bold">{routeStats.totalDistance} km</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Ship className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Gem. Snelheid</span>
              </div>
              <p className="text-2xl font-bold">{routeStats.avgSpeed} km/dag</p>
            </CardContent>
          </Card>
          
          {routeStats.avgTemp !== null && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Thermometer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Temp.</span>
                </div>
                <p className="text-2xl font-bold">{routeStats.avgTemp}°C</p>
              </CardContent>
            </Card>
          )}
          
          {routeStats.mostCommonWeather && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Wind className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Weer</span>
                </div>
                <p className="text-lg font-semibold">{routeStats.mostCommonWeather}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Selecteer welke waarnemingen te tonen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showCaught}
                onChange={(e) => setShowCaught(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm">Gevangen ({filteredSightings.filter(s => s.caught).length})</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showSeen}
                onChange={(e) => setShowSeen(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm">Waargenomen ({filteredSightings.filter(s => !s.caught).length})</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardContent className="p-0">
          <div className="h-[600px] w-full rounded-lg overflow-hidden">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loading />
              </div>
            ) : (
              <MapContainer
                center={mapCenter}
                zoom={routeCoordinates.length > 0 ? 5 : 4}
                className="h-full w-full"
                key={`${selectedVoyageId}-${mapCenter[0]}-${mapCenter[1]}`}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Route polyline */}
                {routeCoordinates.length > 1 && (
                  <>
                    <Polyline
                      positions={routeCoordinates}
                      pathOptions={{
                        color: '#3b82f6',
                        weight: 3,
                        opacity: 0.7,
                      }}
                    />
                    <FitBounds positions={routeCoordinates} />
                  </>
                )}
                
                {/* Route markers */}
                {routeData && routeData.route
                  .filter(entry => entry.latitude !== null && entry.longitude !== null)
                  .map((entry, index) => (
                    <Marker
                      key={entry.id}
                      position={[entry.latitude!, entry.longitude!]}
                    >
                      <Popup>
                        <div className="p-2 min-w-[200px]">
                          <h3 className="font-semibold mb-2">Route Punt {index + 1}</h3>
                          <p className="text-sm mb-1">
                            <strong>Datum:</strong> {formatDate(entry.date)}
                            {entry.time && ` ${entry.time}`}
                          </p>
                          <p className="text-sm mb-1">
                            <strong>Locatie:</strong> {formatCoordinates(entry.latitude!, entry.longitude!)}
                          </p>
                          {entry.weather && (
                            <p className="text-sm mb-1">
                              <strong>Weer:</strong> {entry.weather}
                            </p>
                          )}
                          {entry.wind_direction && (
                            <p className="text-sm mb-1">
                              <strong>Wind:</strong> {entry.wind_direction}
                            </p>
                          )}
                          {entry.temperature !== null && entry.temperature !== undefined && (
                            <p className="text-sm mb-1">
                              <strong>Temp:</strong> {entry.temperature}°C
                            </p>
                          )}
                          {entry.course && (
                            <p className="text-sm mb-1">
                              <strong>Koers:</strong> {entry.course}
                            </p>
                          )}
                          {entry.whale_sightings_count > 0 && (
                            <p className="text-sm text-blue-600 mt-2">
                              🐋 {entry.whale_sightings_count} walvis waarneming(en)
                            </p>
                          )}
                          {entry.catches_count > 0 && (
                            <p className="text-sm text-red-600 mt-1">
                              🎣 {entry.catches_count} vangst(en)
                            </p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                
                {/* Whale sightings */}
                {filteredSightings.map((sighting) => (
                  sighting.latitude && sighting.longitude && (
                    <Circle
                      key={sighting.id}
                      center={[sighting.latitude, sighting.longitude]}
                      radius={selectedVoyageId ? 10000 : 20000}
                      pathOptions={{
                        color: sighting.caught ? '#ef4444' : '#3b82f6',
                        fillColor: sighting.caught ? '#ef4444' : '#3b82f6',
                        fillOpacity: 0.5,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="p-2">
                          <h3 className="font-semibold mb-1">
                            {sighting.caught ? '🎣 Vangst' : '🐋 Waarneming'}
                          </h3>
                          <p className="text-sm">
                            <strong>Soort:</strong> {sighting.species || 'Onbekend'}
                          </p>
                          <p className="text-sm">
                            <strong>Aantal:</strong> {sighting.count}
                          </p>
                          <p className="text-sm">
                            <strong>Schip:</strong> {sighting.ship_name || 'N/A'}
                          </p>
                          <p className="text-sm">
                            <strong>Datum:</strong> {sighting.date ? formatDate(sighting.date) : 'N/A'}
                          </p>
                          <p className="text-sm">
                            <strong>Locatie:</strong> {formatCoordinates(sighting.latitude, sighting.longitude)}
                          </p>
                        </div>
                      </Popup>
                    </Circle>
                  )
                ))}
              </MapContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Legenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            {routeCoordinates.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-blue-500"></div>
                <span className="text-sm">Scheepsroute</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="text-sm">Waargenomen</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-sm">Gevangen</span>
            </div>
            {routeCoordinates.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-600 rounded-full bg-white"></div>
                <span className="text-sm">Route punten</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
