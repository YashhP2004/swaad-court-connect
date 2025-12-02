import React, { useState, useEffect } from 'react';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Filter,
  Download,
  RefreshCw,
  MapPin,
  Phone,
  User,
  Store,
  DollarSign,
  Calendar,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getAllOrdersForAdmin } from '@/lib/firebase';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  isVeg: boolean;
}

interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  restaurantId: string;
  restaurantName: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'collected' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'card' | 'upi' | 'cash' | 'wallet';
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  createdAt: Date;
  updatedAt: Date;
  estimatedTime?: number;
  deliveryAddress?: string;
  tableNumber?: string;
  notes?: string;
  refundReason?: string;
}

export default function OrdersManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, statusFilter, paymentFilter, dateFilter]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      console.log('OrdersManagement: Loading orders from Firebase...');
      const ordersData = await getAllOrdersForAdmin();
      console.log('OrdersManagement: Loaded', ordersData.length, 'orders');
      setOrders(ordersData);

      if (ordersData.length === 0) {
        toast.info('No orders found in the system');
      } else {
        toast.success(`Loaded ${ordersData.length} orders successfully`);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders from Firebase');
      setOrders([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(order => order.paymentStatus === paymentFilter);
    }

    // Date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (dateFilter === 'today') {
      filtered = filtered.filter(order => order.createdAt >= today);
    } else if (dateFilter === 'yesterday') {
      filtered = filtered.filter(order =>
        order.createdAt >= yesterday && order.createdAt < today
      );
    } else if (dateFilter === 'week') {
      filtered = filtered.filter(order => order.createdAt >= weekAgo);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.restaurantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerPhone.includes(searchQuery)
      );
    }

    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || 'pending';
    const variants = {
      pending: <Badge variant="secondary">Pending</Badge>,
      placed: <Badge variant="secondary">Placed</Badge>,
      accepted: <Badge className="bg-blue-100 text-blue-800">Accepted</Badge>,
      confirmed: <Badge className="bg-blue-100 text-blue-800">Confirmed</Badge>,
      preparing: <Badge className="bg-yellow-100 text-yellow-800">Preparing</Badge>,
      ready: <Badge className="bg-green-100 text-green-800">Ready</Badge>,
      collected: <Badge variant="default">Collected</Badge>,
      delivered: <Badge variant="default">Delivered</Badge>,
      completed: <Badge variant="default">Completed</Badge>,
      cancelled: <Badge variant="destructive">Cancelled</Badge>,
      refunded: <Badge className="bg-purple-100 text-purple-800">Refunded</Badge>
    };
    return variants[normalizedStatus as keyof typeof variants] || <Badge variant="outline">{status}</Badge>;
  };

  const getPaymentBadge = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || 'pending';
    const variants = {
      pending: <Badge variant="secondary">Payment: Pending</Badge>,
      completed: <Badge className="bg-green-100 text-green-800">Payment: Completed</Badge>,
      paid: <Badge className="bg-green-100 text-green-800">Payment: Paid</Badge>,
      failed: <Badge variant="destructive">Payment: Failed</Badge>,
      refunded: <Badge className="bg-purple-100 text-purple-800">Payment: Refunded</Badge>
    };
    return variants[normalizedStatus as keyof typeof variants] || <Badge variant="outline">Payment: {status}</Badge>;
  };

  const getOrderTypeIcon = (type: string) => {
    const icons = {
      'dine-in': <Store className="w-4 h-4" />,
      'takeaway': <Package className="w-4 h-4" />,
      'delivery': <MapPin className="w-4 h-4" />
    };
    return icons[type as keyof typeof icons] || <Package className="w-4 h-4" />;
  };

  const calculateStats = () => {
    const totalOrders = filteredOrders.length;

    // Debug logs for status checking
    // console.log('Unique statuses:', [...new Set(filteredOrders.map(o => o.status))]);
    // console.log('Unique payment statuses:', [...new Set(filteredOrders.map(o => o.paymentStatus))]);

    const totalRevenue = filteredOrders.reduce((sum, order) => {
      const pStatus = order.paymentStatus?.toLowerCase();
      const oStatus = order.status?.toLowerCase();
      // Count revenue if payment is completed OR order is completed/delivered/collected
      if (pStatus === 'completed' || pStatus === 'paid' ||
        oStatus === 'collected' || oStatus === 'delivered' || oStatus === 'completed') {
        return sum + (order.totalAmount || 0);
      }
      return sum;
    }, 0);

    const pendingOrders = filteredOrders.filter(order => {
      const s = order.status?.toLowerCase();
      return ['pending', 'placed', 'accepted', 'confirmed', 'preparing', 'ready'].includes(s);
    }).length;

    const completedOrders = filteredOrders.filter(order => {
      const s = order.status?.toLowerCase();
      return ['collected', 'delivered', 'completed'].includes(s);
    }).length;

    return { totalOrders, totalRevenue, pendingOrders, completedOrders };
  };

  const stats = calculateStats();

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
          <p className="text-gray-600">Monitor and manage all platform orders</p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={loadOrders} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button className="gap-2">
            <Download className="w-4 h-4" />
            Export Orders
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.totalOrders}</div>
            <div className="text-sm text-white/70">Total Orders</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">₹{Math.round(stats.totalRevenue).toLocaleString()}</div>
            <div className="text-sm text-white/70">Revenue</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.pendingOrders}</div>
            <div className="text-sm text-white/70">Pending</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.completedOrders}</div>
            <div className="text-sm text-white/70">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Order Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="collected">Collected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          More Filters
        </Button>
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getOrderTypeIcon(order.orderType)}
                        <div>
                          <h3 className="font-semibold text-lg">{order.orderNumber}</h3>
                          <p className="text-sm text-gray-600">
                            {order.createdAt.toLocaleDateString()} • {order.createdAt.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      <div className="hidden md:block">
                        <div className="text-sm text-gray-500">Customer</div>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-sm text-gray-600">{order.customerEmail}</div>
                      </div>

                      <div className="hidden md:block">
                        <div className="text-sm text-gray-500">Restaurant</div>
                        <div className="font-medium">{order.restaurantName}</div>
                        <div className="text-sm text-gray-600">{(order.items || []).length} items</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">₹{Number(order.totalAmount) || 0}</div>
                        <div className="text-sm text-gray-600">{(order.paymentMethod || 'Unknown').toUpperCase()}</div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {getStatusBadge(order.status)}
                        {getPaymentBadge(order.paymentStatus)}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowDetailsDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>

                  {/* Mobile view additional info */}
                  <div className="md:hidden mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Customer: </span>
                      <span className="font-medium">{order.customerName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Restaurant: </span>
                      <span className="font-medium">{order.restaurantName}</span>
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600">Try adjusting your filters or search criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Order Details Dialog */}
      {selectedOrder && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details - {selectedOrder.orderNumber}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Order Date</span>
                  <p className="font-semibold">{selectedOrder.createdAt.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Order Type</span>
                  <p className="font-semibold capitalize">{selectedOrder.orderType}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Payment</span>
                  <div className="mt-1">{getPaymentBadge(selectedOrder.paymentStatus)}</div>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h4 className="font-semibold mb-3">Customer Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Name</span>
                    <p className="font-medium">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Email</span>
                    <p className="font-medium">{selectedOrder.customerEmail}</p>
                  </div>

                </div>
              </div>

              {/* Restaurant Info */}
              <div>
                <h4 className="font-semibold mb-3">Restaurant Information</h4>
                <p className="font-medium">{selectedOrder.restaurantName}</p>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-semibold mb-3">Order Items</h4>
                <div className="space-y-3">
                  {(selectedOrder.items || []).map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-semibold">₹{(Number(item.price) || 0) * (Number(item.quantity) || 1)}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Amount</span>
                    <span className="text-green-600">₹{selectedOrder.totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              {(selectedOrder.deliveryAddress || selectedOrder.tableNumber || selectedOrder.notes) && (
                <div>
                  <h4 className="font-semibold mb-3">Additional Information</h4>
                  {selectedOrder.deliveryAddress && (
                    <div className="mb-2">
                      <span className="text-sm text-gray-500">Delivery Address</span>
                      <p className="font-medium">{selectedOrder.deliveryAddress}</p>
                    </div>
                  )}
                  {selectedOrder.tableNumber && (
                    <div className="mb-2">
                      <span className="text-sm text-gray-500">Table Number</span>
                      <p className="font-medium">{selectedOrder.tableNumber}</p>
                    </div>
                  )}
                  {selectedOrder.notes && (
                    <div className="mb-2">
                      <span className="text-sm text-gray-500">Notes</span>
                      <p className="font-medium">{selectedOrder.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Refund Reason */}
              {selectedOrder.refundReason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">Refund Reason</h4>
                  <p className="text-red-700">{selectedOrder.refundReason}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
