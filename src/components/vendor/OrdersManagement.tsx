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
  ChefHat
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
            status: (order.vendorStatus as VendorOrderStatus) || 'pending',
            vendorStatus: (order.vendorStatus as VendorOrderStatus) || 'pending',
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

  const getStatusIcon = (status: VendorOrderStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
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
      pending: 'secondary',
      accepted: 'default',
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
    pending: 'accepted',
    accepted: 'preparing',
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
      pending: orders.filter(o => o.vendorStatus === 'pending').length,
      accepted: orders.filter(o => o.vendorStatus === 'accepted').length,
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
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
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
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={order.customerAvatar} />
                            <AvatarFallback>
                              {order.customerName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-lg">{order.customerName}</h3>
                            <p className="text-sm text-gray-600">Order #{order.orderNumber}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.vendorStatus)}
                          {getStatusBadge(order.vendorStatus)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          {order.customerEmail || 'No email'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Package className="w-4 h-4" />
                          {order.orderType === 'dine-in' ? `Table ${order.tableNumber || 'N/A'}` : 'Takeaway'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CreditCard className="w-4 h-4" />
                          ₹{Number(order.totalAmount) || 0} ({order.paymentStatus})
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          {order.createdAt.toLocaleTimeString()}
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Items ({order.items?.length || 0})</h4>
                        <div className="space-y-1">
                          {order.items?.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.name}</span>
                              <span>₹{(Number(item.price) || 0) * (Number(item.quantity) || 1)}</span>
                            </div>
                          ))}
                          {order.items?.length > 3 && (
                            <p className="text-sm text-gray-500">
                              +{order.items.length - 3} more items
                            </p>
                          )}
                        </div>
                      </div>

                      {order.specialInstructions && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">Special Instructions</span>
                          </div>
                          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {order.specialInstructions}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 lg:w-56">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedOrder(order)}
                        className="gap-2 w-full"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </Button>

                      {/* Quick Status Dropdown - ALWAYS VISIBLE */}
                      {!['completed', 'cancelled'].includes(order.vendorStatus) && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-700">Update Status:</label>
                          <Select
                            value={order.vendorStatus}
                            onValueChange={(newStatus) => handleStatusUpdate(order.id, newStatus as VendorOrderStatus)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="accepted">Accepted</SelectItem>
                              <SelectItem value="preparing">Preparing</SelectItem>
                              <SelectItem value="ready">Ready</SelectItem>
                              <SelectItem value="collected">Collected</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Status Update Buttons */}
                      {order.vendorStatus === 'pending' && (
                        <>
                          <Button
                            onClick={() => handleStatusUpdate(order.id, 'accepted')}
                            className="gap-2 w-full bg-green-600 hover:bg-green-700 text-white shadow-md"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Accept Order
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                            className="gap-2 w-full shadow-md"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </Button>
                        </>
                      )}

                      {order.vendorStatus === 'accepted' && (
                        <Button
                          onClick={() => handleStatusUpdate(order.id, 'preparing')}
                          className="gap-2 w-full bg-orange-600 hover:bg-orange-700 text-white shadow-md"
                        >
                          <ChefHat className="w-4 h-4" />
                          Start Preparing
                        </Button>
                      )}

                      {order.vendorStatus === 'preparing' && (
                        <Button
                          onClick={() => handleStatusUpdate(order.id, 'ready')}
                          className="gap-2 w-full bg-green-600 hover:bg-green-700 text-white shadow-md"
                        >
                          <Package className="w-4 h-4" />
                          Mark as Ready
                        </Button>
                      )}

                      {order.vendorStatus === 'ready' && (
                        <Button
                          onClick={() => handleStatusUpdate(order.id, 'collected')}
                          className="gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark Collected
                        </Button>
                      )}

                      {order.vendorStatus === 'collected' && (
                        <Button
                          onClick={() => handleStatusUpdate(order.id, 'completed')}
                          className="gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark Completed
                        </Button>
                      )}

                      {['accepted', 'preparing', 'ready', 'collected'].includes(order.vendorStatus) && (
                        <Button
                          variant="outline"
                          onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                          className="gap-2 w-full border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancel
                        </Button>
                      )}

                      {['completed', 'cancelled'].includes(order.vendorStatus) && (
                        <div className="text-xs text-center text-gray-500 py-2 bg-gray-50 rounded">
                          Order {order.vendorStatus}
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
              <DialogTitle>Order Details - #{selectedOrder.id.slice(-6)}</DialogTitle>
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
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
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
                  {selectedOrder.vendorStatus === 'pending' && (
                    <>
                      <Button
                        onClick={() => {
                          handleStatusUpdate(selectedOrder.id, 'accepted');
                          setSelectedOrder(null);
                        }}
                        className="gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Accept Order
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          handleStatusUpdate(selectedOrder.id, 'cancelled');
                          setSelectedOrder(null);
                        }}
                        className="gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject Order
                      </Button>
                    </>
                  )}

                  {selectedOrder.vendorStatus === 'accepted' && (
                    <Button
                      onClick={() => {
                        handleStatusUpdate(selectedOrder.id, 'preparing');
                        setSelectedOrder(null);
                      }}
                      className="gap-2 col-span-2"
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
                        handleStatusUpdate(selectedOrder.id, 'collected');
                        setSelectedOrder(null);
                      }}
                      className="gap-2 col-span-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark as Collected
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
    </div>
  );
}
