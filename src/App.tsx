import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Sidebar from './components/Sidebar';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Clientes from './views/Clientes';
import Pagos from './views/Pagos';
import Movimientos from './views/Movimientos';
import Wallets from './views/Wallets';
import Equipo from './views/Equipo';
import Gastos from './views/Gastos';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [session, setSession] = useState<typeof import('@supabase/supabase-js').Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'clientes':
        return <Clientes />;
      case 'pagos':
        return <Pagos />;
      case 'movimientos':
        return <Movimientos />;
      case 'wallets':
        return <Wallets />;
      case 'equipo':
        return <Equipo />;
      case 'gastos':
        return <Gastos />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        userEmail={session.user?.email}
        onLogout={() => supabase.auth.signOut()}
      />
      <main className="flex-1 ml-64 p-8">{renderView()}</main>
    </div>
  );
}

export default App;
