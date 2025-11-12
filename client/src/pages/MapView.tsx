import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useWhaleSightings } from '../hooks/useWhaleSightings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import Loading from '../components/Loading';
import { formatDate, formatCoordinates } from '../lib/utils';

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

export default function MapView() {
  const [showCaught, setShowCaught] = useState(true);
  const [showSeen, setShowSeen] = useState(true);
  
  const { data, loading, error } = useWhaleSightings({
    hasCoordinates: true
  });

  if (loading) return <Loading />;
  if (error) return <div className="text-destructive">Error: {error}</div>;

  // Filter data based on toggles
  const filteredData = data.filter(sighting => {
    if (!sighting.latitude || !sighting.longitude) return false;
    if (sighting.caught && !showCaught) return false;
    if (!sighting.caught && !showSeen) return false;
    return true;
  });

  // Calculate center based on sightings with valid coordinates
  const validSightings = data.filter(s => s.latitude && s.longitude);
  const centerLat = validSightings.length > 0
    ? validSightings.reduce((sum, s) => sum + (s.latitude || 0), 0) / validSightings.length
    : 60;
  const centerLon = validSightings.length > 0
    ? validSightings.reduce((sum, s) => sum + (s.longitude || 0), 0) / validSightings.length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Kaart Weergave</h1>
        <p className="text-muted-foreground">
          Interactieve kaart met walvis waarnemingen en vangstlocaties
        </p>
      </div>

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
              <span className="text-sm">Gevangen ({data.filter(s => s.caught).length})</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showSeen}
                onChange={(e) => setShowSeen(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm">Waargenomen ({data.filter(s => !s.caught).length})</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardContent className="p-0">
          <div className="h-[600px] w-full rounded-lg overflow-hidden">
            <MapContainer
              center={[centerLat, centerLon]}
              zoom={4}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {filteredData.map((sighting) => (
                sighting.latitude && sighting.longitude && (
                  <Circle
                    key={sighting.id}
                    center={[sighting.latitude, sighting.longitude]}
                    radius={20000}
                    pathOptions={{
                      color: sighting.caught ? '#ef4444' : '#3b82f6',
                      fillColor: sighting.caught ? '#ef4444' : '#3b82f6',
                      fillOpacity: 0.4,
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-semibold mb-1">
                          {sighting.caught ? 'Vangst' : 'Waarneming'}
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
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Legenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="text-sm">Waargenomen</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-sm">Gevangen</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

