import { createContext } from 'react';
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
  Offer,
  PassengerRegisterInput,
  RechargeRequest,
  Ride,
  RideRequest,
  RideStatus,
  Role,
  User,
  VehicleType,
  WalletWriteResult,
  ZonePriceRule,
} from '../types';

export interface AppContextValue {
  /* ---- Session ---- */
  role: Role;
  userName: string;
  phone: string;
  /**
   * Identifiant CANONIQUE du compte = docId Firestore `users/{id}`.
   *
   * ⚠️ À utiliser PARTOUT (`driverId` des recharges et des cadeaux, filtres
   * Firestore) : il est **stable entre appareils**, contrairement à l'uid
   * Firebase Auth qui change à chaque nouvelle session anonyme.
   */
  accountId: string;
  currentUser: User | null;
  login: (phone: string, password: string) => Promise<AuthResult>;
  loginAsAdmin: () => void;
  registerPassenger: (input: PassengerRegisterInput) => Promise<AuthResult>;
  registerDriver: (input: DriverRegisterInput) => Promise<AuthResult>;
  logout: () => Promise<void>;

  /* ---- Réservation passager ---- */
  passengers: number;
  setPassengers: (n: number) => void;
  vehicle: VehicleType | null;
  setVehicle: (v: VehicleType | null) => void;
  pickup: string;
  setPickup: (s: string) => void;
  destination: string;
  setDestination: (s: string) => void;
  /** Slug du quartier choisi dans la base (vide si saisie libre / hors zone). */
  destinationId: string;
  /** Secteur du quartier choisi (vide si destination saisie librement). */
  destinationSecteur: string;
  /** true = destination hors base, tapée manuellement par le client. */
  destinationLibre: boolean;
  /** Sélectionne une destination complète (quartier de la base ou saisie libre). */
  setDestinationLieu: (lieu: DestinationLieu) => void;
  distanceKm: number;
  setDistanceKm: (n: number) => void;

  /* ---- Course ---- */
  rideStatus: RideStatus;
  offers: Offer[];
  selectedOffer: Offer | null;
  lastRide: Ride | null;
  passengerHistory: Ride[];
  startSearch: () => boolean;
  chooseOffer: (o: Offer) => void;
  advanceRide: () => void;
  cancelRide: () => void;
  rateRide: (rating: number) => void;
  resetBooking: () => void;

  /* ---- Offres & négociation de prix (client ↔ chauffeur) ---- */
  /** Négociations en cours côté CLIENT, indexées par identifiant d'offre. */
  negotiations: Record<string, Negotiation>;
  /** Offre publiée par le CONDUCTEUR pour la demande en cours (`null` sinon). */
  myOffer: LiveOffer | null;
  /** Conducteur : propose son prix pour la demande reçue. */
  proposePrice: (price: number) => void;
  /** Client : envoie une contre-offre (consomme un tour). */
  sendCounterOffer: (offerId: string, amount: number) => void;
  /** Conducteur : contre-propose après l'offre du client. */
  driverCounterOffer: (offerId: string, amount: number) => void;
  /** Accepte l'offre (client) ou la contre-offre du client (conducteur). */
  acceptOffer: (offerId: string) => void;
  /** Refuse l'offre : le conducteur est retiré de la course. */
  rejectOffer: (offerId: string) => void;

  /* ---- Suivi de course partagé (client + conducteur) ---- */
  /**
   * Course active : celle que le conducteur conduit ou que le client suit.
   * `status` est le statut PARTAGÉ (Firestore) — piloté par le conducteur.
   */
  activeRide: Ride | null;
  /** Met à jour le statut partagé de la course (Firestore + RTDB). */
  updateRideStatus: (rideId: string, status: CourseStatus) => Promise<void>;
  /** Message d'information conducteur (offre expirée / solde insuffisant). */
  offerNotice: string | null;

  /* ---- Conducteur ---- */
  driverOnline: boolean;
  toggleOnline: () => void;
  incomingRequest: RideRequest | null;
  acceptIncoming: (fare: number) => boolean;
  rejectIncoming: () => void;
  driverRidesToday: Ride[];
  driverRevenue: number;
  driverCommission: number;
  driverNet: number;

  /* ---- Solde virtuel conducteur ---- */
  driverBalance: number;
  setDriverBalance: (amount: number) => void;
  debitDriverBalance: (amount: number) => void;
  creditDriverBalance: (amount: number) => void;

  /* ---- Recharges mobile money ---- */
  rechargeRequests: RechargeRequest[];
  /** Envoie la demande au serveur (Firestore) ; résout avec le résultat réel. */
  submitRechargeRequest: (
    request: Omit<RechargeRequest, 'id' | 'status' | 'createdAt'>,
  ) => Promise<WalletWriteResult>;
  validateRechargeRequest: (id: string, approved: boolean) => void;
  /** État du canal temps réel : 'live' = l'admin reçoit bien les demandes. */
  rechargeSync: 'idle' | 'live' | 'error';
  /** Dernière erreur d'envoi / synchronisation de recharge ('' si aucune). */
  rechargeError: string;

  /* ---- Cadeaux de recharge (offerts par l'admin) ---- */
  driverGifts: DriverGift[];
  addDriverGift: (gift: DriverGiftInput) => Promise<WalletWriteResult>;
  /** Dernière erreur d'envoi de cadeau ('' si aucune). */
  giftError: string;

  /* ---- Inscription conducteur ---- */
  driverApproved: boolean;
  approveDriver: () => void;

  /* ---- Admin ---- */
  adminStats: AdminStats;
  zoneRules: ZonePriceRule[];
  updateZoneRule: (zone: string, patch: Partial<ZonePriceRule>) => void;
  adminDrivers: DriverProfile[];
  toggleDriverStatus: (id: string) => void;

  /* ---- Paramètres applicatifs ---- */
  appSettings: AppSettings;
  updateAppSettings: (partial: Partial<AppSettings>) => void;
  loadAppSettings: () => AppSettings;

  /* ---- Géolocalisation ---- */
  passengerPosition: GeoPosition | null;
  driverPosition: GeoPosition | null;
  setPassengerPosition: (position: GeoPosition | null) => void;
  setDriverPosition: (position: GeoPosition | null) => void;

  /* ---- Temps réel (Firebase) ---- */
  /** true = Firestore + Realtime Database actifs (sinon mode local). */
  cloudEnabled: boolean;
  /** Positions live de TOUS les conducteurs (RTDB) indexées par uid. */
  liveDriverPositions: Record<string, GeoPosition>;
  /** Positions live de TOUS les clients (RTDB) indexées par uid. */
  livePassengerPositions: Record<string, GeoPosition>;
  /** uid des conducteurs actuellement en ligne (RTDB). */
  onlineDriverIds: string[];
}

export const AppContext = createContext<AppContextValue | null>(null);
