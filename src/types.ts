export type VehicleType = 'moto' | 'tricycle';

export type Role = 'guest' | 'passenger' | 'driver' | 'admin';

/** Statuts officiels d'une course. */
export type RideStatus =
  | 'idle'
  | 'searching'
  | 'offers'
  | 'driver_found'
  | 'driver_arriving'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface DriverProfile {
  id: string;
  name: string;
  rating: number;
  rides: number;
  vehicle: VehicleType;
  plate: string;
  model: string;
  online: boolean;
  zone: string;
  /** Nombre de passagers que le véhicule peut réellement accueillir. */
  availableSeats: number;
}

export interface Offer {
  id: string;
  driver: DriverProfile;
  price: number;
}

export interface RideRequest {
  id: string;
  passengers: number;
  vehicle: VehicleType;
  pickup: string;
  destination: string;
  distanceKm: number;
}

export interface Ride {
  id: string;
  passengerName: string;
  driverName: string;
  vehicle: VehicleType;
  pickup: string;
  destination: string;
  distanceKm: number;
  price: number;
  commission: number;
  status: RideStatus;
  date: string;
  time: string;
  rating?: number;
}

export interface ZonePriceRule {
  zone: string;
  min: number;
  observed: string;
  courses: number;
  average: number;
}

export interface Destination {
  name: string;
  distanceKm: number;
  covered: boolean;
}

export interface AdminStats {
  passengers: number;
  drivers: number;
  driversOnline: number;
  ridesToday: number;
  ridesActive: number;
  ridesCompleted: number;
  revenue: number;
}

/** Statut d'une demande de recharge mobile money. */
export type RechargeStatus = 'pending' | 'approved' | 'rejected';

/** Demande de recharge mobile money d'un conducteur (validation admin). */
export interface RechargeRequest {
  id: string;
  driverId: string;
  driverName: string;
  amount: number;
  method: string;
  phone: string;
  /** Capture d'écran du paiement, encodée en base64 (data URL). */
  screenshot: string;
  status: RechargeStatus;
  createdAt: number;
}

/** Cadeau de recharge offert par l'admin à un conducteur. */
export interface DriverGift {
  id: string;
  driverId: string;
  driverName: string;
  amount: number;
  /** Message optionnel (ex. « Bonus fidélité »). */
  message?: string;
  createdAt: number;
}

/** Entrée d'ajout d'un cadeau (saisie par l'admin). */
export interface DriverGiftInput {
  driverId: string;
  amount: number;
  driverName?: string;
  message?: string;
}

/** Rôle d'un compte utilisateur (hors visiteur / administration). */
export type UserRole = 'passenger' | 'driver';

/** Compte utilisateur persisté localement (localStorage pour l'instant). */
export interface User {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  /** ⚠️ Mot de passe stocké en clair (prototype) — à hasher côté Firebase. */
  password: string;
  /** Conducteur uniquement. */
  vehicle?: VehicleType;
  plate?: string;
  /** Photos encodées en base64 (conducteur uniquement). */
  driverPhoto?: string;
  vehiclePhoto?: string;
  /** Question de sécurité (récupération de mot de passe). */
  securityQuestion?: string;
  /** Réponse de sécurité hachée (normalisée : minuscules, sans espaces superflus). */
  securityAnswer?: string;
  createdAt: number;
}

/** Résultat d'une opération d'authentification. */
export interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
}

/** Données d'inscription d'un passager. */
export interface PassengerRegisterInput {
  name: string;
  phone: string;
  password: string;
  securityQuestion: string;
  securityAnswer: string;
}

/** Données d'inscription d'un conducteur. */
export interface DriverRegisterInput extends PassengerRegisterInput {
  vehicle: VehicleType;
  plate: string;
  driverPhoto: string;
  vehiclePhoto: string;
}
