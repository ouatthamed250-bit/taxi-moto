/**
 * Garde-fou GLOBAL de l'application.
 *
 * Capture toute erreur de rendu — notamment un chunk JS introuvable après un
 * redéploiement (« Failed to fetch dynamically imported module ») — et affiche
 * un écran de secours au lieu d'une PAGE BLANCHE.
 *
 * ⚠️ Les styles sont VOLONTAIREMENT en ligne : si le CSS (chunk hashé) est lui
 * aussi périmé, l'écran de secours doit rester lisible. Aucune dépendance
 * (ni icône, ni feuille de style externe).
 */
import { Component } from 'react';
import type { CSSProperties, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Libellé du bouton principal (défaut : « Recharger »). */
  reloadLabel?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/* ---------- Palette premium (navy #062b67 / orange #ff9900) ---------- */

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  background: 'linear-gradient(160deg, #0b3f92 0%, #062b67 55%, #041c45 100%)',
  fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

const cardStyle: CSSProperties = {
  width: '100%',
  maxWidth: 360,
  padding: '28px 22px',
  borderRadius: 24,
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(255,255,255,0.08)',
  boxShadow: '0 24px 56px rgba(0,0,0,0.34)',
  textAlign: 'center',
  color: '#fff',
};

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 64,
  height: 64,
  marginBottom: 16,
  borderRadius: 20,
  fontSize: 30,
  background: 'linear-gradient(145deg, #ffb52e, #ff9900)',
  boxShadow: '0 12px 26px rgba(255,153,0,0.35)',
};

const titleStyle: CSSProperties = {
  margin: '0 0 8px',
  fontSize: 19,
  fontWeight: 900,
  letterSpacing: '-0.3px',
};

const textStyle: CSSProperties = {
  margin: 0,
  fontSize: 13.5,
  fontWeight: 600,
  lineHeight: 1.55,
  color: 'rgba(255,255,255,0.78)',
};

const primaryButtonStyle: CSSProperties = {
  width: '100%',
  marginTop: 20,
  padding: 15,
  border: 'none',
  borderRadius: 16,
  color: '#062b67',
  background: 'linear-gradient(135deg, #ffb52e, #ff9900)',
  fontFamily: 'inherit',
  fontSize: 15,
  fontWeight: 900,
  cursor: 'pointer',
  boxShadow: '0 7px 0 rgba(178,106,0,0.35), 0 14px 26px rgba(255,153,0,0.25)',
};

const secondaryButtonStyle: CSSProperties = {
  width: '100%',
  marginTop: 10,
  padding: 12,
  border: '1px solid rgba(255,255,255,0.22)',
  borderRadius: 14,
  color: 'rgba(255,255,255,0.88)',
  background: 'transparent',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Trace conservée pour le diagnostic (aucune donnée envoyée à un serveur).
    console.error('[ErrorBoundary]', error, info);
  }

  /** Nouvelle tentative SANS rechargement (erreur de rendu transitoire). */
  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  /** Rechargement complet : indispensable quand un chunk JS n'existe plus. */
  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={overlayStyle} role="alert">
        <div style={cardStyle}>
          <span style={badgeStyle} aria-hidden="true">
            🛠️
          </span>

          <h2 style={titleStyle}>Une erreur est survenue</h2>

          <p style={textStyle}>
            Une nouvelle version de l’application a peut-être été déployée.
            Rechargez la page pour continuer.
          </p>

          <button type="button" style={primaryButtonStyle} onClick={this.handleReload}>
            {this.props.reloadLabel ?? 'Recharger'}
          </button>

          <button type="button" style={secondaryButtonStyle} onClick={this.handleRetry}>
            Réessayer sans recharger
          </button>
        </div>
      </div>
    );
  }
}
