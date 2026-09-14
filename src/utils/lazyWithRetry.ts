/**
 * Chargement PARESSEUX avec REPRISE automatique.
 *
 * ⚠️ Problème résolu : après un redéploiement (Vercel), les noms de chunks
 * changent (hash Vite). Un onglet resté ouvert sur l'ANCIEN build demande un
 * fichier qui n'existe plus ; la règle SPA de Vercel (`/(.*) → /index.html`)
 * répond alors `index.html` en `text/html` au lieu du JavaScript :
 *
 *   Failed to load module script: Expected a JavaScript-or-Wasm module script
 *   but the server responded with a MIME type of "text/html"
 *   → PAGE BLANCHE
 *
 * Correctif : au PREMIER échec, on recharge l'application (elle récupère le
 * nouvel `index.html` et les nouveaux hash). Le rechargement n'a lieu QU'UNE
 * SEULE FOIS par session : au 2e échec, l'erreur est relancée et capturée par
 * `ErrorBoundary` → aucune boucle de rechargement possible.
 */
import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

/** Clé de session : garantit UN SEUL rechargement automatique. */
export const CHUNK_RELOAD_KEY = 'taxi.chunk-reload-attempted';

/** sessionStorage est-il déjà marqué ? (false en navigation privée / iframe). */
function hasReloaded(): boolean {
  try {
    return window.sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
  } catch {
    return false;
  }
}

/** Marque la tentative (silencieux si le stockage est indisponible). */
function markReloaded(): void {
  try {
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  } catch {
    // stockage indisponible : l'anti-boucle reste assuré par le cycle de vie de l'onglet
  }
}

/** Réinitialise le marqueur (après un 2e échec, pour une prochaine session). */
function clearReloaded(): void {
  try {
    window.sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    // on ignore
  }
}

/**
 * Enveloppe une importation dynamique avec la reprise automatique.
 *
 * Exportée séparément de `lazyWithRetry` pour rester TESTABLE sans React.
 */
export function withChunkRetry<T>(importFn: () => Promise<T>): () => Promise<T> {
  return () =>
    importFn().catch((error: unknown) => {
      // 1er échec : l'onglet est probablement sur un build périmé → rechargement.
      if (!hasReloaded()) {
        markReloaded();
        console.warn(
          '[lazy] chunk introuvable (nouvelle version déployée ?) → rechargement de l’application.',
          error,
        );
        window.location.reload();
        // Promesse jamais résolue : React reste en « chargement » le temps du reload.
        return new Promise<never>(() => {});
      }

      // 2e échec de la session : on rend la main à l'ErrorBoundary (écran de secours).
      clearReloaded();
      throw error;
    });
}

/** `React.lazy` avec reprise automatique sur chunk périmé (redéploiement). */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(withChunkRetry(importFn));
}
