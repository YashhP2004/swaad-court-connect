import { Timestamp } from 'firebase/firestore';
import { ConfirmationResult } from 'firebase/auth';

// User Role Types
export type UserRole = 'customer' | 'vendor' | 'admin';

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
}

// Phone Authentication Types
export interface PhoneAuthResult {
  verificationId: string;
  confirmationResult: ConfirmationResult;
}

// Order Status Types
export type OrderStatus = 'Placed' | 'Confirmed' | 'Preparing' | 'Ready to Serve' | 'Served' | 'Completed' | 'Cancelled';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;          // price per unit used by UI
  totalPrice?: number;        // computed line total
  image?: string;
  category?: string;
  customizations?: string[];
}

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage?: string;
  items: OrderItem[];
  // pricing summary kept nested but UI also reads root totalAmount
  pricing: {
    subtotal: number;
    taxes: number;
    deliveryFee: number;
    discount: number;
    totalAmount: number;
  };
  totalAmount: number; // convenience mirror of pricing.totalAmount
  status: OrderStatus;
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
  tableNumber?: string; // convenience mirror of dineIn.tableNumber
  createdAt: Date | string | Timestamp;
  updatedAt: Date | string | Timestamp;
  notes?: string;
  source?: string;
  orderNumber?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'vendor' | 'admin';
  profilePicture?: string;

  // Personal preferences and stats
  favoriteRestaurants: string[]; // Array of restaurant IDs
  favoriteCuisines: string[]; // e.g., ["Italian", "Indian", "Chinese"]
  dietaryRestrictions: string[]; // e.g., ["Vegetarian", "Vegan", "Gluten-Free"]
  spicePreference: 'mild' | 'medium' | 'hot' | 'extra-hot';

  // Social and gamification features
  totalOrders: number;
  totalSpent: number;
  memberSince: Date;
  loyaltyPoints: number;
  achievements: string[]; // e.g., ["First Order", "Big Spender", "Regular Customer"]
  reviewsCount: number;
  averageRating: number; // Rating given by restaurants for customer behavior

  // Preferences and settings
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

  // Account metadata
  accountStatus: 'active' | 'pending' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}