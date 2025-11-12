import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getLogEntry } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/Card';
import Loading from '../components/Loading';
import { formatDate, formatCoordinates } from '../lib/utils';
import { ArrowLeft, MapPin, Calendar, Ship as ShipIcon } from 'lucide-react';

export default function LogEntryDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const result = await getLogEntry(parseInt(id));
        setData(result);
        setError(null);
      } catch (err) {
        setError('Failed to load log entry');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <Loading />;
  if (error) return <div className="text-destructive">Error: {error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/log-entries"
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-4xl font-bold text-foreground">Logboek Entry Details</h1>
          <p className="text-muted-foreground">
            {data.ship_name || 'Onbekend Schip'} - {formatDate(data.date)}
          </p>
        </div>
      </div>

      {/* Main Information */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Datum & Tijd
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">{formatDate(data.date)}</p>
            {data.time && <p className="text-muted-foreground">{data.time}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShipIcon className="h-5 w-5" />
              Schip
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">{data.ship_name || 'Onbekend'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Locatie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">{formatCoordinates(data.latitude, data.longitude)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Weather & Navigation */}
      {(data.weather || data.course || data.wind_direction || data.temperature) && (
        <Card>
          <CardHeader>
            <CardTitle>Weer & Navigatie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {data.weather && (
                <div>
                  <p className="text-sm text-muted-foreground">Weer</p>
                  <p className="text-lg font-medium">{data.weather}</p>
                </div>
              )}
              {data.course && (
                <div>
                  <p className="text-sm text-muted-foreground">Koers</p>
                  <p className="text-lg font-medium">{data.course}</p>
                </div>
              )}
              {data.wind_direction && (
                <div>
                  <p className="text-sm text-muted-foreground">Windrichting</p>
                  <p className="text-lg font-medium">{data.wind_direction}</p>
                </div>
              )}
              {data.temperature && (
                <div>
                  <p className="text-sm text-muted-foreground">Temperatuur</p>
                  <p className="text-lg font-medium">{data.temperature}°</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Raw Text */}
      <Card>
        <CardHeader>
          <CardTitle>Originele Tekst</CardTitle>
          <CardDescription>Ruwe tekst uit het logboek</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{data.raw_text}</p>
        </CardContent>
      </Card>

      {/* Whale Sightings */}
      {data.whaleSightings && data.whaleSightings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Walvis Waarnemingen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.whaleSightings.map((sighting: any) => (
                <div key={sighting.id} className="p-4 bg-accent rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {sighting.species || 'Onbekende soort'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Aantal: {sighting.count} | {sighting.caught ? 'Gevangen' : 'Waargenomen'}
                      </p>
                      {sighting.notes && (
                        <p className="text-sm mt-2">{sighting.notes}</p>
                      )}
                    </div>
                    {(sighting.latitude && sighting.longitude) && (
                      <span className="text-sm text-muted-foreground">
                        {formatCoordinates(sighting.latitude, sighting.longitude)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Catches */}
      {data.catches && data.catches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vangsten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.catches.map((catchData: any) => (
                <div key={catchData.id} className="p-4 bg-accent rounded-lg">
                  <div className="grid gap-2 md:grid-cols-3">
                    {catchData.whale_count && (
                      <div>
                        <p className="text-sm text-muted-foreground">Walvissen</p>
                        <p className="text-lg font-medium">{catchData.whale_count}</p>
                      </div>
                    )}
                    {catchData.oil_barrels && (
                      <div>
                        <p className="text-sm text-muted-foreground">Vaten Olie</p>
                        <p className="text-lg font-medium">{catchData.oil_barrels}</p>
                      </div>
                    )}
                    {catchData.blubber_weight && (
                      <div>
                        <p className="text-sm text-muted-foreground">Spek Gewicht</p>
                        <p className="text-lg font-medium">{catchData.blubber_weight} kg</p>
                      </div>
                    )}
                  </div>
                  {catchData.notes && (
                    <p className="text-sm mt-2">{catchData.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Crew Events */}
      {data.crewEvents && data.crewEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bemanning Gebeurtenissen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.crewEvents.map((event: any) => (
                <div key={event.id} className="p-4 bg-accent rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                      </p>
                      {event.crew_member_name && (
                        <p className="text-sm text-muted-foreground">
                          {event.crew_member_name}
                          {event.role && ` - ${event.role}`}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-sm mt-2">{event.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

