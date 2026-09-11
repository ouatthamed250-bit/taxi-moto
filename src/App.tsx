import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './store/AppProvider';
import Splash from './pages/Splash';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import PassengerRegister from './pages/passenger/Register';
import DriverRegister from './pages/driver/Register';
import PassengerHome from './pages/passenger/Home';
import Searching from './pages/passenger/Search';
import Offers from './pages/passenger/Offers';
import Tracking from './pages/passenger/Tracking';
import Unavailable from './pages/passenger/Unavailable';
import PassengerRide from './pages/passenger/Ride';
import PassengerHistory from './pages/passenger/History';
import PassengerProfile from './pages/passenger/Profile';
import DriverDashboard from './pages/driver/Dashboard';
import DriverRides from './pages/driver/Rides';
import DriverEarnings from './pages/driver/Earnings';
import DriverProfile from './pages/driver/Profile';
import AdminDashboard from './pages/admin/Dashboard';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register/passenger" element={<PassengerRegister />} />
          <Route path="/register/driver" element={<DriverRegister />} />

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

          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
