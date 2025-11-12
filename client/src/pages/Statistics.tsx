import { useStatistics } from '../hooks/useStatistics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import Loading from '../components/Loading';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';

export default function Statistics() {
  const { data, loading, error } = useStatistics();

  if (loading) return <Loading />;
  if (error) return <div className="text-destructive">Error: {error}</div>;
  if (!data) return null;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  // Prepare data for success rate chart
  const huntingAreasWithRate = data.huntingAreas.map(area => ({
    ...area,
    successRate: area.sightings > 0 ? (area.catches / area.sightings) * 100 : 0,
    location: `${Math.abs(area.lat).toFixed(0)}° ${area.lat >= 0 ? 'N' : 'S'}, ${Math.abs(area.lon).toFixed(0)}° ${area.lon >= 0 ? 'E' : 'W'}`,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Statistieken</h1>
        <p className="text-muted-foreground">
          Gedetailleerde analyses en visualisaties
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Totaal Walvissen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.overview.totalWhales.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{data.overview.totalSightings} waarnemingen</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Vangsten</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.overview.totalCatches.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Succesvolle vangsten</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Olie Productie</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.overview.totalOilBarrels.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Vaten olie</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {data.overview.totalSightings > 0
                ? ((data.overview.totalCatches / data.overview.totalSightings) * 100).toFixed(1)
                : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Vangsten/Waarnemingen</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
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

        {/* Catches Over Time - Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Vangsten Over Tijd</CardTitle>
            <CardDescription>Maandelijkse trend</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data.catchesByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="catchCount" stroke="#3b82f6" name="Vangsten" strokeWidth={2} />
                <Line type="monotone" dataKey="oilBarrels" stroke="#10b981" name="Vaten Olie" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Species Comparison - Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Soorten Vergelijking</CardTitle>
          <CardDescription>Waarnemingen vs. Vangsten per soort</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.speciesBreakdown.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="species" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalCount" fill="#3b82f6" name="Totaal Waargenomen" />
              <Bar dataKey="caughtCount" fill="#ef4444" name="Gevangen" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Hunting Areas - Top Locations */}
      <Card>
        <CardHeader>
          <CardTitle>Top Jachtgebieden</CardTitle>
          <CardDescription>Meest productieve locaties</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={huntingAreasWithRate.slice(0, 15)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="location" type="category" width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="sightings" fill="#3b82f6" name="Waarnemingen" />
              <Bar dataKey="catches" fill="#10b981" name="Vangsten" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Success Rate by Area */}
      <Card>
        <CardHeader>
          <CardTitle>Success Rate per Gebied</CardTitle>
          <CardDescription>Percentage gevangen vs. waargenomen</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={huntingAreasWithRate.slice(0, 20)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="location" hide />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="successRate" stroke="#f59e0b" fill="#f59e0b" name="Success Rate %" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Gedetailleerde Soorten Statistieken</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">Soort</th>
                  <th className="text-right py-3 px-4">Waarnemingen</th>
                  <th className="text-right py-3 px-4">Totaal Aantal</th>
                  <th className="text-right py-3 px-4">Gevangen</th>
                  <th className="text-right py-3 px-4">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.speciesBreakdown.map((species, index) => (
                  <tr key={index} className="border-b border-border hover:bg-accent">
                    <td className="py-3 px-4 font-medium">{species.species}</td>
                    <td className="text-right py-3 px-4">{species.sightings}</td>
                    <td className="text-right py-3 px-4">{species.totalCount}</td>
                    <td className="text-right py-3 px-4">{species.caughtCount}</td>
                    <td className="text-right py-3 px-4">
                      {species.totalCount > 0
                        ? ((species.caughtCount / species.totalCount) * 100).toFixed(1)
                        : 0}%
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

