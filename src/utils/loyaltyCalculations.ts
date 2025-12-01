/**
 * Loyalty Points Utility Functions
 * Handles validation and calculations for loyalty points redemption
 */

export const POINTS_TO_CURRENCY_RATIO = 0.1; // 100 points = ₹10 (0.1 rupees per point)
export const MIN_ORDER_FOR_REDEMPTION = 200; // Minimum order value to use points
export const MIN_POINTS_TO_REDEEM = 100; // Minimum points that can be redeemed
export const MAX_DISCOUNT_PERCENTAGE = 0.5; // Maximum 50% discount
export const POINTS_INCREMENT = 100; // Points must be redeemed in multiples of 100

export interface PointsRedemptionValidation {
    valid: boolean;
    error?: string;
    maxPointsAllowed?: number;
    maxDiscountAllowed?: number;
}

export interface PointsRedemptionResult {
    pointsToRedeem: number;
    discountAmount: number;
    finalAmount: number;
}

/**
 * Validate if points redemption is allowed
 */
export function validatePointsRedemption(
    availablePoints: number,
    pointsToRedeem: number,
    orderSubtotal: number
): PointsRedemptionValidation {
    // Check minimum order value
    if (orderSubtotal < MIN_ORDER_FOR_REDEMPTION) {
        return {
            valid: false,
            error: `Minimum order value of ₹${MIN_ORDER_FOR_REDEMPTION} required to use points`
        };
    }

    // Check minimum points
    if (pointsToRedeem < MIN_POINTS_TO_REDEEM) {
        return {
            valid: false,
            error: `Minimum ${MIN_POINTS_TO_REDEEM} points required for redemption`
        };
    }

    // Check if points are in valid increments
    if (pointsToRedeem % POINTS_INCREMENT !== 0) {
        return {
            valid: false,
            error: `Points must be redeemed in multiples of ${POINTS_INCREMENT}`
        };
    }

    // Check if user has enough points
    if (pointsToRedeem > availablePoints) {
        return {
            valid: false,
            error: `You only have ${availablePoints} points available`
        };
    }

    // Calculate maximum allowed discount (50% of order)
    const maxDiscountAllowed = orderSubtotal * MAX_DISCOUNT_PERCENTAGE;
    const requestedDiscount = pointsToRedeem * POINTS_TO_CURRENCY_RATIO;

    // Check if discount exceeds maximum
    if (requestedDiscount > maxDiscountAllowed) {
        const maxPointsAllowed = Math.floor(maxDiscountAllowed / POINTS_TO_CURRENCY_RATIO);
        // Round down to nearest increment
        const roundedMaxPoints = Math.floor(maxPointsAllowed / POINTS_INCREMENT) * POINTS_INCREMENT;

        return {
            valid: false,
            error: `Maximum ₹${maxDiscountAllowed.toFixed(0)} discount allowed (50% of order). You can redeem up to ${roundedMaxPoints} points.`,
            maxPointsAllowed: roundedMaxPoints,
            maxDiscountAllowed
        };
    }

    return { valid: true };
}

/**
 * Calculate discount amount from points
 */
export function calculateLoyaltyDiscount(pointsToRedeem: number): number {
    return pointsToRedeem * POINTS_TO_CURRENCY_RATIO;
}

/**
 * Calculate final amount after applying loyalty discount
 */
export function applyLoyaltyDiscount(
    orderSubtotal: number,
    pointsToRedeem: number
): PointsRedemptionResult {
    const discountAmount = calculateLoyaltyDiscount(pointsToRedeem);
    const finalAmount = Math.max(0, orderSubtotal - discountAmount);

    return {
        pointsToRedeem,
        discountAmount,
        finalAmount
    };
}

/**
 * Calculate maximum points that can be redeemed for an order
 */
export function getMaxRedeemablePoints(
    availablePoints: number,
    orderSubtotal: number
): number {
    // Maximum discount is 50% of order
    const maxDiscount = orderSubtotal * MAX_DISCOUNT_PERCENTAGE;

    // Convert to points
    const maxPointsFromDiscount = Math.floor(maxDiscount / POINTS_TO_CURRENCY_RATIO);

    // Take the minimum of available points and max allowed points
    const maxPoints = Math.min(availablePoints, maxPointsFromDiscount);

    // Round down to nearest increment
    const roundedMaxPoints = Math.floor(maxPoints / POINTS_INCREMENT) * POINTS_INCREMENT;

    return Math.max(0, roundedMaxPoints);
}

/**
 * Calculate points earned from an order
 */
export function calculatePointsEarned(orderAmount: number): number {
    return Math.floor(orderAmount * 0.1); // 10% of order value
}

/**
 * Format points as currency
 */
export function pointsToCurrency(points: number): string {
    const amount = points * POINTS_TO_CURRENCY_RATIO;
    return `₹${amount.toFixed(0)}`;
}

/**
 * Format currency as points
 */
export function currencyToPoints(amount: number): number {
    return Math.floor(amount / POINTS_TO_CURRENCY_RATIO);
}
