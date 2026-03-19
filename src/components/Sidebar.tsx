import { LayoutDashboard, Users, CreditCard, ArrowLeftRight, Wallet, SquareUser as UserSquare2, Receipt, LogOut } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  userEmail?: string;
  onLogout: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'pagos', label: 'Pagos', icon: CreditCard },
  { id: 'movimientos', label: 'Movimientos', icon: ArrowLeftRight },
  { id: 'wallets', label: 'Wallets', icon: Wallet },
  { id: 'equipo', label: 'Equipo', icon: UserSquare2 },
  { id: 'gastos', label: 'Gastos', icon: Receipt },
];

export default function Sidebar({ currentView, onViewChange, userEmail, onLogout }: SidebarProps) {
  return (
    <div className="w-64 h-screen bg-white border-r border-gray-200 fixed left-0 top-0 flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900">FinanzasApp</h1>
        <p className="text-sm text-gray-500 mt-1">Gestión Financiera</p>
      </div>

      <nav className="px-3 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200">
        {userEmail && (
          <p className="text-xs text-gray-500 truncate px-2 mb-2" title={userEmail}>
            {userEmail}
          </p>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <LogOut size={20} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}
