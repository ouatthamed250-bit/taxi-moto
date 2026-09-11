import type { ComponentType, FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Car, History, Home, Map, User, Wallet } from 'lucide-react';
import { COLORS } from '../theme';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number | string; color?: string }>;
}

const PASSENGER_ITEMS: NavItem[] = [
  { to: '/passenger', label: 'Accueil', icon: Home },
  { to: '/passenger/ride', label: 'Courses', icon: Map },
  { to: '/passenger/history', label: 'Historique', icon: History },
  { to: '/passenger/profile', label: 'Profil', icon: User },
];

const DRIVER_ITEMS: NavItem[] = [
  { to: '/driver', label: 'Accueil', icon: Home },
  { to: '/driver/rides', label: 'Courses', icon: Car },
  { to: '/driver/earnings', label: 'Revenus', icon: Wallet },
  { to: '/driver/profile', label: 'Profil', icon: User },
];

interface BottomNavProps {
  variant: 'passenger' | 'driver';
}

export const BottomNav: FC<BottomNavProps> = ({ variant }) => {
  const items = variant === 'passenger' ? PASSENGER_ITEMS : DRIVER_ITEMS;
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 14,
        display: 'flex',
        backgroundColor: COLORS.navy,
        borderRadius: 26,
        padding: 8,
        boxShadow: '0 14px 34px rgba(6,43,103,0.35)',
        zIndex: 1200,
      }}
    >
      {items.map((item) => {
        const active = pathname === item.to;
        const Icon = item.icon;
        return (
          <button
            key={item.to}
            type="button"
            onClick={() => navigate(item.to)}
            style={{
              flex: 1,
              border: 'none',
              background: active ? COLORS.orange : 'transparent',
              borderRadius: 20,
              padding: '10px 4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
          >
            <Icon size={20} color={active ? COLORS.white : 'rgba(255,255,255,0.72)'} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: active ? COLORS.white : 'rgba(255,255,255,0.72)',
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
