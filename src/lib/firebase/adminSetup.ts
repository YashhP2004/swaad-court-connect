import { db } from './config';
import { doc, setDoc, getDoc } from 'firebase/firestore';

/**
 * Sets up an admin user in Firestore
 * This function should be called once to grant admin privileges to a user
 */
export async function setupAdminUser(userId: string, userData: {
    email: string;
    name: string;
}) {
    try {
        const userRef = doc(db, 'users', userId);

        // Check if user already exists
        const userSnap = await getDoc(userRef);

        const adminData = {
            uid: userId,
            email: userData.email,
            name: userData.name,
            role: 'admin',
            createdAt: userSnap.exists() ? userSnap.data().createdAt : new Date(),
            updatedAt: new Date()
        };

        await setDoc(userRef, adminData, { merge: true });

        console.log('✅ Admin user setup successful:', userId);
        return { success: true, message: 'Admin user setup successful' };
    } catch (error) {
        console.error('❌ Error setting up admin user:', error);
        throw error;
    }
}

/**
 * Checks if a user has admin privileges
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return false;
        }

        const userData = userSnap.data();
        return userData.role === 'admin';
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}
