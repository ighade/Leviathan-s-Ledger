import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLogEntries } from '../hooks/useLogEntries';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import Loading from '../components/Loading';
import { formatDate, formatCoordinates } from '../lib/utils';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

export default function LogEntries() {
  const [page, setPage] = useState(1);
  const [hasCoordinates, setHasCoordinates] = useState<boolean | undefined>(undefined);
  
  const { data, loading, error } = useLogEntries({ 
    page, 
    limit: 20,
    hasCoordinates 
  });

  if (loading) return <Loading />;
  if (error) return <div className="text-destructive">Error: {error}</div>;
  if (!data) return null;

  const { data: entries, pagination } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Logboek Entries</h1>
        <p className="text-muted-foreground">
          Dagelijkse notities uit de scheepslogs
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <button
              onClick={() => setHasCoordinates(undefined)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                hasCoordinates === undefined
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setHasCoordinates(true)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                hasCoordinates === true
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              Met Coördinaten
            </button>
            <button
              onClick={() => setHasCoordinates(false)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                hasCoordinates === false
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              Zonder Coördinaten
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Log Entries List */}
      <div className="space-y-4">
        {entries.map((entry: any) => (
          <Card key={entry.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{entry.ship_name || 'Onbekend Schip'}</h3>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(entry.date)}
                      {entry.time && ` - ${entry.time}`}
                    </span>
                    {(entry.latitude && entry.longitude) && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {formatCoordinates(entry.latitude, entry.longitude)}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-foreground line-clamp-3 mb-3">
                    {entry.raw_text}
                  </p>
                  
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    {entry.weather && (
                      <span><strong>Weer:</strong> {entry.weather}</span>
                    )}
                    {entry.course && (
                      <span><strong>Koers:</strong> {entry.course}</span>
                    )}
                    {entry.wind_direction && (
                      <span><strong>Wind:</strong> {entry.wind_direction}</span>
                    )}
                  </div>
                </div>
                
                <Link
                  to={`/log-entries/${entry.id}`}
                  className="ml-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm"
                >
                  Details
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Pagina {pagination.page} van {pagination.totalPages} ({pagination.total} entries)
        </p>
        
        <div className="flex gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Vorige
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= pagination.totalPages}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Volgende
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

