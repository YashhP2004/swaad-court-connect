import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  limit
} from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from './firebase-config';

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
}

// Admin operations
export async function getAllVendors(status?: string) {
  try {
    console.log('getAllVendors: Fetching vendors with status:', status);
    let vendorQuery: any = collection(db, 'users');
    const constraints = [where('role', '==', 'vendor')];

    if (status && status !== 'all') {
      constraints.push(where('status', '==', status));
    }

    // Try with orderBy first, fallback to without orderBy if index doesn't exist
    try {
      vendorQuery = query(vendorQuery, ...constraints, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(vendorQuery);
      const vendors = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        email: doc.data().email || '',
        name: doc.data().name || doc.data().displayName || '',
      }));
      return vendors;
    } catch (indexError) {
      console.warn('Index not found, falling back to unordered query');
      vendorQuery = query(vendorQuery, ...constraints);
      const snapshot = await getDocs(vendorQuery);
      const vendors = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        email: doc.data().email || '',
        name: doc.data().name || doc.data().displayName || '',
      }));
      return vendors.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
        return bTime - aTime;
      });
    }
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

export async function getAllOrdersForAdmin(status?: string, limitCount: number = 50) {
  try {
    let ordersQuery: any = collection(db, 'orders');

    if (status && status !== 'all') {
      ordersQuery = query(ordersQuery, where('status', '==', status));
    }

    // Try with orderBy first, fallback to without orderBy if index doesn't exist
    try {
      ordersQuery = query(ordersQuery, orderBy('createdAt', 'desc'), limit(limitCount));
      const snapshot = await getDocs(ordersQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (indexError) {
      console.warn('Index not found, falling back to unordered query with limit');
      ordersQuery = query(ordersQuery, limit(limitCount));
      const snapshot = await getDocs(ordersQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
          const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
          return bTime - aTime;
        });
    }
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