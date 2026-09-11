import type { FC } from 'react';
import './Loader.css';

/** Indicateur de chargement centré — utilisé comme repli de <Suspense>. */
export const Loader: FC = () => (
  <div className="loader" role="status" aria-live="polite">
    <span className="loader-spinner" aria-hidden="true" />
    <span className="loader-text">Chargement…</span>
  </div>
);
