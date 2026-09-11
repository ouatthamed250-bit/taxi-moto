import type { FC } from 'react';
import { COLORS } from '../theme';

interface Props {
  count: number;
  setCount: (n: number) => void;
}

/**
 * Sélection du nombre de passagers (1 à 4).
 * Le nombre de personnes est transmis au conducteur AVANT qu'il accepte.
 */
export const PassengerSelector: FC<Props> = ({ count, setCount }) => (
  <div>
    <h3 style={{ margin: '0 0 14px 0', color: COLORS.navy, fontSize: 16 }}>
      👥 Combien êtes-vous ?
    </h3>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
      {[1, 2, 3, 4].map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => setCount(num)}
          style={{
            width: 54,
            height: 54,
            borderRadius: '50%',
            border: count === num ? `2px solid ${COLORS.orange}` : '2px solid transparent',
            backgroundColor: count === num ? COLORS.orange : COLORS.grayLight,
            color: count === num ? COLORS.white : COLORS.text,
            fontSize: 20,
            fontWeight: 700,
            cursor: 'pointer',
            transform: count === num ? 'scale(1.08)' : 'scale(1)',
            transition: 'all 0.15s ease',
            fontFamily: 'inherit',
          }}
        >
          {num}
        </button>
      ))}
    </div>
    <p style={{ margin: 0, fontSize: 13, color: COLORS.blue, lineHeight: 1.4 }}>
      {count <= 2
        ? '🏍️ Moto (1–2 passagers) ou 🛺 Tricycle (jusqu’à 4) compatibles'
        : '🛺 Tricycle uniquement — jusqu’à 4 passagers'}
    </p>
  </div>
);
