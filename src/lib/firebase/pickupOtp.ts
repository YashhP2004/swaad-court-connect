import { doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from './config';

/**
 * Generate a 4-digit OTP for pickup verification
 */
export function generatePickupOTP(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Hash OTP using simple SHA-256 (browser-compatible)
 */
async function hashOTP(otp: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(otp);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create OTP data structure for order
 */
export async function createPickupOTPData(otp: string) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

    const hash = await hashOTP(otp);

    return {
        plainText: otp, // Only for customer display
        hash: hash,
        generatedAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expiresAt),
        attempts: 0,
        maxAttempts: 5,
        isUsed: false
    };
}

/**
 * Check if OTP is expired
 */
export function isOTPExpired(expiresAt: Timestamp): boolean {
    const now = new Date();
    const expiry = expiresAt.toDate();
    return now > expiry;
}

/**
 * Verify pickup OTP
 */
export async function verifyPickupOTP(
    orderId: string,
    enteredOTP: string
): Promise<{
    success: boolean;
    message: string;
    attemptsRemaining?: number;
}> {
    try {
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
            return { success: false, message: 'Order not found' };
        }

        const orderData = orderSnap.data();
        const pickupOTP = orderData.pickupOTP;

        if (!pickupOTP) {
            return { success: false, message: 'No OTP generated for this order' };
        }

        // Check if OTP is already used
        if (pickupOTP.isUsed) {
            return { success: false, message: 'OTP has already been used' };
        }

        // Check if OTP is expired
        if (isOTPExpired(pickupOTP.expiresAt)) {
            return { success: false, message: 'OTP has expired' };
        }

        // Check if max attempts exceeded
        if (pickupOTP.attempts >= pickupOTP.maxAttempts) {
            return { success: false, message: 'Maximum verification attempts exceeded' };
        }

        // Hash entered OTP and compare
        const enteredHash = await hashOTP(enteredOTP);

        if (enteredHash === pickupOTP.hash) {
            // OTP is correct - mark as used
            await updateDoc(orderRef, {
                'pickupOTP.isUsed': true,
                'pickupOTP.verifiedAt': Timestamp.now(),
                'pickupOTP.plainText': null // Remove plain text after verification
            });

            return { success: true, message: 'OTP verified successfully' };
        } else {
            // OTP is incorrect - increment attempts
            const newAttempts = pickupOTP.attempts + 1;
            await updateDoc(orderRef, {
                'pickupOTP.attempts': newAttempts
            });

            const attemptsRemaining = pickupOTP.maxAttempts - newAttempts;
            return {
                success: false,
                message: `Invalid OTP. ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining`,
                attemptsRemaining
            };
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return { success: false, message: 'Failed to verify OTP' };
    }
}

/**
 * Get remaining time for OTP in minutes and seconds
 */
export function getOTPRemainingTime(expiresAt: Timestamp): {
    minutes: number;
    seconds: number;
    isExpired: boolean;
} {
    const now = new Date();
    const expiry = expiresAt.toDate();
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) {
        return { minutes: 0, seconds: 0, isExpired: true };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return { minutes, seconds, isExpired: false };
}
