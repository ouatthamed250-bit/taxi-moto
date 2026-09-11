import type { FC, ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { COLORS } from '../theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  variant?: 'light' | 'navy';
}

export const Header: FC<HeaderProps> = ({ title, subtitle, onBack, right, variant = 'light' }) => {
  const dark = variant === 'navy';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '18px 20px',
        backgroundColor: dark ? COLORS.navy : COLORS.white,
        borderBottom: dark ? 'none' : `1px solid ${COLORS.grayLight}`,
      }}
    >
      {onBack && (
        <button
          type="button"
          aria-label="Retour"
          onClick={onBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backgroundColor: dark ? 'rgba(255,255,255,0.14)' : COLORS.grayLight,
          }}
        >
          <ArrowLeft size={20} color={dark ? COLORS.white : COLORS.navy} />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: dark ? COLORS.white : COLORS.navy }}>
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 13,
              marginTop: 2,
              color: dark ? 'rgba(255,255,255,0.72)' : COLORS.gray,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {right}
    </div>
  );
};
