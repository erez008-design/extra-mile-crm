export interface Property {
  id: string;
  address: string;
  city: string;
  price: number;
  rooms: number;
  area: number;
  type: "דירה" | "בית פרטי" | "פנטהאוז" | "דופלקס" | "מגרש";
  status: "פעיל" | "נמכר" | "מושכר" | "בהמתנה";
  image?: string;
  createdAt: string;
}

export interface Buyer {
  id: string;
  name: string;
  phone: string;
  email: string;
  budget: { min: number; max: number };
  preferredAreas: string[];
  preferredRooms: number[];
  status: "חם" | "פעיל" | "קר" | "סגור";
  notes?: string;
  createdAt: string;
}

export const mockProperties: Property[] = [
  {
    id: "1",
    address: "רחוב הרצל 45",
    city: "תל אביב",
    price: 3200000,
    rooms: 4,
    area: 120,
    type: "דירה",
    status: "פעיל",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    address: "שדרות רוטשילד 12",
    city: "תל אביב",
    price: 8500000,
    rooms: 5,
    area: 200,
    type: "פנטהאוז",
    status: "פעיל",
    createdAt: "2024-01-10",
  },
  {
    id: "3",
    address: "רחוב סוקולוב 78",
    city: "רמת גן",
    price: 2800000,
    rooms: 3,
    area: 95,
    type: "דירה",
    status: "בהמתנה",
    createdAt: "2024-01-08",
  },
  {
    id: "4",
    address: "רחוב הגפן 22",
    city: "הרצליה",
    price: 12000000,
    rooms: 7,
    area: 350,
    type: "בית פרטי",
    status: "פעיל",
    createdAt: "2024-01-05",
  },
  {
    id: "5",
    address: "רחוב ויצמן 55",
    city: "כפר סבא",
    price: 2100000,
    rooms: 4,
    area: 110,
    type: "דופלקס",
    status: "נמכר",
    createdAt: "2023-12-28",
  },
  {
    id: "6",
    address: "רחוב הנביאים 33",
    city: "ירושלים",
    price: 4500000,
    rooms: 5,
    area: 150,
    type: "דירה",
    status: "פעיל",
    createdAt: "2024-01-12",
  },
];

export const mockBuyers: Buyer[] = [
  {
    id: "1",
    name: "יוסי כהן",
    phone: "054-1234567",
    email: "yossi@email.com",
    budget: { min: 2500000, max: 3500000 },
    preferredAreas: ["תל אביב", "רמת גן"],
    preferredRooms: [3, 4],
    status: "חם",
    notes: "מחפש דירה עם מרפסת שמש",
    createdAt: "2024-01-14",
  },
  {
    id: "2",
    name: "שרה לוי",
    phone: "052-9876543",
    email: "sara@email.com",
    budget: { min: 5000000, max: 9000000 },
    preferredAreas: ["הרצליה", "תל אביב"],
    preferredRooms: [4, 5, 6],
    status: "פעיל",
    notes: "מעדיפה קומות גבוהות",
    createdAt: "2024-01-10",
  },
  {
    id: "3",
    name: "דוד אברהם",
    phone: "050-5555555",
    email: "david@email.com",
    budget: { min: 1800000, max: 2500000 },
    preferredAreas: ["כפר סבא", "רעננה"],
    preferredRooms: [4],
    status: "פעיל",
    createdAt: "2024-01-08",
  },
  {
    id: "4",
    name: "מיכל רוזן",
    phone: "053-7777777",
    email: "michal@email.com",
    budget: { min: 10000000, max: 15000000 },
    preferredAreas: ["הרצליה פיתוח"],
    preferredRooms: [6, 7, 8],
    status: "חם",
    notes: "מחפשת וילה עם בריכה",
    createdAt: "2024-01-13",
  },
  {
    id: "5",
    name: "אבי גולן",
    phone: "058-8888888",
    email: "avi@email.com",
    budget: { min: 3000000, max: 4500000 },
    preferredAreas: ["ירושלים"],
    preferredRooms: [4, 5],
    status: "קר",
    createdAt: "2023-12-20",
  },
];

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(price);
};
