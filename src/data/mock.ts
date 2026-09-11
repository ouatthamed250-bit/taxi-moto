import type { AdminStats, Destination, DriverProfile, Ride, ZonePriceRule } from '../types';

/** Villes couvertes par la carte Taxi-Moto. */
export const CITIES = [
  'Abidjan',
  'Bouaké',
  'Yamoussoukro',
  'Korhogo',
  'Daloa',
  'San-Pédro',
  'Man',
];

/** Conducteurs simulés (répartition Moto / Tricycle + capacités réelles). */
export const DRIVERS: DriverProfile[] = [
  {
    id: 'd1',
    name: 'Kouassi Yao',
    rating: 4.8,
    rides: 412,
    vehicle: 'moto',
    plate: 'AB-1234-CI',
    model: 'Yamaha Crux',
    online: true,
    zone: 'Cocody',
    availableSeats: 2,
  },
  {
    id: 'd2',
    name: 'Ibrahim Traoré',
    rating: 4.9,
    rides: 801,
    vehicle: 'moto',
    plate: 'CD-5521-CI',
    model: 'Haojue DK',
    online: true,
    zone: 'Adjamé',
    availableSeats: 1,
  },
  {
    id: 'd3',
    name: 'Amani Koffi',
    rating: 4.7,
    rides: 233,
    vehicle: 'tricycle',
    plate: 'TR-7788-CI',
    model: 'TVS King',
    online: true,
    zone: 'Yopougon',
    availableSeats: 4,
  },
  {
    id: 'd4',
    name: 'Bakayoko Salif',
    rating: 4.6,
    rides: 158,
    vehicle: 'tricycle',
    plate: 'TR-2043-CI',
    model: 'Bajaj RE',
    online: true,
    zone: 'Abobo',
    availableSeats: 3,
  },
];

/** Destinations simulées — certaines zones ne sont PAS encore couvertes. */
export const DESTINATIONS: Destination[] = [
  { name: 'Cocody — Angré 7e Tranche', distanceKm: 3.4, covered: true },
  { name: 'Plateau — Cité Administrative', distanceKm: 6.1, covered: true },
  { name: 'Yopougon — Niangon Sud', distanceKm: 8.7, covered: true },
  { name: 'Adjamé — Marché Gouro', distanceKm: 4.2, covered: true },
  { name: 'Marcory — Zone 4', distanceKm: 9.3, covered: true },
  { name: 'Bingerville', distanceKm: 14.5, covered: false },
  { name: 'Anyama', distanceKm: 16.2, covered: false },
  { name: 'Grand-Bassam', distanceKm: 32.0, covered: false },
];

/** Historique de courses (passager + conducteur). */
export const RIDE_HISTORY: Ride[] = [
  {
    id: 'C-10241',
    passengerName: 'Aïcha K.',
    driverName: 'Kouassi Yao',
    vehicle: 'moto',
    pickup: 'Cocody — Angré',
    destination: 'Plateau',
    distanceKm: 6.1,
    price: 1800,
    commission: 126,
    status: 'completed',
    date: '09/11/2026',
    time: '08:12',
    rating: 5,
  },
  {
    id: 'C-10238',
    passengerName: 'Aïcha K.',
    driverName: 'Amani Koffi',
    vehicle: 'tricycle',
    pickup: 'Adjamé',
    destination: 'Yopougon',
    distanceKm: 8.7,
    price: 2500,
    commission: 175,
    status: 'completed',
    date: '08/11/2026',
    time: '17:40',
    rating: 4,
  },
  {
    id: 'C-10230',
    passengerName: 'Aïcha K.',
    driverName: 'Ibrahim Traoré',
    vehicle: 'moto',
    pickup: 'Marcory',
    destination: 'Treichville',
    distanceKm: 5.2,
    price: 1500,
    commission: 105,
    status: 'cancelled',
    date: '07/11/2026',
    time: '12:05',
  },
];

/** Courses réalisées aujourd'hui par le conducteur connecté (simulation). */
export const DRIVER_TODAY_RIDES: Ride[] = [
  {
    id: 'C-10255',
    passengerName: 'Yves B.',
    driverName: 'Vous',
    vehicle: 'moto',
    pickup: 'Cocody',
    destination: 'Plateau',
    distanceKm: 6.1,
    price: 2000,
    commission: 140,
    status: 'completed',
    date: '09/11/2026',
    time: '07:35',
    rating: 5,
  },
  {
    id: 'C-10258',
    passengerName: 'Mariam S.',
    driverName: 'Vous',
    vehicle: 'moto',
    pickup: 'Plateau',
    destination: 'Treichville',
    distanceKm: 4.4,
    price: 1500,
    commission: 105,
    status: 'completed',
    date: '09/11/2026',
    time: '08:50',
    rating: 5,
  },
];

/** Règles tarifaires par zone (définies par l'admin). */
export const ZONE_RULES: ZonePriceRule[] = [
  { zone: 'Quartier A (Cocody)', min: 1000, observed: '1 000 – 1 500', courses: 1284, average: 1350 },
  { zone: 'Quartier B (Adjamé)', min: 1000, observed: '1 500 – 2 500', courses: 968, average: 1900 },
  { zone: 'Ville X (Bouaké)', min: 1000, observed: '2 000 – 3 500', courses: 342, average: 2650 },
  { zone: 'Zone difficile (Anyama)', min: 1000, observed: '3 000 – 5 000', courses: 87, average: 3900 },
];

export const ADMIN_STATS: AdminStats = {
  passengers: 12480,
  drivers: 316,
  driversOnline: 148,
  ridesToday: 942,
  ridesActive: 37,
  ridesCompleted: 892,
  revenue: 8450000,
};

/** Toutes les courses vues par l'admin (temps réel simulé). */
export const ADMIN_RIDES: Ride[] = [
  ...DRIVER_TODAY_RIDES,
  ...RIDE_HISTORY,
  {
    id: 'C-10261',
    passengerName: 'Serge D.',
    driverName: 'Bakayoko Salif',
    vehicle: 'tricycle',
    pickup: 'Abobo',
    destination: 'Adjamé',
    distanceKm: 5.4,
    price: 2200,
    commission: 154,
    status: 'in_progress',
    date: '09/11/2026',
    time: '09:02',
  },
  {
    id: 'C-10262',
    passengerName: 'Fatou N.',
    driverName: '—',
    vehicle: 'moto',
    pickup: 'Cocody',
    destination: 'Bingerville',
    distanceKm: 14.5,
    price: 0,
    commission: 0,
    status: 'searching',
    date: '09/11/2026',
    time: '09:05',
  },
];
