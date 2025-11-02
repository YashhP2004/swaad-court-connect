import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, auth, storage } from './firebase-config';
import { UserProfile, Order, OrderStatus } from './firebase-types';

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