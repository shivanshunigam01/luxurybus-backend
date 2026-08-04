/** Canonical vehicle catalog — seed source of truth for names/slugs. */
export const VEHICLE_TYPE_SEED = [
  { slug: 'mini-bus', name: 'Mini bus', category: 'bus', seatsMin: 12, seatsMax: 25, featured: true, sortOrder: 10 },
  { slug: 'tempo-traveller', name: 'Tempo Traveller', category: 'bus', seatsMin: 9, seatsMax: 17, featured: true, sortOrder: 20 },
  { slug: 'luxury-bus', name: 'Luxury bus', category: 'bus', seatsMin: 30, seatsMax: 45, featured: true, sortOrder: 30 },
  { slug: 'large-coach', name: 'Large coach', category: 'coach', seatsMin: 40, seatsMax: 56, featured: true, sortOrder: 40 },
  { slug: 'luxury-coach', name: 'Luxury Coach', category: 'coach', seatsMin: 40, seatsMax: 56, featured: true, sortOrder: 45 },
  { slug: 'volvo-buses', name: 'Volvo buses', category: 'coach', seatsMin: 35, seatsMax: 49, featured: true, sortOrder: 50 },
  { slug: 'mercedes-coach', name: 'Mercedes coach', category: 'coach', seatsMin: 35, seatsMax: 49, featured: false, sortOrder: 60 },
  { slug: 'bharatbenz-bus', name: 'Bharatbenz bus', category: 'bus', seatsMin: 30, seatsMax: 49, featured: false, sortOrder: 70 },
  { slug: 'bus-with-washroom', name: 'Bus with washroom', category: 'bus', seatsMin: 30, seatsMax: 45, featured: false, sortOrder: 80 },
  { slug: 'toyota-minibus', name: 'Toyota minibus', category: 'bus', seatsMin: 12, seatsMax: 26, featured: false, sortOrder: 90 },
  { slug: 'isuzu-bus', name: 'Isuzu bus', category: 'bus', seatsMin: 20, seatsMax: 35, featured: false, sortOrder: 100 },
  { slug: 'mitsubishi-bus', name: 'Mitsubishi bus', category: 'bus', seatsMin: 20, seatsMax: 35, featured: false, sortOrder: 110 },
  { slug: 'motorhome', name: 'Motorhome', category: 'specialty', seatsMin: 2, seatsMax: 8, featured: false, sortOrder: 120 },
  { slug: 'urbania', name: 'Urbania', category: 'bus', seatsMin: 9, seatsMax: 17, featured: true, sortOrder: 15, description: 'Force Urbania premium van for executive and employee travel.' },
  { slug: 'force-urbania', name: 'Force Urbania', category: 'bus', seatsMin: 9, seatsMax: 17, featured: true, sortOrder: 16 },
  { slug: 'cab', name: 'Cab', category: 'cab', seatsMin: 3, seatsMax: 4, featured: true, sortOrder: 200 },
  { slug: 'sedan', name: 'Sedan', category: 'cab', seatsMin: 3, seatsMax: 4, featured: true, sortOrder: 210 },
  { slug: 'suv', name: 'SUV', category: 'cab', seatsMin: 5, seatsMax: 7, featured: true, sortOrder: 220 },
  { slug: 'muv', name: 'MUV', category: 'cab', seatsMin: 6, seatsMax: 8, featured: true, sortOrder: 230 },
  { slug: 'hatchback', name: 'Hatchback', category: 'cab', seatsMin: 3, seatsMax: 4, featured: false, sortOrder: 240 },
  { slug: 'innova-crysta', name: 'Innova Crysta', category: 'cab', seatsMin: 6, seatsMax: 7, featured: true, sortOrder: 250 },
  { slug: 'employee-shuttle', name: 'Employee Shuttle', category: 'shuttle', seatsMin: 12, seatsMax: 40, featured: true, sortOrder: 300 },
  { slug: 'corporate-shuttle', name: 'Corporate Shuttle', category: 'shuttle', seatsMin: 12, seatsMax: 45, featured: true, sortOrder: 310 },
  { slug: 'airport-shuttle', name: 'Airport Shuttle', category: 'shuttle', seatsMin: 8, seatsMax: 40, featured: true, sortOrder: 320 },
];

export const VEHICLE_CATEGORIES = ['bus', 'coach', 'cab', 'shuttle', 'specialty'];

export const slugify = (text = '') =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
