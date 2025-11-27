import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  User,
  Store,
  Shield,
  ArrowLeft,
  Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/context/auth-context';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  sendOTP,
  verifyOTP,
  signInWithEmail,
  signUpWithEmail,
  clearRecaptchaVerifier,
  createUserProfile,
  getUserProfile,
  UserRole
} from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { setPersistence, browserSessionPersistence, browserLocalPersistence } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';

type LoginStep = 'phone-input' | 'otp-verification';
type AuthMode = 'login' | 'signup';

export default function Login() {
  // Using imported functions directly to avoid type conflicts with useAuth wrappers
  // const { signInWithEmail, signUpWithEmail, sendOTP, verifyOTP, createUserProfile, getUserProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect info from location state
  const from = location.state?.from || '/';
  const redirectMessage = location.state?.message;

  const [activeTab, setActiveTab] = useState<UserRole>('customer');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Customer (Phone) Auth State
  const [loginStep, setLoginStep] = useState<LoginStep>('phone-input');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [phoneAuthAvailable, setPhoneAuthAvailable] = useState(true);
  const [customerLoginMethod, setCustomerLoginMethod] = useState<'phone' | 'email'>('phone');

  // Email/Password Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Redirect after successful login
  const handleSuccessfulLogin = (user: any) => {
    console.log('Login successful, user role:', user?.role);

    // Show success message
    toast.success('Login successful!');

    // Show redirect message if provided
    if (redirectMessage) {
      toast.info(redirectMessage);
    }

    // Role-based redirection with fallback to 'from' parameter
    if (user?.role === 'admin' || activeTab === 'admin') {
      navigate('/admin-panel');
    } else if (user?.role === 'vendor') {
      navigate('/vendor-dashboard');
    } else {
      // For customers, redirect to the intended page or home
      navigate(from);
    }
  };

  // OTP Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpCountdown > 0) {
      interval = setInterval(() => {
        setOtpCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpCountdown]);

  // Cleanup reCAPTCHA on component unmount or tab change
  useEffect(() => {
    return () => {
      clearRecaptchaVerifier();
    };
  }, []);

  // Set auth persistence based on active tab
  useEffect(() => {
    const updatePersistence = async () => {
      try {
        if (activeTab === 'vendor') {
          // Vendor sessions only last until the browser/tab is closed
          await setPersistence(auth, browserSessionPersistence);
          console.log('Auth persistence set to SESSION for vendor');
        } else {
          // Other roles persist across browser restarts
          await setPersistence(auth, browserLocalPersistence);
          console.log('Auth persistence set to LOCAL for', activeTab);
        }
      } catch (error) {
        console.error('Error setting auth persistence:', error);
      }
    };

    updatePersistence();
  }, [activeTab]);

  // Clear reCAPTCHA when switching away from customer tab
  useEffect(() => {
    if (activeTab !== 'customer') {
      clearRecaptchaVerifier();
      resetPhoneAuth();
    }
  }, [activeTab]);

  const formatPhoneNumber = (phone: string): string => {
    // Convert to E.164 format
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('91')) {
      return `+${cleaned}`;
    } else if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    return `+${cleaned}`;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  };

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      console.log('Attempting to send OTP to:', formattedPhone);

      const confirmation = await sendOTP(formattedPhone);
      setConfirmationResult(confirmation);
      setLoginStep('otp-verification');
      setOtpCountdown(60);
      toast.success('OTP sent successfully!');
    } catch (error: any) {
      console.error('Error sending OTP:', error);

      // If phone auth is not configured, offer email alternative
      if (error.message?.includes('not properly configured') || error.message?.includes('invalid-app-credential')) {
        setPhoneAuthAvailable(false);
        toast.error('Phone authentication is not available. Please use email login instead.');
        setCustomerLoginMethod('email');
      } else {
        toast.error(error.message || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const user = await verifyOTP(confirmationResult, otp);

      // Check if user profile exists, create if not
      let userProfile = await getUserProfile(user.uid);
      if (!userProfile) {
        await createUserProfile(user, {
          role: 'customer',
          name: name || 'Customer',
          phone: phoneNumber
        });
        userProfile = await getUserProfile(user.uid);
      }

      handleSuccessfulLogin(user);
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error('Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomerEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (authMode === 'signup' && !name) {
      toast.error('Please enter your name');
      return;
    }

    setIsLoading(true);
    try {
      let user;

      if (authMode === 'login') {
        user = await signInWithEmail(email, password);

        // Always check if user profile exists in Firestore, create if not
        let userProfile = await getUserProfile(user.uid);
        if (!userProfile) {
          console.log(`Creating missing Firestore profile for existing auth user: ${user.uid}`);
          await createUserProfile(user, {
            role: 'customer',
            name: user.displayName || name || 'Customer',
            email: user.email || email
          });
          toast.success('Welcome! Your profile has been set up.');
        } else {
          toast.success('Login successful!');
        }
      } else {
        // Signup flow
        try {
          user = await signUpWithEmail(email, password);
          await createUserProfile(user, {
            role: 'customer',
            name: name,
            email: email
          });
          toast.success('Account created successfully!');
        } catch (signupError: any) {
          if (signupError.code === 'auth/email-already-in-use') {
            toast.error('An account with this email already exists. Please try logging in instead.');
            setAuthMode('login');
            return;
          }
          throw signupError;
        }
      }

      handleSuccessfulLogin(user);
    } catch (error: any) {
      console.error('Authentication error:', error);

      // Handle specific Firebase Auth errors
      if (error.code === 'auth/user-not-found') {
        toast.error('No account found with this email. Please sign up first.');
      } else if (error.code === 'auth/wrong-password') {
        toast.error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Please enter a valid email address.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password should be at least 6 characters long.');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Too many failed attempts. Please try again later.');
      } else {
        toast.error(error.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      let user;

      if (authMode === 'login') {
        user = await signInWithEmail(email, password);

        // For admin tab, check admin credentials first
        if (activeTab === 'admin') {
          const { checkAdminCredentials } = await import('@/lib/firebase');
          const isAdmin = await checkAdminCredentials(email);

          if (!isAdmin) {
            // Sign out the user since they don't have admin privileges
            await import('@/lib/firebase').then(({ auth }) => auth.signOut());
            toast.error('Access denied. This account does not have admin privileges.');
            setIsLoading(false);
            return;
          }

          // Get admin profile from users collection
          const usersRef = collection(db, 'users');
          const adminQuery = query(usersRef, where('email', '==', email), where('role', '==', 'admin'));
          const adminSnapshot = await getDocs(adminQuery);

          if (!adminSnapshot.empty) {
            const adminDoc = adminSnapshot.docs[0];
            const adminData = adminDoc.data();
            user.role = 'admin';
            user.name = adminData.name || 'Admin';
            user.adminProfile = adminData;
          } else {
            // Sign out if profile not found
            await import('@/lib/firebase').then(({ auth }) => auth.signOut());
            toast.error('Admin profile not found. Please contact system administrator.');
            setIsLoading(false);
            return;
          }
        } else {
          // For non-admin users, get profile from users collection
          const userProfile = await getUserProfile(user.uid);
          if (userProfile) {
            user.role = userProfile.role;
          } else {
            // Create profile for existing auth user (only for non-admin users)
            await createUserProfile(user, {
              role: activeTab,
              name: user.displayName || name || 'User',
              email: user.email || email
            });
            user.role = activeTab;
          }
        }
      } else {
        // Signup flow
        if (activeTab === 'admin') {
          toast.error('Admin accounts cannot be created through signup. Please contact system administrator.');
          setIsLoading(false);
          return;
        }

        user = await signUpWithEmail(email, password);
        await createUserProfile(user, {
          role: activeTab,
          name: name,
          email: email,
          ...(activeTab === 'vendor' && {
            businessName: name,
            status: 'pending' // Vendors need admin approval
          })
        });
        user.role = activeTab;

        if (activeTab === 'vendor') {
          toast.success('Vendor account created! Your application is pending admin approval.');
        } else {
          toast.success('Account created successfully!');
        }
      }

      handleSuccessfulLogin(user);
    } catch (error: any) {
      console.error('Authentication error:', error);

      if (error.code === 'auth/user-not-found') {
        toast.error('No account found with this email. Please sign up first.');
      } else if (error.code === 'auth/wrong-password') {
        toast.error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Please enter a valid email address.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password should be at least 6 characters long.');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Too many failed attempts. Please try again later.');
      } else {
        toast.error(error.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetPhoneAuth = () => {
    setLoginStep('phone-input');
    setOtp('');
    setConfirmationResult(null);
    setOtpCountdown(0);
    clearRecaptchaVerifier();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-warm">
        <LoadingSpinner size="lg" text="Authenticating..." type="cooking" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4 animate-page-enter">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-food-bounce">
          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow">
            <span className="text-primary-foreground font-bold text-2xl">S</span>
          </div>
          <h1 className="text-3xl font-heading font-bold">Welcome to Swaadcourt</h1>
          <p className="text-muted-foreground mt-2">Sign in to start your food journey</p>
        </div>

        <Card className="shadow-food border-0 animate-float">
          <CardHeader className="text-center pb-4">
            <CardTitle>
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {/* User Type Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as UserRole)} className="w-full mb-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="customer" className="text-xs flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Customer
                </TabsTrigger>
                <TabsTrigger value="vendor" className="text-xs flex items-center gap-1">
                  <Store className="h-3 w-3" />
                  Vendor
                </TabsTrigger>
                <TabsTrigger value="admin" className="text-xs flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Admin
                </TabsTrigger>
              </TabsList>

              {/* Customer Tab - OTP Authentication */}
              <TabsContent value="customer" className="mt-6">
                {!phoneAuthAvailable ? (
                  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Phone authentication is currently unavailable. Please use email login.
                    </p>
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={customerLoginMethod === 'phone' ? 'food' : 'outline'}
                        size="sm"
                        onClick={() => setCustomerLoginMethod('phone')}
                        className="flex-1"
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Phone
                      </Button>
                      <Button
                        type="button"
                        variant={customerLoginMethod === 'email' ? 'food' : 'outline'}
                        size="sm"
                        onClick={() => setCustomerLoginMethod('email')}
                        className="flex-1"
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Email
                      </Button>
                    </div>
                  </div>
                )}

                {customerLoginMethod === 'phone' && phoneAuthAvailable ? (
                  loginStep === 'phone-input' ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="relative">
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="Enter your phone number"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="pl-10 transition-all duration-300 focus:shadow-warm"
                          />
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          We'll send you a verification code
                        </p>
                      </div>

                      {authMode === 'signup' && (
                        <div className="space-y-2">
                          <Label htmlFor="customer-name">Full Name</Label>
                          <Input
                            id="customer-name"
                            type="text"
                            placeholder="Enter your full name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="transition-all duration-300 focus:shadow-warm"
                          />
                        </div>
                      )}

                      <Button
                        onClick={handleSendOTP}
                        variant="food"
                        size="lg"
                        className="w-full ripple-effect"
                        disabled={isLoading}
                      >
                        Send OTP
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetPhoneAuth}
                          className="p-1"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                          <p className="text-sm font-medium">Enter verification code</p>
                          <p className="text-xs text-muted-foreground">
                            Sent to {phoneNumber}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <InputOTP
                            maxLength={6}
                            value={otp}
                            onChange={setOtp}
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>

                        <Button
                          onClick={handleVerifyOTP}
                          variant="food"
                          size="lg"
                          className="w-full ripple-effect"
                          disabled={isLoading || otp.length !== 6}
                        >
                          Verify OTP
                        </Button>

                        <div className="text-center">
                          {otpCountdown > 0 ? (
                            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                              <Timer className="h-3 w-3" />
                              Resend OTP in {otpCountdown}s
                            </p>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSendOTP}
                              disabled={isLoading}
                            >
                              Resend OTP
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <form onSubmit={handleCustomerEmailAuth} className="space-y-4">
                    {authMode === 'signup' && (
                      <div className="space-y-2">
                        <Label htmlFor="customer-email-name">Full Name</Label>
                        <Input
                          id="customer-email-name"
                          type="text"
                          placeholder="Enter your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="transition-all duration-300 focus:shadow-warm"
                          required
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="customer-email">Email Address</Label>
                      <div className="relative">
                        <Input
                          id="customer-email"
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 transition-all duration-300 focus:shadow-warm"
                          required
                        />
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customer-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="customer-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10 transition-all duration-300 focus:shadow-warm"
                          required
                        />
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      variant="food"
                      size="lg"
                      className="w-full ripple-effect"
                      disabled={isLoading}
                    >
                      {authMode === 'login' ? 'Sign In' : 'Create Account'}
                    </Button>
                  </form>
                )}
              </TabsContent>

              {/* Vendor Tab - Email/Password Authentication */}
              <TabsContent value="vendor" className="mt-6">
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {authMode === 'signup' && (
                    <div className="space-y-2">
                      <Label htmlFor="vendor-name">Business Name</Label>
                      <Input
                        id="vendor-name"
                        type="text"
                        placeholder="Enter your business name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="transition-all duration-300 focus:shadow-warm"
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="vendor-email">Email Address</Label>
                    <div className="relative">
                      <Input
                        id="vendor-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 transition-all duration-300 focus:shadow-warm"
                        required
                      />
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vendor-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="vendor-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 transition-all duration-300 focus:shadow-warm"
                        required
                      />
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {authMode === 'signup' && (
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        <strong>Note:</strong> Vendor accounts require admin approval before you can start selling.
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="food"
                    size="lg"
                    className="w-full ripple-effect"
                    disabled={isLoading}
                  >
                    {authMode === 'login' ? 'Sign In' : 'Create Vendor Account'}
                  </Button>
                </form>
              </TabsContent>

              {/* Admin Tab - Email/Password Authentication */}
              <TabsContent value="admin" className="mt-6">
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Admin Email</Label>
                    <div className="relative">
                      <Input
                        id="admin-email"
                        type="email"
                        placeholder="Enter admin email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 transition-all duration-300 focus:shadow-warm"
                        required
                      />
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="admin-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter admin password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 transition-all duration-300 focus:shadow-warm"
                        required
                      />
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                    <p className="text-xs text-red-700 dark:text-red-300">
                      <strong>Restricted Access:</strong> Admin credentials are required to access the admin panel.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    variant="food"
                    size="lg"
                    className="w-full ripple-effect"
                    disabled={isLoading}
                  >
                    Admin Sign In
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Auth Mode Toggle */}
            {activeTab !== 'admin' && (
              <div className="text-center mt-6">
                <p className="text-sm text-muted-foreground">
                  {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAuthMode(authMode === 'login' ? 'signup' : 'login');
                      resetPhoneAuth();
                    }}
                    className="p-0 h-auto font-medium text-primary hover:underline"
                  >
                    {authMode === 'login' ? 'Sign up' : 'Sign in'}
                  </Button>
                </p>
              </div>
            )}

            {/* Forgot Password Link */}
            {authMode === 'login' && activeTab !== 'customer' && (
              <div className="text-center mt-4">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* reCAPTCHA container */}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}