import {
    signInWithPhoneNumber,
    ConfirmationResult,
    User as FirebaseUser,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signInWithRedirect,
    getRedirectResult
} from 'firebase/auth';
import { auth, getRecaptchaVerifier, clearRecaptchaVerifier, db } from './config';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Rate limiting storage
const RATE_LIMIT_KEY = 'phone_auth_attempts';
const RATE_LIMIT_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_ATTEMPTS_PER_HOUR = 3; // Maximum 3 attempts per hour per phone number

interface RateLimitData {
    phoneNumber: string;
    attempts: number;
    firstAttemptTime: number;
    lastAttemptTime: number;
}

// Get rate limit data from localStorage
function getRateLimitData(phoneNumber: string): RateLimitData | null {
    try {
        const stored = localStorage.getItem(`${RATE_LIMIT_KEY}_${phoneNumber}`);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch (error) {
        console.error('Error reading rate limit data:', error);
        return null;
    }
}

// Update rate limit data
function updateRateLimitData(phoneNumber: string): void {
    const now = Date.now();
    let data = getRateLimitData(phoneNumber);

    if (!data) {
        // First attempt
        data = {
            phoneNumber,
            attempts: 1,
            firstAttemptTime: now,
            lastAttemptTime: now
        };
    } else {
        // Check if we should reset (more than 1 hour has passed)
        if (now - data.firstAttemptTime > RATE_LIMIT_DURATION) {
            data = {
                phoneNumber,
                attempts: 1,
                firstAttemptTime: now,
                lastAttemptTime: now
            };
        } else {
            // Increment attempts
            data.attempts += 1;
            data.lastAttemptTime = now;
        }
    }

    try {
        localStorage.setItem(`${RATE_LIMIT_KEY}_${phoneNumber}`, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving rate limit data:', error);
    }
}

// Check if rate limit is exceeded
function isRateLimitExceeded(phoneNumber: string): { exceeded: boolean; waitTime?: number } {
    const data = getRateLimitData(phoneNumber);

    if (!data) {
        return { exceeded: false };
    }

    const now = Date.now();
    const timeSinceFirst = now - data.firstAttemptTime;

    // If more than 1 hour has passed, reset is allowed
    if (timeSinceFirst > RATE_LIMIT_DURATION) {
        return { exceeded: false };
    }

    // Check if attempts exceeded
    if (data.attempts >= MAX_ATTEMPTS_PER_HOUR) {
        const waitTime = RATE_LIMIT_DURATION - timeSinceFirst;
        return { exceeded: true, waitTime };
    }

    return { exceeded: false };
}

// Format wait time for user display
function formatWaitTime(milliseconds: number): string {
    const minutes = Math.ceil(milliseconds / (60 * 1000));
    if (minutes < 60) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.ceil(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
}

// Phone Authentication Functions with improved error handling and rate limiting
export async function sendOTP(phoneNumber: string, retryCount: number = 0): Promise<ConfirmationResult> {
    const maxRetries = 2;

    // Check client-side rate limiting first
    const rateLimitCheck = isRateLimitExceeded(phoneNumber);
    if (rateLimitCheck.exceeded) {
        const waitTime = formatWaitTime(rateLimitCheck.waitTime || 0);
        throw new Error(`Too many OTP requests for this number. Please try again after ${waitTime}. You can use email login as an alternative.`);
    }

    try {
        // Get or initialize reCAPTCHA verifier
        const verifier = getRecaptchaVerifier();

        // Ensure phone number is in correct format
        const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

        console.log('Sending OTP to:', formattedPhone);

        // Update rate limit data before attempting
        updateRateLimitData(formattedPhone);

        const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, verifier);

        return confirmationResult;
    } catch (error: any) {
        console.error('Error sending OTP (attempt ' + (retryCount + 1) + '):', error);

        // Handle Firebase configuration errors
        if (error.code === 'auth/invalid-app-credential') {
            throw new Error('Phone authentication is not properly configured. Please contact support or use email login instead.');
        }

        if (error.code === 'auth/app-not-authorized') {
            throw new Error('This app is not authorized for phone authentication. Please contact support.');
        }

        if (error.code === 'auth/project-not-found') {
            throw new Error('Firebase project configuration error. Please contact support.');
        }

        // Handle specific reCAPTCHA errors
        if (error.message?.includes('reCAPTCHA') || error.code === 'auth/captcha-check-failed') {
            if (retryCount < maxRetries) {
                console.log('Retrying with fresh reCAPTCHA...');
                clearRecaptchaVerifier();
                // Wait a bit before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
                return sendOTP(phoneNumber, retryCount + 1);
            } else {
                throw new Error('reCAPTCHA verification failed. Please refresh the page and try again.');
            }
        }

        // Handle Firebase rate limiting errors
        if (error.code === 'auth/too-many-requests') {
            // This is Firebase's server-side rate limiting
            throw new Error('Firebase has temporarily blocked requests from this device due to unusual activity. This is a security measure. Please try one of these options:\n\n1. Wait 1-2 hours before trying again\n2. Use email login instead (recommended)\n3. Try from a different device or network\n4. Clear your browser cache and cookies');
        }

        if (error.code === 'auth/quota-exceeded') {
            throw new Error('SMS quota exceeded. Please use email login instead or try again later.');
        }

        // Handle other Firebase errors
        if (error.code === 'auth/invalid-phone-number') {
            throw new Error('Invalid phone number format. Please enter a valid phone number.');
        }

        throw error;
    }
};

export async function verifyOTP(confirmationResult: ConfirmationResult, otp: string): Promise<FirebaseUser> {
    try {
        const result = await confirmationResult.confirm(otp);
        return result.user;
    } catch (error: any) {
        console.error('Error verifying OTP:', error);

        // Provide specific error messages
        if (error.code === 'auth/invalid-verification-code') {
            throw new Error('Invalid OTP code. Please check and try again.');
        } else if (error.code === 'auth/code-expired') {
            throw new Error('OTP has expired. Please request a new code.');
        } else if (error.code === 'auth/too-many-requests') {
            throw new Error('Too many verification attempts. Please wait a few minutes and try again, or use email login.');
        }

        throw error;
    }
};

// Email/Password Authentication Functions
export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    } catch (error) {
        console.error('Error signing in with email:', error);
        throw error;
    }
};

export async function signUpWithEmail(email: string, password: string): Promise<FirebaseUser> {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        return result.user;
    } catch (error) {
        console.error('Error signing up with email:', error);
        throw error;
    }
};

// Utility function to clear rate limit data (for testing or user request)
export function clearRateLimitData(phoneNumber: string): void {
    try {
        localStorage.removeItem(`${RATE_LIMIT_KEY}_${phoneNumber}`);
        console.log('Rate limit data cleared for:', phoneNumber);
    } catch (error) {
        console.error('Error clearing rate limit data:', error);
    }
}

// Get remaining attempts for a phone number
export function getRemainingAttempts(phoneNumber: string): number {
    const data = getRateLimitData(phoneNumber);
    if (!data) return MAX_ATTEMPTS_PER_HOUR;

    const now = Date.now();
    if (now - data.firstAttemptTime > RATE_LIMIT_DURATION) {
        return MAX_ATTEMPTS_PER_HOUR;
    }

    return Math.max(0, MAX_ATTEMPTS_PER_HOUR - data.attempts);
}

// Google Sign-In Functions

// Helper function to create or update user profile in Firestore
async function createOrUpdateUserProfile(user: FirebaseUser) {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    const userData = {
        uid: user.uid,
        email: user.email,
        name: user.displayName || '',
        phone: user.phoneNumber || '',
        avatar: user.photoURL || '',
        role: 'customer',
        provider: 'google',
        updatedAt: serverTimestamp()
    };

    if (!userSnap.exists()) {
        // New user - create profile
        await setDoc(userRef, {
            ...userData,
            createdAt: serverTimestamp(),
            addresses: [],
            favorites: []
        });
    } else {
        // Existing user - update profile
        await setDoc(userRef, userData, { merge: true });
    }
}

// Google Sign-In with Popup (Recommended for Desktop)
export async function signInWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();

        // Request additional scopes
        provider.addScope('profile');
        provider.addScope('email');

        // Set custom parameters
        provider.setCustomParameters({
            prompt: 'select_account' // Forces account selection
        });

        const result = await signInWithPopup(auth, provider);

        // Get user info
        const user = result.user;
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;

        // Create/Update user profile in Firestore
        await createOrUpdateUserProfile(user);

        return {
            user,
            token,
            isNewUser: (result as any)._tokenResponse?.isNewUser || false
        };
    } catch (error: any) {
        console.error('Google Sign-In Error:', error);

        // Handle specific errors
        if (error.code === 'auth/popup-closed-by-user') {
            throw new Error('Sign-in cancelled. Please try again.');
        } else if (error.code === 'auth/popup-blocked') {
            throw new Error('Pop-up blocked. Please allow pop-ups for this site.');
        } else if (error.code === 'auth/account-exists-with-different-credential') {
            throw new Error('An account already exists with the same email. Please sign in using your original method.');
        } else if (error.code === 'auth/cancelled-popup-request') {
            // User closed popup, silently fail
            throw new Error('Sign-in cancelled.');
        }

        throw new Error(error.message || 'Failed to sign in with Google');
    }
}

// Google Sign-In with Redirect (Better for Mobile)
export async function signInWithGoogleRedirect() {
    try {
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');

        await signInWithRedirect(auth, provider);
    } catch (error: any) {
        console.error('Google Redirect Error:', error);
        throw new Error(error.message || 'Failed to initiate Google sign-in');
    }
}

// Handle redirect result (call this on app load)
export async function handleGoogleRedirectResult() {
    try {
        const result = await getRedirectResult(auth);

        if (result) {
            const user = result.user;
            await createOrUpdateUserProfile(user);

            return {
                user,
                isNewUser: (result as any)._tokenResponse?.isNewUser || false
            };
        }

        return null;
    } catch (error: any) {
        console.error('Redirect Result Error:', error);

        if (error.code === 'auth/account-exists-with-different-credential') {
            throw new Error('An account already exists with the same email. Please sign in using your original method.');
        }

        throw new Error(error.message || 'Failed to complete Google sign-in');
    }
}

