import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Store, 
  ShoppingBag, 
  CreditCard, 
  BarChart3, 
  Bell, 
  Settings,
  Shield,
  TrendingUp,
  Activity,
  DollarSign,
  Package,
  UserCheck,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Menu,
  X,
  LogOut,
  Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { getAdminDashboardStats, getRecentActivity } from '@/lib/firebase';
import VendorManagement from '@/components/admin/VendorManagement';
import RestaurantMonitoring from '@/components/admin/RestaurantMonitoring';
import OrdersManagement from '@/components/admin/OrdersManagement';
import PaymentsTransactions from '@/components/admin/PaymentsTransactions';
import UserManagement from '@/components/admin/UserManagement';
import AnalyticsReports from '@/components/admin/AnalyticsReports';
import NotificationsCommunication from '@/components/admin/NotificationsCommunication';
import AdminSettings from '@/components/admin/AdminSettings';
import PasswordResetManager from '@/components/admin/PasswordResetManager';

type AdminSection = 'dashboard' | 'vendors' | 'restaurants' | 'orders' | 'payments' | 'users' | 'analytics' | 'notifications' | 'settings' | 'password-reset';

export default function AdminPanel() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  type DashboardStats = {
    totalVendors: number;
    pendingApprovals: number;
    totalCustomers: number;
    totalOrders: number;
    totalRevenue: number;
    activeOrders: number;
    monthlyGrowth: number;
    platformCommission: number;
  };

  const defaultDashboardStats: DashboardStats = {
    totalVendors: 0,
    pendingApprovals: 0,
    totalCustomers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeOrders: 0,
    monthlyGrowth: 0,
    platformCommission: 0
  };

  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(defaultDashboardStats);

  useEffect(() => {
    console.log('AdminPanel useEffect - user:', user, 'authLoading:', authLoading);
    
    // Check admin permissions - wait for auth to be initialized
    if (authLoading) {
      return; // Don't check permissions while auth is still loading
    }
    
    if (!user) {
      // User is not authenticated, redirect to login
      console.log('AdminPanel: No user found, redirecting to login');
      navigate('/login');
      return;
    }
    
    if (user.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      navigate('/'); // Redirect to home page for non-admin users
      return;
    }

    loadDashboardStats();
  }, [user, authLoading, navigate]);

  const loadDashboardStats = async () => {
    setDashboardLoading(true);
    try {
      const stats = await getAdminDashboardStats();
      const totalVendors = stats?.users?.vendors ?? 0;
      const activeRestaurants = stats?.restaurants?.active ?? 0;
      const totalRestaurants = stats?.restaurants?.total ?? 0;
      const pendingApprovals = Math.max(totalRestaurants - activeRestaurants, 0);

      setDashboardStats({
        totalVendors,
        pendingApprovals,
        totalCustomers: stats?.users?.customers ?? stats?.users?.total ?? 0,
        totalOrders: stats?.orders?.total ?? 0,
        totalRevenue: stats?.orders?.totalRevenue ?? 0,
        activeOrders: stats?.orders?.pending ?? 0,
        monthlyGrowth: stats?.users?.monthlyGrowth ?? 0,
        platformCommission: stats?.orders?.platformCommission ?? 0
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('AdminPanel: Starting logout process');
      await logout();
      console.log('AdminPanel: Logout completed');
      toast.success('Logged out successfully');
      
      // Force navigation after a short delay to ensure auth state is updated
      setTimeout(() => {
        console.log('AdminPanel: Forcing navigation to login');
        navigate('/login', { replace: true });
      }, 500);
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to logout');
    }
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'vendors', label: 'Vendor Management', icon: Store },
    { id: 'restaurants', label: 'Restaurant Monitoring', icon: Package },
    { id: 'orders', label: 'Orders Management', icon: ShoppingBag },
    { id: 'payments', label: 'Payments & Transactions', icon: CreditCard },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'analytics', label: 'Analytics & Reports', icon: TrendingUp },
    { id: 'notifications', label: 'Communications', icon: Bell },
    { id: 'password-reset', label: 'Password Reset', icon: Key },
    { id: 'settings', label: 'Admin Settings', icon: Settings }
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Platform overview and management</p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" onClick={loadDashboardStats} className="gap-2">
            <Activity className="w-4 h-4" />
            Refresh
          </Button>
          <Button className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white-600">Total Vendors</p>
                  <p className="text-3xl font-bold text-white-900">{dashboardStats.totalVendors}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {dashboardStats.pendingApprovals} pending
                    </Badge>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Store className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white-600">Total Customers</p>
                  <p className="text-3xl font-bold text-white-900">{dashboardStats.totalCustomers.toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="default" className="text-xs">
                      +{dashboardStats.monthlyGrowth}% this month
                    </Badge>
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white-600">Total Orders</p>
                  <p className="text-3xl font-bold text-white-900">{dashboardStats.totalOrders.toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {dashboardStats.activeOrders} active
                    </Badge>
                  </div>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white-600">Platform Revenue</p>
                  <p className="text-3xl font-bold text-white-900">₹{dashboardStats.totalRevenue.toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="default" className="text-xs">
                      ₹{dashboardStats.platformCommission.toLocaleString()} commission
                    </Badge>
                  </div>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div>
                  <p className="font-medium text-black">Vendor Applications</p>
                  <p className="text-sm text-gray-600">{dashboardStats.pendingApprovals} waiting for approval</p>
                </div>
                <Button size="sm" onClick={() => setActiveSection('vendors')}>
                  Review
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-black">Menu Item Reports</p>
                  <p className="text-sm text-gray-600">3 items flagged for review</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setActiveSection('restaurants')}>
                  Review
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New vendor registered</p>
                  <p className="text-xs text-gray-500">Pizza Palace - 5 minutes ago</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Large order placed</p>
                  <p className="text-xs text-gray-500">₹2,450 order from corporate client</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Payment dispute reported</p>
                  <p className="text-xs text-gray-500">Order #12345 requires attention</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'vendors':
        return <VendorManagement />;
      case 'restaurants':
        return <RestaurantMonitoring />;
      case 'orders':
        return <OrdersManagement />;
      case 'payments':
        return <PaymentsTransactions />;
      case 'users':
        return <UserManagement />;
      case 'analytics':
        return <AnalyticsReports />;
      case 'notifications':
        return <NotificationsCommunication />;
      case 'password-reset':
        return <PasswordResetManager />;
      case 'settings':
        return <AdminSettings />;
      default:
        return renderDashboard();
    }
  };

  if (authLoading || dashboardLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col"
          >
            {/* Logo */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-black">Admin Panel</h2>
                  <p className="text-xs text-gray-500">Swaad Court Connect</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id as AdminSection)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-orange-100 text-orange-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* User Info */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-black">{user?.name || 'Admin'}</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            
            <div className="hidden lg:block">
              <h1 className="text-xl font-semibold capitalize">
                {activeSection.replace(/([A-Z])/g, ' $1').trim()}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              <span className=" md:inline">Logout</span>
            </Button>
            
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.name?.charAt(0) || 'A'}
              </span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
