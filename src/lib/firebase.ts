import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  addDoc,
  deleteDoc,
  Timestamp,
  increment,
  limit,
  limitToLast
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  ConfirmationResult,
  User as FirebaseUser,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Debug Firebase configuration
console.log('Firebase Config Status:', {
  apiKey: firebaseConfig.apiKey ? 'Set' : 'Missing',
  authDomain: firebaseConfig.authDomain ? 'Set' : 'Missing',
  projectId: firebaseConfig.projectId ? 'Set' : 'Missing',
  appId: firebaseConfig.appId ? 'Set' : 'Missing'
});

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Initialize App Check for phone authentication (if reCAPTCHA site key is provided)
// Temporarily disabled to prevent throttling issues
/*
if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
    console.log('App Check initialized successfully');
  } catch (error) {
    console.warn('App Check initialization failed:', error);
  }
}
*/

export { db, auth, storage };

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
  unitPrice: number;
  totalPrice?: number;
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
  pricing: {
    subtotal: number;
    taxes: number;
    deliveryFee: number;
    discount: number;
    totalAmount: number;
  };
  totalAmount: number;
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
  tableNumber?: string;
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
}

// Global reCAPTCHA verifier instance
let recaptchaVerifier: RecaptchaVerifier | null = null;

// Initialize RecaptchaVerifier for phone auth with better error handling
export function initializeRecaptcha(containerId: string = 'recaptcha-container'): RecaptchaVerifier {
  // Clear existing verifier if it exists
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch (error) {
      console.log('Error clearing existing reCAPTCHA:', error);
    }
    recaptchaVerifier = null;
  }

  // Ensure container exists
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.display = 'none';
    document.body.appendChild(container);
  }

  try {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: (response: any) => {
        console.log('reCAPTCHA solved:', response);
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
        // Reinitialize on expiry
        if (recaptchaVerifier) {
          recaptchaVerifier.clear();
          recaptchaVerifier = null;
        }
      },
      'error-callback': (error: any) => {
        console.error('reCAPTCHA error:', error);
      }
    });

    return recaptchaVerifier;
  } catch (error) {
    console.error('Error initializing reCAPTCHA:', error);
    throw new Error('Failed to initialize reCAPTCHA. Please refresh the page and try again.');
  }
};

// Get or create reCAPTCHA verifier
export function getRecaptchaVerifier(): RecaptchaVerifier {
  if (!recaptchaVerifier) {
    return initializeRecaptcha();
  }
  return recaptchaVerifier;
};

// Clear reCAPTCHA verifier
export function clearRecaptchaVerifier(): void {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch (error) {
      console.log('Error clearing reCAPTCHA:', error);
    }
    recaptchaVerifier = null;
  }
};

// Phone Authentication Functions with improved error handling
export async function sendOTP(phoneNumber: string, retryCount: number = 0): Promise<ConfirmationResult> {
  const maxRetries = 2;

  try {
    // Get or initialize reCAPTCHA verifier
    const verifier = getRecaptchaVerifier();

    // Ensure phone number is in correct format
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    console.log('Sending OTP to:', formattedPhone);
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, verifier);

    return confirmationResult;
  } catch (error: any) {
    console.error('Error sending OTP (attempt ' + (retryCount + 1) + '):', error);

    // Handle Firebase configuration errors
    if (error.code === 'auth/invalid-app-credential') {
      throw new Error('Phone authentication is not properly configured. Please contact support or use email login instead.');
    }

    if (error.code === 'auth/app-not-authorized') {
      throw new Error('This app is not authorized for phone authentication. Please contact support.');
    }

    if (error.code === 'auth/project-not-found') {
      throw new Error('Firebase project configuration error. Please contact support.');
    }

    // Handle specific reCAPTCHA errors
    if (error.message?.includes('reCAPTCHA') || error.code === 'auth/captcha-check-failed') {
      if (retryCount < maxRetries) {
        console.log('Retrying with fresh reCAPTCHA...');
        clearRecaptchaVerifier();
        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        return sendOTP(phoneNumber, retryCount + 1);
      } else {
        throw new Error('reCAPTCHA verification failed. Please refresh the page and try again.');
      }
    }

    // Handle other Firebase errors
    if (error.code === 'auth/invalid-phone-number') {
      throw new Error('Invalid phone number format. Please enter a valid phone number.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many requests. Please try again later.');
    } else if (error.code === 'auth/quota-exceeded') {
      throw new Error('SMS quota exceeded. Please try again later.');
    }

    throw error;
  }
};

export async function verifyOTP(confirmationResult: ConfirmationResult, otp: string): Promise<FirebaseUser> {
  try {
    const result = await confirmationResult.confirm(otp);
    return result.user;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

// Email/Password Authentication Functions
export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error('Error signing in with email:', error);
    throw error;
  }
};

export async function signUpWithEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error('Error signing up with email:', error);
    throw error;
  }
};

// User Profile Management
export async function createUserProfile(user: FirebaseUser, additionalData: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  const userProfile: UserProfile = {
    id: user.uid,
    name: user.displayName || additionalData.name || '',
    email: user.email || '',
    phone: user.phoneNumber || additionalData.phone || '',
    role: additionalData.role || 'customer',
    profilePicture: additionalData.profilePicture,

    // Initialize personal preferences
    favoriteRestaurants: additionalData.favoriteRestaurants || [],
    favoriteCuisines: additionalData.favoriteCuisines || [],
    dietaryRestrictions: additionalData.dietaryRestrictions || [],
    spicePreference: additionalData.spicePreference || 'medium',

    // Initialize gamification features
    totalOrders: additionalData.totalOrders || 0,
    totalSpent: additionalData.totalSpent || 0,
    memberSince: additionalData.memberSince || new Date(),
    loyaltyPoints: additionalData.loyaltyPoints || 0,
    achievements: additionalData.achievements || ['Welcome Bonus'], // Give first achievement
    reviewsCount: additionalData.reviewsCount || 0,
    averageRating: additionalData.averageRating || 5.0,

    // Preferences and settings
    notificationPreferences: additionalData.notificationPreferences || {
      orderUpdates: true,
      promotions: true,
      newRestaurants: false,
    },
    defaultPaymentMethod: additionalData.defaultPaymentMethod,
    emergencyContact: additionalData.emergencyContact,

    // Account metadata
    accountStatus: additionalData.role === 'vendor' ? 'pending' : 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await setDoc(userRef, userProfile);
  console.log(`User profile created for ${user.uid}:`, userProfile);
};

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    console.log('getUserProfile: Fetching profile for UID:', uid);

    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      // IMPORTANT: Add the uid field since Firestore doesn't include document ID in data
      const profileWithUid = { ...data, uid } as UserProfile;
      console.log('getUserProfile: Profile found:', profileWithUid);
      return profileWithUid;
    } else {
      console.log('getUserProfile: No profile document found for UID:', uid);
      return null;
    }
  } catch (error) {
    console.error('getUserProfile: Error fetching profile:', error);
    return null;
  }
};

export async function updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...profileData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Profile Picture Management
export async function uploadProfilePicture(userId: string, file: File): Promise<string> {
  try {
    const fileExtension = file.name.split('.').pop();
    const fileName = `profile_${userId}.${fileExtension}`;
    const storageRef = ref(storage, `profile-pictures/${fileName}`);

    // Upload file
    await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);

    // Update user profile with new picture URL
    await updateUserProfile(userId, { profilePicture: downloadURL });

    // Update Firebase Auth profile
    const user = auth.currentUser;
    if (user) {
      await updateProfile(user, { photoURL: downloadURL });
    }

    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw error;
  }
};

export async function deleteProfilePicture(userId: string, pictureUrl: string): Promise<void> {
  try {
    // Delete from storage
    const storageRef = ref(storage, pictureUrl);
    await deleteObject(storageRef);

    // Update user profile
    await updateUserProfile(userId, { profilePicture: '' });

    // Update Firebase Auth profile
    const user = auth.currentUser;
    if (user) {
      await updateProfile(user, { photoURL: '' });
    }
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    throw error;
  }
};

// Admin functions
export async function checkAdminCredentials(email: string): Promise<boolean> {
  try {
    // Check if admin exists by email in the admins collection
    const adminsRef = collection(db, 'admins');
    const q = query(adminsRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return true;
    }

    // Also check in users collection for backward compatibility
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', email), where('role', '==', 'admin'));
    const userSnapshot = await getDocs(userQuery);

    return !userSnapshot.empty;
  } catch (error) {
    console.error('Error checking admin credentials:', error);
    return false;
  }
};

export async function getAdminProfile(userId: string) {
  try {
    const adminDoc = await getDoc(doc(db, 'admins', userId));
    if (adminDoc.exists()) {
      return { id: adminDoc.id, ...adminDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting admin profile:', error);
    return null;
  }
};

export async function loginAsAdmin(email: string, password: string) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const isAdmin = await verifyAdminAccess(credential.user.uid);

    if (!isAdmin) {
      throw new Error('Access denied. Admin privileges required.');
    }

    // Get admin profile from admins collection
    const adminProfile = await getAdminProfile(credential.user.uid);

    return {
      ...credential.user,
      role: 'admin',
      adminProfile
    };
  } catch (error) {
    console.error('Admin login error:', error);
    throw error;
  }
};

// Helper function to verify admin access
async function verifyAdminAccess(userId: string): Promise<boolean> {
  try {
    // Check admins collection first
    const adminDoc = await getDoc(doc(db, 'admins', userId));
    if (adminDoc.exists()) {
      return true;
    }

    // Check users collection for backward compatibility
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData?.role === 'admin';
    }

    return false;
  } catch (error) {
    console.error('Error verifying admin access:', error);
    return false;
  }
};

// Order Management Functions
export async function createOrder(orderData: Partial<Order>): Promise<string> {
  const orderId = `order_${Date.now()}`;
  const orderNumber = `SC${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;

  const order: Order = {
    id: orderId,
    orderNumber,
    status: 'Placed',
    statusHistory: [{
      status: 'Placed',
      timestamp: Timestamp.now(),
      note: 'Order received'
    }],
    timing: {
      orderPlaced: Timestamp.now(),
      estimatedReady: Timestamp.fromMillis(Timestamp.now().toMillis() + 25 * 60000),
      actualReady: null,
      servedAt: null,
      completedAt: null
    },
    payment: {
      method: 'Cash',
      status: 'Pending',
      transactionId: null,
      paidAt: null
    },
    pricing: {
      subtotal: 0,
      taxes: 0,
      deliveryFee: 0,
      discount: 0,
      totalAmount: 0
    },
    totalAmount: 0,
    dineIn: {
      tableNumber: '1',
      seatingArea: 'Main Hall',
      guestCount: 1
    },
    items: orderData.items || [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    source: 'mobile_app',
    userId: '',
    restaurantId: '',
    restaurantName: '',
    ...orderData
  };

  // Create in main orders collection
  await setDoc(doc(db, 'orders', orderId), order);

  // Create in user's subcollection for faster queries
  if (orderData.userId) {
    const userOrderRef = doc(db, `users/${orderData.userId}/orders`, orderId);
    await setDoc(userOrderRef, {
      orderId,
      orderNumber,
      restaurantId: orderData.restaurantId,
      restaurantName: orderData.restaurantName,
      restaurantImage: orderData.restaurantImage,
      totalAmount: orderData.pricing?.totalAmount || 0,
      status: 'Placed',
      tableNumber: orderData.dineIn?.tableNumber,
      itemsCount: orderData.items?.length || 0,
      itemsSummary: orderData.items?.slice(0, 2).map(item =>
        `${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}`
      ).join(', ') || '',
      createdAt: Timestamp.now(),
      estimatedReady: order.timing.estimatedReady
    });

    // Update user stats immediately when order is placed
    const loyaltyPointsEarned = Math.floor((orderData.pricing?.totalAmount || 0) * 0.1); // 10% of order value
    await updateUserOrderStats(orderData.userId, orderData.pricing?.totalAmount || 0, loyaltyPointsEarned);
  }

  console.log(`Order created: ${orderId} for user: ${orderData.userId}`);
  return orderId;
};

export function getUserOrders(userId: string, callback: (orders: Order[]) => void): (() => void) {
  console.log('getUserOrders: Starting order fetch for user:', userId);

  // Fetch from global orders collection filtered by userId (no orderBy to avoid composite index requirement)
  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    console.log('getUserOrders: Firestore snapshot received, docs count:', snapshot.docs.length);

    if (snapshot.empty) {
      console.log('getUserOrders: No documents found for user:', userId);
      callback([]);
      return;
    }

    const orders: Order[] = snapshot.docs.map((doc, index) => {
      const data = doc.data();
      console.log(`getUserOrders: Processing doc ${index + 1}/${snapshot.docs.length}:`, doc.id, data);

      const processedOrder = {
        id: doc.id,
        ...data,
        // Handle date conversion properly
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() :
                   typeof data.createdAt === 'string' ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() :
                   typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : new Date(),
        // Handle nested objects
        timing: data.timing || {
          orderPlaced: new Date().toISOString(),
          estimatedReady: new Date().toISOString()
        },
        pricing: data.pricing || {
          subtotal: data.pricing?.subtotal || data.totalAmount || 0,
          taxes: data.pricing?.taxes || 0,
          deliveryFee: data.pricing?.deliveryFee || 0,
          discount: data.pricing?.discount || 0,
          totalAmount: data.pricing?.totalAmount || data.totalAmount || 0
        },
        dineIn: data.dineIn || {
          tableNumber: data.dineIn?.tableNumber || data.tableNumber || '1',
          seatingArea: data.dineIn?.seatingArea || 'Main Hall',
          guestCount: data.dineIn?.guestCount || 1
        },
        // Ensure required fields exist
        orderNumber: data.orderNumber || `SC${Date.now()}`,
        statusHistory: data.statusHistory || [{
          status: data.status || 'Placed',
          timestamp: new Date().toISOString(),
          note: 'Order received'
        }],
        payment: data.payment || {
          method: 'Cash',
          status: 'Pending'
        },
        // Ensure totalAmount is available at root level for UI compatibility
        totalAmount: data.pricing?.totalAmount || data.totalAmount || 0,
        // Ensure tableNumber is available at root level for UI compatibility
        tableNumber: data.dineIn?.tableNumber || data.tableNumber || '1',
        // Ensure items array exists
        items: data.items || [],
        // Ensure required string fields
        userId: data.userId || userId,
        restaurantId: data.restaurantId || '',
        restaurantName: data.restaurantName || 'Unknown Restaurant',
        status: data.status || 'Placed'
      } as Order;

      return processedOrder;
    })
    // Sort by createdAt desc client-side
    .sort((a, b) => {
      const getTime = (timestamp: any): number => {
        if (timestamp instanceof Date) return timestamp.getTime();
        if (timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp) return timestamp.toMillis();
        if (typeof timestamp === 'string') return new Date(timestamp).getTime();
        return 0;
      };
      return getTime(b.createdAt) - getTime(a.createdAt);
    });

    console.log(`getUserOrders: Final processed orders (${orders.length}):`, orders);
    callback(orders);
  }, (error) => {
    console.error('getUserOrders: Error fetching user orders:', error);
    callback([]);
  });
};

// Helper function to update user order stats
export async function updateUserOrderStats(userId: string, totalAmount: number, loyaltyPointsEarned: number): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      totalOrders: increment(1),
      totalSpent: increment(totalAmount),
      loyaltyPoints: increment(loyaltyPointsEarned),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating user order stats:', error);
    throw error;
  }
}

// Utility functions for orders
export function getOngoingOrders(orders: Order[]): Order[] {
  const ongoingStatuses: OrderStatus[] = ['Placed', 'Confirmed', 'Preparing', 'Ready to Serve', 'Served'];
  return orders.filter(order => ongoingStatuses.includes(order.status));
};

export function getPastOrders(orders: Order[]): Order[] {
  const pastStatuses: OrderStatus[] = ['Completed', 'Cancelled'];
  return orders.filter(order => pastStatuses.includes(order.status));
};

export function getOrderStatusColor(status: OrderStatus): string {
  const statusColors: Record<OrderStatus, string> = {
    'Placed': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'Confirmed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Preparing': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'Ready to Serve': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'Served': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'Completed': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  };

  return statusColors[status] || 'bg-gray-100 text-gray-800';
};

// Restaurant fetching functions
export async function getRestaurants(status?: string) {
  try {
    let restaurantQuery: any = collection(db, 'restaurants');

    if (status && status !== 'all') {
      restaurantQuery = query(restaurantQuery, where('status', '==', status));
    }

    const snapshot = await getDocs(restaurantQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
  } catch (error) {
    console.error('Error getting restaurants:', error);
    throw error;
  }
};

export async function getTopRatedRestaurants(limitCount: number = 10) {
  try {
    const restaurantQuery = query(
      collection(db, 'restaurants'),
      orderBy('rating', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(restaurantQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
  } catch (error) {
    console.error('Error getting top rated restaurants:', error);
    throw error;
  }
};

export async function getTrendingRestaurants(limitCount: number = 10) {
  try {
    const restaurantQuery = query(
      collection(db, 'restaurants'),
      orderBy('totalRatings', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(restaurantQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
  } catch (error) {
    console.error('Error getting trending restaurants:', error);
    throw error;
  }
};

export async function fetchRestaurants(): Promise<Restaurant[]> {
  const restaurantsRef = collection(db, 'restaurants');
  const snapshot = await getDocs(restaurantsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
}

export async function fetchRestaurantMenu(restaurantId: string): Promise<MenuItem[]> {
  const menuRef = collection(db, `restaurants/${restaurantId}/menu`);
  const snapshot = await getDocs(menuRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
}

export async function fetchRestaurant(restaurantId: string): Promise<Restaurant | null> {
  const restaurantRef = collection(db, 'restaurants');
  const q = query(restaurantRef, where('__name__', '==', restaurantId));
  const snapshot = await getDocs(q);
  return snapshot.docs.length > 0 ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Restaurant : null;
}

export async function getMenuItems(restaurantId?: string, flagged?: boolean) {
  try {
    let menuQuery: any = collection(db, 'menuItems');
    const constraints = [];

    if (restaurantId) {
      constraints.push(where('restaurantId', '==', restaurantId));
    }
    if (flagged !== undefined) {
      constraints.push(where('flagged', '==', flagged));
    }

    if (constraints.length > 0) {
      menuQuery = query(menuQuery, ...constraints);
    }

    const snapshot = await getDocs(menuQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    }));
  } catch (error) {
    console.error('Error getting menu items:', error);
    throw error;
  }
};

// Admin Menu Item Management Functions
export async function getAllMenuItemsForAdmin(status?: string) {
  try {
    let menuQuery: any = collection(db, 'menuItems');

    if (status && status !== 'all') {
      if (status === 'flagged') {
        menuQuery = query(menuQuery, where('flagged', '==', true));
      } else if (status === 'approved') {
        menuQuery = query(menuQuery, where('flagged', '==', false));
      }
    }

    menuQuery = query(menuQuery, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(menuQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
  } catch (error) {
    console.error('Error getting all menu items for admin:', error);
    throw error;
  }
};

export async function approveMenuItem(itemId: string) {
  try {
    const itemRef = doc(db, 'menuItems', itemId);
    await updateDoc(itemRef, {
      flagged: false,
      approvedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error approving menu item:', error);
    throw error;
  }
};

export async function removeMenuItem(itemId: string) {
  try {
    const itemRef = doc(db, 'menuItems', itemId);
    await deleteDoc(itemRef);
    return { success: true };
  } catch (error) {
    console.error('Error removing menu item:', error);
    throw error;
  }
};

export async function getRestaurantMenuItems(restaurantId: string) {
  try {
    const menuQuery = query(
      collection(db, 'menuItems'),
      where('restaurantId', '==', restaurantId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(menuQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
  } catch (error) {
    console.error('Error getting restaurant menu items:', error);
    throw error;
  }
};

// Vendor/Restaurant Management Functions
export async function getVendorProfile(vendorId: string): Promise<any> {
  try {
    // First get vendor user data from users collection
    const userRef = doc(db, 'users', vendorId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || (userSnap.data() as any).role !== 'vendor') {
      throw new Error('Vendor not found');
    }

    const userData = userSnap.data();

    // Check if vendor already has a restaurant linked
    let restaurantData: any = null;
    let restaurantId = userData.restaurantId;

    if (restaurantId) {
      // Get existing restaurant data
      const restaurantRef = doc(db, 'restaurants', restaurantId);
      const restaurantSnap = await getDoc(restaurantRef);

      if (restaurantSnap.exists()) {
        restaurantData = restaurantSnap.data();
      }
    } else {
      // Find an existing restaurant that matches this vendor's business name or assign one
      const restaurantsQuery = query(
        collection(db, 'restaurants'),
        where('vendorId', '==', null) // Find restaurants without assigned vendors
      );

      const restaurantsSnapshot = await getDocs(restaurantsQuery);

      if (!restaurantsSnapshot.empty) {
        // Get the first available restaurant
        const availableRestaurant = restaurantsSnapshot.docs[0];
        restaurantId = availableRestaurant.id;
        restaurantData = availableRestaurant.data();

        // Link this restaurant to the vendor
        await updateDoc(doc(db, 'restaurants', restaurantId), {
          vendorId: vendorId,
          name: userData.businessName || userData.name,
          cuisine: userData.cuisine || restaurantData.cuisine,
          phone: userData.phone || restaurantData.phone,
          address: userData.address || restaurantData.address,
          updatedAt: Timestamp.now()
        });

        // Update user with restaurant ID
        await updateDoc(userRef, {
          restaurantId: restaurantId,
          updatedAt: Timestamp.now()
        });

        console.log(`✅ Linked vendor ${userData.businessName} to existing restaurant ${restaurantData.name}`);
      } else {
        // No available restaurants found
        throw new Error('No available restaurants found to assign to vendor');
      }
    }

    // Return combined vendor profile
    return {
      id: vendorId,
      name: userData.name,
      businessName: userData.businessName || userData.name,
      email: userData.email,
      phone: userData.phone,
      address: userData.address,
      cuisine: userData.cuisine || (restaurantData as any).cuisine || ['Indian'],
      logo: userData.logo || (restaurantData as any).image,
      rating: (restaurantData as any).rating || 4.2,
      isOpen: userData.isOpen !== undefined ? userData.isOpen : ((restaurantData as any).isOpen !== undefined ? (restaurantData as any).isOpen : true),
      restaurantId: restaurantId,
      status: userData.status || 'active',
      commissionRate: userData.commissionRate || 10,
      createdAt: userData.createdAt,
      ...restaurantData
    };
  } catch (error) {
    console.error('Error fetching vendor profile:', error);
    throw error;
  }
}

// Update vendor/restaurant profile
export async function updateVendorProfile(vendorId: string, profileData: any): Promise<void> {
  try {
    const vendorRef = doc(db, 'users', vendorId);
    await updateDoc(vendorRef, {
      ...profileData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating vendor profile:', error);
    throw error;
  }
}

// Get vendor orders with real-time updates
export function getVendorOrdersRealtime(vendorId: string, callback: (orders: any[]) => void): () => void {
  console.log('🔥 getVendorOrdersRealtime called with vendorId:', vendorId);

  const ordersRef = collection(db, 'orders');
  let q = query(
    ordersRef,
    where('restaurantId', '==', vendorId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      console.log('📦 onSnapshot triggered, docs count:', snapshot.docs.length);
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort in memory to avoid composite index requirement
      orders.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
        return bTime - aTime; // Descending order (newest first)
      });

      console.log('✅ Calling callback with orders:', orders.length);
      callback(orders);
    },
    (error) => {
      console.error('❌ onSnapshot error:', error);
      // Call callback with empty array on error to prevent infinite loading
      callback([]);
    }
  );
}

// Update order status for vendors
export async function updateOrderStatus(orderId: string, status: string, vendorId: string): Promise<void> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status: status,
      updatedAt: Timestamp.now(),
      [`statusHistory.${status}`]: Timestamp.now()
    });

    // Create notification for customer
    const orderSnap = await getDoc(orderRef);
    if (orderSnap.exists()) {
      const orderData = orderSnap.data();

      // Create notification for customer
      await addDoc(collection(db, 'notifications'), {
        userId: orderData.userId,
        type: 'order_status_update',
        title: 'Order Status Updated',
        message: `Your order #${orderId.slice(-6)} is now ${status}`,
        orderId: orderId,
        isRead: false,
        createdAt: Timestamp.now()
      });
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

// Get vendor menu items
export async function getVendorMenuItems(vendorId: string): Promise<any[]> {
  try {
    const menuRef = collection(db, 'vendors', vendorId, 'menuItems');
    const snapshot = await getDocs(menuRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching vendor menu items:', error);
    throw error;
  }
}

// Add menu item
export async function addMenuItem(vendorId: string, menuItem: any): Promise<string> {
  try {
    const menuRef = collection(db, 'vendors', vendorId, 'menuItems');
    const docRef = await addDoc(menuRef, {
      ...menuItem,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding menu item:', error);
    throw error;
  }
}

export async function updateMenuItem(vendorId: string, itemId: string, updates: any): Promise<void> {
  try {
    const itemRef = doc(db, 'vendors', vendorId, 'menuItems', itemId);
    await updateDoc(itemRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    throw error;
  }
}

export async function deleteMenuItem(vendorId: string, itemId: string): Promise<void> {
  try {
    const itemRef = doc(db, 'vendors', vendorId, 'menuItems', itemId);
    await deleteDoc(itemRef);
  } catch (error) {
    console.error('Error deleting menu item:', error);
    throw error;
  }
}

export async function getVendorCategories(vendorId: string): Promise<any[]> {
  try {
    const categoriesRef = collection(db, 'vendors', vendorId, 'categories');
    const snapshot = await getDocs(query(categoriesRef, orderBy('sortOrder')));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching vendor categories:', error);
    throw error;
  }
}

export async function addCategory(vendorId: string, category: any): Promise<string> {
  try {
    const categoriesRef = collection(db, 'vendors', vendorId, 'categories');
    const docRef = await addDoc(categoriesRef, {
      ...category,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
}

export async function getMenuCategories(vendorId: string): Promise<any[]> {
  return getVendorCategories(vendorId);
}

export async function addMenuCategory(vendorId: string, category: any): Promise<string> {
  return addCategory(vendorId, category);
}

// Vendor analytics and transactions
export async function getVendorAnalytics(vendorId: string, dateRange: string): Promise<any> {
  try {
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const ordersRef = collection(db, 'orders');
    let q = query(
      ordersRef,
      where('restaurantId', '==', vendorId),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('status', '==', 'completed')
    );

    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(doc => doc.data());

    // Calculate analytics
    const totalRevenue = orders.reduce((sum, order) => sum + ((order as any).pricing?.totalAmount || (order as any).totalAmount || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Group by date for charts
    const dailyData = orders.reduce((acc, order) => {
      const date = order.createdAt.toDate().toDateString();
      if (!acc[date]) {
        acc[date] = { revenue: 0, orders: 0, customers: new Set() };
      }
      acc[date].revenue += ((order as any).pricing?.totalAmount || (order as any).totalAmount || 0);
      acc[date].orders += 1;
      acc[date].customers.add(order.userId);
      return acc;
    }, {});

    const salesData = Object.entries(dailyData).map(([date, data]: [string, any]) => ({
      period: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      revenue: data.revenue,
      orders: data.orders,
      customers: data.customers.size
    }));

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      salesData
    };
  } catch (error) {
    console.error('Error fetching vendor analytics:', error);
    throw error;
  }
}

export async function getVendorTransactions(vendorId: string, dateRange: string, statusFilter?: string): Promise<any[]> {
  try {
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const ordersRef = collection(db, 'orders');
    let q = query(
      ordersRef,
      where('restaurantId', '==', vendorId),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      orderBy('createdAt', 'desc')
    );

    if (statusFilter) {
      q = query(q, where('status', '==', statusFilter));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        orderId: doc.id,
        customerName: data.userDetails?.name || 'Unknown',
        amount: (data as any).pricing?.totalAmount || (data as any).totalAmount || 0,
        paymentMethod: data.payment?.method || 'unknown',
        status: data.payment?.status || 'pending',
        transactionId: data.payment?.transactionId || '',
        timestamp: data.createdAt.toDate(),
        commission: ((data as any).pricing?.totalAmount || (data as any).totalAmount || 0) * 0.05, // 5% commission
        netAmount: ((data as any).pricing?.totalAmount || (data as any).totalAmount || 0) * 0.95,
        description: `Order payment for ${data.items?.length || 0} items`
      };
    });
  } catch (error) {
    console.error('Error fetching vendor transactions:', error);
    throw error;
  }
}

export async function getVendorPaymentSummary(vendorId: string, dateRange: string = '30d') {
  try {
    const transactions = await getVendorTransactions(vendorId, dateRange);

    const summary = {
      totalOrders: transactions.length,
      totalRevenue: transactions.reduce((sum, t) => sum + t.amount, 0),
      totalCommission: transactions.reduce((sum, t) => sum + t.commission, 0),
      netEarnings: transactions.reduce((sum, t) => sum + t.netAmount, 0),
      completedPayments: transactions.filter(t => t.status === 'completed').length,
      pendingPayments: transactions.filter(t => t.status === 'pending').length,
      failedPayments: transactions.filter(t => t.status === 'failed').length,
      averageOrderValue: transactions.length > 0 ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length : 0,
      period: dateRange
    };

    return summary;
  } catch (error) {
    console.error('Error getting vendor payment summary:', error);
    throw error;
  }
}

// Payout management
export async function createPayoutRequest(vendorId: string, amount: number): Promise<string> {
  try {
    const payoutRef = collection(db, 'payoutRequests');
    const docRef = await addDoc(payoutRef, {
      vendorId,
      amount,
      status: 'pending',
      requestDate: Timestamp.now(),
      expectedDate: Timestamp.fromDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)), // 3 days
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating payout request:', error);
    throw error;
  }
}

export async function getVendorPayoutRequests(vendorId: string): Promise<any[]> {
  try {
    const payoutRef = collection(db, 'payoutRequests');
    let q = query(
      payoutRef,
      where('vendorId', '==', vendorId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      requestDate: doc.data().requestDate.toDate(),
      expectedDate: doc.data().expectedDate.toDate()
    }));
  } catch (error) {
    console.error('Error fetching payout requests:', error);
    throw error;
  }
}

export async function toggleRestaurantStatus(vendorId: string, isActive: boolean): Promise<void> {
  try {
    const vendorRef = doc(db, 'users', vendorId);
    await updateDoc(vendorRef, {
      isActive,
      updatedAt: Timestamp.now()
    });

    // Also update in restaurants collection if exists
    const restaurantRef = doc(db, 'restaurants', vendorId);
    const restaurantSnap = await getDoc(restaurantRef);
    if (restaurantSnap.exists()) {
      await updateDoc(restaurantRef, {
        isActive,
        updatedAt: Timestamp.now()
      });
    }
  } catch (error) {
    console.error('Error toggling restaurant status:', error);
    throw error;
  }
}

export async function getTopSellingProducts(vendorId: string): Promise<any[]> {
  try {
    const ordersRef = collection(db, 'orders');
    let q = query(
      ordersRef,
      where('restaurantId', '==', vendorId),
      where('status', '==', 'completed')
    );

    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(doc => doc.data());

    // Calculate analytics
    const productSales: { [key: string]: { name: string; totalSold: number; revenue: number; category: string; isVeg: boolean } } = {};

    orders.forEach(order => {
      order.items?.forEach((item: any) => {
        if (!productSales[item.id]) {
          productSales[item.id] = {
            name: item.name,
            totalSold: 0,
            revenue: 0,
            category: item.category || 'Uncategorized',
            isVeg: item.isVeg || false
          };
        }
        productSales[item.id].totalSold += item.quantity;
        productSales[item.id].revenue += item.price * item.quantity;
      });
    });

    return Object.entries(productSales)
      .map(([id, data]: [string, any]) => ({ id, ...data }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);
  } catch (error) {
    console.error('Error fetching top selling products:', error);
    throw error;
  }
}

// Admin Operations Functions
export async function getAllVendors(status?: string) {
  try {
    console.log('getAllVendors: Fetching vendors with status:', status);
    let vendorQuery: any = collection(db, 'users');
    const constraints = [where('role', '==', 'vendor')];

    if (status && status !== 'all') {
      constraints.push(where('status', '==', status));
    }

    vendorQuery = query(vendorQuery, ...constraints);
    const snapshot = await getDocs(vendorQuery);
    const vendors = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      email: doc.data().email || '',
      name: doc.data().name || doc.data().displayName || '',
    }));
    return vendors;
  } catch (error) {
    console.error('Error fetching vendors:', error);
    throw error;
  }
};

export async function approveVendor(vendorId: string) {
  try {
    await updateDoc(doc(db, 'users', vendorId), {
      status: 'approved',
      approvedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error approving vendor:', error);
    throw error;
  }
};

export async function rejectVendor(vendorId: string, reason?: string) {
  try {
    await updateDoc(doc(db, 'users', vendorId), {
      status: 'rejected',
      rejectionReason: reason,
      rejectedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error rejecting vendor:', error);
    throw error;
  }
};

export async function approveVendorById(vendorId: string) {
  try {
    await updateDoc(doc(db, 'users', vendorId), {
      status: 'approved',
      approvedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error approving vendor:', error);
    throw error;
  }
};

export async function rejectVendorById(vendorId: string, reason?: string) {
  try {
    await updateDoc(doc(db, 'users', vendorId), {
      status: 'rejected',
      rejectionReason: reason,
      rejectedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error rejecting vendor:', error);
    throw error;
  }
};

export async function suspendVendorById(vendorId: string, reason?: string) {
  try {
    await updateDoc(doc(db, 'users', vendorId), {
      status: 'suspended',
      suspensionReason: reason,
      suspendedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error suspending vendor:', error);
    throw error;
  }
};

export async function activateVendorById(vendorId: string) {
  try {
    await updateDoc(doc(db, 'users', vendorId), {
      status: 'active',
      activatedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error activating vendor:', error);
    throw error;
  }
};

export async function sendVendorPasswordReset(vendorId: string) {
  try {
    // Get vendor email first
    const vendorDoc = await getDoc(doc(db, 'users', vendorId));
    if (!vendorDoc.exists()) {
      throw new Error('Vendor not found');
    }
    const vendorData = vendorDoc.data();
    const email = vendorData?.email;
    if (!email) {
      throw new Error('Vendor email not found');
    }

    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Error sending vendor password reset:', error);
    throw error;
  }
};

export async function getVendorInfoForPasswordReset(vendorId: string) {
  try {
    const vendorDoc = await getDoc(doc(db, 'users', vendorId));
    if (!vendorDoc.exists()) {
      throw new Error('Vendor not found');
    }
    const vendorData = vendorDoc.data();
    return {
      id: vendorId,
      email: vendorData?.email || '',
      name: vendorData?.name || vendorData?.displayName || '',
      status: vendorData?.status || 'unknown'
    };
  } catch (error) {
    console.error('Error getting vendor info for password reset:', error);
    throw error;
  }
};

export async function getAllOrdersForAdmin(status?: string, limitCount: number = 50) {
  try {
    let ordersQuery: any = collection(db, 'orders');

    if (status && status !== 'all') {
      ordersQuery = query(ordersQuery, where('status', '==', status));
    }

    ordersQuery = query(ordersQuery, orderBy('createdAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(ordersQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting all orders for admin:', error);
    throw error;
  }
};

export async function getAllCustomersForAdmin(status?: string) {
  try {
    let customersQuery: any = collection(db, 'users');
    const constraints = [where('role', '==', 'customer')];

    if (status && status !== 'all') {
      constraints.push(where('status', '==', status));
    }

    customersQuery = query(customersQuery, ...constraints);
    const snapshot = await getDocs(customersQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting all customers for admin:', error);
    throw error;
  }
};

export async function updateCustomerStatus(userId: string, status: 'active' | 'suspended' | 'banned') {
  try {
    console.log('updateCustomerStatus: Updating user', userId, 'to status', status);

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status,
      updatedAt: Timestamp.now()
    });

    console.log('updateCustomerStatus: Successfully updated user status');
    return { success: true };
  } catch (error) {
    console.error('Error updating customer status:', error);
    throw error;
  }
};

export async function sendCustomerPasswordReset(email: string) {
  try {
    console.log('sendCustomerPasswordReset: Sending password reset to', email);

    await sendPasswordResetEmail(auth, email);

    console.log('sendCustomerPasswordReset: Password reset email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending customer password reset:', error);
    throw error;
  }
};

export async function getAllTransactionsForAdmin(dateRange?: string) {
  try {
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const ordersRef = collection(db, 'orders');
    let q = query(
      ordersRef,
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        orderId: doc.id,
        customerId: data.userId,
        customerName: data.userDetails?.name || 'Unknown',
        vendorId: data.restaurantId,
        vendorName: data.restaurantName || 'Unknown',
        amount: (data as any).pricing?.totalAmount || (data as any).totalAmount || 0,
        paymentMethod: data.payment?.method || 'unknown',
        status: data.payment?.status || 'pending',
        transactionId: data.payment?.transactionId || '',
        timestamp: data.createdAt.toDate(),
        commission: ((data as any).pricing?.totalAmount || (data as any).totalAmount || 0) * 0.05, // 5% commission
        netAmount: ((data as any).pricing?.totalAmount || (data as any).totalAmount || 0) * 0.95
      };
    });
  } catch (error) {
    console.error('Error fetching all transactions for admin:', error);
    throw error;
  }
};

export async function getAllPayoutRequestsForAdmin(status?: string) {
  try {
    let payoutQuery: any = collection(db, 'payoutRequests');

    if (status && status !== 'all') {
      payoutQuery = query(payoutQuery, where('status', '==', status));
    }

    payoutQuery = query(payoutQuery, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(payoutQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      requestDate: doc.data().requestDate.toDate(),
      expectedDate: doc.data().expectedDate.toDate()
    }));
  } catch (error) {
    console.error('Error getting payout requests for admin:', error);
    throw error;
  }
};

export async function updatePayoutStatus(payoutId: string, status: string, adminId: string) {
  try {
    const payoutRef = doc(db, 'payoutRequests', payoutId);
    await updateDoc(payoutRef, {
      status,
      processedBy: adminId,
      processedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating payout status:', error);
    throw error;
  }
};

export async function getPasswordResetLogs(limitCount: number = 50) {
  try {
    console.log('getPasswordResetLogs: Fetching last', limitCount, 'password reset logs');

    const logsRef = collection(db, 'passwordResetLogs');
    const logsQuery = query(logsRef, orderBy('requestedAt', 'desc'), limit(limitCount));
    const logsSnapshot = await getDocs(logsQuery);
    const logs: Array<{
      id: string;
      email: string;
      userType: 'vendor' | 'customer';
      requestedAt: Date;
      requestedBy: string;
      status: string;
    }> = [];

    logsSnapshot.forEach((docItem) => {
      const data = docItem.data();
      const rawRequestedAt = data.requestedAt;
      let requestedAt: Date;

      if (rawRequestedAt instanceof Timestamp) {
        requestedAt = rawRequestedAt.toDate();
      } else if (rawRequestedAt?.toDate) {
        requestedAt = rawRequestedAt.toDate();
      } else if (rawRequestedAt instanceof Date) {
        requestedAt = rawRequestedAt;
      } else if (typeof rawRequestedAt === 'number') {
        requestedAt = new Date(rawRequestedAt);
      } else if (typeof rawRequestedAt?.seconds === 'number') {
        requestedAt = new Date(rawRequestedAt.seconds * 1000 + (rawRequestedAt.nanoseconds || 0) / 1_000_000);
      } else {
        requestedAt = new Date();
      }

      logs.push({
        id: docItem.id,
        email: data.email || '',
        userType: (data.userType as 'vendor' | 'customer') || 'vendor',
        requestedAt,
        requestedBy: data.requestedBy || 'System',
        status: data.status || 'sent'
      });
    });

    console.log('getPasswordResetLogs: Found', logs.length, 'logs');
    return logs;
  } catch (error) {
    console.error('Error fetching password reset logs:', error);
    throw error;
  }
};

export async function getAllRestaurantsForAdmin(status?: string) {
  try {
    let restaurantsQuery: any = collection(db, 'restaurants');

    if (status && status !== 'all') {
      restaurantsQuery = query(restaurantsQuery, where('status', '==', status));
    }

    restaurantsQuery = query(restaurantsQuery, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(restaurantsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
  } catch (error) {
    console.error('Error getting all restaurants for admin:', error);
    throw error;
  }
};

// Platform settings management
export async function updatePlatformSettings(settings: any) {
  try {
    await setDoc(doc(db, 'settings', 'platform'), {
      ...settings,
      updatedAt: Timestamp.now()
    });

    return true;
  } catch (error) {
    console.error('Error updating platform settings:', error);
    throw error;
  }
};

export async function getAdminDashboardStats() {
  try {
    // Get counts for different collections
    const [usersSnap, ordersSnap, restaurantsSnap, menuItemsSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'orders')),
      getDocs(collection(db, 'restaurants')),
      getDocs(collection(db, 'menuItems'))
    ]);

    // Calculate user counts by role
    const users = usersSnap.docs.map(doc => doc.data());
    const customersCount = users.filter(user => user.role === 'customer').length;
    const vendorsCount = users.filter(user => user.role === 'vendor').length;
    const adminsCount = users.filter(user => user.role === 'admin').length;

    // Calculate order statistics
    const orders = ordersSnap.docs.map(doc => doc.data());
    const totalOrders = orders.length;
    const completedOrders = orders.filter(order => order.status === 'Completed').length;
    const pendingOrders = orders.filter(order => ['Placed', 'Confirmed', 'Preparing'].includes(order.status)).length;

    // Calculate revenue
    const totalRevenue = orders
      .filter(order => order.status === 'Completed')
      .reduce((sum, order) => sum + (order.pricing?.totalAmount || order.totalAmount || 0), 0);

    // Calculate restaurant and menu stats
    const restaurants = restaurantsSnap.docs.map(doc => doc.data());
    const activeRestaurants = restaurants.filter(restaurant => restaurant.status === 'active').length;
    const totalMenuItems = menuItemsSnap.docs.length;
    const flaggedMenuItems = menuItemsSnap.docs.filter(doc => doc.data().flagged === true).length;

    return {
      users: {
        total: usersSnap.docs.length,
        customers: customersCount,
        vendors: vendorsCount,
        admins: adminsCount
      },
      orders: {
        total: totalOrders,
        completed: completedOrders,
        pending: pendingOrders,
        totalRevenue: totalRevenue
      },
      restaurants: {
        total: restaurantsSnap.docs.length,
        active: activeRestaurants
      },
      menuItems: {
        total: totalMenuItems,
        flagged: flaggedMenuItems
      }
    };
  } catch (error) {
    console.error('Error getting admin dashboard stats:', error);
    throw error;
  }
};

export async function getRecentActivity(limitCount: number = 10) {
  try {
    // Get recent orders
    const recentOrdersQuery = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const ordersSnap = await getDocs(recentOrdersQuery);

    // Get recent user registrations
    const recentUsersQuery = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const usersSnap = await getDocs(recentUsersQuery);

    // Get recent menu items
    const recentMenuQuery = query(
      collection(db, 'menuItems'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const menuSnap = await getDocs(recentMenuQuery);

    const activities = [];

    // Add recent orders
    ordersSnap.docs.forEach(doc => {
      const data = doc.data();
      activities.push({
        id: `order-${doc.id}`,
        type: 'order',
        description: `New order placed by ${data.customerName || 'Customer'}`,
        amount: data.pricing?.totalAmount || data.totalAmount || 0,
        timestamp: data.createdAt?.toDate() || new Date(),
        status: data.status
      });
    });

    // Add recent user registrations
    usersSnap.docs.forEach(doc => {
      const data = doc.data();
      activities.push({
        id: `user-${doc.id}`,
        type: 'user',
        description: `New ${data.role} registered: ${data.name || data.displayName || data.email}`,
        timestamp: data.createdAt?.toDate() || new Date(),
        status: data.status || 'active'
      });
    });

    // Add recent menu items
    menuSnap.docs.forEach(doc => {
      const data = doc.data();
      activities.push({
        id: `menu-${doc.id}`,
        type: 'menu',
        description: `New menu item added: ${data.name}`,
        timestamp: data.createdAt?.toDate() || new Date(),
        status: data.flagged ? 'flagged' : 'approved'
      });
    });

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limitCount);
  } catch (error) {
    console.error('Error getting recent activity:', error);
    throw error;
  }
};

export async function getPlatformSettings() {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'platform'));
    if (settingsDoc.exists()) {
      return settingsDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting platform settings:', error);
    throw error;
  }
};

// Helper function to get order total
export async function getOrderTotal(orderId: string): Promise<number> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (orderSnap.exists()) {
      return ((orderSnap.data() as any).pricing?.totalAmount || (orderSnap.data() as any).totalAmount || 0);
    } else {
      throw new Error('Order not found');
    }
  } catch (error) {
    console.error('Error getting order total:', error);
    throw error;
  }
};

// Sample data creation for testing
export async function createSampleOrders(userId: string): Promise<void> {
  const sampleOrders = [
    {
      userId,
      restaurantId: 'rest1',
      restaurantName: 'Spice Garden',
      items: [
        { id: '1', name: 'Butter Chicken', quantity: 1, unitPrice: 280 },
        { id: '2', name: 'Garlic Naan', quantity: 2, unitPrice: 60 },
        { id: '3', name: 'Basmati Rice', quantity: 1, unitPrice: 120 }
      ],
      totalAmount: 520,
      status: 'Preparing' as OrderStatus,
      tableNumber: '12',
      notes: 'Medium spice level please'
    },
    {
      userId,
      restaurantId: 'rest2',
      restaurantName: 'Pizza Corner',
      items: [
        { id: '4', name: 'Margherita Pizza', quantity: 1, unitPrice: 350 },
        { id: '5', name: 'Garlic Bread', quantity: 1, unitPrice: 120 }
      ],
      totalAmount: 470,
      status: 'Ready to Serve' as OrderStatus,
      tableNumber: '8'
    },
    {
      userId,
      restaurantId: 'rest3',
      restaurantName: 'Cafe Delight',
      items: [
        { id: '6', name: 'Cappuccino', quantity: 2, unitPrice: 150 },
        { id: '7', name: 'Chocolate Croissant', quantity: 1, unitPrice: 180 }
      ],
      totalAmount: 480,
      status: 'Completed' as OrderStatus,
      tableNumber: '5'
    },
    {
      userId,
      restaurantId: 'rest4',
      restaurantName: 'Burger Hub',
      items: [
        { id: '8', name: 'Classic Burger', quantity: 1, unitPrice: 220 },
        { id: '9', name: 'French Fries', quantity: 1, unitPrice: 100 },
        { id: '10', name: 'Coke', quantity: 1, unitPrice: 60 }
      ],
      totalAmount: 380,
      status: 'Cancelled' as OrderStatus,
      tableNumber: '15',
      notes: 'Order cancelled due to unavailability'
    }
  ];

  try {
    for (const orderData of sampleOrders) {
      await createOrder(orderData);
    }
    console.log('Sample orders created successfully');
  } catch (error) {
    console.error('Error creating sample orders:', error);
  }
};
export async function getVendorNotificationSettings(vendorId: string): Promise<any> {
  try {
    const notificationsRef = doc(db, 'vendorNotificationSettings', vendorId);
    const notificationsSnap = await getDoc(notificationsRef);

    if (notificationsSnap.exists()) {
      return notificationsSnap.data();
    } else {
      return {
        orderNotifications: true,
        paymentNotifications: true,
        promotionalEmails: false,
        smsNotifications: true,
        pushNotifications: true,
        reviewNotifications: true
      };
    }
  } catch (error) {
    console.error('Error fetching vendor notification settings:', error);
    return {
      orderNotifications: true,
      paymentNotifications: true,
      promotionalEmails: false,
      smsNotifications: true,
      pushNotifications: true,
      reviewNotifications: true
    };
  }
}

export async function updateVendorNotificationSettings(vendorId: string, settings: any): Promise<void> {
  try {
    const notificationsRef = doc(db, 'vendorNotificationSettings', vendorId);
    await setDoc(notificationsRef, {
      ...settings,
      updatedAt: Timestamp.now()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating vendor notification settings:', error);
    throw error;
  }
}

export async function getVendorStats(vendorId: string): Promise<any> {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('restaurantId', '==', vendorId));
    const snapshot = await getDocs(q);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let todayOrders = 0;
    let todayRevenue = 0;
    let pendingOrders = 0;
    let completedOrders = 0;
    let totalRevenue = 0;
    
    snapshot.docs.forEach(doc => {
      const order = doc.data() as any;
      totalRevenue += order.totalAmount || 0;
      
      const orderDate = order.createdAt?.toDate?.() || new Date();
      if (orderDate >= today) {
        todayOrders++;
        todayRevenue += order.totalAmount || 0;
      }
      
      if (order.status === 'Pending' || order.status === 'Preparing') {
        pendingOrders++;
      } else if (order.status === 'Completed') {
        completedOrders++;
      }
    });
    
    return {
      todayOrders,
      todayRevenue,
      pendingOrders,
      completedOrders,
      totalMenuItems: 0,
      avgOrderValue: snapshot.size > 0 ? totalRevenue / snapshot.size : 0,
      totalRevenue,
      completionRate: snapshot.size > 0 ? (completedOrders / snapshot.size) * 100 : 0
    };
  } catch (error) {
    console.error('Error fetching vendor stats:', error);
    return {
      todayOrders: 0,
      todayRevenue: 0,
      pendingOrders: 0,
      completedOrders: 0,
      totalMenuItems: 0,
      avgOrderValue: 0,
      totalRevenue: 0,
      completionRate: 0
    };
  }
}

export async function createVendorCredentials(): Promise<any> {
  const sampleVendors = [
    {
      businessName: 'Pizza Palace',
      email: 'pizza@example.com',
      password: 'PizzaPalace123!',
      phone: '+91 9876543210',
      address: '123 Food Street, Mumbai',
      cuisine: ['Italian', 'Continental']
    },
    {
      businessName: 'Burger Hub',
      email: 'burger@example.com',
      password: 'BurgerHub123!',
      phone: '+91 9876543211',
      address: '456 Fast Food Lane, Delhi',
      cuisine: ['Fast Food', 'American']
    }
  ];

  const results = [];
  const errors = [];

  for (const vendor of sampleVendors) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, vendor.email, vendor.password);
      
      const restaurantRef = doc(collection(db, 'restaurants'));
      await setDoc(restaurantRef, {
        name: vendor.businessName,
        vendorId: userCredential.user.uid,
        cuisine: vendor.cuisine,
        phone: vendor.phone,
        address: vendor.address,
        isOpen: true,
        createdAt: Timestamp.now()
      });
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: vendor.email,
        name: vendor.businessName,
        businessName: vendor.businessName,
        phone: vendor.phone,
        address: vendor.address,
        cuisine: vendor.cuisine,
        role: 'vendor',
        status: 'active',
        restaurantId: restaurantRef.id,
        createdAt: Timestamp.now()
      });
      
      results.push({
        businessName: vendor.businessName,
        email: vendor.email,
        password: vendor.password,
        uid: userCredential.user.uid,
        restaurantId: restaurantRef.id
      });
    } catch (error) {
      errors.push({
        businessName: vendor.businessName,
        email: vendor.email,
        error: (error as any).message
      });
    }
  }

  return { results, errors };
}

export async function searchRestaurants(query: string, filters: any): Promise<Restaurant[]> {
  try {
    if (!query.trim()) {
      return [];
    }

    const restaurantsRef = collection(db, 'restaurants');
    const snapshot = await getDocs(restaurantsRef);
    const queryLower = query.toLowerCase();

    let results = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      }))
      .filter(restaurant => {
        const nameMatches = restaurant.name?.toLowerCase().includes(queryLower);
        const cuisineMatches = restaurant.cuisine?.some((c: string) => 
          c.toLowerCase().includes(queryLower)
        );
        
        if (!nameMatches && !cuisineMatches) return false;

        if (filters.vegOnly && !restaurant.isVeg) return false;
        if (filters.minRating && restaurant.rating < filters.minRating) return false;
        if (filters.cuisine?.length > 0) {
          const hasCuisine = filters.cuisine.some((c: string) =>
            restaurant.cuisine?.some((rc: string) => 
              rc.toLowerCase() === c.toLowerCase()
            )
          );
          if (!hasCuisine) return false;
        }

        return true;
      });

    return results;
  } catch (error) {
    console.error('Error searching restaurants:', error);
    return [];
  }
}

export async function searchMenuItems(query: string, filters: any): Promise<MenuItem[]> {
  try {
    if (!query.trim()) {
      return [];
    }

    const menuItemsRef = collection(db, 'menuItems');
    const snapshot = await getDocs(menuItemsRef);
    const queryLower = query.toLowerCase();

    let results = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      }))
      .filter((item: any) => {
        const nameMatches = item.name?.toLowerCase().includes(queryLower);
        const descriptionMatches = item.description?.toLowerCase().includes(queryLower);
        const categoryMatches = item.category?.toLowerCase().includes(queryLower);
        
        if (!nameMatches && !descriptionMatches && !categoryMatches) return false;

        if (filters.vegOnly && !item.isVeg) return false;
        if (filters.minRating && item.rating < filters.minRating) return false;
        if (filters.priceRange) {
          const [minPrice, maxPrice] = filters.priceRange;
          if (item.price < minPrice || item.price > maxPrice) return false;
        }

        return true;
      });

    return results;
  } catch (error) {
    console.error('Error searching menu items:', error);
    return [];
  }
}
