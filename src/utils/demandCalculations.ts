/**
 * Demand Indicator System - Calculation Utilities
 * Calculates restaurant demand levels, wait times, and capacity metrics
 */

export type DemandLevel = 'low' | 'medium' | 'high' | 'very-high';

export interface DemandMetrics {
    activeOrders: number;
    orderVelocity: number; // orders per minute
    capacityUtilization: number; // 0-100%
    demandScore: number; // 0-100+
    demandLevel: DemandLevel;
    estimatedWaitTime: number; // minutes
    lastUpdated: Date;
}

export interface KitchenCapacity {
    maxConcurrentOrders: number;
    baseWaitTime: number; // minutes
}

/**
 * Calculate demand score based on capacity utilization and order velocity
 * @param activeOrders - Current number of active orders
 * @param maxCapacity - Maximum concurrent orders the kitchen can handle
 * @param orderVelocity - Orders per minute (recent activity)
 * @returns Demand score (0-100+)
 */
export function calculateDemandScore(
    activeOrders: number,
    maxCapacity: number,
    orderVelocity: number
): number {
    // Capacity utilization contributes 60% to demand score
    const capacityScore = (activeOrders / Math.max(maxCapacity, 1)) * 60;

    // Order velocity contributes 40% to demand score (capped at 40)
    const velocityScore = Math.min(orderVelocity * 10, 40);

    const demandScore = capacityScore + velocityScore;

    return Math.round(demandScore);
}

/**
 * Determine demand level based on demand score
 * @param demandScore - Calculated demand score
 * @returns Demand level category
 */
export function getDemandLevel(demandScore: number): DemandLevel {
    if (demandScore < 25) return 'low';        // 🟢 0-24
    if (demandScore < 50) return 'medium';     // 🟡 25-49
    if (demandScore < 75) return 'high';       // 🟠 50-74
    return 'very-high';                        // 🔴 75+
}

/**
 * Calculate dynamic wait time based on demand score
 * Formula: minWait + (maxWait - minWait) * (demandScore / 100)
 * Capped at maxWait (30 mins)
 * @param baseWaitTime - Minimum wait time (default 10 mins)
 * @param demandScore - Current demand score
 * @returns Estimated wait time in minutes
 */
export function calculateDynamicWaitTime(
    baseWaitTime: number = 10,
    demandScore: number
): number {
    const minWait = baseWaitTime;
    // Allow wait time to extend based on demand, but keep it reasonable
    // If demand is 100%, wait time will be maxWait
    const maxWait = Math.max(minWait + 20, minWait * 2);

    // Calculate busy factor (0 to 1)
    // Cap demandScore at 100 for this calculation
    const rawFactor = Math.min(demandScore, 100) / 100;

    // Use quadratic curve so low demand has less impact
    // 20% demand -> 4% impact
    // 50% demand -> 25% impact
    // 80% demand -> 64% impact
    // 100% demand -> 100% impact
    const busyFactor = Math.pow(rawFactor, 2);

    // Linear interpolation with curved factor
    const waitTime = minWait + (maxWait - minWait) * busyFactor;

    return Math.round(waitTime);
}

/**
 * Get demand level configuration (colors, labels, icons)
 */
export function getDemandLevelConfig(level: DemandLevel) {
    const configs = {
        low: {
            icon: '🟢',
            label: 'Available',
            description: 'Fast service',
            color: 'green',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            textColor: 'text-green-700',
            badgeVariant: 'default' as const
        },
        medium: {
            icon: '🟡',
            label: 'Moderate',
            description: 'Normal wait',
            color: 'yellow',
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-200',
            textColor: 'text-yellow-700',
            badgeVariant: 'secondary' as const
        },
        high: {
            icon: '🟠',
            label: 'Busy',
            description: 'Longer wait',
            color: 'orange',
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-200',
            textColor: 'text-orange-700',
            badgeVariant: 'outline' as const
        },
        'very-high': {
            icon: '🔴',
            label: 'Very Busy',
            description: 'Significant delay',
            color: 'red',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            textColor: 'text-red-700',
            badgeVariant: 'destructive' as const
        }
    };

    return configs[level];
}

/**
 * Calculate capacity utilization percentage
 */
export function calculateCapacityUtilization(
    activeOrders: number,
    maxCapacity: number
): number {
    return Math.round((activeOrders / Math.max(maxCapacity, 1)) * 100);
}

/**
 * Determine if high demand alert should be shown
 */
export function shouldShowHighDemandAlert(
    capacityUtilization: number,
    threshold: number = 80
): boolean {
    return capacityUtilization >= threshold;
}

/**
 * Format wait time for display
 */
export function formatWaitTime(minutes: number): string {
    if (minutes < 1) return 'Less than 1 min';
    if (minutes === 1) return '1 min';
    if (minutes < 60) return `${minutes} mins`;

    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;

    if (remainingMins === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    return `${hours}h ${remainingMins}m`;
}

/**
 * Get recommendation message based on demand level
 */
export function getDemandRecommendation(level: DemandLevel): string {
    const recommendations = {
        low: '⚡ Order now for fastest service!',
        medium: '👍 Good time to order',
        high: '⏰ Expect longer wait times',
        'very-high': '🔥 Very busy - consider alternatives or order for later'
    };

    return recommendations[level];
}

/**
 * Calculate order velocity from recent orders
 * @param recentOrdersCount - Number of orders in the time period
 * @param timeWindowMinutes - Time window in minutes
 * @returns Orders per minute
 */
export function calculateOrderVelocity(
    recentOrdersCount: number,
    timeWindowMinutes: number
): number {
    if (timeWindowMinutes <= 0) return 0;
    return recentOrdersCount / timeWindowMinutes;
}

/**
 * Mock function to simulate demand metrics (for testing)
 */
export function generateMockDemandMetrics(
    activeOrders: number = 5,
    maxCapacity: number = 10
): DemandMetrics {
    const orderVelocity = Math.random() * 2; // 0-2 orders per minute
    const demandScore = calculateDemandScore(activeOrders, maxCapacity, orderVelocity);
    const demandLevel = getDemandLevel(demandScore);
    const capacityUtilization = calculateCapacityUtilization(activeOrders, maxCapacity);
    const estimatedWaitTime = calculateDynamicWaitTime(15, demandScore);

    return {
        activeOrders,
        orderVelocity: Math.round(orderVelocity * 100) / 100,
        capacityUtilization,
        demandScore,
        demandLevel,
        estimatedWaitTime,
        lastUpdated: new Date()
    };
}

/**
 * Calculate order velocity from Firebase order array
 * @param orders - Array of orders with createdAt timestamps
 * @param timeWindowHours - Time window to analyze (default: 0.25 hours = 15 mins)
 * @returns Orders per hour (normalized)
 */
export function calculateOrderVelocityFromOrders(
    orders: any[],
    timeWindowHours: number = 0.25
): number {
    if (!orders || orders.length === 0) return 0;

    const now = new Date();
    const timeWindowMs = timeWindowHours * 60 * 60 * 1000;
    const cutoffTime = new Date(now.getTime() - timeWindowMs);

    const recentOrders = orders.filter(order => {
        const orderTime = order.createdAt?.toDate?.() || order.createdAt;
        if (!orderTime) return false;

        const orderDate = orderTime instanceof Date ? orderTime : new Date(orderTime);
        return orderDate >= cutoffTime;
    });

    // Return orders per hour (velocity)
    // Formula: count / timeWindowHours
    // Example: 5 orders in 0.25h (15m) = 20 orders/hr
    return recentOrders.length / timeWindowHours;
}
