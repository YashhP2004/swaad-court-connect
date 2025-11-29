// Fixed getVendorAnalytics function - no composite index needed
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './config';

export async function getVendorAnalytics(vendorId: string, dateRange: string): Promise<any> {
    try {
        console.log('getVendorAnalytics called with:', { vendorId, dateRange });

        const now = new Date();
        let startDate: Date;
        let previousStartDate: Date;

        switch (dateRange) {
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                previousStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                previousStartDate = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        }

        // Simple query with only restaurantId (no composite index needed)
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('restaurantId', '==', vendorId));

        console.log('Fetching orders for restaurantId:', vendorId);
        const snapshot = await getDocs(q);
        console.log('Total orders fetched:', snapshot.docs.length);

        // Filter in memory to avoid index requirement
        const allOrders = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(order => {
                const createdAt = (order as any).createdAt?.toDate?.();
                return createdAt && createdAt >= previousStartDate;
            });

        console.log('Orders after date filter:', allOrders.length);

        // Current period orders
        const currentOrders = allOrders.filter(order => {
            const createdAt = (order as any).createdAt?.toDate?.();
            return createdAt && createdAt >= startDate;
        });

        // Previous period orders
        const previousOrders = allOrders.filter(order => {
            const createdAt = (order as any).createdAt?.toDate?.();
            return createdAt && createdAt >= previousStartDate && createdAt < startDate;
        });

        // Filter completed orders
        const completedOrders = currentOrders.filter(order =>
            ['completed', 'delivered'].includes((order as any).status?.toLowerCase())
        );

        const previousCompletedOrders = previousOrders.filter(order =>
            ['completed', 'delivered'].includes((order as any).status?.toLowerCase())
        );

        console.log('Completed orders:', completedOrders.length);

        // Calculate metrics
        const totalRevenue = completedOrders.reduce((sum, order) =>
            sum + ((order as any).pricing?.totalAmount || (order as any).totalAmount || 0), 0
        );
        const totalOrders = completedOrders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        const uniqueCustomers = new Set(completedOrders.map(order => (order as any).userId || (order as any).customerId));
        const totalCustomers = uniqueCustomers.size;

        const completionRate = currentOrders.length > 0
            ? Math.round((completedOrders.length / currentOrders.length) * 100)
            : 0;

        const previousRevenue = previousCompletedOrders.reduce((sum, order) =>
            sum + ((order as any).pricing?.totalAmount || (order as any).totalAmount || 0), 0
        );

        const growthRate = previousRevenue > 0
            ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100)
            : totalRevenue > 0 ? 100 : 0;

        // Group by date
        const dailyData: Record<string, any> = {};
        completedOrders.forEach(order => {
            const date = (order as any).createdAt?.toDate?.()?.toDateString() || new Date().toDateString();
            if (!dailyData[date]) {
                dailyData[date] = { revenue: 0, orders: 0, customers: new Set() };
            }
            dailyData[date].revenue += ((order as any).pricing?.totalAmount || (order as any).totalAmount || 0);
            dailyData[date].orders += 1;
            dailyData[date].customers.add((order as any).userId || (order as any).customerId);
        });

        const salesData = Object.entries(dailyData)
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
            .map(([date, data]: [string, any]) => ({
                period: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                revenue: data.revenue,
                orders: data.orders,
                customers: data.customers.size
            }));

        // Top products
        const productSales: Record<string, any> = {};
        completedOrders.forEach(order => {
            const items = (order as any).items || [];
            items.forEach((item: any) => {
                const productId = item.id || item.productId || item.name;
                if (!productSales[productId]) {
                    productSales[productId] = {
                        id: productId,
                        name: item.name || 'Unknown Product',
                        category: item.category || 'Uncategorized',
                        totalSold: 0,
                        revenue: 0,
                        isVeg: item.isVeg !== undefined ? item.isVeg : true
                    };
                }
                productSales[productId].totalSold += item.quantity || 1;
                productSales[productId].revenue += (item.price || 0) * (item.quantity || 1);
            });
        });

        const topProducts = Object.values(productSales)
            .sort((a: any, b: any) => b.revenue - a.revenue)
            .slice(0, 10);

        const result = {
            totalRevenue,
            totalOrders,
            avgOrderValue,
            totalCustomers,
            growthRate,
            completionRate,
            salesData,
            topProducts
        };

        console.log('Analytics result:', result);
        return result;
    } catch (error) {
        console.error('Error fetching vendor analytics:', error);
        return {
            totalRevenue: 0,
            totalOrders: 0,
            avgOrderValue: 0,
            totalCustomers: 0,
            growthRate: 0,
            completionRate: 0,
            salesData: [],
            topProducts: []
        };
    }
}
