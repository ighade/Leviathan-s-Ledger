import { useStatistics } from '../hooks/useStatistics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import Loading from '../components/Loading';
import { Ship, Anchor, FileText, Eye } from 'lucide-react';
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function Statistics() {
  const { data, loading, error } = useStatistics();

  if (loading) return <Loading />;
  if (error) return <div className="text-destructive">Error: {error}</div>;
  if (!data) return null;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  const overviewStats = [
    {
      title: 'Schepen',
      value: data.overview.totalShips,
      icon: Ship,
      description: 'Geregistreerde schepen',
    },
    {
      title: 'Reizen',
      value: data.overview.totalVoyages,
      icon: Anchor,
      description: 'Voltooide reizen',
    },
    {
      title: 'Logboek Entries',
      value: data.overview.totalLogEntries,
      icon: FileText,
      description: 'Dagelijkse notities',
    },
    {
      title: 'Walvis Waarnemingen',
      value: data.overview.totalSightings,
      icon: Eye,
      description: 'Totaal waargenomen',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Statistieken</h1>
        <p className="text-muted-foreground">
          Gedetailleerde analyses en visualisaties
        </p>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {overviewStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-1">
        {/* Species Breakdown - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Walvissoorten Verdeling</CardTitle>
            <CardDescription>Aantal waarnemingen per soort</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={data.speciesBreakdown.slice(0, 8)}
                  dataKey="sightings"
                  nameKey="species"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label={({ species, percent }) => `${species} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {data.speciesBreakdown.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

