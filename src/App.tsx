import { Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppProvider } from './store/AppProvider';
import { useApp } from './store/useApp';
import { isAdminAuthenticated } from './services/adminAuth';
import { Loader } from './components/Loader';
import { InstallPWA } from './components/InstallPWA';
import { ErrorBoundary } from './components/ErrorBoundary';
import { lazyWithRetry } from './utils/lazyWithRetry';
import Splash from './pages/Splash';
import Welcome from './pages/Welcome';

// Code splitting : chaque page devient un chunk séparé, téléchargé uniquement
// quand sa route est visitée → le bundle initial reste léger.
// ⚠️ Splash et Welcome restent importées statiquement : ce sont les écrans
// d'entrée, on veut un affichage immédiat (sans aller-retour réseau).
//
// ⚠️ `lazyWithRetry` (et NON `lazy`) : après un redéploiement, un chunk hashé
// peut ne plus exister → rechargement automatique UNE SEULE FOIS au lieu d'une
// page blanche (voir `utils/lazyWithRetry.ts`).
const Login = lazyWithRetry(() => import('./pages/Login'));
const ForgotPassword = lazyWithRetry(() => import('./pages/ForgotPassword'));
const PassengerRegister = lazyWithRetry(() => import('./pages/passenger/Register'));
const DriverRegister = lazyWithRetry(() => import('./pages/driver/Register'));
const PassengerHome = lazyWithRetry(() => import('./pages/passenger/Home'));
const Searching = lazyWithRetry(() => import('./pages/passenger/Search'));
const Offers = lazyWithRetry(() => import('./pages/passenger/Offers'));
const Tracking = lazyWithRetry(() => import('./pages/passenger/Tracking'));
const Unavailable = lazyWithRetry(() => import('./pages/passenger/Unavailable'));
const PassengerRide = lazyWithRetry(() => import('./pages/passenger/Ride'));
const PassengerHistory = lazyWithRetry(() => import('./pages/passenger/History'));
const PassengerProfile = lazyWithRetry(() => import('./pages/passenger/Profile'));
const DriverDashboard = lazyWithRetry(() => import('./pages/driver/Dashboard'));
const DriverRides = lazyWithRetry(() => import('./pages/driver/Rides'));
const DriverEarnings = lazyWithRetry(() => import('./pages/driver/Earnings'));
const DriverProfile = lazyWithRetry(() => import('./pages/driver/Profile'));
const DriverRecharge = lazyWithRetry(() => import('./pages/driver/Recharge'));
const AdminGate = lazyWithRetry(() => import('./pages/admin/AdminGate'));
const AdminLayout = lazyWithRetry(() => import('./pages/admin/AdminLayout'));
const AdminOverview = lazyWithRetry(() => import('./pages/admin/Overview'));
const AdminClients = lazyWithRetry(() => import('./pages/admin/Clients'));
const AdminDrivers = lazyWithRetry(() => import('./pages/admin/Drivers'));
const AdminDeposits = lazyWithRetry(() => import('./pages/admin/Deposits'));
const AdminGifts = lazyWithRetry(() => import('./pages/admin/Gifts'));
const AdminLiveMap = lazyWithRetry(() => import('./pages/admin/LiveMap'));
const AdminSettings = lazyWithRetry(() => import('./pages/admin/Settings'));
const AdminProfile = lazyWithRetry(() => import('./pages/admin/Profile'));

/** Garde d'accès : réservé au rôle admin ET à une session admin validée. */
function RequireAdmin() {
  const { role } = useApp();

  if (role !== 'admin' || !isAdminAuthenticated()) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}

/**
 * Garde de SESSION : au rafraîchissement, on patiente (loader) le temps que le
 * cache local puis Firestore restaurent le rôle — l'utilisateur n'est jamais
 * redirigé vers /login par erreur.
 */
function SessionGate() {
  const { sessionReady } = useApp();

  if (!sessionReady) return <Loader />;

  return <Outlet />;
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        {/*
          ErrorBoundary AUTOUR du Suspense : il capture aussi bien une erreur de
          rendu d'une page qu'un chunk JS introuvable après un redéploiement
          (« Failed to fetch dynamically imported module ») → plus de page blanche.
        */}
        <ErrorBoundary>
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/" element={<Splash />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/register/passenger" element={<PassengerRegister />} />
              <Route path="/register/driver" element={<DriverRegister />} />

              {/* Espace connecté : session restaurée avant affichage. */}
              <Route element={<SessionGate />}>
                <Route path="/passenger" element={<PassengerHome />} />
                <Route path="/passenger/search" element={<Searching />} />
                <Route path="/passenger/offers" element={<Offers />} />
                <Route path="/passenger/tracking" element={<Tracking />} />
                <Route path="/passenger/unavailable" element={<Unavailable />} />
                <Route path="/passenger/ride" element={<PassengerRide />} />
                <Route path="/passenger/history" element={<PassengerHistory />} />
                <Route path="/passenger/profile" element={<PassengerProfile />} />

                <Route path="/driver" element={<DriverDashboard />} />
                <Route path="/driver/rides" element={<DriverRides />} />
                <Route path="/driver/earnings" element={<DriverEarnings />} />
                <Route path="/driver/profile" element={<DriverProfile />} />
                <Route path="/driver/recharge" element={<DriverRecharge />} />

                {/* Espace admin protégé : RequireAdmin → AdminLayout → pages. */}
                <Route path="/admin" element={<RequireAdmin />}>
                  <Route element={<AdminLayout />}>
                    <Route path="overview" element={<AdminOverview />} />
                    <Route path="clients" element={<AdminClients />} />
                    <Route path="drivers" element={<AdminDrivers />} />
                    <Route path="deposits" element={<AdminDeposits />} />
                    <Route path="gifts" element={<AdminGifts />} />
                    <Route path="map" element={<AdminLiveMap />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="profile" element={<AdminProfile />} />
                  </Route>
                </Route>
              </Route>

              {/* Accès admin caché : porte d'entrée (code d'accès). */}
              <Route path="/admin" element={<AdminGate />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>

        {/* Bannière d'installation PWA (Welcome, Login, Home — jamais Splash). */}
        <InstallPWA />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;

