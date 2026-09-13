import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppProvider } from './store/AppProvider';
import { useApp } from './store/useApp';
import { isAdminAuthenticated } from './services/adminAuth';
import { Loader } from './components/Loader';
import { InstallPWA } from './components/InstallPWA';
import Splash from './pages/Splash';
import Welcome from './pages/Welcome';

// Code splitting : chaque page devient un chunk séparé, téléchargé uniquement
// quand sa route est visitée → le bundle initial reste léger.
// ⚠️ Splash et Welcome restent importées statiquement : ce sont les écrans
// d'entrée, on veut un affichage immédiat (sans aller-retour réseau).
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const PassengerRegister = lazy(() => import('./pages/passenger/Register'));
const DriverRegister = lazy(() => import('./pages/driver/Register'));
const PassengerHome = lazy(() => import('./pages/passenger/Home'));
const Searching = lazy(() => import('./pages/passenger/Search'));
const Offers = lazy(() => import('./pages/passenger/Offers'));
const Tracking = lazy(() => import('./pages/passenger/Tracking'));
const Unavailable = lazy(() => import('./pages/passenger/Unavailable'));
const PassengerRide = lazy(() => import('./pages/passenger/Ride'));
const PassengerHistory = lazy(() => import('./pages/passenger/History'));
const PassengerProfile = lazy(() => import('./pages/passenger/Profile'));
const DriverDashboard = lazy(() => import('./pages/driver/Dashboard'));
const DriverRides = lazy(() => import('./pages/driver/Rides'));
const DriverEarnings = lazy(() => import('./pages/driver/Earnings'));
const DriverProfile = lazy(() => import('./pages/driver/Profile'));
const DriverRecharge = lazy(() => import('./pages/driver/Recharge'));
const AdminGate = lazy(() => import('./pages/admin/AdminGate'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminOverview = lazy(() => import('./pages/admin/Overview'));
const AdminClients = lazy(() => import('./pages/admin/Clients'));
const AdminDrivers = lazy(() => import('./pages/admin/Drivers'));
const AdminDeposits = lazy(() => import('./pages/admin/Deposits'));
const AdminGifts = lazy(() => import('./pages/admin/Gifts'));
const AdminLiveMap = lazy(() => import('./pages/admin/LiveMap'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminProfile = lazy(() => import('./pages/admin/Profile'));

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

        {/* Bannière d'installation PWA (Welcome, Login, Home — jamais Splash). */}
        <InstallPWA />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;

