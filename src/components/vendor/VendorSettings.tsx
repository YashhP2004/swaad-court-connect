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
  Palette,
  Upload,
  ChefHat
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { motion } from 'framer-motion';
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
  maxCapacity?: number; // Kitchen capacity for demand indicators
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
    }
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
          maxCapacity: profileData.maxCapacity || 15
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
    }
  };

  const removeCuisine = (cuisine: string) => {
    setRestaurantProfile(prev => ({
      ...prev,
      cuisine: prev.cuisine.filter(c => c !== cuisine)
    }));
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
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Restaurant Settings</h2>
          <p className="text-gray-600">Manage your restaurant profile and preferences</p>
        </div>

        <div className="flex gap-3">
          {isEditing && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} className="gap-2">
              <Edit className="w-4 h-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Restaurant Profile</TabsTrigger>
          <TabsTrigger value="business">Business Settings</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="account">Account & Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Restaurant Header */}
          <Card className="border-0 shadow-lg">
            <div className="relative">
              <img
                src={restaurantProfile.coverImage}
                alt="Restaurant Cover"
                className="w-full h-48 object-cover rounded-t-lg"
              />
              {isEditing && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-4 right-4 gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Change Cover
                </Button>
              )}
            </div>

            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={restaurantProfile.logo} alt={restaurantProfile.name} />
                    <AvatarFallback className="text-2xl">
                      {restaurantProfile.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute -bottom-2 -right-2 w-8 h-8 p-0"
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {isEditing ? (
                      <Input
                        value={restaurantProfile.name}
                        onChange={(e) => setRestaurantProfile(prev => ({ ...prev, name: e.target.value }))}
                        className="text-xl font-bold"
                      />
                    ) : (
                      <h3 className="text-2xl font-bold">{restaurantProfile.name}</h3>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="font-semibold">{restaurantProfile.rating}</span>
                    </div>
                  </div>

                  {isEditing ? (
                    <Textarea
                      value={restaurantProfile.description}
                      onChange={(e) => setRestaurantProfile(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="mb-4"
                    />
                  ) : (
                    <p className="text-gray-600 mb-4">{restaurantProfile.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {restaurantProfile.cuisine.map(cuisine => (
                      <Badge key={cuisine} variant="secondary" className="gap-1">
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
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
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
                    onChange={(e) => setRestaurantProfile(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={restaurantProfile.email}
                    onChange={(e) => setRestaurantProfile(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={restaurantProfile.website}
                  onChange={(e) => setRestaurantProfile(prev => ({ ...prev, website: e.target.value }))}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={`${restaurantProfile.address}, ${restaurantProfile.city}, ${restaurantProfile.state} - ${restaurantProfile.pincode}`}
                  onChange={(e) => {
                    // Simple address parsing - in real app, use proper address components
                    setRestaurantProfile(prev => ({ ...prev, address: e.target.value }));
                  }}
                  disabled={!isEditing}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Social Media
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={restaurantProfile.socialMedia.facebook}
                    onChange={(e) => setRestaurantProfile(prev => ({
                      ...prev,
                      socialMedia: { ...prev.socialMedia, facebook: e.target.value }
                    }))}
                    disabled={!isEditing}
                    placeholder="facebook.com/yourpage"
                  />
                </div>
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={restaurantProfile.socialMedia.instagram}
                    onChange={(e) => setRestaurantProfile(prev => ({
                      ...prev,
                      socialMedia: { ...prev.socialMedia, instagram: e.target.value }
                    }))}
                    disabled={!isEditing}
                    placeholder="@yourusername"
                  />
                </div>
                <div>
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input
                    id="twitter"
                    value={restaurantProfile.socialMedia.twitter}
                    onChange={(e) => setRestaurantProfile(prev => ({
                      ...prev,
                      socialMedia: { ...prev.socialMedia, twitter: e.target.value }
                    }))}
                    disabled={!isEditing}
                    placeholder="@yourusername"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          {/* Delivery Settings */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Delivery Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="deliveryRadius">Delivery Radius (km)</Label>
                  <Input
                    id="deliveryRadius"
                    type="number"
                    value={restaurantProfile.deliveryRadius}
                    onChange={(e) => setRestaurantProfile(prev => ({ ...prev, deliveryRadius: Number(e.target.value) }))}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="minimumOrder">Minimum Order (₹)</Label>
                  <Input
                    id="minimumOrder"
                    type="number"
                    value={restaurantProfile.minimumOrder}
                    onChange={(e) => setRestaurantProfile(prev => ({ ...prev, minimumOrder: Number(e.target.value) }))}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryFee">Delivery Fee (₹)</Label>
                  <Input
                    id="deliveryFee"
                    type="number"
                    value={restaurantProfile.deliveryFee}
                    onChange={(e) => setRestaurantProfile(prev => ({ ...prev, deliveryFee: Number(e.target.value) }))}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="deliveryTime">Estimated Delivery Time</Label>
                <Input
                  id="deliveryTime"
                  value={restaurantProfile.estimatedDeliveryTime}
                  onChange={(e) => setRestaurantProfile(prev => ({ ...prev, estimatedDeliveryTime: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="e.g., 30-45 mins"
                />
              </div>
            </CardContent>
          </Card>

          {/* Opening Hours */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Opening Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {days.map(day => (
                <div key={day} className="flex items-center gap-4">
                  <div className="w-24">
                    <span className="font-medium capitalize">{day}</span>
                  </div>

                  <Switch
                    checked={restaurantProfile.openingHours?.[day]?.isOpen || false}
                    onCheckedChange={(checked) => updateOpeningHours(day, 'isOpen', checked)}
                    disabled={!isEditing}
                  />

                  {restaurantProfile.openingHours?.[day]?.isOpen ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={restaurantProfile.openingHours[day].open}
                        onChange={(e) => updateOpeningHours(day, 'open', e.target.value)}
                        disabled={!isEditing}
                        className="w-32"
                      />
                      <span>to</span>
                      <Input
                        type="time"
                        value={restaurantProfile.openingHours[day].close}
                        onChange={(e) => updateOpeningHours(day, 'close', e.target.value)}
                        disabled={!isEditing}
                        className="w-32"
                      />
                    </div>
                  ) : (
                    <span className="text-gray-500">Closed</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Restaurant Status */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Restaurant Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Restaurant Active Status</h4>
                  <p className="text-sm text-gray-600">
                    {restaurantProfile.isActive
                      ? 'Your restaurant is currently accepting orders'
                      : 'Your restaurant is temporarily closed'
                    }
                  </p>
                </div>
                <Switch
                  checked={restaurantProfile.isActive}
                  onCheckedChange={(checked) => setRestaurantProfile(prev => ({ ...prev, isActive: checked }))}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          {/* Kitchen Capacity Settings */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="w-5 h-5" />
                Kitchen Capacity Settings
              </CardTitle>
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
                  onChange={(e) => setRestaurantProfile(prev => ({ ...prev, maxCapacity: Number(e.target.value) }))}
                  disabled={!isEditing}
                  placeholder="15"
                />
                <p className="text-sm text-gray-600 mt-2">
                  Set the maximum number of orders your kitchen can handle simultaneously.
                  This helps calculate demand levels and wait times for customers.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 How This Works</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Helps customers see accurate wait times</li>
                  <li>• Shows demand indicators (🟢🟡🟠🔴) on your restaurant card</li>
                  <li>• Alerts you when kitchen capacity reaches 80%+</li>
                  <li>• Recommended: 10-20 for small kitchens, 20-30 for medium, 30+ for large</li>
                </ul>
              </div>

              {restaurantProfile.maxCapacity && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Current Capacity: {restaurantProfile.maxCapacity} orders</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex justify-between">
                      <span>🟢 Low Demand (0-24%):</span>
                      <span>0-{Math.floor(restaurantProfile.maxCapacity * 0.24)} orders</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🟡 Medium Demand (25-49%):</span>
                      <span>{Math.floor(restaurantProfile.maxCapacity * 0.25)}-{Math.floor(restaurantProfile.maxCapacity * 0.49)} orders</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🟠 High Demand (50-74%):</span>
                      <span>{Math.floor(restaurantProfile.maxCapacity * 0.50)}-{Math.floor(restaurantProfile.maxCapacity * 0.74)} orders</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🔴 Very High Demand (75%+):</span>
                      <span>{Math.floor(restaurantProfile.maxCapacity * 0.75)}+ orders</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Order Notifications</h4>
                    <p className="text-sm text-gray-600">Get notified about new orders and order updates</p>
                  </div>
                  <Switch
                    checked={notificationSettings.orderNotifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, orderNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Payment Notifications</h4>
                    <p className="text-sm text-gray-600">Receive updates about payments and payouts</p>
                  </div>
                  <Switch
                    checked={notificationSettings.paymentNotifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, paymentNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Review Notifications</h4>
                    <p className="text-sm text-gray-600">Get notified when customers leave reviews</p>
                  </div>
                  <Switch
                    checked={notificationSettings.reviewNotifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, reviewNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">SMS Notifications</h4>
                    <p className="text-sm text-gray-600">Receive important updates via SMS</p>
                  </div>
                  <Switch
                    checked={notificationSettings.smsNotifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, smsNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Push Notifications</h4>
                    <p className="text-sm text-gray-600">Enable browser push notifications</p>
                  </div>
                  <Switch
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, pushNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Promotional Emails</h4>
                    <p className="text-sm text-gray-600">Receive marketing and promotional content</p>
                  </div>
                  <Switch
                    checked={notificationSettings.promotionalEmails}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, promotionalEmails: checked }))}
                  />
                </div>
              </div>

              <Button onClick={handleSaveNotifications} disabled={isSaving} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Notification Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          {/* Bank Details */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Bank Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountHolder">Account Holder Name</Label>
                  <Input
                    id="accountHolder"
                    value={restaurantProfile.bankDetails.accountHolderName}
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={restaurantProfile.bankDetails.bankName}
                    disabled
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={restaurantProfile.bankDetails.accountNumber}
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    value={restaurantProfile.bankDetails.ifscCode}
                    disabled
                  />
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Contact support to update your bank account details for security reasons.
              </p>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start">
                Change Password
              </Button>

              <Button variant="outline" className="w-full justify-start">
                Enable Two-Factor Authentication
              </Button>

              <Button variant="outline" className="w-full justify-start">
                Download Account Data
              </Button>

              <Separator />

              <div className="pt-4">
                <h4 className="font-semibold text-red-600 mb-2">Danger Zone</h4>
                <Button variant="destructive" className="w-full">
                  Deactivate Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
