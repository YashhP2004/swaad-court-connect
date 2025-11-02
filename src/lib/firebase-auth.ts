import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  ConfirmationResult,
  User as FirebaseUser,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from './firebase-config';
import { PhoneAuthResult } from './firebase-types';

// Global reCAPTCHA verifier instance
let recaptchaVerifier: RecaptchaVerifier | null = null;

// Initialize RecaptchaVerifier for phone auth with better error handling
export function initializeRecaptcha(containerId: string = 'recaptcha-container'): RecaptchaVerifier {
  // Clear existing verifier if it exists
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch (error) {
      console.log('Error clearing existing reCAPTCHA:', error);
    }
    recaptchaVerifier = null;
  }

  // Ensure container exists
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.display = 'none';
    document.body.appendChild(container);
  }

  try {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: (response: any) => {
        console.log('reCAPTCHA solved:', response);
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
        // Reinitialize on expiry
        if (recaptchaVerifier) {
          recaptchaVerifier.clear();
          recaptchaVerifier = null;
        }
      },
      'error-callback': (error: any) => {
        console.error('reCAPTCHA error:', error);
      }
    });

    return recaptchaVerifier;
  } catch (error) {
    console.error('Error initializing reCAPTCHA:', error);
    throw new Error('Failed to initialize reCAPTCHA. Please refresh the page and try again.');
  }
};

// Get or create reCAPTCHA verifier
export function getRecaptchaVerifier(): RecaptchaVerifier {
  if (!recaptchaVerifier) {
    return initializeRecaptcha();
  }
  return recaptchaVerifier;
};

// Clear reCAPTCHA verifier
export function clearRecaptchaVerifier(): void {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch (error) {
      console.log('Error clearing reCAPTCHA:', error);
    }
    recaptchaVerifier = null;
  }
};

// Phone Authentication Functions with improved error handling
export async function sendOTP(phoneNumber: string, retryCount: number = 0): Promise<ConfirmationResult> {
  const maxRetries = 2;

  try {
    // Get or initialize reCAPTCHA verifier
    const verifier = getRecaptchaVerifier();

    // Ensure phone number is in correct format
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    console.log('Sending OTP to:', formattedPhone);
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

    // Handle other Firebase errors
    if (error.code === 'auth/invalid-phone-number') {
      throw new Error('Invalid phone number format. Please enter a valid phone number.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many requests. Please try again later.');
    } else if (error.code === 'auth/quota-exceeded') {
      throw new Error('SMS quota exceeded. Please try again later.');
    }

    throw error;
  }
};

export async function verifyOTP(confirmationResult: ConfirmationResult, otp: string): Promise<FirebaseUser> {
  try {
    const result = await confirmationResult.confirm(otp);
    return result.user;
  } catch (error) {
    console.error('Error verifying OTP:', error);
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