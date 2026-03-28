export type UserRole = 'customer' | 'vendor';
export type VendorStatus = 'pending' | 'active' | 'inactive' | 'suspended';
export type LiveStatus = 'live' | 'scheduled' | 'offline';

export type MenuItem = {
  id: string;
  name: string;
  priceLabel: string;
};

export type AppUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
};

export type VendorBusiness = {
  id: string;
  userId: string;
  businessName: string;
  description: string;
  category: string;
  imageHint: string;
  imageSymbol?: string;
  operatingHours: string;
  phone: string;
  status: VendorStatus;
  isOpen: boolean;
  rating: number;
  distanceKm: number;
  priceHint: string;
  liveStatus: LiveStatus;
  eta: string;
  nextArea: string;
  tags: string[];
};

export type VendorLocation = {
  id: string;
  vendorId: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
};

export type Product = {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  price: number;
  priceLabel: string;
  isAvailable: boolean;
  imageSymbol?: string;
};

export type Favorite = {
  id: string;
  userId: string;
  vendorId: string;
};

export type Vendor = {
  id: string;
  name: string;
  category: string;
  description: string;
  distanceKm: number;
  isOpen: boolean;
  rating: number;
  lastUpdated: string;
  priceHint: string;
  tags: string[];
  eta: string;
  liveStatus: LiveStatus;
  nextArea: string;
  menu: MenuItem[];
};

export type VendorTabRecord = {
  vendor: VendorBusiness;
  owner: AppUser;
  latestLocation: VendorLocation | null;
  products: Product[];
  isFavorite: boolean;
  favoriteCount: number;
};
