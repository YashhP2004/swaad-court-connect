import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Package,
  ShoppingBag,
  CreditCard,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Clock,
  DollarSign,
  ChefHat,
  Eye,
  Plus,
  Store,
  Users,
  Star,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  getVendorOrdersRealtime,
  getVendorProfile,
  getVendorStats,
  getVendorAnalytics,
  updateOrderStatus
} from '@/lib/firebase';

// Import dashboard components
import OrdersManagement from '@/components/vendor/OrdersManagement';
import SalesAnalytics from '@/components/vendor/SalesAnalytics';
import MenuManagement from '@/components/vendor/MenuManagement';
import BillingTransactions from '@/components/vendor/BillingTransactions';
import VendorSettings from '@/components/vendor/VendorSettings';

interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  totalMenuItems: number;
  avgOrderValue: number;
  totalRevenue: number;
  completionRate: number;
}

interface VendorProfile {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  address: string;
  cuisine: string[];
  logo?: string;
  rating: number;
  isOpen: boolean;
}

// Dashboard Overview Component
const DashboardOverview = ({
  stats,
  recentOrders,
  vendorProfile,
  onTabChange
}: {
  stats: DashboardStats;
  recentOrders: any[];
  vendorProfile: VendorProfile | null;
  onTabChange: (tab: string) => void;
}) => {
  // Calculate top selling items from recent orders (client-side approximation for "Trending Now")
  const getTrendingItems = () => {
    const itemCounts: Record<string, { name: string, count: number, price: number }> = {};

    recentOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          if (!itemCounts[item.id]) {
            itemCounts[item.id] = { name: item.name, count: 0, price: item.price || item.unitPrice || 0 };
          }
          itemCounts[item.id].count += item.quantity || 1;
        });
      }
    });

    return Object.values(itemCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  };

  const trendingItems = getTrendingItems();

  const handleAcceptOrder = async (orderId: string) => {
    if (!vendorProfile?.id) return;
    try {
      await updateOrderStatus(orderId, 'accepted', vendorProfile.id);
      toast.success('Order accepted');
    } catch (error) {
      toast.error('Failed to accept order');
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    if (!vendorProfile?.id) return;
    try {
      await updateOrderStatus(orderId, 'cancelled', vendorProfile.id);
      toast.success('Order rejected');
    } catch (error) {
      toast.error('Failed to reject order');
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-orange-500 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20"></div>

        <div className="relative p-8 md:p-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
                  {vendorProfile?.logo ? (
                    <img src={vendorProfile.logo} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <Store className="w-10 h-10 text-white" />
                  )}
                </div>
                <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-4 border-gray-900 ${vendorProfile?.isOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                  {vendorProfile?.businessName || 'Welcome Back'}
                </h1>
                <div className="flex items-center gap-4 text-gray-300">
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-semibold text-white">{vendorProfile?.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-sm font-medium px-3 py-1 bg-white/5 rounded-full border border-white/10">
                    {vendorProfile?.cuisine.join(', ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => onTabChange('orders')}
                className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg shadow-orange-500/25 transition-all hover:scale-105"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                View Orders
              </Button>
              <Button
                variant="outline"
                onClick={() => onTabChange('settings')}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm transition-all"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: "Today's Revenue",
            value: `₹${stats.todayRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: "text-green-600",
            bg: "bg-green-50",
            border: "border-green-100",
            trend: "+12% vs yesterday" // Placeholder trend
          },
          {
            title: "Today's Orders",
            value: stats.todayOrders,
            icon: ShoppingBag,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100",
            trend: `${stats.pendingOrders} pending`
          },
          {
            title: "Avg Order Value",
            value: `₹${Math.round(stats.avgOrderValue)}`,
            icon: TrendingUp,
            color: "text-purple-600",
            bg: "bg-purple-50",
            border: "border-purple-100",
            trend: "Based on today"
          },
          {
            title: "Completion Rate",
            value: `${Math.round(stats.completionRate)}%`,
            icon: CheckCircle,
            color: "text-orange-600",
            bg: "bg-orange-50",
            border: "border-orange-100",
            trend: "Performance"
          }
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`border ${stat.border} shadow-sm hover:shadow-md transition-all duration-300 group`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${stat.bg} ${stat.color}`}>
                    {stat.trend}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              Live Orders
            </h2>
            <Button variant="ghost" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => onTabChange('orders')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {recentOrders.length > 0 ? (
                recentOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
                      <div className={`h-1 w-full ${order.status === 'pending' ? 'bg-orange-500' :
                        order.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                        }`}></div>
                      <CardContent className="p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                              <ShoppingBag className="w-6 h-6 text-gray-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-gray-900">#{order.id.slice(-6)}</h4>
                                <Badge variant={
                                  order.status === 'pending' ? 'destructive' :
                                    order.status === 'completed' ? 'default' : 'secondary'
                                } className="uppercase text-[10px] tracking-wider">
                                  {order.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 font-medium">{order.customerName || 'Guest Customer'}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {order.items?.length || 0} items • ₹{order.totalAmount || 0}
                              </p>
                            </div>
                          </div>

                          {order.status === 'pending' && (
                            <div className="flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleRejectOrder(order.id)}
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleAcceptOrder(order.id)}
                              >
                                Accept
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <ShoppingBag className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">No orders yet</h3>
                  <p className="text-gray-500">New orders will appear here instantly</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
          {/* Trending Items */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 rounded-full blur-3xl opacity-10"></div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="w-5 h-5 text-orange-400" />
                Trending Now
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trendingItems.length > 0 ? (
                  trendingItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-100">{item.name}</p>
                          <p className="text-xs text-gray-400">{item.count} orders</p>
                        </div>
                      </div>
                      <span className="font-bold text-orange-400">₹{item.price}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">No trending data yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Grid */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-500" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 bg-white hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-all shadow-sm"
                onClick={() => onTabChange('menu')}
              >
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-xs font-medium">Add Item</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 bg-white hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
                onClick={() => onTabChange('analytics')}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-xs font-medium">Analytics</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 bg-white hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600 transition-all shadow-sm"
                onClick={() => onTabChange('settings')}
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-xs font-medium">Hours</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 bg-white hover:bg-green-50 hover:border-green-200 hover:text-green-600 transition-all shadow-sm"
                onClick={() => onTabChange('billing')}
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-xs font-medium">Payouts</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function VendorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    todayOrders: 0,
    todayRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalMenuItems: 0,
    avgOrderValue: 0,
    totalRevenue: 0,
    completionRate: 0
  });
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  console.log('🏪 VendorDashboard rendered, user:', user);

  const loadVendorData = useCallback(async () => {
    console.log('🔄 loadVendorData called, user:', user);
    if (!user?.uid) {
      console.log('❌ No user.uid, returning early');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔄 Loading vendor data for:', user.uid);

      // Load vendor profile and stats
      console.log('📡 Fetching profile and stats...');
      const [profile, stats] = await Promise.all([
        getVendorProfile(user.uid),
        getVendorStats(user.uid)
      ]);

      console.log('✅ Profile loaded:', profile);
      console.log('✅ Stats loaded:', stats);

      if (profile) {
        setVendorProfile(profile);
      } else {
        throw new Error('Failed to load vendor profile');
      }

      // Set dashboard stats
      setDashboardStats(prev => ({
        ...prev,
        ...stats
      }));

      // Set up real-time orders listener using restaurantId
      const restaurantId = profile?.restaurantId || user.uid;
      console.log('📡 Setting up real-time listener for restaurant:', restaurantId);

      const unsubscribe = getVendorOrdersRealtime(restaurantId, (orders) => {
        console.log('📦 Received orders update:', orders.length);

        // First callback means listener is working, so we can stop loading
        setIsLoading(false);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayOrders = orders.filter(order => {
          let orderDate: Date;
          // Handle Firestore Timestamp
          if (order.createdAt && typeof order.createdAt.toDate === 'function') {
            orderDate = order.createdAt.toDate();
          } else if (order.createdAt && typeof order.createdAt.toMillis === 'function') {
            orderDate = new Date(order.createdAt.toMillis());
          } else {
            // Handle string or number
            orderDate = new Date(order.createdAt || Date.now());
          }

          console.log(`Order ${order.id} date:`, orderDate, 'Today:', today);
          return orderDate >= today;
        });

        const pendingOrders = orders.filter(order =>
          ['pending', 'accepted', 'preparing'].includes(order.status?.toLowerCase())
        );

        const completedToday = todayOrders.filter(order =>
          order.status?.toLowerCase() === 'completed'
        );

        const todayRevenue = completedToday.reduce((sum, order) =>
          sum + (order.totalAmount || 0), 0
        );

        // Calculate all-time completed orders and revenue
        const allCompletedOrders = orders.filter(order =>
          order.status?.toLowerCase() === 'completed'
        );

        const totalRevenue = allCompletedOrders.reduce((sum, order) =>
          sum + (order.totalAmount || 0), 0
        );

        // Calculate average order value
        const avgOrderValue = allCompletedOrders.length > 0
          ? totalRevenue / allCompletedOrders.length
          : 0;

        // Calculate completion rate
        const completionRate = orders.length > 0
          ? (allCompletedOrders.length / orders.length) * 100
          : 0;

        console.log('📊 Stats calculated:', {
          todayOrders: todayOrders.length,
          todayRevenue,
          pendingOrders: pendingOrders.length,
          completedOrders: allCompletedOrders.length,
          totalRevenue,
          avgOrderValue,
          completionRate
        });

        setDashboardStats(prev => ({
          ...prev,
          todayOrders: todayOrders.length,
          todayRevenue,
          pendingOrders: pendingOrders.length,
          completedOrders: allCompletedOrders.length,
          totalRevenue,
          avgOrderValue,
          completionRate
        }));

        setRecentOrders(orders.slice(0, 5));
      });

      console.log('✅ Real-time listener set up successfully');

      return () => unsubscribe && unsubscribe();
    } catch (error) {
      console.error('❌ Error loading vendor data:', error);
      toast.error('Failed to load dashboard data: ' + (error as Error).message);
      setIsLoading(false);
    }
  }, [user, navigate]);

  // Check if user is vendor and load data
  useEffect(() => {
    console.log('🔍 useEffect triggered, user:', user);
    if (!user || user.role !== 'vendor') {
      console.log('❌ User is not vendor or not logged in, redirecting...');
      navigate('/login');
      return;
    }
    console.log('✅ User is vendor, calling loadVendorData...');
    loadVendorData();
  }, [user, navigate, loadVendorData]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Top Navigation Bar */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {vendorProfile?.businessName || 'Vendor Dashboard'}
                </h1>
                <p className="text-sm text-gray-600">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="gap-2 hidden md:flex">
              <Bell className="w-4 h-4" />
              <Badge variant="destructive" className="text-xs">3</Badge>
            </Button>

            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={vendorProfile?.logo} />
                <AvatarFallback className="bg-orange-100 text-orange-700 text-sm">
                  {vendorProfile?.businessName?.charAt(0) || 'V'}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-700 hover:text-red-600"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Modern Tabs */}
      <main className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Modern Tab Navigation */}
          <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 bg-transparent gap-2">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white rounded-xl font-medium transition-all duration-200"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-xl font-medium transition-all duration-200"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Orders
                {dashboardStats.pendingOrders > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {dashboardStats.pendingOrders}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="menu"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white rounded-xl font-medium transition-all duration-200"
              >
                <ChefHat className="w-4 h-4 mr-2" />
                Menu
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-500 data-[state=active]:text-white rounded-xl font-medium transition-all duration-200"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger
                value="billing"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-500 data-[state=active]:text-white rounded-xl font-medium transition-all duration-200"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Billing
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-500 data-[state=active]:to-slate-500 data-[state=active]:text-white rounded-xl font-medium transition-all duration-200"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content */}
          <TabsContent value="overview" className="space-y-6">
            <DashboardOverview
              stats={dashboardStats}
              recentOrders={recentOrders}
              vendorProfile={vendorProfile}
              onTabChange={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersManagement />
          </TabsContent>

          <TabsContent value="menu">
            <MenuManagement />
          </TabsContent>

          <TabsContent value="analytics">
            <SalesAnalytics />
          </TabsContent>

          <TabsContent value="billing">
            <BillingTransactions />
          </TabsContent>

          <TabsContent value="settings">
            <VendorSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
