import {
  doc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  onSnapshot,
  Timestamp,
  increment
} from 'firebase/firestore';
import { addDoc } from 'firebase/firestore';
import { db } from './firebase-config';
import { Order, OrderStatus } from './firebase-types';

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
    items: [],
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