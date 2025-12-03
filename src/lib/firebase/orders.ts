import {
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    query,
    where,
    onSnapshot,
    orderBy,
    limit,
    Timestamp,
    increment,
    arrayUnion,
    addDoc,
    getDocs
} from 'firebase/firestore';
import { db } from './config';
import { Order, OrderStatus, VendorOrderStatus } from '../types';

// Order Management Functions
export async function createOrder(orderData: Partial<Order>): Promise<string> {
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const paymentId = orderData.payment?.transactionId || `pay_${Date.now()}`;
    const timestamp = Timestamp.now();

    // Group items by restaurant
    const itemsByRestaurant = (orderData.items || []).reduce((acc, item) => {
        const restId = item.restaurantId || 'unknown';
        if (!acc[restId]) {
            acc[restId] = {
                restaurantName: item.restaurantName || 'Unknown Restaurant',
                items: [],
                subtotal: 0
            };
        }
        acc[restId].items.push(item);
        acc[restId].subtotal += item.totalPrice || 0;
        return acc;
    }, {} as Record<string, { restaurantName: string; items: any[]; subtotal: number }>);

    const createdOrderIds: string[] = [];

    // Create an order for each restaurant
    for (const [restaurantId, data] of Object.entries(itemsByRestaurant)) {
        const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const orderNumber = `SC${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;

        const taxes = Math.round(data.subtotal * 0.05); // 5% tax
        const totalAmount = data.subtotal + taxes; // No delivery fee for now

        const order: Order = {
            id: orderId,
            groupId,
            paymentId,
            orderNumber,
            status: 'Placed',
            vendorStatus: 'queued', // Auto-accept paid orders
            statusHistory: [{
                status: 'Placed',
                timestamp: timestamp,
                note: 'Order received and queued for preparation'
            }],
            timing: {
                orderPlaced: timestamp,
                estimatedReady: Timestamp.fromMillis(timestamp.toMillis() + 25 * 60000),
                actualReady: null,
                servedAt: null,
                completedAt: null
            },
            payment: {
                ...(orderData.payment || {}),
                method: orderData.payment?.method || 'Cash',
                status: orderData.payment?.status || 'Pending',
                transactionId: paymentId,
                paidAt: orderData.payment?.paidAt || null
            },
            pricing: {
                subtotal: data.subtotal,
                taxes: taxes,
                discount: 0,
                totalAmount: totalAmount
            },
            totalAmount: totalAmount,
            dineIn: orderData.dineIn || {
                tableNumber: '1',
                seatingArea: 'Main Hall',
                guestCount: 1
            },
            restaurantIds: [restaurantId],
            restaurantBreakdown: [{
                restaurantId,
                restaurantName: data.restaurantName,
                itemCount: data.items.length,
                totalAmount: totalAmount
            }],
            items: data.items,
            createdAt: timestamp,
            updatedAt: timestamp,
            source: 'mobile_app',
            userId: orderData.userId || '',
            restaurantId: restaurantId,
            restaurantName: data.restaurantName,
            userDetails: orderData.userDetails || { name: 'Customer' }
        };

        // Create in main orders collection
        await setDoc(doc(db, 'orders', orderId), order);

        // Create in user's subcollection for faster queries
        if (orderData.userId) {
            const userOrderRef = doc(db, `users/${orderData.userId}/orders`, orderId);
            await setDoc(userOrderRef, {
                ...order,
                itemsSummary: data.items.slice(0, 2).map(item =>
                    `${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}`
                ).join(', ')
            });
        }

        createdOrderIds.push(orderId);
        console.log(`Order created: ${orderId} for restaurant: ${restaurantId}`);

        // Update active orders count for restaurant
        try {
            const restaurantRef = doc(db, 'restaurants', restaurantId);
            await updateDoc(restaurantRef, {
                activeOrders: increment(1)
            });
        } catch (error) {
            console.error(`Error updating active orders for restaurant ${restaurantId}:`, error);
        }
    }

    // Update user stats with total amount
    if (orderData.userId) {
        const totalOrderAmount = Object.values(itemsByRestaurant).reduce((sum, data) => {
            return sum + data.subtotal + Math.round(data.subtotal * 0.05);
        }, 0);

        const loyaltyPointsEarned = Math.floor(totalOrderAmount * 0.1);
        await updateUserOrderStats(orderData.userId, totalOrderAmount, loyaltyPointsEarned);
    }

    return groupId;
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
                    discount: data.pricing?.discount || 0,
                    totalAmount: data.pricing?.totalAmount || data.totalAmount || 0
                },
                dineIn: data.dineIn || {
                    tableNumber: data.dineIn?.tableNumber || data.tableNumber || '1',
                    seatingArea: data.dineIn?.seatingArea || 'Main Hall',
                    guestCount: data.dineIn?.guestCount || 1
                },
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
                totalAmount: data.pricing?.totalAmount || data.totalAmount || 0,
                tableNumber: data.dineIn?.tableNumber || data.tableNumber || '1',
                items: (data.items || []).map((item: any) => ({
                    ...item,
                    restaurantId: item.restaurantId || data.restaurantId,
                    restaurantName: item.restaurantName || data.restaurantName
                })),
                userId: data.userId || userId,
                restaurantId: data.restaurantId || '',
                restaurantName: data.restaurantName || 'Unknown Restaurant',
                status: data.status || 'Placed',
                vendorStatus: (data.vendorStatus as VendorOrderStatus | undefined) || 'pending'
            } as Order;

            return processedOrder;
        })
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

// Update order status for vendors
export async function updateOrderStatus(orderId: string, status: VendorOrderStatus, vendorId: string): Promise<void> {
    try {
        const orderRef = doc(db, 'orders', orderId);

        // Get current order state to check for status transitions
        const currentOrderSnap = await getDoc(orderRef);
        if (!currentOrderSnap.exists()) {
            throw new Error('Order not found');
        }
        const currentOrderData = currentOrderSnap.data();
        const prevVendorStatus = currentOrderData.vendorStatus;
        const restaurantId = currentOrderData.restaurantId;

        const statusMap: Record<VendorOrderStatus, OrderStatus> = {
            queued: 'Placed',
            preparing: 'Preparing',
            ready: 'Ready to Serve',
            collected: 'Served',
            completed: 'Completed',
            cancelled: 'Cancelled'
        };

        const userStatus = statusMap[status] || 'Placed';
        const timestamp = Timestamp.now();

        const statusHistoryEntry = {
            status: userStatus,
            timestamp,
            note: `Vendor updated to ${status}`
        } as const;

        const updateData: any = {
            status: userStatus,
            vendorStatus: status,
            updatedAt: timestamp,
            statusHistory: arrayUnion(statusHistoryEntry)
        };

        // Generate OTP when order is marked as ready
        if (status === 'ready') {
            const { generatePickupOTP, createPickupOTPData } = await import('./pickupOtp');
            const otp = generatePickupOTP();
            const otpData = await createPickupOTPData(otp);
            updateData.pickupOTP = otpData;
            console.log('🔐 Generated pickup OTP for order:', orderId, 'OTP:', otp);
        }

        await updateDoc(orderRef, updateData);

        // Update restaurant active orders count based on transition
        // Active statuses: queued, preparing
        const isActive = (s: string) => ['queued', 'preparing'].includes(s);
        const wasActive = isActive(prevVendorStatus);
        const isNowActive = isActive(status);

        if (restaurantId) {
            const restaurantRef = doc(db, 'restaurants', restaurantId);
            if (wasActive && !isNowActive) {
                // Transitioned from active to inactive (e.g., preparing -> ready)
                await updateDoc(restaurantRef, {
                    activeOrders: increment(-1)
                }).catch(e => console.error('Error decrementing active orders:', e));
            } else if (!wasActive && isNowActive) {
                // Transitioned from inactive to active (unlikely but possible)
                await updateDoc(restaurantRef, {
                    activeOrders: increment(1)
                }).catch(e => console.error('Error incrementing active orders:', e));
            }
        }

        const orderSnap = await getDoc(orderRef);
        if (orderSnap.exists()) {
            const orderData = orderSnap.data();
            const userOrdersRef = doc(db, `users/${orderData.userId}/orders`, orderId);
            await updateDoc(userOrdersRef, updateData).catch(() => { });

            try {
                const notificationMessage = status === 'ready'
                    ? `Your order #${orderId.slice(-6)} is ready for pickup! Check your OTP.`
                    : `Your order #${orderId.slice(-6)} is now ${userStatus}`;

                await addDoc(collection(db, 'notifications'), {
                    userId: orderData.userId,
                    type: 'order_status_update',
                    title: 'Order Status Updated',
                    message: notificationMessage,
                    orderId: orderId,
                    isRead: false,
                    createdAt: timestamp
                });
            } catch (error) {
                console.error('Error creating notification:', error);
            }
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        throw error;
    }
}

// Helper function to generate OTP for existing ready orders without OTP
export async function generateOTPForReadyOrder(orderId: string): Promise<string> {
    try {
        const { auth } = await import('./config');

        if (!auth.currentUser) {
            throw new Error('User must be logged in to generate OTP');
        }

        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
            throw new Error('Order not found');
        }

        const orderData = orderSnap.data();

        // Verify ownership
        if (orderData.userId !== auth.currentUser.uid) {
            console.error('Permission denied: User is not the owner of this order', {
                orderUserId: orderData.userId,
                currentUserId: auth.currentUser.uid
            });
            throw new Error('You do not have permission to generate OTP for this order');
        }

        // Generate new OTP for ready orders (even if one already exists - for regeneration)
        if (orderData.vendorStatus === 'ready') {
            const { generatePickupOTP, createPickupOTPData } = await import('./pickupOtp');
            const otp = generatePickupOTP();
            const otpData = await createPickupOTPData(otp);

            try {
                await updateDoc(orderRef, {
                    pickupOTP: otpData,
                    updatedAt: Timestamp.now()
                });
            } catch (updateError: any) {
                console.error('Error updating main order document:', updateError);
                if (updateError.code === 'permission-denied') {
                    throw new Error('Permission denied updating order. Please contact support.');
                }
                throw updateError;
            }

            // Also update user subcollection if it exists
            if (orderData.userId) {
                const userOrdersRef = doc(db, `users/${orderData.userId}/orders`, orderId);
                await updateDoc(userOrdersRef, {
                    pickupOTP: otpData,
                    updatedAt: Timestamp.now()
                }).catch((e) => console.warn('Failed to update user subcollection:', e));
            }

            console.log('🔐 Generated OTP for ready order:', orderId, 'OTP:', otp);
            return otp;
        }

        return orderData.pickupOTP?.plainText || '';
    } catch (error) {
        console.error('Error generating OTP for ready order:', error);
        throw error;
    }
}

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

export async function getAllOrdersForAdmin(status?: string, limitCount: number = 50) {
    try {
        let ordersQuery: any = collection(db, 'orders');

        if (status && status !== 'all') {
            ordersQuery = query(ordersQuery, where('status', '==', status));
        }

        // ordersQuery = query(ordersQuery, orderBy('createdAt', 'desc'), limit(limitCount));
        console.log('Fetching orders for admin...');
        const snapshot = await getDocs(ordersQuery);
        console.log(`Fetched ${snapshot.docs.length} orders`);

        return snapshot.docs.map(doc => {
            const data = doc.data() as any;
            return {
                id: doc.id,
                ...data,
                customerName: data.customerName || data.userDetails?.name || 'Customer',
                customerPhone: data.customerPhone || data.userDetails?.phone || 'No phone',
                customerEmail: data.customerEmail || data.userDetails?.email || '',
                items: (data.items || []).map((item: any) => {
                    const quantity = Number(item.quantity) || 1;
                    let price = Number(item.price || item.unitPrice || 0);
                    if (isNaN(price)) price = 0;
                    return {
                        ...item,
                        quantity,
                        price
                    };
                }),
                totalAmount: isNaN(Number(data.totalAmount || data.pricing?.totalAmount)) ? 0 : Number(data.totalAmount || data.pricing?.totalAmount),
                paymentStatus: data.paymentStatus || data.payment?.status || 'pending',
                paymentMethod: data.paymentMethod || data.payment?.method || 'Unknown',
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now())
            };
        });
    } catch (error) {
        console.error('Error getting all orders for admin:', error);
        throw error;
    }
};
