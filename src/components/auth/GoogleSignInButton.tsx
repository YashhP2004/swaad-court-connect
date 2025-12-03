import React, { useState, useEffect } from 'react';
import { Chrome } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    signInWithGoogle,
    signInWithGoogleRedirect,
    handleGoogleRedirectResult
} from '@/lib/firebase/auth';

interface GoogleSignInButtonProps {
    onSuccess: (user: any) => void;
    className?: string;
}

export function GoogleSignInButton({ onSuccess, className = '' }: GoogleSignInButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile device
    useEffect(() => {
        const checkMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        setIsMobile(checkMobile);
    }, []);

    // Handle Google redirect result on component mount
    useEffect(() => {
        const checkRedirect = async () => {
            try {
                const result = await handleGoogleRedirectResult();
                if (result) {
                    toast.success('Successfully signed in with Google!');
                    onSuccess(result.user);
                }
            } catch (error: any) {
                toast.error(error.message);
            }
        };

        checkRedirect();
    }, [onSuccess]);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);

        try {
            if (isMobile) {
                // Use redirect for mobile devices
                await signInWithGoogleRedirect();
                // User will be redirected, no need to do anything else
            } else {
                // Use popup for desktop
                const result = await signInWithGoogle();

                if (result.isNewUser) {
                    toast.success('Welcome to SwaadCourt! Your account has been created.');
                } else {
                    toast.success('Welcome back!');
                }

                onSuccess(result.user);
            }
        } catch (error: any) {
            toast.error(error.message);
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Divider */}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">Or continue with</span>
                </div>
            </div>

            {/* Google Sign-In Button */}
            <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                variant="outline"
                type="button"
                className={`w-full h-12 border-2 border-gray-300 hover:border-orange-500 hover:bg-orange-50 transition-all ${className}`}
            >
                {isLoading ? (
                    <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                        <span>Signing in...</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <Chrome className="w-5 h-5 text-blue-500" />
                        <span className="font-semibold">Sign in with Google</span>
                    </div>
                )}
            </Button>
        </>
    );
}
