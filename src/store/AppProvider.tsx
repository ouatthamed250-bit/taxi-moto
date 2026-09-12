import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppContext } from './context';
import type { AppContextValue } from './context';
import type {
  AdminStats,
  AppSettings,
  AuthResult,
  CourseStatus,
  DestinationLieu,
  DriverGift,
  DriverGiftInput,
  DriverProfile,
  DriverRegisterInput,
  GeoPosition,
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
import { ADMIN_STATS } from '../data/mock';
import { commissionOf, netEarnings } from '../theme';
import { getCurrentUser } from '../services/authLocal';
import {
  ensureCloudSession,
  isCloudEnabled,
  listDrivers,
  login as authLogin,
  logout as authLogout,
  onSessionChange,
  registerDriver as authRegisterDriver,
  registerPassenger as authRegisterPassenger,
  replaceUserCache,
  restoreSession,
} from '../services/authService';
import { currentFirebaseUid, onAuthChange } from '../services/firebase';
import {
  createGift,
  createRechargeRequest,
  createRide,
  subscribeToGifts,
  subscribeToRechargeRequests,
  subscribeToRides,
  subscribeToUsers,
  incrementDriverBalance,
  updateRechargeRequest,
  updateRide,
  updateUser,
} from '../services/firestore';
import {
  publishDriverPosition,
  publishOnlineStatus,
  publishPassengerPosition,
  publishRideRequest,
  publishRideStatus,
  removeRideRequest,
  subscribeToAllPositions,
  subscribeToOnlineDrivers,
  subscribeToRideRequests,
} from '../services/realtimeDb';
import type { LivePosition } from '../services/realtimeDb';
import { COURSE_STATUS_BY_RIDE, RIDE_STATUS_BY_COURSE } from '../data/courseStatus';
import { playAlertSound, unlockAudio } from '../services/notification';
import { INITIAL_DRIVER_BALANCE } from '../services/wallet';
import { readAppSettings, writeAppSettings } from '../services/settingsLocal';
import { isAdminAuthenticated } from '../services/adminAuth';

/** Convertit une carte de positions RTDB en positions simples (sans horodatage). */
function toGeoMap(positions: Record<string, LivePosition>): Record<string, GeoPosition> {
  const result: Record<string, GeoPosition> = {};

  for (const [id, value] of Object.entries(positions)) {
    result[id] = { latitude: value.latitude, longitude: value.longitude };
  }

  return result;
}

/**
 * Ordre du suivi de course.
 */
const RIDE_ORDER: RideStatus[] = [
  'driver_found',
  'driver_arriving',
  'driver_arrived',
  'in_progress',
  'completed',
];

/** Intervalle de répétition du bip d'une demande en attente (ms). */
const ALERT_REPEAT_MS = 6000;

/** Statuts pour lesquels le conducteur a une course « en cours ». */
const DRIVER_ACTIVE_STATUSES: CourseStatus[] = ['accepted', 'arrived', 'in_progress'];

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
  /** Session admin active (sessionStorage) → rôle restauré au rechargement. */
  const [adminSession] = useState(() => isAdminAuthenticated());

  /* ---- Paramètres applicatifs (localStorage) ---- */
  const [appSettings, setAppSettings] = useState<AppSettings>(() => readAppSettings());

  /* ---- Session ---- */
  const [role, setRole] = useState<Role>(
    restoredUser?.role ?? (adminSession ? 'admin' : 'guest'),
  );
  const [userName, setUserName] = useState(
    restoredUser?.name ?? (adminSession ? 'Administrateur' : ''),
  );
  const [phone, setPhone] = useState(restoredUser?.phone ?? '');
  const [currentUser, setCurrentUser] = useState<User | null>(restoredUser);

  /* ---- Réservation ---- */
  const [passengers, setPassengers] = useState(1);
  const [vehicle, setVehicle] = useState<VehicleType | null>(restoredUser?.vehicle ?? null);
  const [pickup, setPickup] = useState('Ma position actuelle');
  const [destination, setDestination] = useState('');
  /** Slug du quartier choisi dans la base (vide si saisie libre / hors zone). */
  const [destinationId, setDestinationId] = useState('');
  /** Secteur du quartier choisi (vide si saisie libre). */
  const [destinationSecteur, setDestinationSecteur] = useState('');
  /** true = destination hors base de quartiers (saisie libre du client). */
  const [destinationLibre, setDestinationLibre] = useState(false);
  const [distanceKm, setDistanceKm] = useState(0);

  /* ---- Course ---- */
  const [rideStatus, setRideStatus] = useState<RideStatus>('idle');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [lastRide, setLastRide] = useState<Ride | null>(null);
  const [passengerHistory, setPassengerHistory] = useState<Ride[]>([]);
  /** Course partagée en cours (conducteur : celle qu'il conduit). */
  const [activeRide, setActiveRide] = useState<Ride | null>(null);

  /* ---- Conducteur ---- */
  const [driverOnline, setDriverOnline] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState<RideRequest | null>(null);
  const [driverRidesToday, setDriverRidesToday] = useState<Ride[]>([]);
  const [driverApproved, setDriverApproved] = useState(false);
  const [driverBalance, setDriverBalanceState] = useState(INITIAL_DRIVER_BALANCE);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);
  const [driverGifts, setDriverGifts] = useState<DriverGift[]>([]);

  /* ---- Admin ---- */
  const [adminStats, setAdminStats] = useState<AdminStats>(ADMIN_STATS);
  const [zoneRules, setZoneRules] = useState<ZonePriceRule[]>([]);
  const [adminDrivers, setAdminDrivers] = useState<DriverProfile[]>([]);

  /* ---- Géolocalisation ---- */
  const [passengerPosition, setPassengerPositionState] = useState<GeoPosition | null>(null);
  /** Position du conducteur restaurée depuis localStorage (partage prototype). */
  const [driverPosition, setDriverPositionState] = useState<GeoPosition | null>(() => {
    try {
      const raw = window.localStorage.getItem('taxi-moto:driver-position');
      return raw ? (JSON.parse(raw) as GeoPosition) : null;
    } catch {
      return null;
    }
  });

  /* ---- Temps réel (Firebase) ---- */
  const [liveDriverPositions, setLiveDriverPositions] = useState<
    Record<string, GeoPosition>
  >({});
  const [livePassengerPositions, setLivePassengerPositions] = useState<
    Record<string, GeoPosition>
  >({});
  const [onlineDriverIds, setOnlineDriverIds] = useState<string[]>([]);
  /** Session Firebase (anonyme) ouverte ? Les abonnements en dépendent. */
  const [cloudReady, setCloudReady] = useState(false);
  /** Dernière demande vue → évite de rejouer le son d'alerte en boucle. */
  const lastRequestId = useRef('');
  /** Demande déjà traitée (acceptée/refusée) → ne plus alerter. */
  const dismissedRequestId = useRef('');
  /** Minuterie du bip répété (demande en attente de réponse). */
  const alertTimerRef = useRef<number | null>(null);
  /** Id de la course active (suivi partagé client/conducteur). */
  const activeRideIdRef = useRef('');
  /** Statut courant, lu par les abonnements sans re-souscription. */
  const rideStatusRef = useRef<RideStatus>('idle');
  /** Demande publiée par le client (retirée à l'annulation). */
  const activeRequestId = useRef('');
  /** uids en ligne (lu par d'autres abonnements sans re-souscription). */
  const onlineIdsRef = useRef<string[]>([]);
  /**
   * Identifiant TEMPS RÉEL = uid Firebase (`auth.uid`).
   * Les règles RTDB imposent `auth.uid === $uid` pour écrire une position ou
   * un statut en ligne : on n'utilise donc PAS l'id du compte Firestore (qui
   * peut dater d'un autre appareil), sauf en mode local (pas de session).
   */
  const liveUserId = currentFirebaseUid() ?? currentUser?.id ?? '';
  /** Id du document Firestore du compte (filtres, écritures `users/{id}`). */
  const accountId = currentUser?.id ?? '';
  /** Le compte connecté est-il un conducteur ? (réception des demandes) */
  const isDriverAccount = currentUser?.role === 'driver';

  /** Arrête le bip répété d'une demande entrante. */
  const stopIncomingAlert = useCallback(() => {
    if (alertTimerRef.current !== null) {
      window.clearInterval(alertTimerRef.current);
      alertTimerRef.current = null;
    }
  }, []);

  /* Mémorise le statut courant pour les abonnements temps réel. */
  useEffect(() => {
    rideStatusRef.current = rideStatus;
  }, [rideStatus]);

  /**
   * Met à jour le STATUT PARTAGÉ d'une course :
   *   1. Firestore `rides/{id}.status` → source de vérité, écoutée par le client
   *      via `onSnapshot` (temps réel) ;
   *   2. Realtime Database `/rideStatus/{id}` → canal live complémentaire ;
   *   3. état local → retour visuel immédiat.
   */
  const updateRideStatus = useCallback(
    async (rideId: string, status: CourseStatus): Promise<void> => {
      if (!rideId) return;

      await updateRide(rideId, { status });
      void publishRideStatus(rideId, status);

      setActiveRide((ride) => (ride && ride.id === rideId ? { ...ride, status } : ride));

      // Le statut d'affichage ne concerne que le client.
      if (!isDriverAccount) setRideStatus(RIDE_STATUS_BY_COURSE[status]);
    },
    [isDriverAccount],
  );

  /**
   * Course attribuée par un conducteur (Firestore, statut « accepted ») :
   * le CLIENT passe en « Chauffeur en route » avec le suivi de la position.
   * On n'applique la transition que si une commande est en cours.
   */
  const applyAcceptedRide = useCallback((ride: Ride) => {
    const status = rideStatusRef.current;
    if (status !== 'searching' && status !== 'offers') return;
    if (activeRideIdRef.current === ride.id) return;

    activeRideIdRef.current = ride.id;
    setActiveRide(ride);

    setSelectedOffer({
      id: ride.id,
      price: ride.price,
      driver: {
        id: ride.driverId ?? '',
        name: ride.driverName || 'Conducteur',
        rating: 0,
        rides: 0,
        vehicle: ride.vehicle,
        plate: ride.driverPlate ?? '—',
        model: ride.vehicle === 'tricycle' ? 'Tricycle' : 'Moto',
        online: true,
        zone: 'Zone couverte',
        availableSeats: 1,
        phone: ride.driverPhone,
      },
    });
    setRideStatus('driver_found');
  }, []);
  /* ---- Solde virtuel conducteur (persisté dans Firestore) ---- */
  /** Écrit le nouveau solde en base (sans bloquer l'interface). */
  const persistDriverBalance = useCallback(
    (next: number) => {
      if (!isCloudEnabled() || !accountId) return;
      void updateUser(accountId, { driverBalance: next });
    },
    [accountId],
  );

  /** Fixe le solde (jamais négatif). */
  const setDriverBalance = useCallback(
    (amount: number) => {
      const next = Math.max(0, Math.round(amount));
      setDriverBalanceState(next);
      persistDriverBalance(next);
    },
    [persistDriverBalance],
  );

  /** Crédite le solde (recharge, cadeau). */
  const creditDriverBalance = useCallback(
    (amount: number) => {
      const value = Math.max(0, Math.round(amount));
      setDriverBalanceState((current) => {
        const next = current + value;
        persistDriverBalance(next);
        return next;
      });
    },
    [persistDriverBalance],
  );

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
      setDriverBalanceState((current) => {
        const next = Math.max(0, current - debit);
        persistDriverBalance(next);
        return next;
      });
    },
    [driverBalance, persistDriverBalance],
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

      // Persistance cloud (Firestore) — sans bloquer l'interface.
      void createRechargeRequest(entry);
    },
    [],
  );

  /** Valide ou rejette une demande ; crédite le solde du CONDUCTEUR concerné. */
  const validateRechargeRequest = useCallback(
    (id: string, approved: boolean) => {
      if (approved) {
        const request = rechargeRequests.find((item) => item.id === id);

        if (request && request.status === 'pending') {
          // Le solde appartient au conducteur ciblé (`request.driverId` =
          // docId Firestore) → incrément atomique côté serveur.
          void incrementDriverBalance(request.driverId, request.amount);

          // Retour visuel immédiat uniquement si c'est NOTRE solde.
          if (request.driverId === accountId) creditDriverBalance(request.amount);
        }
      }

      setRechargeRequests((list) =>
        list.map((request) =>
          request.id === id
            ? { ...request, status: approved ? 'approved' : 'rejected' }
            : request,
        ),
      );

      // Synchronisation cloud du statut de la demande.
      void updateRechargeRequest(id, {
        status: approved ? 'approved' : 'rejected',
      });
    },
    [rechargeRequests, creditDriverBalance, accountId],
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

      /*
       * Crédit du CONDUCTEUR concerné (et non du compte connecté : l'admin
       * n'est pas le bénéficiaire !). `driverId` = docId Firestore du
       * conducteur → la même clé partout (recharges, cadeaux, courses).
       */
      if (isCloudEnabled() && gift.driverId) {
        void incrementDriverBalance(gift.driverId, value);
      }

      // Retour visuel immédiat uniquement si le cadeau nous est destiné.
      if (!isCloudEnabled() && gift.driverId === accountId) {
        creditDriverBalance(value);
      }

      // Persistance cloud du cadeau (Firestore).
      void createGift(entry);
    },
    [userName, creditDriverBalance, accountId],
  );

  /** Applique un compte connecté à l'état de session. */
  const applyUser = useCallback((user: User) => {
    setCurrentUser(user);
    setRole(user.role);
    setUserName(user.name);
    setPhone(user.phone);
    if (user.role === 'driver' && user.vehicle) setVehicle(user.vehicle);

    // Solde conducteur : valeur persistée dans Firestore (200 FCFA à la création).
    if (user.role === 'driver') {
      setDriverBalanceState(
        typeof user.driverBalance === 'number'
          ? user.driverBalance
          : INITIAL_DRIVER_BALANCE,
      );
    }
  }, []);

  const login = useCallback(
    async (digits: string, secret: string): Promise<AuthResult> => {
      const result = await authLogin(digits, secret);
      if (result.success && result.user) applyUser(result.user);
      return result;
    },
    [applyUser],
  );

  const registerPassenger = useCallback(
    async (input: PassengerRegisterInput): Promise<AuthResult> => {
      const result = await authRegisterPassenger(input);
      if (result.success && result.user) applyUser(result.user);
      return result;
    },
    [applyUser],
  );

  const registerDriver = useCallback(
    async (input: DriverRegisterInput): Promise<AuthResult> => {
      const result = await authRegisterDriver(input);
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

  const logout = useCallback(async (): Promise<void> => {
    // Fin de session : on coupe d'abord la présence temps réel (le conducteur
    // ne doit pas rester « en ligne » sur la carte après déconnexion).
    if (isCloudEnabled() && liveUserId && currentUser?.role === 'driver') {
      await publishOnlineStatus(liveUserId, false);
    }

    await authLogout();
    setCurrentUser(null);
    setRole('guest');
    setUserName('');
    setPhone('');
  }, [liveUserId, currentUser]);

  /**
   * Lance la recherche d'un conducteur. Retourne `true` si au moins un
   * conducteur réel est disponible (inscrit et non bloqué).
   * ⚠️ Aucune offre fictive : le moteur d'offres réel arrivera avec Firebase.
   */
  const startSearch = useCallback((): boolean => {
    setOffers([]);
    setSelectedOffer(null);

    const available = listDrivers().some((driver) => !driver.blocked);
    setRideStatus(available ? 'searching' : 'idle');

    /*
     * Publication de la demande sur la Realtime Database : les conducteurs
     * en ligne la reçoivent instantanément (son d'alerte + carte).
     */
    if (available && isCloudEnabled() && liveUserId) {
      const requestId = `REQ-${Date.now().toString(36)}`;
      activeRequestId.current = requestId;

      void publishRideRequest({
        id: requestId,
        passengers,
        vehicle: vehicle ?? 'moto',
        pickup,
        destination,
        distanceKm,
        destinationLibre,
        destinationId,
        passengerId: liveUserId,
        passengerAccountId: accountId,
        passengerName: userName || 'Passager',
        passengerPhone: phone,
      });
    }

    return available;
  }, [
    passengers,
    vehicle,
    pickup,
    destination,
    distanceKm,
    destinationLibre,
    destinationId,
    liveUserId,
    accountId,
    userName,
    phone,
  ]);

  const chooseOffer = useCallback((offer: Offer) => {
    setSelectedOffer(offer);
    setRideStatus('driver_found');
  }, []);

  const advanceRide = useCallback(() => {
    const index = RIDE_ORDER.indexOf(rideStatus);
    if (index === -1 || index === RIDE_ORDER.length - 1) return;
    const next = RIDE_ORDER[index + 1];
    setRideStatus(next);

    // Statut PARTAGÉ : le client peut aussi faire avancer la course.
    const rideId = activeRideIdRef.current;
    if (rideId) void updateRideStatus(rideId, COURSE_STATUS_BY_RIDE[next]);

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
        passengerId: liveUserId,
        driverId: selectedOffer?.driver.id,
      };
      setLastRide(ride);
      setPassengerHistory((history) => [ride, ...history]);

      // Archivage cloud de la course terminée (Firestore).
      void createRide(ride);
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
    liveUserId,
    updateRideStatus,
  ]);

  const cancelRide = useCallback(() => {
    setRideStatus('cancelled');
    setOffers([]);
    setSelectedOffer(null);

    // Statut partagé : la course en cours est annulée.
    if (activeRideIdRef.current) {
      void updateRideStatus(activeRideIdRef.current, 'cancelled');
      activeRideIdRef.current = '';
    }
    setActiveRide(null);

    // Retire la demande de la Realtime Database (plus visible par les conducteurs).
    if (activeRequestId.current) {
      void removeRideRequest(activeRequestId.current);
      activeRequestId.current = '';
    }
  }, [updateRideStatus]);

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
    setDestinationId('');
    setDestinationSecteur('');
    setDestinationLibre(false);
    setDistanceKm(0);
    setVehicle(null);
    setPassengers(1);

    // Fin de course : plus de course active.
    activeRideIdRef.current = '';
    setActiveRide(null);

    // Retire la demande publiée (elle n'est plus d'actualité).
    if (activeRequestId.current) {
      void removeRideRequest(activeRequestId.current);
      activeRequestId.current = '';
    }
  }, []);

  /**
   * Bascule le statut en ligne du conducteur.
   * Publie l'état sur la Realtime Database (`/online/drivers/{uid}`) et débloque
   * l'audio (obligatoire sur mobile pour le son d'alerte des nouvelles courses).
   */
  const toggleOnline = useCallback(() => {
    const next = !driverOnline;
    setDriverOnline(next);
    unlockAudio();

    if (isCloudEnabled() && liveUserId) {
      void publishOnlineStatus(liveUserId, next);
    }
  }, [driverOnline, liveUserId]);

  /**
   * Sélectionne une destination complète.
   * `id` → slug du quartier de la base (source de vérité de la couverture).
   * `libre: true` → lieu hors base (tapé par le client) : accepté quand même,
   * le chauffeur pourra contacter le client pour confirmer.
   */
  const setDestinationLieu = useCallback((lieu: DestinationLieu) => {
    setDestination(lieu.nom);
    setDestinationId(lieu.id ?? '');
    setDestinationSecteur(lieu.secteur ?? '');
    setDestinationLibre(Boolean(lieu.libre));
  }, []);

  /** Refuse la demande : le bip s'arrête et la demande ne revient plus. */
  const rejectIncoming = useCallback(() => {
    const requestId = incomingRequest?.id ?? '';
    dismissedRequestId.current = requestId;
    lastRequestId.current = requestId;
    stopIncomingAlert();
    setIncomingRequest(null);
  }, [incomingRequest, stopIncomingAlert]);

  const acceptIncoming = useCallback(
    (fare: number): boolean => {
      const request = incomingRequest;
      if (!request) return false;

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
        passengerName: request.passengerName ?? 'Passager Taxi-Moto',
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
        passengerId: request.passengerId,
        driverId: liveUserId || phone,
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

      /*
       * Publication de l'ACCEPTATION dans Firestore : le client suit les
       * courses qui lui sont attribuées (statut « driver_found ») et passe
       * ainsi en « Chauffeur en route ».
       *
       * ⚠️ Le retrait de la demande RTDB est réservé au client (les règles
       *    n'autorisent que `data.child('passengerId').val() === auth.uid`) :
       *    on marque simplement la demande comme traitée de notre côté.
       */
      const acceptedRide: Ride = {
        id: ride.id,
        passengerName: request.passengerName ?? 'Passager',
        driverName: userName || 'Conducteur',
        driverPhone: phone,
        driverPlate: currentUser?.plate,
        vehicle: request.vehicle,
        pickup: request.pickup,
        destination: request.destination,
        destinationId: request.destinationId,
        distanceKm: request.distanceKm,
        price: fare,
        commission,
        // Statut PARTAGÉ initial : le client passe en « Chauffeur en route ».
        status: 'accepted',
        date: ride.date,
        time: ride.time,
        passengerId: request.passengerAccountId ?? request.passengerId,
        passengerUid: request.passengerId,
        passengerPhone: request.passengerPhone,
        driverId: accountId || liveUserId,
      };

      void createRide(acceptedRide);
      void publishRideStatus(acceptedRide.id, 'accepted');

      // Le conducteur passe immédiatement à la vue « Course en cours ».
      setActiveRide(acceptedRide);

      // Fin du bip : la demande est traitée.
      dismissedRequestId.current = request.id;
      lastRequestId.current = request.id;
      stopIncomingAlert();
      setIncomingRequest(null);

      return true;
    },
    [
      incomingRequest,
      driverBalance,
      debitDriverBalance,
      liveUserId,
      accountId,
      userName,
      currentUser,
      phone,
      stopIncomingAlert,
    ],
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

  /* ---- Paramètres applicatifs ---- */
  /** Met à jour partiellement les paramètres (fusion + persistance localStorage). */
  const updateAppSettings = useCallback((partial: Partial<AppSettings>) => {
    setAppSettings((current) => {
      const next: AppSettings = {
        ...current,
        ...partial,
        depositNumbers: { ...current.depositNumbers, ...(partial.depositNumbers ?? {}) },
      };
      writeAppSettings(next);
      return next;
    });
  }, []);

  /** Recharge les paramètres depuis localStorage. */
  const loadAppSettings = useCallback((): AppSettings => {
    const loaded = readAppSettings();
    setAppSettings(loaded);
    return loaded;
  }, []);

  /* ---- Géolocalisation ---- */
  const setPassengerPosition = useCallback(
    (position: GeoPosition | null) => {
      setPassengerPositionState(position);

      // Publication temps réel (le conducteur/ l'admin voit le client bouger).
      if (position && isCloudEnabled() && liveUserId) {
        void publishPassengerPosition(liveUserId, position);
      }
    },
    [liveUserId],
  );

  /**
   * Position du conducteur : mémoire + publication Realtime Database
   * (partagée en direct avec les clients et l'admin). Le miroir localStorage
   * n'est utilisé qu'en mode local (Firebase non configuré).
   */
  const setDriverPosition = useCallback(
    (position: GeoPosition | null) => {
      setDriverPositionState(position);

      if (isCloudEnabled()) {
        // On ne partage la position que lorsque le conducteur est en ligne.
        if (position && liveUserId && driverOnline) {
          void publishDriverPosition(liveUserId, position);
        }
        return;
      }

      try {
        if (position) {
          window.localStorage.setItem('taxi-moto:driver-position', JSON.stringify(position));
        } else {
          window.localStorage.removeItem('taxi-moto:driver-position');
        }
      } catch {
        // Navigation privée / quota : on ignore.
      }
    },
    [liveUserId, driverOnline],
  );

  /* ================================================================
   *  TEMPS RÉEL — Firebase Firestore (données) + Realtime DB (positions)
   * ================================================================ */

  /**
   * Ouvre la session Firebase (anonyme) AVANT de brancher les abonnements :
   * sans session, Firestore/RTDB répondent PERMISSION_DENIED et un abonnement
   * en erreur ne se réessaie pas tout seul.
   */
  useEffect(() => {
    if (!isCloudEnabled()) return undefined;

    let active = true;
    const sync = () => {
      if (active) setCloudReady(currentFirebaseUid() !== null);
    };

    void ensureCloudSession().then(sync);
    const unsubscribe = onAuthChange(() => sync());

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  /** Restaure la session Firebase puis suit les changements de session. */
  useEffect(() => {
    if (!isCloudEnabled()) return undefined;

    return onSessionChange((user) => {
      if (user) applyUser(user);
    });
  }, [applyUser]);

  /** Session prête → on recharge le compte le plus à jour depuis Firestore. */
  useEffect(() => {
    if (!isCloudEnabled() || !cloudReady) return undefined;

    void restoreSession().then((user) => {
      if (user) applyUser(user);
    });

    return undefined;
  }, [cloudReady, applyUser]);

  /** Comptes Firestore → cache local (listes admin, contacts) + état admin. */
  useEffect(() => {
    if (!isCloudEnabled() || !cloudReady) return undefined;

    return subscribeToUsers((users) => {
      replaceUserCache(users);

      /*
       * Solde du conducteur connecté : le crédit (recharge validée ou cadeau)
       * est écrit par l'ADMIN dans `users/{id}.driverBalance` → on le reflète
       * en temps réel, sans réécrire (pas de boucle d'écriture).
       */
      const me = accountId ? users.find((user) => user.id === accountId) : undefined;

      if (me && typeof me.driverBalance === 'number') {
        const remoteBalance = me.driverBalance;
        setDriverBalanceState((current) =>
          current === remoteBalance ? current : remoteBalance,
        );
      }

      setAdminDrivers(
        users
          .filter((user) => user.role === 'driver')
          .map((user) => ({
            id: user.id,
            name: user.name,
            rating: 0,
            rides: 0,
            vehicle: user.vehicle ?? 'moto',
            plate: user.plate ?? '—',
            model: user.vehicle === 'tricycle' ? 'Tricycle' : 'Moto',
            online: onlineIdsRef.current.includes(user.id),
            zone: 'Zone couverte',
            availableSeats: user.vehicle === 'tricycle' ? 3 : 1,
            phone: user.phone,
          })),
      );
    });
  }, [cloudReady, accountId]);

  /** Positions live (conducteurs + clients) publiées sur la Realtime Database. */
  useEffect(() => {
    if (!isCloudEnabled() || !cloudReady) return undefined;

    return subscribeToAllPositions((positions) => {
      setLiveDriverPositions(toGeoMap(positions.drivers));
      setLivePassengerPositions(toGeoMap(positions.passengers));
    });
  }, [cloudReady]);

  /** Conducteurs en ligne/hors ligne (Realtime Database). */
  useEffect(() => {
    if (!isCloudEnabled() || !cloudReady) return undefined;

    return subscribeToOnlineDrivers((drivers) => {
      const ids = Object.entries(drivers)
        .filter(([, isOnline]) => isOnline)
        .map(([id]) => id);

      onlineIdsRef.current = ids;
      setOnlineDriverIds(ids);
    });
  }, [cloudReady]);

/**
 * Demandes de course entrantes — CÔTÉ CONDUCTEUR uniquement.
 *
 *   • le client ne s'alerte jamais lui-même (demandes par d'autres ignorées) ;
 *   • le SON D'ALERTE SE RÉPÈTE toutes les `ALERT_REPEAT_MS` tant que la
 *     demande n'est ni acceptée ni refusée ;
 *   • une demande déjà traitée (acceptée/refusée) ne re-déclenche plus le bip.
 */
useEffect(() => {
  if (!isCloudEnabled() || !cloudReady) return undefined;

  const unsubscribe = subscribeToRideRequests((requests) => {
    if (!isDriverAccount) return;

    const pending =
      requests.find(
        (request) =>
          request.passengerId !== liveUserId &&
          request.id !== dismissedRequestId.current,
      ) ?? null;

    if (!pending) {
      lastRequestId.current = '';
      stopIncomingAlert();
      setIncomingRequest(null);
      return;
    }

    setIncomingRequest(pending);

    if (pending.id === lastRequestId.current) return;

    lastRequestId.current = pending.id;
    playAlertSound();

    // Bip répété : le conducteur doit l'entendre jusqu'à sa réponse.
    stopIncomingAlert();
    alertTimerRef.current = window.setInterval(playAlertSound, ALERT_REPEAT_MS);
  });

  return () => {
    stopIncomingAlert();
    unsubscribe();
  };
}, [cloudReady, isDriverAccount, liveUserId, stopIncomingAlert]);

  /** Recharges, cadeaux et historique client : synchronisation Firestore. */
  useEffect(() => {
    if (!isCloudEnabled() || !cloudReady) return undefined;

    const unsubscribeRecharges = subscribeToRechargeRequests((requests) => {
      setRechargeRequests([...requests].sort((a, b) => b.createdAt - a.createdAt));
    });

    const unsubscribeGifts = subscribeToGifts((gifts) => {
      setDriverGifts([...gifts].sort((a, b) => b.createdAt - a.createdAt));
    });

    /*
     * Le CLIENT suit les courses qui lui sont attribuées ; le CONDUCTEUR suit
     * la course qu'il est en train de faire. Dans les deux cas le statut vient
     * de Firestore → synchronisation temps réel via `onSnapshot`.
     */
    const unsubscribeRides = subscribeToRides(
      (rides) => {
        if (isDriverAccount) {
          const mine =
            rides.find((ride) => DRIVER_ACTIVE_STATUSES.includes(ride.status)) ?? null;
          setActiveRide(mine);
          return;
        }

        setPassengerHistory(rides);

        // 1) Course déjà suivie → on applique le statut partagé (Firestore).
        const current = activeRideIdRef.current
          ? rides.find((ride) => ride.id === activeRideIdRef.current)
          : undefined;

        if (current) {
          setActiveRide(current);
          const nextStatus = RIDE_STATUS_BY_COURSE[current.status];
          setRideStatus((status) => (status === nextStatus ? status : nextStatus));
          return;
        }

        // 2) Un conducteur vient d'accepter → bascule en suivi de course.
        const accepted = rides.find((ride) => ride.status === 'accepted');
        if (accepted) applyAcceptedRide(accepted);
      },
      accountId
        ? { field: isDriverAccount ? 'driverId' : 'passengerId', value: accountId }
        : undefined,
    );

    return () => {
      unsubscribeRecharges();
      unsubscribeGifts();
      unsubscribeRides();
    };
  }, [cloudReady, accountId, applyAcceptedRide, isDriverAccount]);

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
    accountId,
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
    destinationId,
    destinationSecteur,
    destinationLibre,
    setDestinationLieu,
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

    activeRide,
    updateRideStatus,

    driverOnline,
    toggleOnline,
    incomingRequest,
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

    appSettings,
    updateAppSettings,
    loadAppSettings,

    passengerPosition,
    driverPosition,
    setPassengerPosition,
    setDriverPosition,

    cloudEnabled: isCloudEnabled(),
    liveDriverPositions,
    livePassengerPositions,
    onlineDriverIds,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
