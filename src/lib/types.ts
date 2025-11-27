import { Timestamp } from 'firebase/firestore';
import { ConfirmationResult } from 'firebase/auth';

// User Role Types
export type UserRole = 'customer' | 'vendor' | 'admin';

// Type definitions
export interface CustomizationOption {
  id: string;
  name: string;
  price: number;
  isVeg: boolean;
  description?: string;
}

export interface MenuItemCustomization {
  id: string;
  name: string;
  required: boolean;
  maxSelections?: number;
  options: CustomizationOption[];
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isVeg: boolean;
  spiceLevel?: number;
  preparationTime?: string;
  isPopular?: boolean;
  isRecommended?: boolean;
  rating: number;
  customizations?: MenuItemCustomization[];
  allergens?: string[];
  nutritionInfo?: NutritionInfo;
  flagged?: boolean;
  approvedAt?: Timestamp | Date;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  restaurantId?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  image: string;
  coverImage: string;
  rating: number;
  totalRatings: number;
  deliveryTime: string;
  distance: string;
  cuisine: string[];
  tags: string[];
  isVeg: boolean;
  discount?: string;
  isPopular?: boolean;
  openingHours: {
    open: string;
    close: string;
  };
  address: string;
  phone: string;
  vendorId?: string;
  status?: string;
  isActive?: boolean;
  email?: string;
  logo?: string;
  menuItemsCount?: number;
  flaggedItemsCount?: number;
  averagePrice?: number;
  stats?: {
    totalOrders: number;
    totalRevenue: number;
    averageRating: number;
    completionRate: number;
  };
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// Phone Authentication Types
export interface PhoneAuthResult {
  verificationId: string;
  confirmationResult: ConfirmationResult;
}

// Order Status Types
export type OrderStatus = 'Placed' | 'Confirmed' | 'Preparing' | 'Ready to Serve' | 'Served' | 'Completed' | 'Cancelled';
export type VendorOrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'collected' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  image?: string;
  category?: string;
  customizations?: string[];
  restaurantId?: string;
  restaurantName?: string;
  price?: number;
  isVeg?: boolean;
}

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage?: string;
  restaurantIds?: string[];
  restaurantBreakdown?: Array<{
    restaurantId: string;
    restaurantName: string;
    itemCount: number;
    totalAmount: number;
  }>;
  items: OrderItem[];
  pricing: {
    subtotal: number;
    taxes: number;
    deliveryFee: number;
    discount: number;
    totalAmount: number;
  };
  totalAmount: number;
  status: OrderStatus;
  vendorStatus?: VendorOrderStatus;
  statusHistory?: Array<{ status: OrderStatus; timestamp: string | Date | Timestamp; note?: string }>;
  dineIn?: { tableNumber?: string; seatingArea?: string; guestCount?: number };
  timing?: {
    orderPlaced?: string | Date | Timestamp;
    estimatedReady?: string | Date | Timestamp | null;
    actualReady?: string | Date | Timestamp | null;
    servedAt?: string | Date | Timestamp | null;
    completedAt?: string | Date | Timestamp | null;
  };
  payment?: {
    method: string;
    status: 'Pending' | 'Completed' | 'Refunded' | 'Failed';
    transactionId?: string | null;
    paidAt?: string | Date | Timestamp | null;
  };
  tableNumber?: string;
  createdAt: Date | string | Timestamp;
  updatedAt: Date | string | Timestamp;
  notes?: string;
  source?: string;
  orderNumber?: string;
  groupId?: string; // To link multiple vendor orders from a single checkout
  paymentId?: string; // Shared payment transaction ID
  userDetails?: {
    name: string;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'vendor' | 'admin';
  profilePicture?: string;

  favoriteRestaurants: string[];
  favoriteCuisines: string[];
  dietaryRestrictions: string[];
  spicePreference: 'mild' | 'medium' | 'hot' | 'extra-hot';

  totalOrders: number;
  totalSpent: number;
  memberSince: Date;
  loyaltyPoints: number;
  achievements: string[];
  reviewsCount: number;
  averageRating: number;

  notificationPreferences: {
    orderUpdates: boolean;
    promotions: boolean;
    newRestaurants: boolean;
  };
  defaultPaymentMethod?: string;
  emergencyContact?: {
    name: string;
    phone: string;
  };

  accountStatus: 'active' | 'pending' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
  uid?: string;
}
