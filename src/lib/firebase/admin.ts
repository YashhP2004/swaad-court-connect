import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp
} from 'firebase/firestore';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from './config';

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

export async function approveVendorById(vendorId: string, commissionRate: number = 10) {
    try {
        await updateDoc(doc(db, 'users', vendorId), {
            status: 'approved',
            commissionRate,
            approvedAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        // Also update restaurant status if it exists
        const restaurantRef = doc(db, 'restaurants', vendorId);
        const restaurantSnap = await getDoc(restaurantRef);
        if (restaurantSnap.exists()) {
            await updateDoc(restaurantRef, {
                status: 'active',
                updatedAt: Timestamp.now()
            });
        }

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
