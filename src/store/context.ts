import { createContext } from 'react';
import type {
  AdminStats,
  AppSettings,
  AuthResult,
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

export interface AppContextValue {
  /* ---- Session ---- */
  role: Role;
  userName: string;
  phone: string;
  currentUser: User | null;
  login: (phone: string, password: string) => AuthResult;
  loginAsAdmin: () => void;
  registerPassenger: (input: PassengerRegisterInput) => AuthResult;
  registerDriver: (input: DriverRegisterInput) => AuthResult;
  logout: () => void;

  /* ---- Réservation passager ---- */
  passengers: number;
  setPassengers: (n: number) => void;
  vehicle: VehicleType | null;
  setVehicle: (v: VehicleType | null) => void;
  pickup: string;
  setPickup: (s: string) => void;
  destination: string;
  setDestination: (s: string) => void;
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
  submitRechargeRequest: (
    request: Omit<RechargeRequest, 'id' | 'status' | 'createdAt'>,
  ) => void;
  validateRechargeRequest: (id: string, approved: boolean) => void;

  /* ---- Cadeaux de recharge (offerts par l'admin) ---- */
  driverGifts: DriverGift[];
  addDriverGift: (gift: DriverGiftInput) => void;

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
}

export const AppContext = createContext<AppContextValue | null>(null);
