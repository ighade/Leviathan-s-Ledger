import { useState, useEffect } from 'react';
import { getTimeline, TimelineEvent } from '../services/api';
import { Card, CardContent } from '../components/Card';
import Loading from '../components/Loading';
import { formatDate } from '../lib/utils';
import { Ship, Eye, AlertTriangle, Calendar } from 'lucide-react';

export default function Timeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getTimeline({ type: filter });
        setEvents(result);
        setError(null);
      } catch (err) {
        setError('Failed to load timeline');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filter]);

  if (loading) return <Loading />;
  if (error) return <div className="text-destructive">Error: {error}</div>;

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'voyage_start':
        return <Ship className="h-5 w-5 text-primary" />;
      case 'whale_sighting':
        return <Eye className="h-5 w-5 text-blue-500" />;
      case 'crew_event':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Calendar className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getEventDescription = (event: TimelineEvent) => {
    switch (event.eventType) {
      case 'voyage_start':
        return `Reis gestart door ${event.shipName}`;
      case 'whale_sighting':
        return `${event.count} ${event.species || 'walvis(sen)'} ${event.caught ? 'gevangen' : 'waargenomen'} door ${event.shipName}`;
      case 'crew_event':
        return `${event.eventSubType}: ${event.crew_member_name || 'Bemanningslid'} op ${event.shipName}`;
      default:
        return 'Gebeurtenis';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Tijdlijn</h1>
        <p className="text-muted-foreground">
          Chronologische weergave van gebeurtenissen
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter(undefined)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === undefined
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setFilter('voyage')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'voyage'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              Reizen
            </button>
            <button
              onClick={() => setFilter('whale')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'whale'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              Walvissen
            </button>
            <button
              onClick={() => setFilter('crew')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'crew'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              Bemanning
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>

        {/* Events */}
        <div className="space-y-8">
          {events.map((event, index) => (
            <div key={`${event.eventType}-${event.entityId}-${index}`} className="relative pl-16">
              {/* Icon */}
              <div className="absolute left-3 -translate-x-1/2 w-10 h-10 rounded-full bg-card border-2 border-border flex items-center justify-center">
                {getEventIcon(event.eventType)}
              </div>

              {/* Content */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">
                        {formatDate(event.date)}
                      </p>
                      <p className="text-lg font-medium mb-2">
                        {getEventDescription(event)}
                      </p>
                      {event.description && (
                        <p className="text-sm text-muted-foreground">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {events.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Geen gebeurtenissen gevonden voor deze filter
          </div>
        )}
      </div>
    </div>
  );
}

