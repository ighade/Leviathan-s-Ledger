import { useState, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
  ZoomControl,
} from "react-leaflet";
import { Icon, LatLngExpression, divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useWhaleSightings } from "../hooks/useWhaleSightings";
import { useShips } from "../hooks/useShips";
import { useVoyages } from "../hooks/useVoyages";
import { getVoyageRoute, LogEntry, WhaleSighting } from "../services/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/Card";
import Loading from "../components/Loading";
import { formatDate, formatCoordinates } from "../lib/utils";
import {
  Ship,
  Route,
  Wind,
  Thermometer,
  Calendar,
  X,
  Maximize2,
  Minimize2,
  Filter,
  Map,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// Fix for default marker icon in react-leaflet
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

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
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate speed between two points (km/day)
function calculateSpeed(
  lat1: number,
  lon1: number,
  date1: string,
  lat2: number,
  lon2: number,
  date2: string
): number {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  const timeDiff =
    (new Date(date2).getTime() - new Date(date1).getTime()) /
    (1000 * 60 * 60 * 24); // days
  return timeDiff > 0 ? distance / timeDiff : 0;
}

export default function MapView() {
  const [showCaught, setShowCaught] = useState(true);
  const [showSeen, setShowSeen] = useState(true);
  const [selectedShipId, setSelectedShipId] = useState<number | null>(null);
  const [selectedVoyageId, setSelectedVoyageId] = useState<number | null>(null);
  const [routeData, setRouteData] = useState<{
    route: LogEntry[];
    whaleSightings: WhaleSighting[];
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [mapType, setMapType] = useState<"default" | "satellite">("default");

  const { data: ships, loading: shipsLoading } = useShips();
  const { data: voyages, loading: voyagesLoading } = useVoyages(
    selectedShipId || undefined
  );
  const { data: allSightings, loading: sightingsLoading } = useWhaleSightings();

  // Load route data when voyage is selected
  useEffect(() => {
    if (selectedVoyageId) {
      setRouteLoading(true);
      getVoyageRoute(selectedVoyageId)
        .then((data) => {
          setRouteData(data);
        })
        .catch((err) => {
          console.error("Error loading route:", err);
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

  // Automatically select the first voyage when voyages are loaded (each ship has only one voyage)
  useEffect(() => {
    if (selectedShipId && voyages.length > 0 && !selectedVoyageId) {
      setSelectedVoyageId(voyages[0].id);
    }
  }, [selectedShipId, voyages, selectedVoyageId]);

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
        const dist = calculateDistance(
          prev.latitude,
          prev.longitude,
          curr.latitude,
          curr.longitude
        );
        totalDistance += dist;

        const speed = calculateSpeed(
          prev.latitude,
          prev.longitude,
          prev.date,
          curr.latitude,
          curr.longitude,
          curr.date
        );
        if (speed > 0 && speed < 1000) {
          // Filter out unrealistic speeds
          speeds.push(speed);
        }
      }

      if (curr.weather) {
        weatherConditions[curr.weather] =
          (weatherConditions[curr.weather] || 0) + 1;
      }

      if (curr.temperature !== null && curr.temperature !== undefined) {
        temperatures.push(curr.temperature);
      }
    }

    const avgSpeed =
      speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

    const avgTemp =
      temperatures.length > 0
        ? temperatures.reduce((a, b) => a + b, 0) / temperatures.length
        : null;

    const mostCommonWeather =
      Object.entries(weatherConditions).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      null;

    return {
      totalDistance: Math.round(totalDistance),
      avgSpeed: Math.round(avgSpeed * 10) / 10,
      avgTemp: avgTemp ? Math.round(avgTemp * 10) / 10 : null,
      mostCommonWeather,
      routePoints: route.length,
      whaleSightings: routeData.whaleSightings.length,
      catches: routeData.whaleSightings.filter((w) => w.caught).length,
    };
  }, [routeData]);

  // Prepare route coordinates
  const routeCoordinates = useMemo(() => {
    if (!routeData) return [];
    return routeData.route
      .filter((entry) => entry.latitude !== null && entry.longitude !== null)
      .map((entry) => [entry.latitude!, entry.longitude!] as LatLngExpression);
  }, [routeData]);

  // Filter sightings based on selected voyage
  const filteredSightings = useMemo(() => {
    if (selectedVoyageId && routeData) {
      // Show only sightings from selected voyage
      return routeData.whaleSightings.filter((sighting) => {
        if (!sighting.latitude || !sighting.longitude) return false;
        if (sighting.caught && !showCaught) return false;
        if (!sighting.caught && !showSeen) return false;
        return true;
      });
    } else {
      // Show all sightings
      return allSightings.filter((sighting) => {
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
      const avgLat =
        routeCoordinates.reduce((sum, coord) => sum + (coord[0] as number), 0) /
        routeCoordinates.length;
      const avgLon =
        routeCoordinates.reduce((sum, coord) => sum + (coord[1] as number), 0) /
        routeCoordinates.length;
      return [avgLat, avgLon] as [number, number];
    }

    const validSightings = filteredSightings.filter(
      (s) => s.latitude && s.longitude
    );
    if (validSightings.length > 0) {
      const avgLat =
        validSightings.reduce((sum, s) => sum + (s.latitude || 0), 0) /
        validSightings.length;
      const avgLon =
        validSightings.reduce((sum, s) => sum + (s.longitude || 0), 0) /
        validSightings.length;
      return [avgLat, avgLon] as [number, number];
    }

    return [60, 0] as [number, number];
  }, [routeCoordinates, filteredSightings]);

  const loading =
    shipsLoading || voyagesLoading || sightingsLoading || routeLoading;

  return (
    <div
      className={`${
        isFullscreen ? "fixed inset-0 z-50 bg-background" : "space-y-3"
      }`}
    >
      {/* Header - hidden in fullscreen */}
      {!isFullscreen && (
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-foreground mb-1">
            Kaart Weergave
          </h1>
          <p className="text-sm text-muted-foreground">
            Interactieve kaart met scheepsroutes en walvis waarnemingen
          </p>
        </div>
      )}

      {/* Route Statistics - shown above map when not fullscreen */}
      {!isFullscreen && routeStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Route className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Afstand</span>
              </div>
              <p className="text-xl font-bold">{routeStats.totalDistance} km</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Ship className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Snelheid</span>
              </div>
              <p className="text-xl font-bold">{routeStats.avgSpeed} km/dag</p>
            </CardContent>
          </Card>

          {routeStats.avgTemp !== null && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Thermometer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Temp.</span>
                </div>
                <p className="text-xl font-bold">{routeStats.avgTemp}°C</p>
              </CardContent>
            </Card>
          )}

          {routeStats.mostCommonWeather && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Wind className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Weer</span>
                </div>
                <p className="text-base font-semibold">
                  {routeStats.mostCommonWeather}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Map Container with floating controls */}
      <div
        className={`relative ${
          isFullscreen ? "h-screen" : "h-[calc(100vh-100px)] min-h-[750px]"
        }`}
      >
        <Card className="h-full">
          <CardContent className="p-0 h-full relative">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loading />
              </div>
            ) : (
              <>
                <MapContainer
                  center={mapCenter}
                  zoom={routeCoordinates.length > 0 ? 5 : 4}
                  className="h-full w-full rounded-lg"
                  zoomControl={false}
                  key={`map-${selectedVoyageId || "all"}`}
                >
                  <ZoomControl position="bottomright" />

                  {/* Tile Layer based on map type */}
                  {mapType === "default" ? (
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                  ) : (
                    <TileLayer
                      attribution='Imagery &copy; <a href="https://www.esri.com/">Esri</a>'
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                  )}

                  {/* Route polyline */}
                  {routeCoordinates.length > 1 && (
                    <>
                      <Polyline
                        positions={routeCoordinates}
                        pathOptions={{
                          color: "#3b82f6",
                          weight: 4,
                          opacity: 0.8,
                        }}
                      />
                      <FitBounds positions={routeCoordinates} />
                    </>
                  )}

                  {/* Whale sightings */}
                  {filteredSightings.map(
                    (sighting) =>
                      sighting.latitude &&
                      sighting.longitude && (
                        <div key={sighting.id}>
                          {/* Circle for area indication */}
                          <Circle
                            center={[sighting.latitude, sighting.longitude]}
                            radius={selectedVoyageId ? 30000 : 50000}
                            pathOptions={{
                              color: sighting.caught ? "#dc2626" : "#2563eb",
                              fillColor: sighting.caught
                                ? "#dc2626"
                                : "#2563eb",
                              fillOpacity: 0.2,
                              weight: 2,
                            }}
                          />
                          {/* Marker for precise location */}
                          <Marker
                            position={[sighting.latitude, sighting.longitude]}
                            icon={divIcon({
                              className: "whale-marker",
                              html: `<div style="
                                  background-color: ${
                                    sighting.caught ? "#dc2626" : "#2563eb"
                                  };
                                  width: 32px;
                                  height: 32px;
                                  border-radius: 50%;
                                  border: 3px solid white;
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  font-size: 18px;
                                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                                ">${sighting.caught ? "🎣" : "🐋"}</div>`,
                              iconSize: [32, 32],
                              iconAnchor: [16, 16],
                              popupAnchor: [0, -16],
                            })}
                          >
                            <Popup maxWidth={250}>
                              <div className="p-2">
                                <h3 className="font-semibold mb-2 text-base">
                                  {sighting.caught
                                    ? "🎣 Vangst"
                                    : "🐋 Waarneming"}
                                </h3>
                                <div className="space-y-1">
                                  <p className="text-sm">
                                    <strong>Soort:</strong>{" "}
                                    {sighting.species || "Onbekend"}
                                  </p>
                                  <p className="text-sm">
                                    <strong>Aantal:</strong> {sighting.count}
                                  </p>
                                  <p className="text-sm">
                                    <strong>Schip:</strong>{" "}
                                    {sighting.ship_name || "N/A"}
                                  </p>
                                  <p className="text-sm">
                                    <strong>Datum:</strong>{" "}
                                    {sighting.date
                                      ? formatDate(sighting.date)
                                      : "N/A"}
                                  </p>
                                  <p className="text-sm">
                                    <strong>Locatie:</strong>{" "}
                                    {formatCoordinates(
                                      sighting.latitude,
                                      sighting.longitude
                                    )}
                                  </p>
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        </div>
                      )
                  )}
                </MapContainer>

                {/* Floating Control Panel - Top Left */}
                <div className="absolute top-4 left-4 z-[1000] max-w-sm">
                  <Card className="shadow-xl">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Filter className="h-5 w-5" />
                          <CardTitle className="text-base">
                            Kaart Opties
                          </CardTitle>
                        </div>
                        <button
                          onClick={() => setShowControls(!showControls)}
                          className="p-1 hover:bg-accent rounded"
                        >
                          {showControls ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </CardHeader>

                    {showControls && (
                      <CardContent className="space-y-4">
                        {/* Ship Selection */}
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            <Ship className="h-4 w-4 inline mr-1" />
                            Selecteer Schip
                          </label>
                          <select
                            value={selectedShipId || ""}
                            onChange={(e) =>
                              setSelectedShipId(
                                e.target.value ? parseInt(e.target.value) : null
                              )
                            }
                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                          >
                            <option value="">Alle schepen</option>
                            {ships.map((ship) => (
                              <option key={ship.id} value={ship.id}>
                                {ship.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Voyage Info */}
                        {selectedShipId && voyages.length > 0 && (
                          <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-md bg-muted text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs">
                              {formatDate(voyages[0].start_date)}
                              {voyages[0].end_date &&
                                ` - ${formatDate(voyages[0].end_date)}`}
                              {!voyages[0].end_date && " - Lopend"}
                            </span>
                          </div>
                        )}

                        {/* Map Type */}
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            <Map className="h-4 w-4 inline mr-1" />
                            Kaart Type
                          </label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setMapType("default")}
                              className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                                mapType === "default"
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background border-border hover:bg-accent"
                              }`}
                            >
                              Standaard
                            </button>
                            <button
                              onClick={() => setMapType("satellite")}
                              className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                                mapType === "satellite"
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background border-border hover:bg-accent"
                              }`}
                            >
                              Satelliet
                            </button>
                          </div>
                        </div>

                        {/* Filters */}
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Toon op Kaart
                          </label>
                          <div className="space-y-2">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={showCaught}
                                onChange={(e) =>
                                  setShowCaught(e.target.checked)
                                }
                                className="rounded border-border w-4 h-4"
                              />
                              <span className="text-sm flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-red-600"></span>
                                Gevangen (
                                {
                                  filteredSightings.filter((s) => s.caught)
                                    .length
                                }
                                )
                              </span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={showSeen}
                                onChange={(e) => setShowSeen(e.target.checked)}
                                className="rounded border-border w-4 h-4"
                              />
                              <span className="text-sm flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                                Waargenomen (
                                {
                                  filteredSightings.filter((s) => !s.caught)
                                    .length
                                }
                                )
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Clear Selection */}
                        {selectedShipId && (
                          <button
                            onClick={() => setSelectedShipId(null)}
                            className="w-full px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                          >
                            Reset naar Alle Schepen
                          </button>
                        )}
                      </CardContent>
                    )}
                  </Card>
                </div>

                {/* Stats Panel - Top Right (only in fullscreen) */}
                {isFullscreen && routeStats && (
                  <div className="absolute top-4 right-4 z-[1000] max-w-xs">
                    <Card className="shadow-xl">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            Route Statistieken
                          </CardTitle>
                          <button
                            onClick={() => setShowStats(!showStats)}
                            className="p-1 hover:bg-accent rounded"
                          >
                            {showStats ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </CardHeader>

                      {showStats && (
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Route className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Afstand
                              </span>
                            </div>
                            <span className="font-bold">
                              {routeStats.totalDistance} km
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Ship className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Snelheid
                              </span>
                            </div>
                            <span className="font-bold">
                              {routeStats.avgSpeed} km/dag
                            </span>
                          </div>

                          {routeStats.avgTemp !== null && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Thermometer className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  Temp
                                </span>
                              </div>
                              <span className="font-bold">
                                {routeStats.avgTemp}°C
                              </span>
                            </div>
                          )}

                          {routeStats.mostCommonWeather && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Wind className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  Weer
                                </span>
                              </div>
                              <span className="font-semibold text-sm">
                                {routeStats.mostCommonWeather}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  </div>
                )}

                {/* Legend - Bottom Left */}
                <div className="absolute bottom-24 left-4 z-[1000]">
                  <Card className="shadow-xl">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        {routeCoordinates.length > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-1 bg-blue-500 rounded"></div>
                            <span className="text-xs font-medium">Route</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center text-[10px]">
                            🐋
                          </div>
                          <span className="text-xs">Waarneming</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-red-600 border-2 border-white shadow-md flex items-center justify-center text-[10px]">
                            🎣
                          </div>
                          <span className="text-xs">Vangst</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Fullscreen Toggle - Bottom Right */}
                <div className="absolute bottom-24 right-4 z-[1000]">
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title={
                      isFullscreen
                        ? "Verlaat volledig scherm"
                        : "Volledig scherm"
                    }
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-5 w-5" />
                    ) : (
                      <Maximize2 className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
