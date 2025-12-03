import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Phone,
  MapPin,
  User,
  Package,
  CreditCard,
  MessageSquare,
  ChefHat,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import {
  getVendorOrdersRealtime,
  updateOrderStatus,
  getVendorProfile,
  VendorOrderStatus
} from '@/lib/firebase';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAvatar?: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    customizations?: string[];
  }>;
  totalAmount: number;
  status: VendorOrderStatus;
  vendorStatus: VendorOrderStatus;
  paymentStatus: 'pending' | 'completed' | 'failed';
  orderType: 'dine-in' | 'takeaway';
  tableNumber?: string;
  specialInstructions?: string;
  createdAt: Date;
  estimatedTime?: number;
  userId: string;
  userDetails?: {
    name: string;
    phone: string;
    email?: string;
  };
  pricing: {
    subtotal: number;
    tax: number;
    deliveryFee: number;
    totalAmount: number;
  };
  payment?: {
    method: string;
    status: string;
    transactionId?: string;
  };
}

export default function OrdersManagement() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [vendorProfile, setVendorProfile] = useState<any>(null);

  // OTP Verification State
  const [isOtpDialogOpen, setIsOtpDialogOpen] = useState(false);
  const [otpOrder, setOtpOrder] = useState<Order | null>(null);
  const [otpInput, setOtpInput] = useState(['', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const otpInputRefs = [
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null)
  ];

  // Real-time orders subscription
  useEffect(() => {
    if (!user?.uid) return;

    setIsLoading(true);
    let unsubscribe: (() => void) | null = null;

    // Load vendor profile and set up real-time listener
    const loadVendorProfile = async () => {
      try {
        const profile = await getVendorProfile(user.uid);
        setVendorProfile(profile);

        // Use restaurantId if available, otherwise use uid
        const vendorIdToUse = profile?.restaurantId || user.uid;
        console.log('📡 OrdersManagement: Setting up listener for:', vendorIdToUse);

        // Subscribe to real-time orders using restaurantId
        unsubscribe = getVendorOrdersRealtime(vendorIdToUse, (ordersData) => {
          console.log('📦 OrdersManagement: Received orders:', ordersData.length);
          const formattedOrders = ordersData.map(order => ({
            ...order,
            status: (order.vendorStatus as VendorOrderStatus) || 'queued',
            vendorStatus: (order.vendorStatus as VendorOrderStatus) || 'queued',
            customerName: order.userDetails?.name || 'Unknown Customer',
            customerPhone: order.userDetails?.phone || '',
            customerEmail: order.userDetails?.email || '',
            createdAt: order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt),
            totalAmount: order.pricing?.totalAmount || 0
          }));

          setOrders(formattedOrders);
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Error loading vendor profile:', error);
        setIsLoading(false);
      }
    };

    loadVendorProfile();

    return () => {
      if (unsubscribe) {
        console.log('🔌 OrdersManagement: Unsubscribing from orders');
        unsubscribe();
      }
    };
  }, [user?.uid]);

  // Filter orders based on status and search
  useEffect(() => {
    let filtered = orders;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.vendorStatus === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(order =>
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerPhone.includes(searchQuery)
      );
    }

    setFilteredOrders(filtered);
  }, [orders, statusFilter, searchQuery]);

  const handleStatusUpdate = async (orderId: string, newStatus: VendorOrderStatus) => {
    if (!user?.uid) return;

    try {
      console.log('🔄 Updating order status:', orderId, 'to', newStatus);
      await updateOrderStatus(orderId, newStatus, user.uid);
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  // Handle OTP verification for order collection
  const handleOpenOtpDialog = (order: Order) => {
    setOtpOrder(order);
    setOtpInput(['', '', '', '']);
    setOtpError('');
    setIsOtpDialogOpen(true);
    // Focus first input after dialog opens
    setTimeout(() => otpInputRefs[0].current?.focus(), 100);
  };

  const handleOtpInputChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otpInput];
    newOtp[index] = value;
    setOtpInput(newOtp);
    setOtpError('');

    // Auto-focus next input
    if (value && index < 3) {
      otpInputRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpInput[index] && index > 0) {
      otpInputRefs[index - 1].current?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpOrder || !user?.uid) return;

    const enteredOtp = otpInput.join('');
    if (enteredOtp.length !== 4) {
      setOtpError('Please enter complete 4-digit OTP');
      return;
    }

    setIsVerifying(true);
    setOtpError('');

    try {
      const { verifyPickupOTP } = await import('@/lib/firebase/pickupOtp');
      const result = await verifyPickupOTP(otpOrder.id, enteredOtp);

      if (result.success) {
        // OTP verified successfully - mark order as collected
        await updateOrderStatus(otpOrder.id, 'collected', user.uid);
        toast.success('Order collected successfully!');
        setIsOtpDialogOpen(false);
        setOtpOrder(null);
        setOtpInput(['', '', '', '']);
      } else {
        // OTP verification failed
        setOtpError(result.message);
        setOtpInput(['', '', '', '']);
        otpInputRefs[0].current?.focus();

        if (result.attemptsRemaining === 0) {
          toast.error('Maximum attempts exceeded. Please contact support.');
          setTimeout(() => {
            setIsOtpDialogOpen(false);
            setOtpOrder(null);
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setOtpError('Failed to verify OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusIcon = (status: VendorOrderStatus) => {
    switch (status) {
      case 'queued':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'preparing':
        return <ChefHat className="w-4 h-4 text-orange-500" />;
      case 'ready':
        return <Package className="w-4 h-4 text-green-500" />;
      case 'collected':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: VendorOrderStatus) => {
    const variants = {
      queued: 'secondary',
      preparing: 'secondary',
      ready: 'default',
      collected: 'default',
      completed: 'default',
      cancelled: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status] || 'secondary'} className="text-xs capitalize">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const statusFlow: Record<VendorOrderStatus, VendorOrderStatus | null> = {
    queued: 'preparing',
    preparing: 'ready',
    ready: 'collected',
    collected: 'completed',
    completed: null,
    cancelled: null
  };

  const getNextStatus = (currentStatus: VendorOrderStatus): VendorOrderStatus | null => {
    return statusFlow[currentStatus];
  };

  const canUpdateStatus = (status: VendorOrderStatus): boolean => {
    return statusFlow[status] !== null;
  };

  const getOrderStats = () => {
    return {
      total: orders.length,
      queued: orders.filter(o => o.vendorStatus === 'queued').length,
      preparing: orders.filter(o => o.vendorStatus === 'preparing').length,
      ready: orders.filter(o => o.vendorStatus === 'ready').length,
      collected: orders.filter(o => o.vendorStatus === 'collected').length,
      completed: orders.filter(o => o.vendorStatus === 'completed').length
    };
  };

  const stats = getOrderStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Orders Management</h2>
          <p className="text-gray-600">Manage incoming orders and track their status</p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Orders</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.queued}</div>
              <div className="text-sm text-gray-600">Queued</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.preparing}</div>
              <div className="text-sm text-gray-600">Preparing</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
              <div className="text-sm text-gray-600">Ready</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by customer name, order ID, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="collected">Collected</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredOrders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-navy-900 text-white overflow-hidden group relative">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-peach-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>

                <CardContent className="p-6 relative z-10">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12 border-2 border-white/10 shadow-md">
                            <AvatarImage src={order.customerAvatar} />
                            <AvatarFallback className="bg-gradient-to-br from-navy-700 to-navy-800 text-peach-400 font-bold text-lg">
                              {order.customerName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-bold text-xl text-white tracking-tight">{order.customerName}</h3>
                            <p className="text-sm text-gray-400 font-medium flex items-center gap-2">
                              Order <span className="text-peach-400 font-mono">#{order.orderNumber || order.id.slice(-6)}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="bg-white/5 backdrop-blur-sm p-2 rounded-xl border border-white/10 shadow-sm">
                            {getStatusIcon(order.vendorStatus)}
                          </div>
                          {getStatusBadge(order.vendorStatus)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-white/5 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-peach-400">
                            {order.customerEmail ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                          </div>
                          <span className="font-medium">{order.customerEmail || order.customerPhone || 'No contact info'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-blue-400">
                            <Package className="w-4 h-4" />
                          </div>
                          <span className="font-medium">{order.orderType === 'dine-in' ? `Table ${order.tableNumber || 'N/A'}` : 'Takeaway'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-green-400">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <span className="font-medium">₹{Number(order.totalAmount) || 0}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-purple-400">
                            <Clock className="w-4 h-4" />
                          </div>
                          <span className="font-medium">{order.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-3">Order Items ({order.items?.length || 0})</h4>
                        <div className="space-y-2">
                          {order.items?.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm p-2 hover:bg-white/5 rounded-lg transition-colors">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-md bg-peach-500/20 text-peach-400 flex items-center justify-center text-xs font-bold">
                                  {item.quantity}x
                                </span>
                                <span className="text-gray-200 font-medium">{item.name}</span>
                              </div>
                              <span className="text-white font-bold">₹{(Number(item.price) || 0) * (Number(item.quantity) || 1)}</span>
                            </div>
                          ))}
                          {order.items?.length > 3 && (
                            <p className="text-xs text-peach-400 font-medium pl-2 pt-1">
                              +{order.items.length - 3} more items...
                            </p>
                          )}
                        </div>
                      </div>

                      {order.specialInstructions && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-peach-400" />
                            <span className="text-xs font-bold text-peach-400 uppercase tracking-wider">Special Instructions</span>
                          </div>
                          <p className="text-sm text-gray-300 bg-white/5 border border-white/10 p-3 rounded-xl italic">
                            "{order.specialInstructions}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 lg:w-64 border-t lg:border-t-0 lg:border-l border-white/10 pt-6 lg:pt-0 lg:pl-6">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedOrder(order)}
                        className="gap-2 w-full bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-peach-400 hover:border-peach-400/50 transition-all group/btn"
                      >
                        <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                        View Details
                      </Button>

                      {/* Quick Status Dropdown - ALWAYS VISIBLE */}
                      {!['completed', 'cancelled'].includes(order.vendorStatus) && (
                        <div className="space-y-2 bg-white/5 p-3 rounded-xl border border-white/10">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Update Status</label>
                          <Select
                            value={order.vendorStatus}
                            onValueChange={(newStatus) => handleStatusUpdate(order.id, newStatus as VendorOrderStatus)}
                          >
                            <SelectTrigger className="w-full bg-navy-950 border-white/10 text-white focus:ring-peach-500/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-navy-900 border-white/10 text-white">
                              <SelectItem value="queued" className="focus:bg-white/10 focus:text-white">Queued</SelectItem>
                              <SelectItem value="preparing" className="focus:bg-white/10 focus:text-white">Preparing</SelectItem>
                              <SelectItem value="ready" className="focus:bg-white/10 focus:text-white">Ready</SelectItem>
                              <SelectItem value="collected" className="focus:bg-white/10 focus:text-white">Collected</SelectItem>
                              <SelectItem value="completed" className="focus:bg-white/10 focus:text-white">Completed</SelectItem>
                              <SelectItem value="cancelled" className="focus:bg-white/10 focus:text-white">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Status Update Buttons */}
                      {order.vendorStatus === 'queued' && (
                        <Button
                          onClick={() => handleStatusUpdate(order.id, 'preparing')}
                          className="gap-2 w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20 border-0"
                        >
                          <ChefHat className="w-4 w-4" />
                          Start Preparing
                        </Button>
                      )}

                      {order.vendorStatus === 'preparing' && (
                        <Button
                          onClick={() => handleStatusUpdate(order.id, 'ready')}
                          className="gap-2 w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/20 border-0"
                        >
                          <Package className="w-4 h-4" />
                          Mark as Ready
                        </Button>
                      )}

                      {order.vendorStatus === 'ready' && (
                        <Button
                          onClick={() => handleOpenOtpDialog(order)}
                          className="gap-2 w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 border-0"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Verify & Collect
                        </Button>
                      )}

                      {order.vendorStatus === 'collected' && (
                        <Button
                          onClick={() => handleStatusUpdate(order.id, 'completed')}
                          className="gap-2 w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 border-0"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark Completed
                        </Button>
                      )}

                      {['accepted', 'preparing', 'ready', 'collected'].includes(order.vendorStatus) && (
                        <Button
                          variant="outline"
                          onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                          className="gap-2 w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancel Order
                        </Button>
                      )}

                      {['completed', 'cancelled'].includes(order.vendorStatus) && (
                        <div className={`text-xs font-bold text-center py-3 rounded-xl border ${order.vendorStatus === 'completed'
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                          ORDER {order.vendorStatus.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredOrders.length === 0 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600">
                {statusFilter === 'all'
                  ? 'No orders available at the moment.'
                  : `No ${statusFilter} orders found.`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details - #{selectedOrder.orderNumber || selectedOrder.id.slice(-6)}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Customer Info */}
              <div>
                <h4 className="font-semibold mb-3">Customer Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Name</span>
                    <p className="font-medium">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Phone</span>
                    <p className="font-medium">{selectedOrder.customerPhone || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Order Items */}
              <div>
                <h4 className="font-semibold mb-3">Order Items</h4>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        {item.customizations && item.customizations.length > 0 && (
                          <p className="text-sm text-gray-500">
                            Customizations: {item.customizations.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{item.price * item.quantity}</p>
                        <p className="text-sm text-gray-600">₹{item.price} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Pricing */}
              <div>
                <h4 className="font-semibold mb-3">Order Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{selectedOrder.pricing?.subtotal || selectedOrder.totalAmount}</span>
                  </div>
                  {selectedOrder.pricing?.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>₹{selectedOrder.pricing.tax}</span>
                    </div>
                  )}
                  {selectedOrder.pricing?.deliveryFee > 0 && (
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span>₹{selectedOrder.pricing.deliveryFee}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>₹{selectedOrder.totalAmount}</span>
                  </div>
                </div>
              </div>

              {selectedOrder.specialInstructions && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">Special Instructions</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {selectedOrder.specialInstructions}
                    </p>
                  </div>
                </>
              )}

              {/* Status Update Section in Modal */}
              <Separator />
              <div>
                <h4 className="font-semibold mb-3">Update Order Status</h4>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm text-gray-600">Current Status:</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedOrder.vendorStatus)}
                    {getStatusBadge(selectedOrder.vendorStatus)}
                  </div>
                </div>

                {/* Quick Status Dropdown in Modal */}
                {!['completed', 'cancelled'].includes(selectedOrder.vendorStatus) && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Change Status To:</label>
                    <Select
                      value={selectedOrder.vendorStatus}
                      onValueChange={(newStatus) => {
                        handleStatusUpdate(selectedOrder.id, newStatus as VendorOrderStatus);
                        setSelectedOrder(null);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="queued">Queued</SelectItem>
                        <SelectItem value="preparing">Preparing</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="collected">Collected</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {selectedOrder.vendorStatus === 'queued' && (
                    <Button
                      onClick={() => {
                        handleStatusUpdate(selectedOrder.id, 'preparing');
                        setSelectedOrder(null);
                      }}
                      className="gap-2 col-span-2 bg-orange-600 hover:bg-orange-700"
                    >
                      <ChefHat className="w-4 h-4" />
                      Start Preparing
                    </Button>
                  )}

                  {selectedOrder.vendorStatus === 'preparing' && (
                    <Button
                      onClick={() => {
                        handleStatusUpdate(selectedOrder.id, 'ready');
                        setSelectedOrder(null);
                      }}
                      className="gap-2 col-span-2 bg-green-600 hover:bg-green-700"
                    >
                      <Package className="w-4 h-4" />
                      Mark as Ready
                    </Button>
                  )}

                  {selectedOrder.vendorStatus === 'ready' && (
                    <Button
                      onClick={() => {
                        setSelectedOrder(null);
                        handleOpenOtpDialog(selectedOrder);
                      }}
                      className="gap-2 col-span-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Verify & Collect
                    </Button>
                  )}

                  {selectedOrder.vendorStatus === 'collected' && (
                    <Button
                      onClick={() => {
                        handleStatusUpdate(selectedOrder.id, 'completed');
                        setSelectedOrder(null);
                      }}
                      className="gap-2 col-span-2 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark as Completed
                    </Button>
                  )}

                  {['accepted', 'preparing', 'ready', 'collected'].includes(selectedOrder.vendorStatus) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleStatusUpdate(selectedOrder.id, 'cancelled');
                        setSelectedOrder(null);
                      }}
                      className="gap-2 col-span-2 border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel Order
                    </Button>
                  )}

                  {['completed', 'cancelled'].includes(selectedOrder.vendorStatus) && (
                    <div className="col-span-2 text-center text-sm text-gray-500 py-2">
                      This order is {selectedOrder.vendorStatus} and cannot be updated.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* OTP Verification Dialog */}
      {otpOrder && (
        <Dialog open={isOtpDialogOpen} onOpenChange={setIsOtpDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">Verify Pickup OTP</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Order Info */}
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">Order #{otpOrder.orderNumber}</p>
                <p className="font-semibold text-lg">{otpOrder.customerName}</p>
                <p className="text-sm text-gray-500">₹{otpOrder.totalAmount}</p>
              </div>

              <Separator />

              {/* OTP Input */}
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 mb-1">Enter 4-Digit OTP</p>
                  <p className="text-xs text-gray-500">Ask the customer for their pickup OTP</p>
                </div>

                <div className="flex justify-center gap-3">
                  {otpInput.map((digit, index) => (
                    <Input
                      key={index}
                      ref={otpInputRefs[index]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpInputChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-14 h-14 text-center text-2xl font-bold border-2 focus:border-orange-500 focus:ring-orange-500"
                      disabled={isVerifying}
                    />
                  ))}
                </div>

                {/* Error Message */}
                {otpError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{otpError}</span>
                  </motion.div>
                )}

                {/* Info Message */}
                <div className="flex items-center gap-2 text-blue-600 text-xs bg-blue-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>The customer should show you a 4-digit OTP from their orders page</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsOtpDialogOpen(false);
                    setOtpOrder(null);
                    setOtpInput(['', '', '', '']);
                    setOtpError('');
                  }}
                  disabled={isVerifying}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={isVerifying || otpInput.join('').length !== 4}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Verify OTP
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
