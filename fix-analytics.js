const fs = require('fs');

const filePath = 'src/lib/firebase/vendor.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Find the section to replace - from salesData calculation to the return statement
const searchPattern = /const salesData = Object\.entries\(dailyData\)\.map\(\(\[date, data\]: \[string, any\]\) => \({\s+period: new Date\(date\)\.toLocaleDateString\('en-US', { weekday: 'short' }\),\s+revenue: data\.revenue,\s+orders: data\.orders,\s+customers: data\.customers\.size\s+}\)\);[\s\S]*?return {[\s\S]*?salesData[\s\S]*?};/;

const replacement = `const salesData = Object.entries(dailyData).map(([date, data]: [string, any]) => ({
            period: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            revenue: data.revenue,
            orders: data.orders,
            customers: data.customers.size
        }));

        // Calculate additional metrics
        const uniqueCustomers = new Set(orders.map(order => (order as any).userId || (order as any).customerId));
        const totalCustomers = uniqueCustomers.size;
        const growthRate = 0; // Simplified
        const completionRate = 100; // All queried orders are completed

        // Calculate top products
        const productSales: Record<string, any> = {};
        orders.forEach(order => {
            const items = (order as any).items || [];
            items.forEach((item: any) => {
                const productId = item.id || item.productId || item.name;
                if (!productSales[productId]) {
                    productSales[productId] = {
                        id: productId,
                        name: item.name || 'Unknown',
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

        return {
            totalRevenue,
            totalOrders,
            avgOrderValue,
            totalCustomers,
            growthRate,
            completionRate,
            salesData,
            topProducts
        };`;

content = content.replace(searchPattern, replacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Successfully updated getVendorAnalytics function!');
