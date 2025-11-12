import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { useStatistics } from '../hooks/useStatistics';
import Loading from '../components/Loading';
import { Ship, Anchor, FileText, Eye, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const { data, loading, error } = useStatistics();

  if (loading) return <Loading />;
  if (error) return <div className="text-destructive">Error: {error}</div>;
  if (!data) return null;

  const stats = [
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
    {
      title: 'Vaten Olie',
      value: data.overview.totalOilBarrels,
      icon: TrendingUp,
      description: 'Totale opbrengst',
    },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Overzicht van de walvisvangst scheepslogs database
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
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
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Species Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Walvissoorten</CardTitle>
            <CardDescription>Verdeling van waargenomen soorten</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.speciesBreakdown.slice(0, 6)}
                  dataKey="totalCount"
                  nameKey="species"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => entry.species}
                >
                  {data.speciesBreakdown.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Catches Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Vangsten Over Tijd</CardTitle>
            <CardDescription>Maandelijkse vangsten en olie productie</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.catchesByMonth.slice(-12)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="catchCount" fill="#3b82f6" name="Vangsten" />
                <Bar dataKey="oilBarrels" fill="#10b981" name="Vaten Olie" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Hunting Areas */}
      <Card>
        <CardHeader>
          <CardTitle>Populaire Jachtgebieden</CardTitle>
          <CardDescription>Top 10 gebieden met meeste waarnemingen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-4">Coördinaten</th>
                  <th className="text-right py-2 px-4">Waarnemingen</th>
                  <th className="text-right py-2 px-4">Vangsten</th>
                  <th className="text-right py-2 px-4">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.huntingAreas.slice(0, 10).map((area, index) => (
                  <tr key={index} className="border-b border-border hover:bg-accent">
                    <td className="py-2 px-4">
                      {Math.abs(area.lat).toFixed(0)}° {area.lat >= 0 ? 'N' : 'S'},{' '}
                      {Math.abs(area.lon).toFixed(0)}° {area.lon >= 0 ? 'E' : 'W'}
                    </td>
                    <td className="text-right py-2 px-4">{area.sightings}</td>
                    <td className="text-right py-2 px-4">{area.catches}</td>
                    <td className="text-right py-2 px-4">
                      {area.sightings > 0 ? ((area.catches / area.sightings) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

