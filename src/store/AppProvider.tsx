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
  LiveOffer,
  Negotiation,
  NegotiationMessage,
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
import { commissionOf, netEarnings, clampFare } from '../theme';
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
  listGifts,
  listRechargeRequests,
  saveNegotiation,
  subscribeToGifts,
  subscribeToRechargeRequests,
  subscribeToRides,
  subscribeToUsers,
  incrementDriverBalance,
  updateRechargeRequest,
  updateRide,
  updateUser,
} from '../services/firestore';
import type { WriteResult } from '../services/firestore';
import {
  publishDriverPosition,
  publishNegotiation,
  publishOffer,
  publishOfferStatus,
  publishOnlineStatus,
  publishPassengerPosition,
  publishRideRequest,
  publishRideStatus,
  removeOffer,
  removeRideRequest,
  subscribeToAllPositions,
  subscribeToOffers,
  subscribeToOnlineDrivers,
  subscribeToRideRequests,
} from '../services/realtimeDb';
import type { LivePosition } from '../services/realtimeDb';
import { COURSE_STATUS_BY_RIDE, RIDE_STATUS_BY_COURSE } from '../data/courseStatus';
import { mergeRideHistory, sortRidesDesc, todayStamp } from '../data/rides';
import {
  MAX_NEGOTIATION_ROUNDS,
  canDriverCounter,
  canPassengerAcceptOffer,
  canPassengerCounter,
  countRounds,
  isAwaitingDriverResponse,
  isTimedOut,
  lastAmount,
  toNegotiation,
} from '../data/negotiation';
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

  /* ---- Offres live & négociation (Realtime Database) ---- */
  const [liveOffers, setLiveOffers] = useState<LiveOffer[]>([]);
  /** Offre publiée par le conducteur pour la demande en cours. */
  const [myOffer, setMyOffer] = useState<LiveOffer | null>(null);
  /** Négociations en cours (client), indexées par identifiant d'offre. */
  const [negotiations, setNegotiations] = useState<Record<string, Negotiation>>({});
  /** Message d'information affiché au conducteur (offre acceptée / expirée). */
  const [offerNotice, setOfferNotice] = useState<string | null>(null);
  /** Offres déjà concrétisées en course (évite un doublon). */
  const finalizedOfferIds = useRef<string[]>([]);
  /** Dernière republication automatique (expiration) — anti-boucle. */
  const lastRepublishAt = useRef(0);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [lastRide, setLastRide] = useState<Ride | null>(null);
  const [passengerHistory, setPassengerHistory] = useState<Ride[]>([]);
  /** Course partagée en cours (conducteur : celle qu'il conduit). */
  const [activeRide, setActiveRide] = useState<Ride | null>(null);

  /* ---- Conducteur ---- */
  const [driverOnline, setDriverOnline] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState<RideRequest | null>(null);
  /**
   * HISTORIQUE conducteur : une course = un document Firestore = une entrée.
   * Alimenté par la complétion (côté conducteur) ET par la synchronisation
   * Firestore (filtre `driverId === accountId`), dédoublonné et trié.
   */
  const [driverRideHistory, setDriverRideHistory] = useState<Ride[]>([]);
  /** Courses du jour (`date` = aujourd'hui) — KPI « gains du jour ». */
  const driverRidesToday = useMemo(
    () => driverRideHistory.filter((ride) => ride.date === todayStamp()),
    [driverRideHistory],
  );
  const [driverApproved, setDriverApproved] = useState(false);
  const [driverBalance, setDriverBalanceState] = useState(INITIAL_DRIVER_BALANCE);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);
  const [driverGifts, setDriverGifts] = useState<DriverGift[]>([]);
  /** Message d'information CLIENT (refus du chauffeur, expiration…). */
  const [passengerNotice, setPassengerNotice] = useState('');
  /**
   * État de la synchronisation temps réel des recharges.
   * 'error' = l'admin ne reçoit RIEN de Firestore → affiché sur sa page.
   */
  const [rechargeSync, setRechargeSync] = useState<'idle' | 'live' | 'error'>('idle');
  /** Dernière erreur d'envoi de recharge (montrée au conducteur). */
  const [rechargeError, setRechargeError] = useState('');
  /** Dernière erreur d'envoi de cadeau (montrée à l'admin). */
  const [giftError, setGiftError] = useState('');

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
   * Demandes de course actuellement publiées (RTDB) — permet de retomber sur la
   * demande par son `requestId` même si l'état d'affichage `incomingRequest` a
   * été réinitialisé entre-temps (cause d'échecs d'acceptation en pleine négo).
   */
  const pendingRequestsRef = useRef<RideRequest[]>([]);
  /** Offres connues côté CLIENT → détecte le retrait d'un conducteur. */
  const knownOfferIds = useRef<string[]>([]);
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
   * Course attribuée par un conducteur (Firestore) : le CLIENT s'y ATTACHE et
   * suit le déroulé piloté par le conducteur (statuts + position live).
   *
   * ⚠️ On accepte aussi l'état « driver_found » : le client a verrouillé le prix
   * (il attend la course créée par le conducteur) et DOIT s'attacher dès que la
   * course existe — sinon son écran ne recevrait AUCUN changement de statut.
   */
  const applyAcceptedRide = useCallback((ride: Ride) => {
    const status = rideStatusRef.current;
    const attachable =
      status === 'searching' ||
      status === 'offers' ||
      status === 'driver_found' ||
      status === 'driver_arriving';

    if (!attachable) return;
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
    // Statut RÉEL de la course (le conducteur peut déjà l'avoir avancée).
    setRideStatus(RIDE_STATUS_BY_COURSE[ride.status] ?? 'driver_found');
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

  /**
   * CONDUCTEUR : clôture DÉFINITIVE de la course (« Terminer la course »).
   *
   * Archive la course (Firestore), débite la commission (10 %) du solde
   * conducteur et met à jour les statistiques admin. Le CLIENT reçoit tout via
   * Firestore (statut PUSHÉ + récapitulatif) — il ne déclenche JAMAIS l'étape.
   */
  const completeRide = useCallback(
    (rideId: string) => {
      const price = activeRide?.price ?? selectedOffer?.price ?? 0;
      const commission = activeRide?.commission ?? commissionOf(price);

      const finished: Ride = {
        id: rideId,
        passengerName: activeRide?.passengerName ?? 'Passager',
        passengerPhone: activeRide?.passengerPhone,
        passengerId: activeRide?.passengerId,
        passengerUid: activeRide?.passengerUid,
        driverName: activeRide?.driverName ?? (userName || 'Conducteur'),
        driverPhone: activeRide?.driverPhone ?? phone,
        driverPlate: activeRide?.driverPlate ?? currentUser?.plate,
        vehicle: activeRide?.vehicle ?? vehicle ?? 'moto',
        pickup: activeRide?.pickup ?? pickup,
        destination: activeRide?.destination ?? destination,
        distanceKm: activeRide?.distanceKm ?? distanceKm,
        price,
        commission,
        status: 'completed',
        date: activeRide?.date ?? nowDate(),
        time: activeRide?.time ?? nowTime(),
        driverId: activeRide?.driverId ?? accountId,
      };

      // Archivage cloud de la course terminée (docId = celui de la course).
      void createRide(finished);

      /*
       * Historique conducteur : on FUSIONNE (dédup par `id` + tri décroissant).
       * Le même document arrivera ensuite par la synchronisation Firestore :
       * la fusion garantit qu'il n'y a jamais de doublon affiché.
       */
      setDriverRideHistory((list) => mergeRideHistory(list, [finished]));
      debitDriverBalance(commission);

      setAdminStats((stats) => ({
        ...stats,
        ridesToday: stats.ridesToday + 1,
        ridesCompleted: stats.ridesCompleted + 1,
        ridesActive: Math.max(0, stats.ridesActive - 1),
        revenue: stats.revenue + commission,
      }));

      console.info(`[course] ${rideId} terminée — commission ${commission} F débitée.`);
    },
    [
      activeRide,
      selectedOffer,
      userName,
      phone,
      currentUser,
      vehicle,
      pickup,
      destination,
      distanceKm,
      accountId,
      debitDriverBalance,
    ],
  );

  /**
   * Met à jour une offre localement (retour visuel immédiat, avant l'écho
   * temps réel) : offre brute (`liveOffers`) ET négociation exposée à l'UI.
   */
  const updateOfferLocally = useCallback(
    (offerId: string, patch: Partial<LiveOffer>) => {
      setLiveOffers((list) =>
        list.map((item) => (item.id === offerId ? { ...item, ...patch } : item)),
      );

      const rounds = patch.rounds;
      if (rounds) {
        const status = patch.status ?? 'negotiating';
        setNegotiations((current) => ({
          ...current,
          [offerId]: toNegotiation(rounds, status),
        }));
      }
    },
    [],
  );

  /**
   * Met à jour le STATUT PARTAGÉ d'une course :
   *   1. Firestore `rides/{id}.status` → source de vérité, écoutée par le client
   *      via `onSnapshot` (temps réel) ;
   *   2. Realtime Database `/rideStatus/{id}` → canal live complémentaire ;
   *   3. état local → retour visuel immédiat.
   *
   * ⚠️ GARDE-FOU : seul le CONDUCTEUR pilote le déroulé de la course. Le client
   * ne peut QU'ANNULER (et uniquement avant le départ) — toutes les autres
   * transitions sont refusées côté client.
   */
  const updateRideStatus = useCallback(
    async (rideId: string, status: CourseStatus): Promise<void> => {
      if (!rideId) return;

      if (!isDriverAccount && status !== 'cancelled') {
        console.warn(
          `[course] statut « ${status} » refusé côté client : seul le conducteur pilote la course.`,
        );
        return;
      }

      await updateRide(rideId, { status });
      void publishRideStatus(rideId, status);

      setActiveRide((ride) => (ride && ride.id === rideId ? { ...ride, status } : ride));

      // Le statut d'affichage ne concerne que le client.
      if (!isDriverAccount) {
        setRideStatus(RIDE_STATUS_BY_COURSE[status]);
        return;
      }

      // « Terminer la course » → comptabilité + historique (côté conducteur).
      if (status === 'completed') completeRide(rideId);
    },
    [isDriverAccount, completeRide],
  );

  /* ---- Recharges mobile money ---- */
  /**
   * Enregistre une demande de recharge (statut initial : « pending »).
   *
   * ⚠️ L'écriture Firestore est ATTENDUE et son résultat est REMONTÉ : sinon la
   * demande partait « au feu » en silence (premier `permission-denied` le temps
   * que la session anonyme soit propagée) et l'ADMIN ne la voyait jamais.
   */
  const submitRechargeRequest = useCallback(
    async (
      request: Omit<RechargeRequest, 'id' | 'status' | 'createdAt'>,
    ): Promise<WriteResult> => {
      const entry: RechargeRequest = {
        ...request,
        id: `RC-${Math.floor(100000 + Math.random() * 899999)}`,
        status: 'pending',
        createdAt: Date.now(),
      };

      // Session Firebase AVANT toute écriture Firestore.
      await ensureCloudSession();

      const result = await createRechargeRequest(entry);

      if (result.ok) {
        console.info('[recharge] demande transmise à l’admin :', result.id);
        setRechargeRequests((list) => [entry, ...list]);
        setRechargeError('');
      } else {
        console.error('[recharge] envoi impossible :', result.error);
        setRechargeError(result.error ?? 'Envoi impossible.');
      }

      return result;
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
      void (async () => {
        await ensureCloudSession();
        const result = await updateRechargeRequest(id, {
          status: approved ? 'approved' : 'rejected',
        });

        if (result.ok) {
          console.info(`[recharge] statut ${approved ? 'validé' : 'rejeté'} pour ${id}.`);
          setRechargeError('');
        } else {
          console.error('[recharge] statut NON synchronisé :', result.error);
          setRechargeError(result.error ?? 'Synchronisation impossible.');
        }
      })();
    },
    [rechargeRequests, creditDriverBalance, accountId],
  );

  /* ---- Cadeaux de recharge ---- */
  /** Ajoute un cadeau de recharge (offert par l'admin) et crédite le solde. */
  const addDriverGift = useCallback(
    async (gift: DriverGiftInput): Promise<WriteResult> => {
      const value = Math.max(0, Math.round(gift.amount));
      if (value <= 0) {
        const invalid = { ok: false, id: '', error: 'Montant du cadeau invalide.' };
        setGiftError(invalid.error);
        return invalid;
      }

      const entry: DriverGift = {
        id: `GF-${Math.floor(100000 + Math.random() * 899999)}`,
        driverId: gift.driverId,
        driverName: gift.driverName || userName || 'Conducteur',
        amount: value,
        message: gift.message?.trim() || undefined,
        createdAt: Date.now(),
      };

      // Session Firebase AVANT toute écriture Firestore.
      await ensureCloudSession();

      /*
       * Crédit du CONDUCTEUR concerné (et non du compte connecté : l'admin
       * n'est pas le bénéficiaire !). `driverId` = docId Firestore du
       * conducteur → la même clé partout (recharges, cadeaux, courses).
       */
      if (isCloudEnabled() && gift.driverId) {
        await incrementDriverBalance(gift.driverId, value);
      }

      const result = await createGift(entry);

      if (result.ok) {
        setDriverGifts((list) => [entry, ...list]);
        setGiftError('');
      } else {
        console.error('[cadeau] envoi impossible :', result.error);
        setGiftError(result.error ?? 'Envoi du cadeau impossible.');
      }

      // Retour visuel immédiat uniquement si le cadeau nous est destiné.
      if (!isCloudEnabled() && gift.driverId === accountId) {
        creditDriverBalance(value);
      }

      return result;
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

  /**
   * Avance la course d'une étape.
   *
   * ⚠️ RÉSERVÉ AU CONDUCTEUR. Le client ne pilote JAMAIS le déroulé de la
   * course : il ne fait qu'OBSERVER le statut poussé par le conducteur
   * (Firestore `rides/{id}.status`). Tout appel côté passager est ignoré.
   */
  const advanceRide = useCallback(() => {
    if (!isDriverAccount) {
      console.warn('[course] advanceRide ignoré : étape réservée au conducteur.');
      return;
    }

    const index = RIDE_ORDER.indexOf(rideStatus);
    if (index === -1 || index === RIDE_ORDER.length - 1) return;

    const next = RIDE_ORDER[index + 1];
    setRideStatus(next);

    // Statut PARTAGÉ : le client le reçoit en temps réel via Firestore.
    const rideId = activeRideIdRef.current;
    if (rideId) void updateRideStatus(rideId, COURSE_STATUS_BY_RIDE[next]);
  }, [isDriverAccount, rideStatus, updateRideStatus]);

  const cancelRide = useCallback(() => {
    /*
     * Le CLIENT peut annuler — mais SEULEMENT avant le départ de la course
     * (une fois « en cours », seul le conducteur peut clôturer la course).
     */
    if (rideStatus === 'in_progress') {
      console.warn('[course] annulation impossible : la course est déjà en cours.');
      return;
    }

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
  }, [rideStatus, updateRideStatus]);

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

  const acceptIncoming = useCallback(
    (fare: number, explicitRequest?: RideRequest | null): boolean => {
      /*
       * La demande peut être fournie explicitement (acceptation d'une offre en
       * pleine négociation) : on ne dépend plus du seul état `incomingRequest`.
       */
      const request = explicitRequest ?? incomingRequest;
      if (!request) return false;

      const commission = commissionOf(fare);

      // Blocage : le solde doit couvrir la commission de la course.
      if (driverBalance < commission) {
        console.warn(
          `[solde conducteur] Acceptation refusée : solde ${driverBalance} FCFA < commission ${commission} FCFA.`,
        );
        return false;
      }

      /*
       * ⚠️ ACCEPTER n'est PAS TERMINER. On crée UNIQUEMENT le document de course
       * (statut « accepted »), mis à jour à chaque étape par le conducteur puis
       * clôturé par `completeRide()` (historique + commission + statistiques).
       *
       * Avant, on ajoutait ici une course fictive « completed » : elle créait un
       * DOUBLON dans l'historique (même `id` que la vraie course), mélangeait les
       * courses en cours et les terminées, et débitait la commission DEUX fois.
       */
      const rideId = `C-${Math.floor(10000 + Math.random() * 89999)}`;
      const date = nowDate();
      const time = nowTime();

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
        id: rideId,
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
        date,
        time,
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
    // On mémorise TOUTES les demandes publiées (résolution par `requestId`).
    pendingRequestsRef.current = requests;

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

/* ================================================================
 *  OFFRES DE PRIX & NÉGOCIATION (client ↔ chauffeur, 3 tours max)
 * ================================================================ */

/** Offre live (RTDB) → objet `Offer` du store, négociation comprise. */
const toStoreOffer = useCallback(
  (offer: LiveOffer): Offer => ({
    id: offer.id,
    requestId: offer.requestId,
    price: offer.price,
    negotiation: toNegotiation(offer.rounds ?? [], offer.status),
    driver: {
      id: offer.driverAccountId || offer.driverId,
      name: offer.driverName,
      rating: 0,
      rides: 0,
      vehicle: offer.vehicle,
      plate: offer.driverPlate ?? '—',
      model: offer.vehicle === 'tricycle' ? 'Tricycle' : 'Moto',
      online: true,
      zone: 'Zone couverte',
      availableSeats: 1,
      phone: offer.driverPhone,
    },
  }),
  [],
);

/** Enregistre la négociation dans Firestore (historique consultable). */
const logNegotiation = useCallback((offer: LiveOffer) => {
  void saveNegotiation({
    offerId: offer.id,
    requestId: offer.requestId,
    driverAccountId: offer.driverAccountId,
    passengerAccountId: offer.passengerAccountId,
    price: offer.price,
    status: offer.status,
    rounds: offer.rounds ?? [],
  });
}, []);

/** Republie la demande auprès des autres conducteurs (offres tombées). */
const republishRequest = useCallback(() => {
  const now = Date.now();
  if (now - lastRepublishAt.current < 8000) return; // anti-boucle
  lastRepublishAt.current = now;

  if (activeRequestId.current) void removeRideRequest(activeRequestId.current);
  setOffers([]);
  startSearch();
}, [startSearch]);

/**
 * CONDUCTEUR : concrétise une offre acceptée en créant la course au prix
 * convenu (la commission est débitée comme pour une acceptation directe).
 */
const finalizeAcceptedOffer = useCallback(
  (offer: LiveOffer, amount: number) => {
    /*
     * La demande est résolue par son `requestId` parmi les demandes PUBLIÉES :
     * l'acceptation ne peut plus échouer parce que l'écran du conducteur avait
     * réinitialisé `incomingRequest` pendant la négociation.
     */
    const request =
      pendingRequestsRef.current.find((item) => item.id === offer.requestId) ??
      incomingRequest;

    // La demande du client doit encore être active pour créer la course.
    if (!request) {
      void publishOfferStatus(offer.id, 'rejected', { status: 'rejected' });
      setOfferNotice('La demande du client n’est plus disponible.');
      return;
    }

    const accepted = acceptIncoming(amount, request);

    if (!accepted) {
      /*
       * Solde insuffisant : l'offre est RETIRÉE (le client cherche un autre
       * conducteur) au lieu de rester bloquée en « accepted ».
       */
      void publishOfferStatus(offer.id, 'rejected', { status: 'rejected' });
      void removeOffer(offer.id);
      setMyOffer(null);
      setOfferNotice('Solde insuffisant pour accepter cette course.');
      return;
    }

    void publishOfferStatus(offer.id, 'accepted', {
      status: 'accepted',
      price: amount,
    });
    stopIncomingAlert();
    dismissedRequestId.current = offer.requestId;
    setOfferNotice(null);
  },
  [acceptIncoming, stopIncomingAlert, incomingRequest],
);

/** CONDUCTEUR : propose son prix pour la demande reçue. */
const proposePrice = useCallback(
  (price: number) => {
    const request = incomingRequest;
    if (!request) return;

    const amount = clampFare(price);
    const now = Date.now();

    const offer: LiveOffer = {
      id: `OF-${request.id}`,
      requestId: request.id,
      driverId: liveUserId,
      driverAccountId: accountId || liveUserId,
      driverName: userName || 'Conducteur',
      driverPhone: phone,
      driverPlate: currentUser?.plate,
      vehicle: request.vehicle,
      price: amount,
      status: 'pending',
      currentRound: 0,
      createdAt: now,
      updatedAt: now,
      passengerAccountId: request.passengerAccountId,
      rounds: [{ from: 'driver', amount, timestamp: now }],
    };

    setMyOffer(offer);
    setOfferNotice(null);
    void publishOffer(offer);
    logNegotiation(offer);
  },
  [incomingRequest, liveUserId, accountId, userName, phone, currentUser, logNegotiation],
);

/**
 * EXPIRATION d'une offre : plus de 60 s sans réponse, ou 3 tours sans accord.
 * Le conducteur est alors retiré et la course repart chez un autre.
 */
const expireOffer = useCallback(
  (offer: LiveOffer, reason: string) => {
    const rounds = offer.rounds ?? [];
    const expired: LiveOffer = {
      ...offer,
      price: lastAmount(rounds, offer.price),
      currentRound: countRounds(rounds),
      status: 'expired',
    };

    void publishOfferStatus(offer.id, 'expired', {
      status: 'expired',
      price: expired.price,
      currentRound: expired.currentRound,
    });
    logNegotiation(expired);

    setMyOffer((current) => (current?.id === offer.id ? null : current));

    if (isDriverAccount) {
      setOfferNotice(
        `Négociation terminée (${reason}) — la course a été proposée à un autre conducteur.`,
      );
      stopIncomingAlert();
      dismissedRequestId.current = offer.requestId;
    }
  },
  [isDriverAccount, logNegotiation, stopIncomingAlert],
);

/** CLIENT : envoie une contre-offre (consomme un tour, 3 maximum). */
const sendCounterOffer = useCallback(
  (offerId: string, amount: number) => {
    const offer = liveOffers.find((item) => item.id === offerId);
    if (!offer) return;

    const rounds = offer.rounds ?? [];

    /*
     * ⚠️ C'est au CHAUFFEUR de répondre : le client ne peut pas enchaîner deux
     * propositions (il doit attendre — boutons grisés dans l'interface).
     */
    if (isAwaitingDriverResponse(rounds)) {
      console.warn(
        '[négociation] contre-offre déjà envoyée : en attente de la réponse du chauffeur.',
      );
      return;
    }

    // 3 tours déjà consommés → limite atteinte (expiration conformément à la règle).
    if (!canPassengerCounter(rounds)) {
      setPassengerNotice(
        'Limite de 3 tours atteinte — acceptez le dernier prix proposé ou refusez.',
      );
      expireOffer(offer, '3 tours atteints sans accord');
      return;
    }

    const message: NegotiationMessage = {
      from: 'passenger',
      amount: clampFare(amount),
      timestamp: Date.now(),
    };
    const nextRounds = [...rounds, message];

    /*
     * Retour visuel IMMÉDIAT (avant l'écho temps réel) : le client voit sa
     * proposition et l'écran se met en attente — aucune course ne démarre.
     */
    updateOfferLocally(offerId, {
      price: message.amount,
      status: 'negotiating',
      currentRound: countRounds(nextRounds),
      rounds: nextRounds,
    });

    /*
     * On écrit UNIQUEMENT la proposition : `negotiating` (pas « accepted » !) →
     * aucune course ne démarre, le chauffeur doit répondre.
     */
    void publishNegotiation(offerId, message, nextRounds.length);
    void publishOfferStatus(offerId, 'negotiating', {
      status: 'negotiating',
      price: message.amount,
      currentRound: countRounds(nextRounds),
      rounds: nextRounds,
    });
    logNegotiation({
      ...offer,
      price: message.amount,
      status: 'negotiating',
      rounds: nextRounds,
    });
  },
  [liveOffers, expireOffer, logNegotiation, updateOfferLocally],
);

/** CONDUCTEUR : contre-propose après la contre-offre du client. */
const driverCounterOffer = useCallback(
  async (offerId: string, amount: number): Promise<boolean> => {
    const offer = liveOffers.find((item) => item.id === offerId) ?? myOffer;

    if (!offer) {
      console.warn('[driver] contre-proposition ignorée : offre introuvable.');
      setOfferNotice('Négociation terminée — la demande n’est plus disponible.');
      return false;
    }

    const rounds = offer.rounds ?? [];

    /*
     * ⚠️ Limite de tours : on REFUSE la contre-offre (bouton désactivé côté UI)
     * au lieu d'expirer TOUTE la négociation — le chauffeur peut encore
     * ACCEPTER le prix du client, ce qui était impossible avant.
     */
    if (!canDriverCounter(rounds)) {
      console.warn('[négociation] limite de 3 contre-offres chauffeur atteinte.');
      setOfferNotice('Limite de 3 tours atteinte — acceptez le prix du client ou refusez.');
      return false;
    }

    const message: NegotiationMessage = {
      from: 'driver',
      amount: clampFare(amount),
      timestamp: Date.now(),
    };
    const nextRounds = [...rounds, message];

    console.info(
      `[driver] contre-proposition ${message.amount} F (tour ${countRounds(nextRounds)}/${MAX_NEGOTIATION_ROUNDS})`,
    );

    // Retour visuel immédiat : le conducteur repasse « en attente du client ».
    updateOfferLocally(offerId, {
      price: message.amount,
      status: 'negotiating',
      currentRound: countRounds(nextRounds),
      rounds: nextRounds,
    });

    /*
     * Écriture RTDB : proposition (`negotiations/{id}/rounds/{n}`) + mise à jour
     * de l'offre. On ATTEND le résultat pour pouvoir le confirmer à l'UI.
     */
    const [negotiationOk, statusOk] = await Promise.all([
      publishNegotiation(offerId, message, nextRounds.length),
      publishOfferStatus(offerId, 'negotiating', {
        status: 'negotiating',
        price: message.amount,
        currentRound: countRounds(nextRounds),
        rounds: nextRounds,
      }),
    ]);

    logNegotiation({
      ...offer,
      price: message.amount,
      status: 'negotiating',
      rounds: nextRounds,
    });

    const ok = negotiationOk && statusOk;
    console.info(`[driver] résultat : ${ok ? 'OK' : 'ÉCHEC (écriture RTDB)'}`);

    setOfferNotice(ok ? null : 'Envoi impossible — vérifiez votre connexion.');

    return ok;
  },
  [liveOffers, myOffer, logNegotiation, updateOfferLocally, setOfferNotice],
);

/**
 * ACCEPTATION :
 *   • CLIENT → verrouille le prix et prévient le conducteur (c'est lui qui crée
 *     la course, comme pour une acceptation directe) ;
 *   • CONDUCTEUR → crée la course au prix convenu.
 */
const acceptOffer = useCallback(
  (offerId: string) => {
    const offer = liveOffers.find((item) => item.id === offerId) ?? myOffer;
    if (!offer) return;

    const rounds = offer.rounds ?? [];

    /*
     * ⚠️ GARDE-FOU : le CLIENT ne peut accepter QUE la proposition du CHAUFFEUR.
     * S'il vient de négocier, il doit ATTENDRE la réponse — sinon la course
     * démarrerait à SON prix sans l'accord du chauffeur (auto-acceptation).
     */
    if (!isDriverAccount && !canPassengerAcceptOffer(rounds)) {
      console.warn(
        '[négociation] acceptation refusée : en attente de la réponse du chauffeur.',
      );
      return;
    }

    const amount = lastAmount(rounds, offer.price);

    if (isDriverAccount) {
      finalizeAcceptedOffer({ ...offer, price: amount }, amount);
      return;
    }

    // Retour visuel immédiat côté client (le suivi s'active dès que le
    // conducteur a créé la course — Firestore temps réel).
    setSelectedOffer(toStoreOffer({ ...offer, price: amount, status: 'accepted' }));

    void publishOfferStatus(offerId, 'accepted', { status: 'accepted', price: amount });
    logNegotiation({ ...offer, price: amount, status: 'accepted' });
  },
  [liveOffers, myOffer, isDriverAccount, finalizeAcceptedOffer, toStoreOffer, logNegotiation],
);
/** REFUS : le conducteur est retiré de la course. */
const rejectOffer = useCallback(
  (offerId: string) => {
    const offer = liveOffers.find((item) => item.id === offerId) ?? myOffer;
    if (offer) logNegotiation({ ...offer, status: 'rejected' });

    /*
     * 1) Le statut « rejected » est publié PUIS l'offre est retirée de la RTDB :
     *    le CLIENT voit en temps réel que ce conducteur s'est retiré, et la
     *    demande reste publiée pour les AUTRES conducteurs.
     */
    void publishOfferStatus(offerId, 'rejected', { status: 'rejected' });
    void removeOffer(offerId);

    setOffers((list) => list.filter((item) => item.id !== offerId));
    setMyOffer((current) => (current?.id === offerId ? null : current));

    // 2) Côté CONDUCTEUR : la demande disparaît de sa vue (plus de bip).
    if (isDriverAccount && offer) {
      dismissedRequestId.current = offer.requestId;
      lastRequestId.current = offer.requestId;
      stopIncomingAlert();
      setIncomingRequest(null);
      setOfferNotice('Demande refusée — les autres conducteurs peuvent la prendre.');
    }
  },
  [liveOffers, myOffer, isDriverAccount, logNegotiation, stopIncomingAlert],
);

/**
 * CONDUCTEUR : refuse la demande entrante — y compris APRÈS avoir proposé un
 * prix (le bouton « Refuser » est présent dans les deux cartes).
 *
 * Avant, cette action se contentait de masquer la demande localement : AUCUNE
 * écriture RTDB → le client n'était jamais prévenu et son offre restait
 * « en attente » indéfiniment.
 *
 * ⚠️ Défini APRÈS `rejectOffer` (il l'utilise).
 */
const rejectIncoming = useCallback(() => {
  const requestId = incomingRequest?.id ?? '';
  const mine = myOffer;

  // 1) Retrait de l'offre publiée → le client est notifié en temps réel.
  if (mine) rejectOffer(mine.id);

  // 2) La demande disparaît de la vue de CE conducteur (plus de bip).
  const dismissed = requestId || mine?.requestId || '';
  if (dismissed) {
    dismissedRequestId.current = dismissed;
    lastRequestId.current = dismissed;
  }

  stopIncomingAlert();
  setIncomingRequest(null);
}, [incomingRequest, myOffer, rejectOffer, stopIncomingAlert]);

/**
 * Abonnements temps réel aux offres :
 *   • CLIENT     : les prix proposés pour sa demande → écran « Offres » ;
 *   • CONDUCTEUR : le suivi de son offre (acceptée → course ; expirée → autre).
 */
useEffect(() => {
  if (!isCloudEnabled() || !cloudReady) return undefined;

  return subscribeToOffers((list) => {
    setLiveOffers(list);

    if (isDriverAccount) {
      const mine =
        list.find(
          (offer) =>
            offer.driverAccountId === (accountId || liveUserId) &&
            offer.status !== 'expired' &&
            offer.status !== 'rejected',
        ) ?? null;

      setMyOffer((current) =>
        current && mine && current.id === mine.id ? { ...current, ...mine } : mine,
      );

      // Le client a accepté → le conducteur crée la course au prix convenu.
      if (mine?.status === 'accepted' && !finalizedOfferIds.current.includes(mine.id)) {
        finalizedOfferIds.current = [...finalizedOfferIds.current, mine.id];
        finalizeAcceptedOffer(mine, lastAmount(mine.rounds ?? [], mine.price));
      }
      return;
    }

    /* ---- CÔTÉ CLIENT ---- */
    const relevant = list.filter(
      (offer) =>
        offer.status !== 'rejected' &&
        offer.status !== 'expired' &&
        (!activeRequestId.current || offer.requestId === activeRequestId.current),
    );

    const nextNegotiations: Record<string, Negotiation> = {};
    for (const offer of relevant) {
      nextNegotiations[offer.id] = toNegotiation(offer.rounds ?? [], offer.status);
    }

    setNegotiations(nextNegotiations);
    setOffers(relevant.map(toStoreOffer));

    /*
     * NOTIFICATION CLIENT : une offre que l'on suivait a DISPARU (refus du
     * conducteur → statut « rejected » puis retrait, ou expiration). On prévient
     * le client au lieu de le laisser devant une liste vide sans explication.
     */
    const currentIds = relevant.map((offer) => offer.id);
    const lostOffer = knownOfferIds.current.some((id) => !currentIds.includes(id));
    knownOfferIds.current = currentIds;

    if (relevant.length === 0 && lostOffer) {
      setPassengerNotice('Le chauffeur a refusé. Recherche d’un autre chauffeur…');
    } else if (relevant.length > 0) {
      setPassengerNotice('');
    }

    // Une offre arrive pendant la recherche → écran des offres.
    if (relevant.length > 0 && rideStatusRef.current === 'searching') {
      setRideStatus('offers');
    }

    // Toutes les offres sont tombées (refus / expiration) → autre conducteur.
    if (relevant.length === 0 && rideStatusRef.current === 'offers') {
      republishRequest();
    }
  });
}, [
  cloudReady,
  isDriverAccount,
  accountId,
  liveUserId,
  toStoreOffer,
  finalizeAcceptedOffer,
  republishRequest,
]);

/** Minuterie : expire une offre restée 60 s sans réponse. */
useEffect(() => {
  if (!isCloudEnabled() || !cloudReady) return undefined;

  const timer = window.setInterval(() => {
    const now = Date.now();

    for (const offer of liveOffers) {
      if (!isTimedOut(offer.rounds ?? [], offer.status, now)) continue;
      expireOffer(offer, 'délai de réponse de 60 s dépassé');
    }
  }, 5000);

  return () => window.clearInterval(timer);
}, [cloudReady, liveOffers, expireOffer]);

  /** Recharges, cadeaux et historique client : synchronisation Firestore. */
  useEffect(() => {
    if (!isCloudEnabled() || !cloudReady) return undefined;

    const unsubscribeRecharges = subscribeToRechargeRequests(
      (requests) => {
        setRechargeRequests([...requests].sort((a, b) => b.createdAt - a.createdAt));
      },
      (status) => setRechargeSync(status),
    );

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
          /*
           * HISTORIQUE conducteur : source de vérité = Firestore (une course =
           * un document, filtré par `driverId === accountId`). On fusionne à
           * chaque snapshot : dédoublonnage par `id` + tri décroissant, et les
           * courses en cours sont exclues (elles restent dans `activeRide`).
           */
          setDriverRideHistory((list) => mergeRideHistory(list, rides));

          const mine =
            rides.find((ride) => DRIVER_ACTIVE_STATUSES.includes(ride.status)) ?? null;
          setActiveRide(mine);
          return;
        }

        // Historique client : même tri que le conducteur (plus récent en haut).
        setPassengerHistory(sortRidesDesc(rides));

        // 1) Course déjà suivie → on applique le statut partagé (Firestore).
        const current = activeRideIdRef.current
          ? rides.find((ride) => ride.id === activeRideIdRef.current)
          : undefined;

        if (current) {
          /*
           * Le CONDUCTEUR a terminé la course ET le client a déjà fermé sa
           * réservation (notation faite) : on n'applique rien (sinon on le
           * renverrait sur l'écran de notation en boucle).
           */
          if (current.status === 'completed' && rideStatusRef.current === 'idle') return;

          setActiveRide(current);
          const nextStatus = RIDE_STATUS_BY_COURSE[current.status];
          setRideStatus((status) => (status === nextStatus ? status : nextStatus));

          /*
           * Course TERMINÉE PAR LE CONDUCTEUR : on conserve le récapitulatif
           * pour l'écran de notation (le client ne déclenche jamais cette étape).
           */
          if (current.status === 'completed') {
            setLastRide((ride) => (ride && ride.id === current.id ? ride : current));
          }

          return;
        }

        // 2) Une course est en cours avec un conducteur → le client s'y attache
        //    (même s'il a manqué le premier changement de statut).
        const running = rides.find((ride) => DRIVER_ACTIVE_STATUSES.includes(ride.status));
        if (running) applyAcceptedRide(running);
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

  /**
   * FILET DE SÉCURITÉ — si le canal temps réel des recharges est en erreur
   * (session non propagée, réseau, règles), on fait une LECTURE UNIQUE de
   * secours : l'admin voit au moins les demandes déjà enregistrées au lieu
   * d'une page vide, et le canal live se rétablit de son côté.
   */
  useEffect(() => {
    if (!isCloudEnabled() || !cloudReady || rechargeSync !== 'error') return undefined;

    let active = true;

    void listRechargeRequests().then((requests) => {
      if (active && requests.length > 0) {
        console.info(`[recharge] lecture de secours : ${requests.length} demande(s).`);
        setRechargeRequests([...requests].sort((a, b) => b.createdAt - a.createdAt));
      }
    });

    void listGifts().then((gifts) => {
      if (active && gifts.length > 0) {
        setDriverGifts([...gifts].sort((a, b) => b.createdAt - a.createdAt));
      }
    });

    return () => {
      active = false;
    };
  }, [rechargeSync, cloudReady]);

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

    negotiations,
    passengerNotice,
    myOffer,
    proposePrice,
    sendCounterOffer,
    driverCounterOffer,
    acceptOffer,
    rejectOffer,
    offerNotice,

    driverOnline,
    toggleOnline,
    incomingRequest,
    acceptIncoming,
    rejectIncoming,
    driverRidesToday,
    driverRideHistory,
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
    rechargeSync,
    rechargeError,

    driverGifts,
    addDriverGift,
    giftError,

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
