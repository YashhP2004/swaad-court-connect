import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    Timestamp,
    writeBatch,
    increment
} from 'firebase/firestore';
import { db } from './config';

// Types
export interface PayoutBatch {
    id: string;
    batchNumber: string;
    createdAt: Date;
    processedAt?: Date;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    totalAmount: number;
    vendorPayouts: VendorPayout[];
    createdBy: string;
    notes?: string;
}

export interface VendorPayout {
    vendorId: string;
    vendorName: string;
    amount: number;
    transactionCount: number;
    orderIds: string[];
    utrNumber?: string;
    status: 'queued' | 'processing' | 'paid' | 'failed';
}

export interface VendorBalance {
    vendorId: string;
    vendorName: string;
    pendingBalance: number;
    totalEarnings: number;
    totalPayouts: number;
    lastPayoutDate?: Date;
    lastPayoutAmount?: number;
    orderCount: number;
}

/**
 * Calculate pending balances for all vendors
 */
export async function calculateVendorPendingBalances(): Promise<VendorBalance[]> {
    try {
        console.log('🔍 Calculating vendor pending balances...');

        // Get all completed orders with completed payments
        const ordersRef = collection(db, 'orders');

        // First, try to get ALL orders to see what we have
        const allOrdersSnapshot = await getDocs(ordersRef);
        console.log(`📊 Total orders in database: ${allOrdersSnapshot.size}`);

        // Log order statuses
        const statusCounts: Record<string, number> = {};
        const paymentStatusCounts: Record<string, number> = {};

        allOrdersSnapshot.forEach(doc => {
            const order = doc.data();
            const status = order.status || 'unknown';
            const paymentStatus = order.payment?.status || 'unknown';

            statusCounts[status] = (statusCounts[status] || 0) + 1;
            paymentStatusCounts[paymentStatus] = (paymentStatusCounts[paymentStatus] || 0) + 1;
        });

        console.log('📈 Order statuses:', statusCounts);
        console.log('💳 Payment statuses:', paymentStatusCounts);

        // Now query for completed orders with completed payments
        // Note: We can't use compound queries with 'in' operator, so we'll filter in memory
        const ordersQuery = query(
            ordersRef,
            where('payment.status', '==', 'Completed')
        );

        const ordersSnapshot = await getDocs(ordersQuery);
        console.log(`✅ Orders with completed payment: ${ordersSnapshot.size}`);

        const vendorBalances = new Map<string, VendorBalance>();
        let processedOrders = 0;
        let pendingOrders = 0;

        for (const orderDoc of ordersSnapshot.docs) {
            const order = orderDoc.data();

            // Filter for completed/delivered orders
            const orderStatus = order.status?.toLowerCase();
            if (!['completed', 'delivered', 'ready'].includes(orderStatus)) {
                continue;
            }

            const vendorId = order.restaurantId || order.vendorId;
            const vendorName = order.restaurantName || 'Unknown Vendor';
            const totalAmount = order.pricing?.totalAmount || order.totalAmount || 0;

            if (!vendorId || totalAmount === 0) {
                console.warn(`⚠️ Skipping order ${orderDoc.id}: missing vendorId or amount`);
                continue;
            }

            const commission = totalAmount * 0.05; // 5% commission
            const vendorEarnings = totalAmount - commission;

            // Check if order has been paid out
            const payoutStatus = order.payoutStatus || 'pending';
            const isPending = payoutStatus === 'pending';

            if (isPending) {
                pendingOrders++;
            }

            if (!vendorBalances.has(vendorId)) {
                vendorBalances.set(vendorId, {
                    vendorId,
                    vendorName,
                    pendingBalance: 0,
                    totalEarnings: 0,
                    totalPayouts: 0,
                    orderCount: 0
                });
            }

            const balance = vendorBalances.get(vendorId)!;
            balance.totalEarnings += vendorEarnings;
            balance.orderCount += 1;

            if (isPending) {
                balance.pendingBalance += vendorEarnings;
            } else if (payoutStatus === 'paid') {
                balance.totalPayouts += vendorEarnings;
            }

            processedOrders++;
        }

        console.log(`📦 Processed ${processedOrders} orders`);
        console.log(`⏳ Pending orders: ${pendingOrders}`);
        console.log(`👥 Vendors found: ${vendorBalances.size}`);

        // Get last payout info for each vendor
        for (const [vendorId, balance] of vendorBalances.entries()) {
            try {
                const payoutBatchesRef = collection(db, 'payoutBatches');
                const payoutQuery = query(
                    payoutBatchesRef,
                    where('status', '==', 'completed'),
                    orderBy('processedAt', 'desc')
                );

                const payoutSnapshot = await getDocs(payoutQuery);

                for (const batchDoc of payoutSnapshot.docs) {
                    const batch = batchDoc.data();
                    const vendorPayout = batch.vendorPayouts?.find(
                        (vp: VendorPayout) => vp.vendorId === vendorId
                    );

                    if (vendorPayout) {
                        balance.lastPayoutDate = batch.processedAt?.toDate();
                        balance.lastPayoutAmount = vendorPayout.amount;
                        break;
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Could not fetch payout history for vendor ${vendorId}:`, error);
            }
        }

        const result = Array.from(vendorBalances.values())
            .filter(balance => balance.pendingBalance > 0)
            .sort((a, b) => b.pendingBalance - a.pendingBalance);

        console.log(`💰 Vendors with pending balance: ${result.length}`);
        result.forEach(v => {
            console.log(`  - ${v.vendorName}: ₹${v.pendingBalance.toFixed(2)} (${v.orderCount} orders)`);
        });

        return result;
    } catch (error) {
        console.error('❌ Error calculating vendor pending balances:', error);
        throw error;
    }
}

/**
 * Generate a new payout batch for selected vendors
 */
export async function generatePayoutBatch(
    vendorIds: string[],
    createdBy: string,
    notes?: string
): Promise<string> {
    try {
        const batch = writeBatch(db);
        const vendorBalances = await calculateVendorPendingBalances();
        const selectedVendors = vendorBalances.filter(v => vendorIds.includes(v.vendorId));

        if (selectedVendors.length === 0) {
            throw new Error('No vendors selected or no pending balances');
        }

        // Generate batch number
        const batchNumber = `BATCH-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        const batchId = doc(collection(db, 'payoutBatches')).id;

        // Get orders for each vendor
        const vendorPayouts: VendorPayout[] = [];
        let totalAmount = 0;

        for (const vendor of selectedVendors) {
            const ordersRef = collection(db, 'orders');
            // Use a broader query and filter in memory to match calculateVendorPendingBalances logic
            // This avoids issues with missing indexes or undefined fields in complex queries
            const ordersQuery = query(
                ordersRef,
                where('restaurantId', '==', vendor.vendorId),
                where('payment.status', '==', 'Completed')
            );

            const ordersSnapshot = await getDocs(ordersQuery);
            const orderIds: string[] = [];
            let vendorAmount = 0;

            ordersSnapshot.forEach(orderDoc => {
                const order = orderDoc.data();

                // 1. Check Order Status (match calculateVendorPendingBalances)
                const orderStatus = order.status?.toLowerCase();
                if (!['completed', 'delivered', 'ready'].includes(orderStatus)) {
                    return; // Skip non-completed orders
                }

                // 2. Check Payout Status (match calculateVendorPendingBalances)
                // Treat undefined/null as 'pending'
                const payoutStatus = order.payoutStatus || 'pending';
                if (payoutStatus !== 'pending') {
                    return; // Skip already processed/queued orders
                }

                const orderTotal = order.pricing?.totalAmount || order.totalAmount || 0;
                if (orderTotal === 0) return;

                const commission = orderTotal * 0.05;
                const earnings = orderTotal - commission;

                vendorAmount += earnings;
                orderIds.push(orderDoc.id);

                // Mark order as queued for payout
                batch.update(doc(db, 'orders', orderDoc.id), {
                    payoutStatus: 'queued',
                    payoutBatchId: batchId,
                    vendorEarnings: earnings
                });
            });

            vendorPayouts.push({
                vendorId: vendor.vendorId,
                vendorName: vendor.vendorName,
                amount: vendorAmount,
                transactionCount: orderIds.length,
                orderIds,
                status: 'queued'
            });

            totalAmount += vendorAmount;

            // Update vendor balance
            // Update vendor balance
            const vendorRef = doc(db, 'vendors', vendor.vendorId);
            batch.set(vendorRef, {
                pendingBalance: increment(-vendorAmount)
            }, { merge: true });
        }

        // Create payout batch
        const payoutBatchData: any = {
            batchNumber,
            createdAt: Timestamp.fromDate(new Date()),
            status: 'queued',
            totalAmount,
            vendorPayouts,
            createdBy
        };

        // Only add notes if it's provided
        if (notes) {
            payoutBatchData.notes = notes;
        }

        batch.set(doc(db, 'payoutBatches', batchId), payoutBatchData);

        await batch.commit();
        return batchId;
    } catch (error) {
        console.error('Error generating payout batch:', error);
        throw error;
    }
}

/**
 * Process a payout batch (mark as processing)
 */
export async function processPayoutBatch(batchId: string): Promise<void> {
    try {
        const batchRef = doc(db, 'payoutBatches', batchId);
        const batchDoc = await getDoc(batchRef);

        if (!batchDoc.exists()) {
            throw new Error('Payout batch not found');
        }

        const batchData = batchDoc.data();

        if (batchData.status !== 'queued') {
            throw new Error('Batch is not in queued status');
        }

        const batch = writeBatch(db);

        // Update batch status
        batch.update(batchRef, {
            status: 'processing'
        });

        // Update all orders in batch
        for (const vendorPayout of batchData.vendorPayouts) {
            for (const orderId of vendorPayout.orderIds) {
                batch.update(doc(db, 'orders', orderId), {
                    payoutStatus: 'processing'
                });
            }
        }

        await batch.commit();
    } catch (error) {
        console.error('Error processing payout batch:', error);
        throw error;
    }
}

/**
 * Complete a payout batch with UTR numbers
 */
export async function completePayoutBatch(
    batchId: string,
    utrNumbers: Record<string, string>
): Promise<void> {
    try {
        const batchRef = doc(db, 'payoutBatches', batchId);
        const batchDoc = await getDoc(batchRef);

        if (!batchDoc.exists()) {
            throw new Error('Payout batch not found');
        }

        const batchData = batchDoc.data();

        if (batchData.status !== 'processing') {
            throw new Error('Batch is not in processing status');
        }

        const batch = writeBatch(db);
        const processedAt = new Date();

        // Update vendor payouts with UTR numbers
        const updatedVendorPayouts = batchData.vendorPayouts.map((vp: VendorPayout) => ({
            ...vp,
            utrNumber: utrNumbers[vp.vendorId],
            status: 'paid'
        }));

        // Update batch
        batch.update(batchRef, {
            status: 'completed',
            processedAt: Timestamp.fromDate(processedAt),
            vendorPayouts: updatedVendorPayouts
        });

        // Update all orders
        for (const vendorPayout of batchData.vendorPayouts) {
            for (const orderId of vendorPayout.orderIds) {
                batch.update(doc(db, 'orders', orderId), {
                    payoutStatus: 'paid',
                    payoutDate: Timestamp.fromDate(processedAt)
                });
            }

            // Update vendor stats
            const vendorRef = doc(db, 'vendors', vendorPayout.vendorId);
            batch.update(vendorRef, {
                totalPayouts: increment(vendorPayout.amount),
                lastPayoutDate: Timestamp.fromDate(processedAt),
                lastPayoutAmount: vendorPayout.amount
            });
        }

        await batch.commit();
    } catch (error) {
        console.error('Error completing payout batch:', error);
        throw error;
    }
}

/**
 * Delete a payout batch and reset order statuses
 */
export async function deletePayoutBatch(batchId: string): Promise<void> {
    try {
        const batchRef = doc(db, 'payoutBatches', batchId);
        const batchSnap = await getDoc(batchRef);

        if (!batchSnap.exists()) {
            throw new Error('Batch not found');
        }

        const batchData = batchSnap.data() as PayoutBatch;
        const writeBatchOp = writeBatch(db);

        // 1. Reset all orders in this batch to 'pending'
        for (const vendorPayout of batchData.vendorPayouts) {
            for (const orderId of vendorPayout.orderIds) {
                const orderRef = doc(db, 'orders', orderId);
                writeBatchOp.update(orderRef, {
                    payoutStatus: 'pending',
                    payoutBatchId: null,
                    // We don't reset vendorEarnings as it's a property of the order itself
                });
            }

            // 2. Revert vendor pending balance (add back the amount)
            const vendorRef = doc(db, 'vendors', vendorPayout.vendorId);
            writeBatchOp.set(vendorRef, {
                pendingBalance: increment(vendorPayout.amount)
            }, { merge: true });
        }

        // 3. Delete the batch document
        writeBatchOp.delete(batchRef);

        await writeBatchOp.commit();
        console.log(`✅ Batch ${batchId} deleted and orders reset`);
    } catch (error) {
        console.error('Error deleting payout batch:', error);
        throw error;
    }
}

/**
 * Get payout history for a vendor
 */
export async function getVendorPayoutHistory(vendorId: string): Promise<PayoutBatch[]> {
    try {
        const payoutBatchesRef = collection(db, 'payoutBatches');
        const payoutQuery = query(
            payoutBatchesRef,
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(payoutQuery);
        const payouts: PayoutBatch[] = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const vendorPayout = data.vendorPayouts?.find(
                (vp: VendorPayout) => vp.vendorId === vendorId
            );

            if (vendorPayout) {
                payouts.push({
                    id: doc.id,
                    batchNumber: data.batchNumber,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    processedAt: data.processedAt?.toDate(),
                    status: data.status,
                    totalAmount: vendorPayout.amount,
                    vendorPayouts: [vendorPayout],
                    createdBy: data.createdBy,
                    notes: data.notes
                });
            }
        });

        return payouts;
    } catch (error) {
        console.error('Error getting vendor payout history:', error);
        throw error;
    }
}

/**
 * Get payout batch details
 */
export async function getPayoutBatchDetails(batchId: string): Promise<PayoutBatch | null> {
    try {
        const batchRef = doc(db, 'payoutBatches', batchId);
        const batchDoc = await getDoc(batchRef);

        if (!batchDoc.exists()) {
            return null;
        }

        const data = batchDoc.data();
        return {
            id: batchDoc.id,
            batchNumber: data.batchNumber,
            createdAt: data.createdAt?.toDate() || new Date(),
            processedAt: data.processedAt?.toDate(),
            status: data.status,
            totalAmount: data.totalAmount,
            vendorPayouts: data.vendorPayouts,
            createdBy: data.createdBy,
            notes: data.notes
        };
    } catch (error) {
        console.error('Error getting payout batch details:', error);
        throw error;
    }
}

/**
 * Request payout for a vendor
 */
export async function requestVendorPayout(
    vendorId: string,
    amount: number,
    bankDetails?: any
): Promise<string> {
    try {
        const requestId = doc(collection(db, 'payoutRequests')).id;

        // Get vendor info
        const vendorRef = doc(db, 'vendors', vendorId);
        const vendorDoc = await getDoc(vendorRef);

        if (!vendorDoc.exists()) {
            throw new Error('Vendor not found');
        }

        const vendorData = vendorDoc.data();

        await setDoc(doc(db, 'payoutRequests', requestId), {
            restaurantId: vendorId,
            restaurantName: vendorData.name || 'Unknown Vendor',
            amount,
            status: 'pending',
            requestedAt: Timestamp.now(),
            bankDetails: bankDetails || vendorData.bankDetails || {}
        });

        return requestId;
    } catch (error) {
        console.error('Error requesting vendor payout:', error);
        throw error;
    }
}

/**
 * Get all payout batches for admin
 */
export async function getAllPayoutBatches(): Promise<PayoutBatch[]> {
    try {
        const payoutBatchesRef = collection(db, 'payoutBatches');
        const payoutQuery = query(payoutBatchesRef, orderBy('createdAt', 'desc'));

        const snapshot = await getDocs(payoutQuery);
        const batches: PayoutBatch[] = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            batches.push({
                id: doc.id,
                batchNumber: data.batchNumber,
                createdAt: data.createdAt?.toDate() || new Date(),
                processedAt: data.processedAt?.toDate(),
                status: data.status,
                totalAmount: data.totalAmount,
                vendorPayouts: data.vendorPayouts || [],
                createdBy: data.createdBy,
                notes: data.notes
            });
        });

        return batches;
    } catch (error) {
        console.error('Error getting all payout batches:', error);
        throw error;
    }
}
