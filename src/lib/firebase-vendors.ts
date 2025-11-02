import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  Timestamp,
  orderBy,
  addDoc
} from 'firebase/firestore';
import { db } from './firebase-config';

// Get vendor/restaurant profile
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