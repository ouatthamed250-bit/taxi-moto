import type { FC, ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { COLORS } from '../theme';

interface PageProps {
  children: ReactNode;
  nav?: 'passenger' | 'driver';
  background?: string;
  scroll?: boolean;
  padBottom?: number;
}

/** Conteneur d'écran mobile : zone défilante + bottom navigation optionnelle. */
export const Page: FC<PageProps> = ({
  children,
  nav,
  background = COLORS.grayLight,
  scroll = true,
  padBottom,
}) => (
  <div
    style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: background,
    }}
  >
    <div
      style={{
        flex: 1,
        overflowY: scroll ? 'auto' : 'hidden',
        overflowX: 'hidden',
        paddingBottom: padBottom ?? (nav ? 104 : 0),
      }}
    >
      {children}
    </div>
    {nav && <BottomNav variant={nav} />}
  </div>
);
