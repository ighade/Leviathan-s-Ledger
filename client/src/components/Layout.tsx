import { Link, useLocation } from 'react-router-dom';
import { Ship, Map, Calendar, FileText, BarChart3, Moon, Sun } from 'lucide-react';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export default function Layout({ children, darkMode, toggleDarkMode }: LayoutProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', icon: BarChart3, label: 'Dashboard' },
    { path: '/map', icon: Map, label: 'Kaart' },
    { path: '/timeline', icon: Calendar, label: 'Tijdlijn' },
    { path: '/log-entries', icon: FileText, label: 'Logboeken' },
    { path: '/statistics', icon: BarChart3, label: 'Statistieken' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <Ship className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Leviathan's Ledger</h1>
                <p className="text-sm text-muted-foreground">Walvisvangst Scheepslogs</p>
              </div>
            </Link>
            
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun className="h-5 w-5 text-foreground" />
              ) : (
                <Moon className="h-5 w-5 text-foreground" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-border bg-card sticky top-16 z-40">
        <div className="container mx-auto px-4">
          <ul className="flex space-x-1">
            {navLinks.map(({ path, icon: Icon, label }) => (
              <li key={path}>
                <Link
                  to={path}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                    isActive(path)
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-16">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            © 2024 Leviathan's Ledger - Historische Walvisvangst Database
          </p>
        </div>
      </footer>
    </div>
  );
}

