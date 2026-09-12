import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bike,
  Gift,
  LogOut,
  Map,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import { useApp } from '../../store/useApp';
import { setAdminAuthenticated } from '../../services/adminAuth';
import './Dashboard.css';
import './AdminLayout.css';

interface NavItem {
  to: string;
  label: string;
  emoji: string;
  icon: typeof BarChart3;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin/overview', label: "Vue d'ensemble", emoji: '📊', icon: BarChart3 },
  { to: '/admin/clients', label: 'Clients', emoji: '👥', icon: Users },
  { to: '/admin/drivers', label: 'Conducteurs', emoji: '🏍️', icon: Bike },
  { to: '/admin/deposits', label: 'Dépôts', emoji: '💰', icon: Wallet },
  { to: '/admin/gifts', label: 'Cadeaux', emoji: '🎁', icon: Gift },
  { to: '/admin/map', label: 'Carte live', emoji: '🗺️', icon: Map },
  { to: '/admin/settings', label: 'Paramètres', emoji: '⚙️', icon: Settings },
  { to: '/admin/profile', label: 'Profil', emoji: '👤', icon: UserRound },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { role, logout } = useApp();

  // PROTECTION : seul un administrateur peut accéder à l'espace admin.
  if (role !== 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const handleLogout = () => {
    setAdminAuthenticated(false);
    logout();
    navigate('/');
  };

  return (
    <div className="admin-page">
      <div className="admin-layout">

        {/* ===== SIDEBAR (desktop) ===== */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-brand">
            <img className="admin-sidebar-logo" src="/images/logo.png" alt="Taxi-Moto" />

            <div className="admin-sidebar-brand-text">
              <strong>Taxi-Moto</strong>
              <span className="admin-badge">
                <ShieldCheck size={11} />
                Administration
              </span>
            </div>
          </div>

          <nav className="admin-nav">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `admin-nav-item${isActive ? ' admin-nav-item--active' : ''}`
                  }
                >
                  <span className="admin-nav-emoji" aria-hidden="true">
                    {item.emoji}
                  </span>
                  <Icon size={17} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <button type="button" className="admin-sidebar-logout" onClick={handleLogout}>
            <LogOut size={17} />
            Déconnexion
          </button>
        </aside>

        {/* ===== CONTENU ===== */}
        <div className="admin-main">

          <header className="admin-mobile-header">
            <div className="admin-mobile-brand">
              <img className="admin-mobile-logo" src="/images/logo.png" alt="Taxi-Moto" />
              <span className="admin-badge">
                <ShieldCheck size={11} />
                Administration
              </span>
            </div>

            <button
              type="button"
              className="admin-mobile-logout"
              aria-label="Déconnexion"
              onClick={handleLogout}
            >
              <LogOut size={17} />
            </button>
          </header>

          <nav className="admin-tabs">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `admin-tab${isActive ? ' admin-tab--active' : ''}`}
              >
                <span aria-hidden="true">{item.emoji}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="admin-content">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
