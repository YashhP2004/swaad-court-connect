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
    Timestamp,
    collectionGroup,
    getCountFromServer
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
// Admin Menu Item Management Functions
export async function getAllMenuItemsForAdmin(status?: string) {
    try {
        let menuQuery: any = collectionGroup(db, 'menuItems');

        if (status && status !== 'all') {
            if (status === 'flagged') {
                menuQuery = query(menuQuery, where('flagged', '==', true));
            } else if (status === 'approved') {
                menuQuery = query(menuQuery, where('flagged', '==', false));
            }
        }

        // menuQuery = query(menuQuery, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(menuQuery);
        return snapshot.docs.map(doc => {
            const data = doc.data() as any;
            // If restaurantId is not in data, try to get it from parent
            const restaurantId = data.restaurantId || doc.ref.parent.parent?.id;

            return {
                id: doc.id,
                ...data,
                restaurantId,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate()
            };
        });
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

        const vendors = await Promise.all(snapshot.docs.map(async (userDoc) => {
            const userData = userDoc.data() as any;
            const vendorId = userDoc.id;

            // Try to get associated restaurant
            let restaurantData: any = {};
            try {
                let restaurantDoc;
                const restaurantId = userData.restaurantId;

                if (restaurantId) {
                    restaurantDoc = await getDoc(doc(db, 'restaurants', restaurantId));
                }

                // If not found by ID, try finding by vendorId field
                if (!restaurantDoc || !restaurantDoc.exists()) {
                    const q = query(collection(db, 'restaurants'), where('vendorId', '==', vendorId));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        restaurantDoc = querySnapshot.docs[0];
                    }
                }

                // Fallback: try using vendorId as restaurantId (legacy)
                if (!restaurantDoc || !restaurantDoc.exists()) {
                    restaurantDoc = await getDoc(doc(db, 'restaurants', vendorId));
                }

                if (restaurantDoc && restaurantDoc.exists()) {
                    restaurantData = { id: restaurantDoc.id, ...restaurantDoc.data() };
                }
            } catch (err) {
                console.warn(`Could not fetch restaurant for vendor ${vendorId}`, err);
            }

            // Fetch menu items count
            let menuItemsCount = restaurantData.menuItemsCount || 0;
            try {
                // Try fetching from vendors collection (primary)
                const vendorMenuRef = collection(db, 'vendors', vendorId, 'menuItems');
                const vendorMenuSnapshot = await getDocs(vendorMenuRef);
                const vendorCount = vendorMenuSnapshot.size;

                // Try fetching from restaurants collection (fallback 1: menuItems)
                let restaurantCount = 0;
                let restaurantMenuCount = 0;

                if (restaurantData.id) {
                    // Check 'menuItems' subcollection
                    const restaurantItemsRef = collection(db, 'restaurants', restaurantData.id, 'menuItems');
                    const restaurantItemsSnapshot = await getDocs(restaurantItemsRef);
                    restaurantCount = restaurantItemsSnapshot.size;

                    // Check 'menu' subcollection (used by some public fetchers)
                    const restaurantMenuRef = collection(db, 'restaurants', restaurantData.id, 'menu');
                    const restaurantMenuSnapshot = await getDocs(restaurantMenuRef);
                    restaurantMenuCount = restaurantMenuSnapshot.size;
                }

                // Use the largest count found
                menuItemsCount = Math.max(vendorCount, restaurantCount, restaurantMenuCount, menuItemsCount);

                console.log(`Vendor ${vendorId}: Menu count = ${menuItemsCount} (Vendor: ${vendorCount}, RestItems: ${restaurantCount}, RestMenu: ${restaurantMenuCount})`);

            } catch (err) {
                console.warn('Could not fetch menu count', err);
            }

            return {
                id: vendorId,
                ...userData,
                email: userData.email || '',
                name: userData.name || userData.displayName || '',
                // Merge restaurant data
                cuisine: restaurantData.cuisine || [],
                logo: restaurantData.image || restaurantData.logo || userData.avatar || '',
                rating: restaurantData.rating || 0,
                isOpen: restaurantData.isOpen !== undefined ? restaurantData.isOpen : false,
                menuItemsCount: menuItemsCount,
                flaggedItemsCount: restaurantData.flaggedItemsCount || 0,
                averagePrice: restaurantData.averagePrice || 0,
                stats: restaurantData.stats || {
                    totalOrders: 0,
                    totalRevenue: 0,
                    averageRating: 0,
                    completionRate: 0
                },
                // Prefer restaurant status if active, otherwise user status
                status: userData.status || 'pending',
                restaurantStatus: restaurantData.status || 'inactive'
            };
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
        return snapshot.docs.map(doc => {
            const data = doc.data() as any;
            return { id: doc.id, ...data };
        });
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
        return snapshot.docs.map(doc => {
            const data = doc.data() as any;
            return {
                id: doc.id,
                ...data,
                requestDate: data.requestDate?.toDate(),
                expectedDate: data.expectedDate?.toDate()
            };
        });
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
        const [usersSnap, ordersSnap, restaurantsSnap, menuItemsSnap, menuSnap] = await Promise.all([
            getDocs(collection(db, 'users')),
            getDocs(collection(db, 'orders')),
            getDocs(collection(db, 'restaurants')),
            getDocs(collectionGroup(db, 'menuItems')),
            getDocs(collectionGroup(db, 'menu'))
        ]);

        // Debug logging
        console.log('Admin Stats Debug:');
        console.log('- Users:', usersSnap.docs.length);
        console.log('- Orders:', ordersSnap.docs.length);
        console.log('- Restaurants:', restaurantsSnap.docs.length);
        console.log('- Menu Items (menuItems):', menuItemsSnap.docs.length);
        console.log('- Menu Items (menu):', menuSnap.docs.length);

        // Calculate user counts by role
        const users = usersSnap.docs.map(doc => {
            const data = doc.data();
            // console.log(`- User ${doc.id}: role=${data.role}`);
            return data;
        });
        const customersCount = users.filter(user => user.role === 'customer').length;
        const vendorsCount = users.filter(user => user.role === 'vendor').length;
        const adminsCount = users.filter(user => user.role === 'admin').length;

        console.log(`- Counts: Customers=${customersCount}, Vendors=${vendorsCount}, Admins=${adminsCount}`);

        // Calculate order statistics
        const orders = ordersSnap.docs.map(doc => doc.data());
        const totalOrders = orders.length;

        const completedOrders = orders.filter(order => {
            const s = order.status?.toLowerCase();
            return ['collected', 'delivered', 'completed'].includes(s);
        }).length;

        const pendingOrders = orders.filter(order => {
            const s = order.status?.toLowerCase();
            return ['pending', 'placed', 'accepted', 'confirmed', 'preparing', 'ready'].includes(s);
        }).length;

        // Calculate revenue
        const totalRevenue = orders
            .filter(order => {
                const pStatus = (order.paymentStatus || order.payment?.status)?.toLowerCase();
                const oStatus = order.status?.toLowerCase();
                return pStatus === 'completed' || pStatus === 'paid' ||
                    oStatus === 'collected' || oStatus === 'delivered' || oStatus === 'completed';
            })
            .reduce((sum, order) => sum + (order.pricing?.totalAmount || order.totalAmount || 0), 0);

        // Calculate restaurant and menu stats
        const restaurants = restaurantsSnap.docs.map(doc => doc.data());
        const activeRestaurants = restaurants.filter(restaurant => restaurant.status === 'active').length;

        // Combine menu items from both sources
        const allMenuItems = [...menuItemsSnap.docs, ...menuSnap.docs];
        const totalMenuItems = allMenuItems.length;
        const flaggedMenuItems = allMenuItems.filter(doc => doc.data().flagged === true).length;

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

        // Get recent menu items (from both locations)
        // Note: collectionGroup queries with orderBy require an index. 
        // If this fails, check console for index creation link.
        const recentMenuItemsQuery = query(
            collectionGroup(db, 'menuItems'),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const recentMenuQuery = query(
            collectionGroup(db, 'menu'),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const [menuItemsSnap, menuSnap] = await Promise.all([
            getDocs(recentMenuItemsQuery).catch(err => {
                console.warn('Error fetching recent menuItems (check indexes):', err);
                return { docs: [] };
            }),
            getDocs(recentMenuQuery).catch(err => {
                console.warn('Error fetching recent menu (check indexes):', err);
                return { docs: [] };
            })
        ]);

        const activities: any[] = [];

        // Helper to safely parse dates
        const parseDate = (date: any) => {
            if (!date) return new Date();
            if (date.toDate && typeof date.toDate === 'function') return date.toDate();
            if (date instanceof Date) return date;
            if (typeof date === 'number') return new Date(date);
            if (typeof date === 'string') return new Date(date);
            if (date.seconds) return new Date(date.seconds * 1000);
            return new Date();
        };

        // Add recent orders
        ordersSnap.docs.forEach(doc => {
            const data = doc.data();
            activities.push({
                id: `order-${doc.id}`,
                type: 'order',
                description: `New order placed by ${data.customerName || data.userDetails?.name || 'Customer'}`,
                amount: (data as any).pricing?.totalAmount || (data as any).totalAmount || 0,
                timestamp: parseDate(data.createdAt),
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
                timestamp: parseDate(data.createdAt),
                status: data.status || 'active'
            });
        });

        // Add recent menu items
        [...menuItemsSnap.docs, ...menuSnap.docs].forEach(doc => {
            const data = doc.data();
            activities.push({
                id: `menu-${doc.id}`,
                type: 'menu',
                description: `New menu item added: ${data.name}`,
                timestamp: parseDate(data.createdAt),
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
