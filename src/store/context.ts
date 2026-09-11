import { createContext } from 'react';
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

export interface AppContextValue {
  /* ---- Session ---- */
  role: Role;
  userName: string;
  phone: string;
  login: (role: Role, name: string, phone: string) => void;
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
  distanceKm: number;
  setDistanceKm: (n: number) => void;

  /* ---- Course ---- */
  rideStatus: RideStatus;
  offers: Offer[];
  selectedOffer: Offer | null;
  lastRide: Ride | null;
  passengerHistory: Ride[];
  startSearch: () => void;
  chooseOffer: (o: Offer) => void;
  advanceRide: () => void;
  cancelRide: () => void;
  rateRide: (rating: number) => void;
  resetBooking: () => void;

  /* ---- Conducteur ---- */
  driverOnline: boolean;
  toggleOnline: () => void;
  incomingRequest: RideRequest | null;
  triggerIncoming: () => void;
  acceptIncoming: (fare: number) => void;
  rejectIncoming: () => void;
  driverRidesToday: Ride[];
  driverRevenue: number;
  driverCommission: number;
  driverNet: number;

  /* ---- Inscription conducteur ---- */
  driverApproved: boolean;
  approveDriver: () => void;

  /* ---- Admin ---- */
  adminStats: AdminStats;
  zoneRules: ZonePriceRule[];
  updateZoneRule: (zone: string, patch: Partial<ZonePriceRule>) => void;
  adminDrivers: DriverProfile[];
  toggleDriverStatus: (id: string) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);
