import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    Timestamp
} from 'firebase/firestore';
import {
    User as FirebaseUser,
    updateProfile,
    sendPasswordResetEmail
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from './config';
import { UserProfile } from '../types';

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
