import React, { useState, useEffect } from 'react';
import {
  Settings,
  User,
  MapPin,
  Clock,
  Phone,
  Mail,
  Globe,
  Camera,
  Save,
  Edit,
  Trash2,
  Plus,
  X,
  Bell,
  Shield,
  CreditCard,
  Store,
  Users,
  Upload,
  ChefHat,
  Package,
  Utensils,
  Timer,
  Leaf,
  AlertCircle,
  Check,
  Facebook,
  Instagram,
  Twitter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import {
  getVendorProfile,
  updateVendorProfile,
  getVendorNotificationSettings,
  updateVendorNotificationSettings
} from '@/lib/firebase';

interface RestaurantProfile {
  id: string;
  name: string;
  description: string;
  cuisine: string[];
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
  coverImage: string;
  rating: number;
  isActive: boolean;
  deliveryRadius: number;
  minimumOrder: number;
  deliveryFee: number;
  estimatedDeliveryTime: string;
  openingHours: {
    [key: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
  socialMedia: {
    facebook: string;
    instagram: string;
    twitter: string;
  };
  bankDetails: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
  };
  maxCapacity?: number;
  // New menu settings
  defaultPrepTime?: number;
  packagingType?: 'standard' | 'eco-friendly' | 'premium';
  autoAcceptOrders?: boolean;
}

interface NotificationSettings {
  orderNotifications: boolean;
  paymentNotifications: boolean;
  promotionalEmails: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  reviewNotifications: boolean;
}

export default function VendorSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [restaurantProfile, setRestaurantProfile] = useState<RestaurantProfile>({
    id: '1',
    name: 'Delicious Bites Restaurant',
    description: 'Authentic Indian cuisine with a modern twist. We serve fresh, flavorful dishes made with the finest ingredients.',
    cuisine: ['Indian', 'North Indian', 'Vegetarian'],
    address: '123 Food Street, Sector 15',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    phone: '+91 98765 43210',
    email: 'contact@deliciousbites.com',
    website: 'www.deliciousbites.com',
    logo: '/api/placeholder/150/150',
    coverImage: '/api/placeholder/800/300',
    rating: 4.5,
    isActive: true,
    deliveryRadius: 5,
    minimumOrder: 200,
    deliveryFee: 40,
    estimatedDeliveryTime: '30-45 mins',
    openingHours: {
      monday: { open: '10:00', close: '22:00', isOpen: true },
      tuesday: { open: '10:00', close: '22:00', isOpen: true },
      wednesday: { open: '10:00', close: '22:00', isOpen: true },
      thursday: { open: '10:00', close: '22:00', isOpen: true },
      friday: { open: '10:00', close: '23:00', isOpen: true },
      saturday: { open: '10:00', close: '23:00', isOpen: true },
      sunday: { open: '11:00', close: '21:00', isOpen: true }
    },
    socialMedia: {
      facebook: 'deliciousbites',
      instagram: '@deliciousbites',
      twitter: '@deliciousbites'
    },
    bankDetails: {
      accountNumber: '****1234',
      ifscCode: 'HDFC0001234',
      accountHolderName: 'Delicious Bites Restaurant',
      bankName: 'HDFC Bank'
    },
    maxCapacity: 15,
    defaultPrepTime: 20,
    packagingType: 'standard',
    autoAcceptOrders: false
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    orderNotifications: true,
    paymentNotifications: true,
    promotionalEmails: false,
    smsNotifications: true,
    pushNotifications: true,
    reviewNotifications: true
  });

  const [newCuisine, setNewCuisine] = useState('');

  const cuisineOptions = [
    'Indian', 'Chinese', 'Italian', 'Mexican', 'Thai', 'Continental',
    'North Indian', 'South Indian', 'Punjabi', 'Bengali', 'Gujarati',
    'Fast Food', 'Street Food', 'Vegetarian', 'Vegan', 'Desserts'
  ];

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  useEffect(() => {
    if (user?.uid) {
      loadVendorSettings();
    }
  }, [user]);

  const loadVendorSettings = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      const [profileData, notificationData] = await Promise.all([
        getVendorProfile(user.uid),
        getVendorNotificationSettings(user.uid)
      ]);

      if (profileData) {
        setRestaurantProfile({
          id: profileData.id,
          name: profileData.businessName || profileData.name,
          description: profileData.description || 'Authentic cuisine with fresh ingredients',
          cuisine: profileData.cuisine || ['Indian'],
          address: profileData.address || '',
          city: profileData.city || '',
          state: profileData.state || '',
          pincode: profileData.pincode || '',
          phone: profileData.phone || '',
          email: profileData.email || '',
          website: profileData.website || '',
          logo: profileData.logo || '/api/placeholder/150/150',
          coverImage: profileData.coverImage || '/api/placeholder/800/300',
          rating: profileData.rating || 4.5,
          isActive: profileData.isOpen !== undefined ? profileData.isOpen : true,
          deliveryRadius: profileData.deliveryRadius || 5,
          minimumOrder: profileData.minimumOrder || 200,
          deliveryFee: profileData.deliveryFee || 40,
          estimatedDeliveryTime: profileData.estimatedDeliveryTime || '30-45 mins',
          openingHours: profileData.openingHours || {
            monday: { open: '10:00', close: '22:00', isOpen: true },
            tuesday: { open: '10:00', close: '22:00', isOpen: true },
            wednesday: { open: '10:00', close: '22:00', isOpen: true },
            thursday: { open: '10:00', close: '22:00', isOpen: true },
            friday: { open: '10:00', close: '23:00', isOpen: true },
            saturday: { open: '10:00', close: '23:00', isOpen: true },
            sunday: { open: '11:00', close: '21:00', isOpen: true }
          },
          socialMedia: profileData.socialMedia || {
            facebook: '',
            instagram: '',
            twitter: ''
          },
          bankDetails: profileData.bankDetails || {
            accountNumber: '****1234',
            ifscCode: 'HDFC0001234',
            accountHolderName: profileData.businessName || profileData.name,
            bankName: 'HDFC Bank'
          },
          maxCapacity: profileData.maxCapacity || 15,
          defaultPrepTime: profileData.defaultPrepTime || 20,
          packagingType: profileData.packagingType || 'standard',
          autoAcceptOrders: profileData.autoAcceptOrders || false
        });
      }

      setNotificationSettings(notificationData);
    } catch (error) {
      console.error('Error loading vendor settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.uid) return;

    setIsSaving(true);
    try {
      const profileToSave = {
        ...restaurantProfile,
        isOpen: restaurantProfile.isActive
      };
      await updateVendorProfile(user.uid, profileToSave);
      toast.success('Restaurant profile updated successfully');
      setIsEditing(false);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user?.uid) return;

    setIsSaving(true);
    try {
      await updateVendorNotificationSettings(user.uid, notificationSettings);
      toast.success('Notification settings updated');
    } catch (error) {
      console.error('Error updating notifications:', error);
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const addCuisine = () => {
    if (newCuisine && !restaurantProfile.cuisine.includes(newCuisine)) {
      setRestaurantProfile(prev => ({
        ...prev,
        cuisine: [...prev.cuisine, newCuisine]
      }));
      setNewCuisine('');
      setHasUnsavedChanges(true);
    }
  };

  const removeCuisine = (cuisine: string) => {
    setRestaurantProfile(prev => ({
      ...prev,
      cuisine: prev.cuisine.filter(c => c !== cuisine)
    }));
    setHasUnsavedChanges(true);
  };

  const updateOpeningHours = (day: string, field: string, value: string | boolean) => {
    setRestaurantProfile(prev => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day]: {
          ...prev.openingHours[day],
          [field]: value
        }
      }
    }));
    setHasUnsavedChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-3 text-gray-600">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-400 via-rose-400 to-pink-400 p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white rounded-full blur-3xl opacity-10"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-white rounded-full blur-3xl opacity-10"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-20 h-20 border-4 border-white/20 shadow-xl">
                <AvatarImage src={restaurantProfile.logo} alt={restaurantProfile.name} />
                <AvatarFallback className="text-2xl bg-white/20 text-white">
                  {restaurantProfile.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-4 border-white ${restaurantProfile.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                {restaurantProfile.name}
              </h1>
              <div className="flex items-center gap-4 text-white/90">
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                  <span className="text-yellow-300">★</span>
                  <span className="font-semibold">{restaurantProfile.rating.toFixed(1)}</span>
                </div>
                <Badge variant="secondary" className="bg-white/10 text-white border-0 hover:bg-white/20">
                  {restaurantProfile.cuisine[0]}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {isEditing && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setHasUnsavedChanges(false);
                  }}
                  disabled={isSaving}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="bg-white text-orange-600 hover:bg-white/90 shadow-lg"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-white text-orange-600 hover:bg-white/90 shadow-lg"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-2 shadow-sm border border-orange-100">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-transparent gap-2">
            <TabsTrigger
              value="profile"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white rounded-xl font-medium transition-all duration-200"
            >
              <Store className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="business"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-xl font-medium transition-all duration-200"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Business
            </TabsTrigger>
            <TabsTrigger
              value="menu-settings"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white rounded-xl font-medium transition-all duration-200"
            >
              <Utensils className="w-4 h-4 mr-2" />
              Menu
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-500 data-[state=active]:text-white rounded-xl font-medium transition-all duration-200"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="account"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-500 data-[state=active]:to-slate-500 data-[state=active]:text-white rounded-xl font-medium transition-all duration-200"
            >
              <Shield className="w-4 h-4 mr-2" />
              Account
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Cover Image */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="relative h-48">
              <img
                src={restaurantProfile.coverImage}
                alt="Restaurant Cover"
                className="w-full h-full object-cover"
              />
              {isEditing && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-4 right-4 gap-2 bg-white/90 hover:bg-white"
                >
                  <Camera className="w-4 h-4" />
                  Change Cover
                </Button>
              )}
            </div>
          </Card>

          {/* Basic Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-orange-500" />
                Restaurant Information
              </CardTitle>
              <CardDescription>Basic details about your restaurant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Restaurant Name</Label>
                <Input
                  id="name"
                  value={restaurantProfile.name}
                  onChange={(e) => {
                    setRestaurantProfile(prev => ({ ...prev, name: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={restaurantProfile.description}
                  onChange={(e) => {
                    setRestaurantProfile(prev => ({ ...prev, description: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  disabled={!isEditing}
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Cuisine Types</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {restaurantProfile.cuisine.map(cuisine => (
                    <Badge key={cuisine} variant="secondary" className="gap-1 bg-orange-100 text-orange-700 hover:bg-orange-200">
                      {cuisine}
                      {isEditing && (
                        <button
                          onClick={() => removeCuisine(cuisine)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                  {isEditing && (
                    <div className="flex gap-2">
                      <Select value={newCuisine} onValueChange={setNewCuisine}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Add cuisine" />
                        </SelectTrigger>
                        <SelectContent>
                          {cuisineOptions
                            .filter(option => !restaurantProfile.cuisine.includes(option))
                            .map(option => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={addCuisine} disabled={!newCuisine}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-orange-500" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={restaurantProfile.phone}
                    onChange={(e) => {
                      setRestaurantProfile(prev => ({ ...prev, phone: e.target.value }));
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={restaurantProfile.email}
                    onChange={(e) => {
                      setRestaurantProfile(prev => ({ ...prev, email: e.target.value }));
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={restaurantProfile.website}
                  onChange={(e) => {
                    setRestaurantProfile(prev => ({ ...prev, website: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  disabled={!isEditing}
                  className="mt-1"
                  placeholder="www.yourrestaurant.com"
                />
              </div>

              <div>
                <Label htmlFor="address">Full Address</Label>
                <Textarea
                  id="address"
                  value={`${restaurantProfile.address}, ${restaurantProfile.city}, ${restaurantProfile.state} - ${restaurantProfile.pincode}`}
                  onChange={(e) => {
                    setRestaurantProfile(prev => ({ ...prev, address: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  disabled={!isEditing}
                  rows={2}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-orange-500" />
                Social Media
              </CardTitle>
              <CardDescription>Connect your social media profiles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="facebook" className="flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-blue-600" />
                    Facebook
                  </Label>
                  <Input
                    id="facebook"
                    value={restaurantProfile.socialMedia.facebook}
                    onChange={(e) => {
                      setRestaurantProfile(prev => ({
                        ...prev,
                        socialMedia: { ...prev.socialMedia, facebook: e.target.value }
                      }));
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!isEditing}
                    placeholder="facebook.com/yourpage"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="instagram" className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-pink-600" />
                    Instagram
                  </Label>
                  <Input
                    id="instagram"
                    value={restaurantProfile.socialMedia.instagram}
                    onChange={(e) => {
                      setRestaurantProfile(prev => ({
                        ...prev,
                        socialMedia: { ...prev.socialMedia, instagram: e.target.value }
                      }));
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!isEditing}
                    placeholder="@yourusername"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="twitter" className="flex items-center gap-2">
                    <Twitter className="w-4 h-4 text-blue-400" />
                    Twitter
                  </Label>
                  <Input
                    id="twitter"
                    value={restaurantProfile.socialMedia.twitter}
                    onChange={(e) => {
                      setRestaurantProfile(prev => ({
                        ...prev,
                        socialMedia: { ...prev.socialMedia, twitter: e.target.value }
                      }));
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!isEditing}
                    placeholder="@yourusername"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Settings Tab */}
        <TabsContent value="business" className="space-y-6">
          {/* Opening Hours */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Opening Hours
              </CardTitle>
              <CardDescription>Set your restaurant operating hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {days.map(day => (
                <div key={day} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-28">
                    <span className="font-medium capitalize text-gray-700">{day}</span>
                  </div>

                  <Switch
                    checked={restaurantProfile.openingHours?.[day]?.isOpen || false}
                    onCheckedChange={(checked) => updateOpeningHours(day, 'isOpen', checked)}
                    disabled={!isEditing}
                  />

                  {restaurantProfile.openingHours?.[day]?.isOpen ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={restaurantProfile.openingHours[day].open}
                        onChange={(e) => updateOpeningHours(day, 'open', e.target.value)}
                        disabled={!isEditing}
                        className="w-32"
                      />
                      <span className="text-gray-500">to</span>
                      <Input
                        type="time"
                        value={restaurantProfile.openingHours[day].close}
                        onChange={(e) => updateOpeningHours(day, 'close', e.target.value)}
                        disabled={!isEditing}
                        className="w-32"
                      />
                    </div>
                  ) : (
                    <span className="text-gray-500 flex-1">Closed</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Restaurant Status */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-500" />
                Restaurant Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-rose-50 rounded-lg border border-orange-100">
                <div>
                  <h4 className="font-semibold text-gray-900">Currently {restaurantProfile.isActive ? 'Open' : 'Closed'}</h4>
                  <p className="text-sm text-gray-600">
                    {restaurantProfile.isActive
                      ? 'Your restaurant is accepting orders'
                      : 'Your restaurant is temporarily closed'
                    }
                  </p>
                </div>
                <Switch
                  checked={restaurantProfile.isActive}
                  onCheckedChange={(checked) => {
                    setRestaurantProfile(prev => ({ ...prev, isActive: checked }));
                    setHasUnsavedChanges(true);
                  }}
                  disabled={!isEditing}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Kitchen Capacity */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-blue-500" />
                Kitchen Capacity
              </CardTitle>
              <CardDescription>Manage your kitchen's order handling capacity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="maxCapacity">Maximum Concurrent Orders</Label>
                <Input
                  id="maxCapacity"
                  type="number"
                  min="5"
                  max="50"
                  value={restaurantProfile.maxCapacity || 15}
                  onChange={(e) => {
                    setRestaurantProfile(prev => ({ ...prev, maxCapacity: Number(e.target.value) }));
                    setHasUnsavedChanges(true);
                  }}
                  disabled={!isEditing}
                  placeholder="15"
                  className="mt-1"
                />
                <p className="text-sm text-gray-600 mt-2">
                  Set the maximum number of orders your kitchen can handle simultaneously.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  How This Works
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Helps customers see accurate wait times</li>
                  <li>• Shows demand indicators on your restaurant card</li>
                  <li>• Alerts you when capacity reaches 80%+</li>
                  <li>• Recommended: 10-20 for small, 20-30 for medium, 30+ for large kitchens</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Menu Settings Tab (NEW) */}
        <TabsContent value="menu-settings" className="space-y-6">
          {/* Preparation Settings */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-green-500" />
                Preparation Settings
              </CardTitle>
              <CardDescription>Default settings for menu items</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="defaultPrepTime">Default Preparation Time (minutes)</Label>
                <Input
                  id="defaultPrepTime"
                  type="number"
                  min="5"
                  max="120"
                  value={restaurantProfile.defaultPrepTime || 20}
                  onChange={(e) => {
                    setRestaurantProfile(prev => ({ ...prev, defaultPrepTime: Number(e.target.value) }));
                    setHasUnsavedChanges(true);
                  }}
                  disabled={!isEditing}
                  className="mt-1"
                />
                <p className="text-sm text-gray-600 mt-2">
                  This will be used as the default prep time for new menu items
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Packaging Options */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-green-500" />
                Packaging Options
              </CardTitle>
              <CardDescription>Choose your default packaging type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: 'standard', label: 'Standard', desc: 'Regular packaging' },
                  { value: 'eco-friendly', label: 'Eco-Friendly', desc: 'Biodegradable materials' },
                  { value: 'premium', label: 'Premium', desc: 'High-quality packaging' }
                ].map(option => (
                  <div
                    key={option.value}
                    onClick={() => {
                      if (isEditing) {
                        setRestaurantProfile(prev => ({ ...prev, packagingType: option.value as any }));
                        setHasUnsavedChanges(true);
                      }
                    }}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${restaurantProfile.packagingType === option.value
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                      } ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{option.label}</h4>
                      {restaurantProfile.packagingType === option.value && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{option.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Management */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-green-500" />
                Order Management
              </CardTitle>
              <CardDescription>Configure how you handle incoming orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-semibold text-gray-900">Auto-Accept Orders</h4>
                  <p className="text-sm text-gray-600">
                    Automatically accept orders without manual confirmation
                  </p>
                </div>
                <Switch
                  checked={restaurantProfile.autoAcceptOrders || false}
                  onCheckedChange={(checked) => {
                    setRestaurantProfile(prev => ({ ...prev, autoAcceptOrders: checked }));
                    setHasUnsavedChanges(true);
                  }}
                  disabled={!isEditing}
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Note
                </h4>
                <p className="text-sm text-yellow-800">
                  When auto-accept is enabled, orders will be automatically moved to "Preparing" status.
                  Make sure your kitchen can handle the incoming volume.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-500" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: 'orderNotifications', label: 'Order Notifications', desc: 'Get notified about new orders and order updates' },
                { key: 'paymentNotifications', label: 'Payment Notifications', desc: 'Receive updates about payments and payouts' },
                { key: 'reviewNotifications', label: 'Review Notifications', desc: 'Get notified when customers leave reviews' },
                { key: 'pushNotifications', label: 'Push Notifications', desc: 'Receive push notifications on your device' },
                { key: 'smsNotifications', label: 'SMS Notifications', desc: 'Receive important updates via SMS' },
                { key: 'promotionalEmails', label: 'Promotional Emails', desc: 'Receive marketing and promotional emails' }
              ].map(setting => (
                <div key={setting.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-gray-900">{setting.label}</h4>
                    <p className="text-sm text-gray-600">{setting.desc}</p>
                  </div>
                  <Switch
                    checked={notificationSettings[setting.key as keyof NotificationSettings]}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, [setting.key]: checked }))}
                  />
                </div>
              ))}

              <Separator />

              <Button onClick={handleSaveNotifications} disabled={isSaving} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Notification Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account & Security Tab */}
        <TabsContent value="account" className="space-y-6">
          {/* Bank Details */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gray-500" />
                Bank Details
              </CardTitle>
              <CardDescription>Your payout account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Account Holder Name</Label>
                  <Input value={restaurantProfile.bankDetails.accountHolderName} disabled className="mt-1" />
                </div>
                <div>
                  <Label>Bank Name</Label>
                  <Input value={restaurantProfile.bankDetails.bankName} disabled className="mt-1" />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input value={restaurantProfile.bankDetails.accountNumber} disabled className="mt-1" />
                </div>
                <div>
                  <Label>IFSC Code</Label>
                  <Input value={restaurantProfile.bankDetails.ifscCode} disabled className="mt-1" />
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  To update your bank details, please contact support for security verification.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-gray-500" />
                Security
              </CardTitle>
              <CardDescription>Manage your account security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start">
                <Shield className="w-4 h-4 mr-2" />
                Change Password
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                Two-Factor Authentication
              </Button>
              <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Unsaved Changes Warning */}
      <AnimatePresence>
        {hasUnsavedChanges && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 bg-orange-500 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">You have unsaved changes</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
