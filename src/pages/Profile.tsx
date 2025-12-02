import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Edit3,
  Save,
  X,
  Camera,
  Mail,
  Phone,
  Calendar,
  Shield,
  Trophy,
  TrendingUp,
  Gift,
  LogOut,
  Clock,
  Package,
  ChevronRight,
  ShoppingBag,
  Utensils
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-context';
import {
  updateUserProfile,
  uploadProfilePicture,
  getUserProfile,
  createUserProfile,
  UserProfile,
  getUserOrders,
  Order
} from '@/lib/firebase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    name: '',
    email: '',
    phone: '',
    role: 'customer',
    totalOrders: 0,
    totalSpent: 0,
    loyaltyPoints: 0,
    memberSince: new Date(),
    accountStatus: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    favoriteRestaurants: [],
    favoriteCuisines: [],
    dietaryRestrictions: [],
    spicePreference: 'medium',
    achievements: [],
    reviewsCount: 0,
    averageRating: 5.0,
    notificationPreferences: {
      orderUpdates: true,
      promotions: true,
      newRestaurants: false,
    },
  });

  const [orders, setOrders] = useState<Order[]>([]);

  // Load user profile
  useEffect(() => {
    let isMounted = true;

    if (authLoading || !user?.uid) {
      setIsLoadingProfile(false);
      return;
    }

    const loadProfile = async () => {
      try {
        let p = await getUserProfile(user.uid);

        if (!isMounted) return;

        if (p) {
          setProfile(p);
        } else {
          await createUserProfile(
            {
              uid: user.uid,
              email: user.email,
              displayName: user.name,
              phoneNumber: user.phone
            } as any,
            {
              role: 'customer',
              name: user.name || 'Customer',
              email: user.email || '',
              phone: user.phone || ''
            }
          );

          p = await getUserProfile(user.uid);
          if (p && isMounted) {
            setProfile(p);
          }
        }
      } catch (err) {
        console.error('Profile load error:', err);
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, authLoading]);

  // Load user orders
  useEffect(() => {
    if (!user?.uid) {
      setIsLoadingOrders(false);
      return;
    }

    const unsubscribe = getUserOrders(user.uid, (fetchedOrders) => {
      setOrders(fetchedOrders);
      setIsLoadingOrders(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  // Redirect vendors and admins to their respective dashboards
  // Use user.role from AuthContext for immediate redirect
  useEffect(() => {
    if (!authLoading && user) {
      console.log('Profile.tsx: Checking redirect for user role:', user.role);
      if (user.role === 'vendor') {
        console.log('Profile.tsx: Redirecting vendor to dashboard');
        navigate('/vendor-dashboard');
      } else if (user.role === 'admin') {
        console.log('Profile.tsx: Redirecting admin to panel');
        navigate('/admin-panel');
      }
    }
  }, [authLoading, user, navigate]);

  // Also check profile-based redirect as fallback
  useEffect(() => {
    if (!isLoadingProfile && profile && !user?.role) {
      console.log('Profile.tsx: Fallback redirect check for profile role:', profile.role);
      if (profile.role === 'vendor') {
        navigate('/vendor-dashboard');
      } else if (profile.role === 'admin') {
        navigate('/admin-panel');
      }
    }
  }, [isLoadingProfile, profile, user, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to logout');
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: any) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const downloadURL = await uploadProfilePicture(user.uid, file);
      setProfile(prev => ({ ...prev, profilePicture: downloadURL }));
      toast.success('Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await updateUserProfile(user.uid, profile);
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Placed': 'bg-blue-500/90 text-white',
      'Confirmed': 'bg-green-500/90 text-white',
      'Preparing': 'bg-yellow-500/90 text-white',
      'Ready to Serve': 'bg-orange-500/90 text-white',
      'Served': 'bg-purple-500/90 text-white',
      'Completed': 'bg-gray-500/90 text-white',
      'Cancelled': 'bg-red-500/90 text-white'
    };
    return colors[status] || 'bg-gray-500/90 text-white';
  };

  if (authLoading || isLoadingProfile || profile?.role === 'vendor') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-warm">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4 animate-spin"></div>
          <p className="text-foreground text-lg">
            {profile?.role === 'vendor' ? 'Redirecting to dashboard...' : 'Loading your profile...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-warm">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-heading font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              My Profile
            </h1>
            <p className="text-muted-foreground text-lg">Manage your account and view your orders</p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-2 hover:bg-accent/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="mb-8 border-0 shadow-warm overflow-hidden">
          <div className="relative h-40 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent"></div>
          </div>

          <CardContent className="pt-0 pb-8 px-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-end gap-8 -mt-20 relative z-10">
              {/* Avatar */}
              <div className="relative group">
                <div
                  className="w-40 h-40 rounded-3xl bg-gradient-to-br from-orange-400 to-amber-600 p-1.5 shadow-2xl cursor-pointer transform transition-transform duration-300 group-hover:scale-105"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Avatar className="w-full h-full rounded-3xl border-4 border-background shadow-xl">
                    <AvatarImage
                      src={profile.profilePicture}
                      alt={profile.name || user?.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-4xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold rounded-3xl">
                      {(profile.name || user?.name)?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <Button
                  size="icon"
                  className="absolute -bottom-2 -right-2 rounded-2xl shadow-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 border-4 border-background w-14 h-14 transform transition-transform duration-300 hover:scale-110"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* User Info */}
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-sm font-semibold mb-2 block">Full Name</Label>
                      <Input
                        id="name"
                        value={profile.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-sm font-semibold mb-2 block">Phone Number</Label>
                      <Input
                        id="phone"
                        value={profile.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-4xl font-heading font-bold mb-6">
                      {profile.name || user?.name || 'Customer'}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 bg-accent/5 rounded-xl p-3 border border-border">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                          <Mail className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm">{profile.email || user?.email}</span>
                      </div>
                      {(profile.phone || user?.phone) && (
                        <div className="flex items-center gap-3 bg-accent/5 rounded-xl p-3 border border-border">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                            <Phone className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-sm">{profile.phone || user?.phone}</span>
                        </div>
                      )}
                      {profile.accountStatus && (
                        <div className="flex items-center gap-3 bg-accent/5 rounded-xl p-3 border border-border">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
                            <Shield className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-sm capitalize">{profile.accountStatus} Account</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Edit Button */}
              <div className="flex gap-3">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                      className="rounded-xl"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      variant="food"
                      className="rounded-xl shadow-lg"
                    >
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2 animate-spin"></div>
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="food"
                    className="rounded-xl shadow-lg px-6"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Stats */}
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-600 to-cyan-600 border-0 text-white shadow-warm transform transition-transform duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold mb-1">{profile.totalOrders || 0}</div>
                  <div className="text-blue-100 font-medium">Total Orders</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-600 to-green-600 border-0 text-white shadow-warm transform transition-transform duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold mb-1">₹{Math.round(profile.totalSpent || 0)}</div>
                  <div className="text-emerald-100 font-medium">Total Spent</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-pink-600 border-0 text-white shadow-warm transform transition-transform duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl">
                  <Gift className="w-8 h-8 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold mb-1">{profile.loyaltyPoints || 0}</div>
                  <div className="text-purple-100 font-medium">Loyalty Points</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card className="border-0 shadow-warm">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <Package className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-heading font-bold">Recent Orders</h3>
                  <p className="text-muted-foreground">Your order history</p>
                </div>
              </div>
              {orders.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => navigate('/orders')}
                  className="hover:bg-accent/10"
                >
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
          <CardContent className="p-6">
            {isLoadingOrders ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4 animate-spin"></div>
                <p className="text-muted-foreground text-lg">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">No orders yet</h3>
                <p className="text-muted-foreground mb-8 text-lg">Start exploring restaurants and place your first order!</p>
                <Button
                  onClick={() => navigate('/')}
                  variant="food"
                  className="shadow-lg px-8 py-6 text-lg rounded-xl"
                >
                  Browse Restaurants
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-accent/5 border border-border rounded-2xl p-5 hover:border-primary/50 hover:bg-accent/10 transition-all duration-300 cursor-pointer group"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-lg">Order #{order.orderNumber}</h4>
                          <Badge className={`${getStatusColor(order.status)} px-3 py-1 rounded-lg font-medium`}>
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground font-medium">{order.restaurantName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-2xl mb-1">₹{Math.round(order.pricing?.totalAmount || order.totalAmount)}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 justify-end">
                          <Clock className="w-4 h-4" />
                          {(order.createdAt instanceof Date
                            ? order.createdAt
                            : typeof order.createdAt === 'string'
                              ? new Date(order.createdAt)
                              : order.createdAt?.toDate?.() || new Date()
                          ).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="w-4 h-4 text-primary" />
                      <span className="text-sm">
                        {order.items?.slice(0, 2).map((item, idx) => (
                          <span key={idx}>
                            {item.name} {item.quantity > 1 && `x${item.quantity}`}
                            {idx < Math.min(order.items.length - 1, 1) && ', '}
                          </span>
                        ))}
                        {order.items?.length > 2 && (
                          <span className="text-primary font-medium"> +{order.items.length - 2} more items</span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
