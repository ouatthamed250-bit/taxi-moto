import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppContext } from './context';
import type { AppContextValue } from './context';
import type {
  AdminStats,
  AuthResult,
  DriverGift,
  DriverGiftInput,
  DriverProfile,
  DriverRegisterInput,
  Offer,
  PassengerRegisterInput,
  RechargeRequest,
  Ride,
  RideRequest,
  RideStatus,
  Role,
  User,
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
import {
  getCurrentUser,
  login as authLogin,
  logout as authLogout,
  registerDriver as authRegisterDriver,
  registerPassenger as authRegisterPassenger,
} from '../services/authLocal';

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

/**
 * Solde virtuel initial du conducteur (FCFA).
 * 5 000 FCFA permet de tester plusieurs courses (commission 10 %).
 */
const INITIAL_DRIVER_BALANCE = 5000;

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
  /**
   * Session restaurée depuis localStorage AVANT le premier rendu
   * (initialiseur paresseux → aucun setState dans un effet).
   */
  const [restoredUser] = useState(() => getCurrentUser());

  /* ---- Session ---- */
  const [role, setRole] = useState<Role>(restoredUser?.role ?? 'guest');
  const [userName, setUserName] = useState(restoredUser?.name ?? '');
  const [phone, setPhone] = useState(restoredUser?.phone ?? '');
  const [currentUser, setCurrentUser] = useState<User | null>(restoredUser);

  /* ---- Réservation ---- */
  const [passengers, setPassengers] = useState(1);
  const [vehicle, setVehicle] = useState<VehicleType | null>(restoredUser?.vehicle ?? null);
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
  const [driverBalance, setDriverBalanceState] = useState(INITIAL_DRIVER_BALANCE);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);
  const [driverGifts, setDriverGifts] = useState<DriverGift[]>([]);

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

  /* ---- Solde virtuel conducteur ---- */
  /** Fixe le solde (jamais négatif). */
  const setDriverBalance = useCallback((amount: number) => {
    setDriverBalanceState(Math.max(0, Math.round(amount)));
  }, []);

  /** Crédite le solde (recharge — branchement mobile money à venir). */
  const creditDriverBalance = useCallback((amount: number) => {
    setDriverBalanceState((current) => current + Math.max(0, Math.round(amount)));
  }, []);

  /** Débite le solde ; refusé + warning si insuffisant. */
  const debitDriverBalance = useCallback(
    (amount: number) => {
      const debit = Math.max(0, Math.round(amount));
      if (driverBalance < debit) {
        console.warn(
          `[solde conducteur] Débit refusé : solde ${driverBalance} FCFA < montant ${debit} FCFA.`,
        );
        return;
      }
      setDriverBalanceState((current) => Math.max(0, current - debit));
    },
    [driverBalance],
  );

  /* ---- Recharges mobile money ---- */
  /** Enregistre une demande de recharge (statut initial : « pending »). */
  const submitRechargeRequest = useCallback(
    (request: Omit<RechargeRequest, 'id' | 'status' | 'createdAt'>) => {
      const entry: RechargeRequest = {
        ...request,
        id: `RC-${Math.floor(100000 + Math.random() * 899999)}`,
        status: 'pending',
        createdAt: Date.now(),
      };
      setRechargeRequests((list) => [entry, ...list]);
    },
    [],
  );

  /** Valide ou rejette une demande ; crédite le solde si approuvée. */
  const validateRechargeRequest = useCallback(
    (id: string, approved: boolean) => {
      if (approved) {
        const request = rechargeRequests.find((item) => item.id === id);
        if (request && request.status === 'pending') {
          creditDriverBalance(request.amount);
        }
      }
      setRechargeRequests((list) =>
        list.map((request) =>
          request.id === id
            ? { ...request, status: approved ? 'approved' : 'rejected' }
            : request,
        ),
      );
    },
    [rechargeRequests, creditDriverBalance],
  );

  /* ---- Cadeaux de recharge ---- */
  /** Ajoute un cadeau de recharge (offert par l'admin) et crédite le solde. */
  const addDriverGift = useCallback(
    (gift: DriverGiftInput) => {
      const value = Math.max(0, Math.round(gift.amount));
      if (value <= 0) return;

      const entry: DriverGift = {
        id: `GF-${Math.floor(100000 + Math.random() * 899999)}`,
        driverId: gift.driverId,
        driverName: gift.driverName || userName || 'Conducteur',
        amount: value,
        message: gift.message?.trim() || undefined,
        createdAt: Date.now(),
      };
      setDriverGifts((list) => [entry, ...list]);
      creditDriverBalance(value);
    },
    [userName, creditDriverBalance],
  );

  /** Applique un compte connecté à l'état de session. */
  const applyUser = useCallback((user: User) => {
    setCurrentUser(user);
    setRole(user.role);
    setUserName(user.name);
    setPhone(user.phone);
    if (user.role === 'driver' && user.vehicle) setVehicle(user.vehicle);
  }, []);

  const login = useCallback(
    (digits: string, secret: string): AuthResult => {
      const result = authLogin(digits, secret);
      if (result.success && result.user) applyUser(result.user);
      return result;
    },
    [applyUser],
  );

  const registerPassenger = useCallback(
    (input: PassengerRegisterInput): AuthResult => {
      const result = authRegisterPassenger(input);
      if (result.success && result.user) applyUser(result.user);
      return result;
    },
    [applyUser],
  );

  const registerDriver = useCallback(
    (input: DriverRegisterInput): AuthResult => {
      const result = authRegisterDriver(input);
      if (result.success && result.user) applyUser(result.user);
      return result;
    },
    [applyUser],
  );

  const loginAsAdmin = useCallback(() => {
    setCurrentUser(null);
    setRole('admin');
    setUserName('Administrateur');
    setPhone('');
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setCurrentUser(null);
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

      // La commission (10 %) est débitée automatiquement du solde conducteur.
      debitDriverBalance(commissionOf(price));
    }
  }, [
    rideStatus,
    selectedOffer,
    userName,
    pickup,
    destination,
    distanceKm,
    vehicle,
    debitDriverBalance,
  ]);

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

  const acceptIncoming = useCallback(
    (fare: number): boolean => {
      const request = SAMPLE_REQUEST;
      const commission = commissionOf(fare);

      // Blocage : le solde doit couvrir la commission de la course.
      if (driverBalance < commission) {
        console.warn(
          `[solde conducteur] Acceptation refusée : solde ${driverBalance} FCFA < commission ${commission} FCFA.`,
        );
        return false;
      }

      const ride: Ride = {
        id: `C-${Math.floor(10000 + Math.random() * 89999)}`,
        passengerName: 'Passager Taxi-Moto',
        driverName: 'Vous',
        vehicle: request.vehicle,
        pickup: request.pickup,
        destination: request.destination,
        distanceKm: request.distanceKm,
        price: fare,
        commission,
        status: 'completed',
        date: nowDate(),
        time: nowTime(),
      };
      setDriverRidesToday((rides) => [ride, ...rides]);
      setAdminStats((stats) => ({
        ...stats,
        ridesCompleted: stats.ridesCompleted + 1,
        ridesToday: stats.ridesToday + 1,
        revenue: stats.revenue + commission,
      }));

      // La commission (10 %) est débitée du solde conducteur.
      debitDriverBalance(commission);
      setIncomingRequest(null);
      return true;
    },
    [driverBalance, debitDriverBalance],
  );

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
    currentUser,
    login,
    loginAsAdmin,
    registerPassenger,
    registerDriver,
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

    driverBalance,
    setDriverBalance,
    debitDriverBalance,
    creditDriverBalance,

    rechargeRequests,
    submitRechargeRequest,
    validateRechargeRequest,

    driverGifts,
    addDriverGift,

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
