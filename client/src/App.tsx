import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import Timeline from './pages/Timeline';
import LogEntries from './pages/LogEntries';
import LogEntryDetail from './pages/LogEntryDetail';
import Statistics from './pages/Statistics';

function App() {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <Router>
      <div className={darkMode ? 'dark' : ''}>
        <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/log-entries" element={<LogEntries />} />
            <Route path="/log-entries/:id" element={<LogEntryDetail />} />
            <Route path="/statistics" element={<Statistics />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App;

