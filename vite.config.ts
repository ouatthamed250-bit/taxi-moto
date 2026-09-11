import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Les chunks restent sous ce seuil (le plus gros est « vendor », ~211 ko).
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        /**
         * Sépare les gros vendors en chunks dédiés → mis en cache par le
         * navigateur entre deux déploiements et chargés en parallèle.
         *
         * ⚠️ Rolldown (bundler de Vite 8) ne supporte que la forme « fonction »
         * (la forme objet de Rollup n'est pas acceptée). Le chemin est normalisé
         * car Windows utilise « \ » alors que le test porte sur « / ».
         *
         * ⚠️ Aucun chunk « leaflet » forcé volontairement : en le forçant, la lib
         * devenait une dépendance STATIQUE du chunk « vendor » (lui-même préchargé
         * au démarrage → +157 ko inutiles avant le premier rendu). Laissée en
         * découpage automatique, elle reste dans le chunk paresseux de
         * MapComponent et n'est téléchargée qu'à l'ouverture d'un écran avec
         * carte (Home, Tracking, Dashboard conducteur).
         */
        manualChunks(id: string) {
          const path = id.replace(/\\/g, '/')
          if (!path.includes('node_modules')) return null

          // ⚠️ Ordre important : « react-router » et « lucide-react » contiennent
          // « react » et doivent donc être testés avant lui.
          if (path.includes('react-router')) return 'router'
          if (path.includes('lucide-react')) return 'icons'
          if (path.includes('firebase')) return 'firebase'
          if (
            path.includes('react-dom') ||
            path.includes('/react/') ||
            path.includes('scheduler')
          ) {
            return 'vendor'
          }

          return null
        },
      },
    },
  },
})

