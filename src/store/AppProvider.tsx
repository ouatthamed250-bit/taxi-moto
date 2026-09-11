import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppContext } from './context';
import type { AppContextValue } from './context';
import type {
  AdminStats,
  DriverProfile,
  Offer,
  Ride,
  RideRequest,
  RideStatus,
  Role,
  VehicleType,
  ZonePriceRule,
} from '../types';
import {
  ADMIN_STATS,
  DRIVERS,
  DRIVER_TODAY_RIDES,
  RIDE_HISTORY,
  ZONE_RULES,
} from '../data/mock';
import { MIN_FARE, commissionOf, estimateFare, netEarnings } from '../theme';

/** Ordre du suivi de course. */
const RIDE_ORDER: RideStatus[] = [
  'driver_found',
  'driver_arriving',
  'driver_arrived',
  'in_progress',
  'completed',
];

const SAMPLE_REQUEST: RideRequest = {
  id: 'REQ-2045',
  passengers: 2,
  vehicle: 'moto',
  pickup: 'Cocody — Angré 7e Tranche',
  destination: 'Plateau — Cité Administrative',
  distanceKm: 6.1,
};

function buildOffers(vehicle: VehicleType, passengers: number, distanceKm: number): Offer[] {
  const { min, max } = estimateFare(distanceKm);
  return DRIVERS.filter(
    (d) => d.vehicle === vehicle && d.online && d.availableSeats >= passengers,
  ).map((driver, index) => {
    const spread = index === 0 ? 0 : index === 1 ? 0.15 : 0.3;
    const price = Math.round((min + (max - min) * spread) / 100) * 100;
    return {
      id: `${driver.id}-${distanceKm}`,
      driver,
      price: Math.max(MIN_FARE, price),
    };
  });
}

function nowDate(): string {
  return new Date().toLocaleDateString('fr-FR');
}

function nowTime(): string {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function AppProvider({ children }: { children: ReactNode }) {
  /* ---- Session ---- */
  const [role, setRole] = useState<Role>('guest');
  const [userName, setUserName] = useState('');
  const [phone, setPhone] = useState('');

  /* ---- Réservation ---- */
  const [passengers, setPassengers] = useState(1);
  const [vehicle, setVehicle] = useState<VehicleType | null>(null);
  const [pickup, setPickup] = useState('Ma position actuelle');
  const [destination, setDestination] = useState('');
  const [distanceKm, setDistanceKm] = useState(0);

  /* ---- Course ---- */
  const [rideStatus, setRideStatus] = useState<RideStatus>('idle');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [lastRide, setLastRide] = useState<Ride | null>(null);
  const [passengerHistory, setPassengerHistory] = useState<Ride[]>(RIDE_HISTORY);

  /* ---- Conducteur ---- */
  const [driverOnline, setDriverOnline] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState<RideRequest | null>(null);
  const [driverRidesToday, setDriverRidesToday] = useState<Ride[]>(DRIVER_TODAY_RIDES);
  const [driverApproved, setDriverApproved] = useState(false);

  /* ---- Admin ---- */
  const [adminStats, setAdminStats] = useState<AdminStats>(ADMIN_STATS);
  const [zoneRules, setZoneRules] = useState<ZonePriceRule[]>(ZONE_RULES);
  const [adminDrivers, setAdminDrivers] = useState<DriverProfile[]>(DRIVERS);

  const searchTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimer.current !== null) window.clearTimeout(searchTimer.current);
    };
  }, []);

  const login = useCallback((nextRole: Role, name: string, digits: string) => {
    setRole(nextRole);
    setUserName(name);
    setPhone(digits);
  }, []);

  const logout = useCallback(() => {
    setRole('guest');
    setUserName('');
    setPhone('');
  }, []);

  const startSearch = useCallback(() => {
    setOffers([]);
    setSelectedOffer(null);
    setRideStatus('searching');
    if (searchTimer.current !== null) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      setOffers(buildOffers(vehicle ?? 'moto', passengers, distanceKm));
      setRideStatus('offers');
    }, 2200);
  }, [vehicle, passengers, distanceKm]);

  const chooseOffer = useCallback((offer: Offer) => {
    setSelectedOffer(offer);
    setRideStatus('driver_found');
  }, []);

  const advanceRide = useCallback(() => {
    const index = RIDE_ORDER.indexOf(rideStatus);
    if (index === -1 || index === RIDE_ORDER.length - 1) return;
    const next = RIDE_ORDER[index + 1];
    setRideStatus(next);

    if (next === 'completed') {
      const price = selectedOffer?.price ?? 0;
      const ride: Ride = {
        id: `C-${Math.floor(10000 + Math.random() * 89999)}`,
        passengerName: userName || 'Vous',
        driverName: selectedOffer?.driver.name ?? '—',
        vehicle: selectedOffer?.driver.vehicle ?? vehicle ?? 'moto',
        pickup,
        destination,
        distanceKm,
        price,
        commission: commissionOf(price),
        status: 'completed',
        date: nowDate(),
        time: nowTime(),
      };
      setLastRide(ride);
      setPassengerHistory((history) => [ride, ...history]);
      setAdminStats((stats) => ({
        ...stats,
        ridesCompleted: stats.ridesCompleted + 1,
        ridesActive: Math.max(0, stats.ridesActive - 1),
        revenue: stats.revenue + commissionOf(price),
      }));
    }
  }, [rideStatus, selectedOffer, userName, pickup, destination, distanceKm, vehicle]);

  const cancelRide = useCallback(() => {
    if (searchTimer.current !== null) window.clearTimeout(searchTimer.current);
    setRideStatus('cancelled');
    setOffers([]);
    setSelectedOffer(null);
  }, []);

  const rateRide = useCallback((rating: number) => {
    setLastRide((ride) => (ride ? { ...ride, rating } : ride));
    setPassengerHistory((history) =>
      history.map((ride, index) => (index === 0 ? { ...ride, rating } : ride)),
    );
  }, []);

  const resetBooking = useCallback(() => {
    setRideStatus('idle');
    setOffers([]);
    setSelectedOffer(null);
    setDestination('');
    setDistanceKm(0);
    setVehicle(null);
    setPassengers(1);
  }, []);

  const toggleOnline = useCallback(() => setDriverOnline((online) => !online), []);

  const triggerIncoming = useCallback(() => setIncomingRequest(SAMPLE_REQUEST), []);

  const rejectIncoming = useCallback(() => setIncomingRequest(null), []);

  const acceptIncoming = useCallback((fare: number) => {
    const request = SAMPLE_REQUEST;
    const ride: Ride = {
      id: `C-${Math.floor(10000 + Math.random() * 89999)}`,
      passengerName: 'Passager Taxi-Moto',
      driverName: 'Vous',
      vehicle: request.vehicle,
      pickup: request.pickup,
      destination: request.destination,
      distanceKm: request.distanceKm,
      price: fare,
      commission: commissionOf(fare),
      status: 'completed',
      date: nowDate(),
      time: nowTime(),
    };
    setDriverRidesToday((rides) => [ride, ...rides]);
    setAdminStats((stats) => ({
      ...stats,
      ridesCompleted: stats.ridesCompleted + 1,
      ridesToday: stats.ridesToday + 1,
      revenue: stats.revenue + commissionOf(fare),
    }));
    setIncomingRequest(null);
  }, []);

  const approveDriver = useCallback(() => setDriverApproved(true), []);

  const updateZoneRule = useCallback((zone: string, patch: Partial<ZonePriceRule>) => {
    setZoneRules((rules) =>
      rules.map((rule) => (rule.zone === zone ? { ...rule, ...patch } : rule)),
    );
  }, []);

  const toggleDriverStatus = useCallback((id: string) => {
    setAdminDrivers((drivers) =>
      drivers.map((driver) => (driver.id === id ? { ...driver, online: !driver.online } : driver)),
    );
  }, []);

  const driverRevenue = useMemo(
    () => driverRidesToday.reduce((total, ride) => total + ride.price, 0),
    [driverRidesToday],
  );
  const driverCommission = useMemo(
    () => driverRidesToday.reduce((total, ride) => total + ride.commission, 0),
    [driverRidesToday],
  );
  const driverNet = useMemo(
    () => driverRidesToday.reduce((total, ride) => total + netEarnings(ride.price), 0),
    [driverRidesToday],
  );

  const value: AppContextValue = {
    role,
    userName,
    phone,
    login,
    logout,

    passengers,
    setPassengers,
    vehicle,
    setVehicle,
    pickup,
    setPickup,
    destination,
    setDestination,
    distanceKm,
    setDistanceKm,

    rideStatus,
    offers,
    selectedOffer,
    lastRide,
    passengerHistory,
    startSearch,
    chooseOffer,
    advanceRide,
    cancelRide,
    rateRide,
    resetBooking,

    driverOnline,
    toggleOnline,
    incomingRequest,
    triggerIncoming,
    acceptIncoming,
    rejectIncoming,
    driverRidesToday,
    driverRevenue,
    driverCommission,
    driverNet,

    driverApproved,
    approveDriver,

    adminStats,
    zoneRules,
    updateZoneRule,
    adminDrivers,
    toggleDriverStatus,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
