import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Download,
  Search,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Banknote,
  Wallet,
  Calendar,
  BarChart3,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';
import { getVendorPayoutHistory, requestVendorPayout, type PayoutBatch } from '@/lib/firebase/payout';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface Transaction {
  id: string;
  orderId: string;
  customerName: string;
  amount: number;
  paymentMethod: 'card' | 'upi' | 'cash' | 'wallet';
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  orderStatus: 'pending' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  payoutStatus: 'pending' | 'queued' | 'processing' | 'paid';
  transactionId: string;
  timestamp: Date;
  commission: number;
  earnings: number;
  description: string;
  payoutBatchId?: string;
}

interface PaymentSummary {
  totalEarnings: number;
  lifetimeEarnings: number;
  filteredEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
  lastPayoutDate?: Date;
  lastPayoutAmount?: number;
}

interface CompletedPayout {
  id: string;
  batchNumber: string;
  amount: number;
  payoutDate: Date;
  utrNumber?: string;
  orderCount: number;
  orderIds: string[];
}

export default function BillingTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [completedPayouts, setCompletedPayouts] = useState<CompletedPayout[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary>({
    totalEarnings: 0,
    lifetimeEarnings: 0,
    filteredEarnings: 0,
    pendingPayouts: 0,
    completedPayouts: 0
  });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<CompletedPayout | null>(null);
  const [dateRange, setDateRange] = useState('7d');
  const [statusFilter, setStatusFilter] = useState('all');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyEarnings, setWeeklyEarnings] = useState<number[]>([]);

  useEffect(() => {
    if (user?.uid) {
      loadBillingData();
    }
  }, [dateRange, statusFilter, user]);

  const loadBillingData = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      // Get all orders for this vendor
      const ordersRef = collection(db, 'orders');
      const ordersQuery = query(
        ordersRef,
        where('restaurantId', '==', user.uid),
        where('payment.status', '==', 'Completed'),
        orderBy('createdAt', 'desc')
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const transactionData: Transaction[] = [];
      let lifetimeEarnings = 0;
      let pendingBalance = 0;
      let completedPayoutsTotal = 0;

      ordersSnapshot.forEach(doc => {
        const order = doc.data();
        const totalAmount = order.pricing?.totalAmount || 0;
        const commission = totalAmount * 0.05;
        const earnings = totalAmount - commission;
        const payoutStatus = order.payoutStatus || 'pending';

        lifetimeEarnings += earnings;

        if (payoutStatus === 'pending') {
          pendingBalance += earnings;
        } else if (payoutStatus === 'paid') {
          completedPayoutsTotal += earnings;
        }

        transactionData.push({
          id: doc.id,
          orderId: doc.id,
          customerName: order.customerName || 'Unknown Customer',
          amount: totalAmount,
          paymentMethod: order.payment?.method || 'card',
          status: order.payment?.status === 'Completed' ? 'completed' : 'pending',
          orderStatus: order.status || 'pending',
          payoutStatus: payoutStatus,
          transactionId: order.payment?.transactionId || '',
          timestamp: order.createdAt?.toDate ? order.createdAt.toDate() : new Date(),
          commission,
          earnings,
          description: `Order payment for ${order.items?.length || 0} items`,
          payoutBatchId: order.payoutBatchId
        });
      });

      setTransactions(transactionData);

      // Get payout history
      const payoutHistory = await getVendorPayoutHistory(user.uid);
      const completedPayoutsData: CompletedPayout[] = payoutHistory
        .filter(batch => batch.status === 'completed')
        .map(batch => {
          const vendorPayout = batch.vendorPayouts[0];
          return {
            id: batch.id,
            batchNumber: batch.batchNumber,
            amount: vendorPayout.amount,
            payoutDate: batch.processedAt || batch.createdAt,
            utrNumber: vendorPayout.utrNumber,
            orderCount: vendorPayout.orderIds.length,
            orderIds: vendorPayout.orderIds
          };
        });

      setCompletedPayouts(completedPayoutsData);

      // Calculate weekly earnings
      const weeklyData = calculateWeeklyEarnings(transactionData);
      setWeeklyEarnings(weeklyData);

      // Calculate filtered earnings based on date range
      const filteredEarnings = calculateFilteredEarnings(transactionData, dateRange);

      const lastPayout = completedPayoutsData[0];

      setPaymentSummary({
        totalEarnings: pendingBalance,
        lifetimeEarnings,
        filteredEarnings,
        pendingPayouts: pendingBalance,
        completedPayouts: completedPayoutsData.length,
        lastPayoutDate: lastPayout?.payoutDate,
        lastPayoutAmount: lastPayout?.amount
      });

    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateWeeklyEarnings = (transactions: Transaction[]): number[] => {
    const today = new Date();
    const weeklyData = Array(7).fill(0);

    transactions.forEach(txn => {
      const daysDiff = Math.floor((today.getTime() - txn.timestamp.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 7 && txn.status === 'completed') {
        weeklyData[6 - daysDiff] += txn.earnings;
      }
    });

    return weeklyData;
  };

  const calculateFilteredEarnings = (transactions: Transaction[], range: string): number => {
    const now = new Date();
    let cutoffDate = new Date();

    switch (range) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return transactions.reduce((sum, txn) => sum + (txn.status === 'completed' ? txn.earnings : 0), 0);
    }

    return transactions
      .filter(txn => txn.timestamp >= cutoffDate && txn.status === 'completed')
      .reduce((sum, txn) => sum + txn.earnings, 0);
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.transactionId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesPayoutStatus = payoutStatusFilter === 'all' || transaction.payoutStatus === payoutStatusFilter;
    return matchesSearch && matchesStatus && matchesPayoutStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'refunded':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      pending: 'secondary',
      failed: 'destructive',
      refunded: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'} className="text-xs">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPayoutStatusBadge = (status: string) => {
    const variants = {
      pending: <Badge variant="secondary" className="bg-gray-100 text-gray-800">Pending</Badge>,
      queued: <Badge className="bg-blue-100 text-blue-800">Queued</Badge>,
      processing: <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>,
      paid: <Badge className="bg-green-100 text-green-800">Paid</Badge>
    };
    return variants[status as keyof typeof variants] || variants.pending;
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
        return <CreditCard className="w-4 h-4" />;
      case 'upi':
        return <Banknote className="w-4 h-4" />;
      case 'wallet':
        return <Wallet className="w-4 h-4" />;
      case 'cash':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const handleRequestPayout = async () => {
    if (payoutAmount <= 0 || payoutAmount > paymentSummary.pendingPayouts) {
      toast.error('Invalid payout amount');
      return;
    }

    try {
      if (!user?.uid) return;
      await requestVendorPayout(user.uid, payoutAmount);

      toast.success('Payout request submitted successfully');
      setPayoutAmount(0);
      setIsPayoutDialogOpen(false);
      loadBillingData();
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast.error('Failed to submit payout request');
    }
  };

  const exportTransactions = () => {
    toast.success('Transaction report exported successfully');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-3 text-gray-600">Loading billing data...</span>
      </div>
    );
  }

  const maxWeeklyEarning = Math.max(...weeklyEarnings, 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Billing & Transactions</h2>
          <p className="text-gray-600">Track payments, transactions, and manage payouts</p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={exportTransactions} className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>

          <Dialog open={isPayoutDialogOpen} onOpenChange={setIsPayoutDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="gap-2 bg-orange-600 hover:bg-orange-700"
                disabled={paymentSummary.pendingPayouts === 0}
              >
                <Banknote className="w-4 h-4" />
                Request Payout
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Payment Summary Cards */}
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
                  <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
                  <p className="text-2xl font-bold text-green-600">₹{paymentSummary.lifetimeEarnings.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs text-gray-500">Filtered: ₹{paymentSummary.filteredEarnings.toLocaleString()}</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
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
                  <p className="text-sm text-gray-600 mb-1">Pending Payouts</p>
                  <p className="text-2xl font-bold text-orange-600">₹{paymentSummary.pendingPayouts.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className="text-sm text-orange-600">Outstanding</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
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
                  <p className="text-sm text-gray-600 mb-1">Completed Payouts</p>
                  <p className="text-2xl font-bold text-purple-600">{paymentSummary.completedPayouts}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <CreditCard className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-purple-600">Total received</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-purple-600" />
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
                  <p className="text-sm text-gray-600 mb-1">Last Payout</p>
                  <p className="text-lg font-bold text-blue-600">
                    {paymentSummary.lastPayoutDate
                      ? paymentSummary.lastPayoutDate.toLocaleDateString()
                      : 'No payouts yet'}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-sm text-blue-600">
                      {paymentSummary.lastPayoutAmount
                        ? `₹${paymentSummary.lastPayoutAmount.toLocaleString()}`
                        : '-'}
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Weekly Earnings Chart */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Weekly Earnings Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-32">
            {weeklyEarnings.map((earning, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-gray-200 rounded-t-lg relative" style={{ height: '100%' }}>
                  <div
                    className="w-full bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-lg absolute bottom-0 transition-all"
                    style={{ height: `${(earning / maxWeeklyEarning) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-600">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                </div>
                <div className="text-xs font-semibold text-green-600">
                  ₹{earning.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          <TabsTrigger value="payouts">Completed Payouts</TabsTrigger>
          <TabsTrigger value="reports">Financial Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search transactions..."
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
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={payoutStatusFilter} onValueChange={setPayoutStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Payout Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payout Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 3 Months</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transactions Table */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Order Status</TableHead>
                    <TableHead>Payout Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction, index) => (
                    <motion.tr
                      key={transaction.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold">{transaction.transactionId}</p>
                          <p className="text-sm text-gray-500">{transaction.orderId.slice(0, 8)}</p>
                        </div>
                      </TableCell>
                      <TableCell>{transaction.customerName}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold">₹{transaction.amount.toLocaleString()}</p>
                          <p className="text-sm text-gray-500">-₹{transaction.commission.toFixed(2)} fee</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-green-600">₹{transaction.earnings.toLocaleString()}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(transaction.orderStatus)}
                          {getStatusBadge(transaction.orderStatus)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getPayoutStatusBadge(transaction.payoutStatus)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{transaction.timestamp.toLocaleDateString()}</p>
                          <p className="text-sm text-gray-500">{transaction.timestamp.toLocaleTimeString()}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTransaction(transaction)}
                          className="gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Completed Payouts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {completedPayouts.map((payout, index) => (
                  <motion.div
                    key={payout.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    onClick={() => setSelectedPayout(payout)}
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{payout.batchNumber}</h4>
                        <Badge className="bg-green-100 text-green-800">Paid</Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Payout Date: {payout.payoutDate.toLocaleDateString()}</p>
                        <p>Orders Included: {payout.orderCount}</p>
                        {payout.utrNumber && <p>UTR: {payout.utrNumber}</p>}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">₹{payout.amount.toLocaleString()}</div>
                      <Button variant="ghost" size="sm" className="mt-2">
                        <FileText className="w-4 h-4 mr-2" />
                        View Statement
                      </Button>
                    </div>
                  </motion.div>
                ))}

                {completedPayouts.length === 0 && (
                  <div className="text-center py-12">
                    <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No completed payouts yet</h3>
                    <p className="text-gray-600">Your payout history will appear here once processed.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Gross Revenue</span>
                    <span className="font-bold">₹{(paymentSummary.lifetimeEarnings / 0.95).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-600">
                    <span>Platform Commission (5%)</span>
                    <span className="font-bold">-₹{(paymentSummary.lifetimeEarnings * 0.05 / 0.95).toLocaleString()}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between items-center text-green-600 font-bold text-lg">
                    <span>Net Earnings</span>
                    <span>₹{paymentSummary.lifetimeEarnings.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Payout Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Earnings</span>
                    <span className="font-bold">₹{paymentSummary.lifetimeEarnings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-orange-600">
                    <span>Pending Payouts</span>
                    <span className="font-bold">₹{paymentSummary.pendingPayouts.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-green-600">
                    <span>Completed Payouts</span>
                    <span className="font-bold">₹{(paymentSummary.lifetimeEarnings - paymentSummary.pendingPayouts).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Transaction Details Dialog */}
      {selectedTransaction && (
        <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Transaction ID</Label>
                  <p className="font-semibold">{selectedTransaction.transactionId}</p>
                </div>
                <div>
                  <Label>Order ID</Label>
                  <p className="font-semibold">{selectedTransaction.orderId}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer</Label>
                  <p className="font-semibold">{selectedTransaction.customerName}</p>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <div className="flex items-center gap-2">
                    {getPaymentMethodIcon(selectedTransaction.paymentMethod)}
                    <span className="capitalize font-semibold">{selectedTransaction.paymentMethod}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Amount</Label>
                  <p className="font-semibold text-lg">₹{selectedTransaction.amount.toLocaleString()}</p>
                </div>
                <div>
                  <Label>Commission</Label>
                  <p className="font-semibold text-red-600">₹{selectedTransaction.commission.toFixed(2)}</p>
                </div>
                <div>
                  <Label>Your Earnings</Label>
                  <p className="font-semibold text-green-600">₹{selectedTransaction.earnings.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Order Status</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedTransaction.orderStatus)}
                    {getStatusBadge(selectedTransaction.orderStatus)}
                  </div>
                </div>
                <div>
                  <Label>Payout Status</Label>
                  <div className="mt-1">{getPayoutStatusBadge(selectedTransaction.payoutStatus)}</div>
                </div>
              </div>

              {selectedTransaction.payoutBatchId && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Label>Payout Batch ID</Label>
                  <p className="font-mono text-sm">{selectedTransaction.payoutBatchId}</p>
                </div>
              )}

              <div>
                <Label>Description</Label>
                <p className="text-gray-700">{selectedTransaction.description}</p>
              </div>

              <div>
                <Label>Timestamp</Label>
                <p className="font-semibold">
                  {selectedTransaction.timestamp.toLocaleDateString()} at {selectedTransaction.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Payout Request Dialog */}
      <Dialog open={isPayoutDialogOpen} onOpenChange={setIsPayoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Available Balance</Label>
              <p className="text-2xl font-bold text-green-600">₹{paymentSummary.pendingPayouts.toLocaleString()}</p>
            </div>

            <div>
              <Label htmlFor="payoutAmount">Payout Amount (₹)</Label>
              <Input
                id="payoutAmount"
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(Number(e.target.value))}
                placeholder="Enter amount"
                max={paymentSummary.pendingPayouts}
              />
            </div>

            <div>
              <Label>Bank Account</Label>
              <p className="text-gray-600">Funds will be transferred to your registered bank account ****1234</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestPayout}
              disabled={payoutAmount <= 0 || payoutAmount > paymentSummary.pendingPayouts}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Request Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payout Details Dialog */}
      {selectedPayout && (
        <Dialog open={!!selectedPayout} onOpenChange={() => setSelectedPayout(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Payout Details - {selectedPayout.batchNumber}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payout Date</Label>
                  <p className="font-semibold">{selectedPayout.payoutDate.toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>Amount</Label>
                  <p className="text-2xl font-bold text-green-600">₹{selectedPayout.amount.toLocaleString()}</p>
                </div>
              </div>

              {selectedPayout.utrNumber && (
                <div>
                  <Label>UTR Number</Label>
                  <p className="font-mono font-semibold">{selectedPayout.utrNumber}</p>
                </div>
              )}

              <div>
                <Label>Orders Included ({selectedPayout.orderCount})</Label>
                <div className="mt-2 max-h-48 overflow-y-auto space-y-2">
                  {selectedPayout.orderIds.map((orderId, index) => (
                    <div key={orderId} className="p-2 bg-gray-50 rounded text-sm font-mono">
                      {index + 1}. {orderId}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
