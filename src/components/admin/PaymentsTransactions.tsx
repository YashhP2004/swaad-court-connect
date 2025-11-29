import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Eye,
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Send,
  Users,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';
import { getAllTransactionsForAdmin, getAllPayoutRequestsForAdmin, updatePayoutStatus } from '@/lib/firebase/admin';
import {
  calculateVendorPendingBalances,
  generatePayoutBatch,
  processPayoutBatch,
  completePayoutBatch,
  getAllPayoutBatches,
  deletePayoutBatch,
  type VendorBalance,
  type PayoutBatch
} from '@/lib/firebase/payout';

interface Transaction {
  id: string;
  orderId: string;
  orderNumber: string;
  type: 'payment' | 'refund' | 'payout' | 'commission';
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'processing';
  paymentMethod: 'card' | 'upi' | 'wallet' | 'cash';
  customerId: string;
  customerName: string;
  restaurantId: string;
  restaurantName: string;
  createdAt: Date;
  completedAt?: Date;
  transactionId: string;
  commission?: number;
  vendorEarnings?: number;
  payoutStatus?: 'pending' | 'queued' | 'processing' | 'paid';
  payoutBatchId?: string;
}

export default function PaymentsTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [vendorBalances, setVendorBalances] = useState<VendorBalance[]>([]);
  const [payoutBatches, setPayoutBatches] = useState<PayoutBatch[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState<'transactions' | 'payouts' | 'batches' | 'analytics'>('transactions');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showGeneratePayoutDialog, setShowGeneratePayoutDialog] = useState(false);
  const [showVendorBalancesDialog, setShowVendorBalancesDialog] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const itemsPerPage = 20;

  const [processingBatch, setProcessingBatch] = useState<PayoutBatch | null>(null);
  const [utrInputs, setUtrInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchQuery, typeFilter, statusFilter, payoutStatusFilter, dateFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [transactionsData, balancesData, batchesData, requestsData] = await Promise.all([
        getAllTransactionsForAdmin(),
        calculateVendorPendingBalances(),
        getAllPayoutBatches(),
        getAllPayoutRequestsForAdmin()
      ]);

      setTransactions(transactionsData as Transaction[]);
      setVendorBalances(balancesData);
      setPayoutBatches(batchesData);
      setPayoutRequests(requestsData);

      toast.success(`Loaded ${transactionsData.length} transactions`);
    } catch (error) {
      console.error('Error loading payment data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setIsLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    if (typeFilter !== 'all') {
      filtered = filtered.filter(txn => txn.type === typeFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(txn => txn.status === statusFilter);
    }

    if (payoutStatusFilter !== 'all') {
      filtered = filtered.filter(txn => txn.payoutStatus === payoutStatusFilter);
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (dateFilter === 'today') {
      filtered = filtered.filter(txn => txn.createdAt >= today);
    } else if (dateFilter === 'week') {
      filtered = filtered.filter(txn => txn.createdAt >= weekAgo);
    } else if (dateFilter === 'month') {
      filtered = filtered.filter(txn => txn.createdAt >= monthAgo);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(txn =>
        txn.orderNumber?.toLowerCase().includes(query) ||
        txn.customerName?.toLowerCase().includes(query) ||
        txn.restaurantName?.toLowerCase().includes(query) ||
        txn.transactionId?.toLowerCase().includes(query)
      );
    }

    setFilteredTransactions(filtered);
  };

  const calculateStats = () => {
    const totalRevenue = transactions
      .filter(txn => txn.type === 'payment' && txn.status === 'completed')
      .reduce((sum, txn) => sum + txn.amount, 0);

    const totalRefunds = transactions
      .filter(txn => txn.type === 'refund' && txn.status === 'completed')
      .reduce((sum, txn) => sum + txn.amount, 0);

    const totalCommission = transactions
      .filter(txn => txn.type === 'payment' && txn.status === 'completed')
      .reduce((sum, txn) => sum + (txn.commission || 0), 0);

    const pendingPayouts = vendorBalances.reduce((sum, vendor) => sum + vendor.pendingBalance, 0);

    return { totalRevenue, totalRefunds, totalCommission, pendingPayouts };
  };

  const handleGeneratePayouts = async () => {
    if (selectedVendors.length === 0) {
      toast.error('Please select at least one vendor');
      return;
    }

    try {
      const batchId = await generatePayoutBatch(selectedVendors, user?.uid || 'admin');
      toast.success(`Payout batch generated successfully! Batch ID: ${batchId}`);
      setShowGeneratePayoutDialog(false);
      setSelectedVendors([]);
      loadData();
    } catch (error) {
      console.error('Error generating payout batch:', error);
      toast.error('Failed to generate payout batch');
    }
  };

  const handleProcessBatch = async (batch: PayoutBatch) => {
    try {
      await processPayoutBatch(batch.id);
      toast.success('Batch marked as processing');
      loadData();
    } catch (error) {
      console.error('Error processing batch:', error);
      toast.error('Failed to process batch');
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!window.confirm('Are you sure you want to delete this batch? This will reset all orders to pending status.')) {
      return;
    }

    try {
      await deletePayoutBatch(batchId);
      toast.success('Batch deleted and orders reset successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast.error('Failed to delete batch');
    }
  };

  const handleCompleteBatch = async () => {
    if (!processingBatch) return;

    try {
      await completePayoutBatch(processingBatch.id, utrInputs);
      toast.success('Payout batch completed successfully!');
      setProcessingBatch(null);
      setUtrInputs({});
      loadData();
    } catch (error) {
      console.error('Error completing batch:', error);
      toast.error('Failed to complete batch');
    }
  };

  const handleApprovePayoutRequest = async (requestId: string) => {
    try {
      await updatePayoutStatus(requestId, 'approved', user?.uid || 'admin');
      toast.success('Payout request approved');
      loadData();
    } catch (error) {
      console.error('Error approving payout request:', error);
      toast.error('Failed to approve payout request');
    }
  };

  const handleRejectPayoutRequest = async (requestId: string) => {
    try {
      await updatePayoutStatus(requestId, 'rejected', user?.uid || 'admin');
      toast.success('Payout request rejected');
      loadData();
    } catch (error) {
      console.error('Error rejecting payout request:', error);
      toast.error('Failed to reject payout request');
    }
  };

  const handleMetricCardClick = (metric: string) => {
    switch (metric) {
      case 'revenue':
        setTypeFilter('payment');
        setStatusFilter('completed');
        setActiveTab('transactions');
        break;
      case 'refunds':
        setTypeFilter('refund');
        setStatusFilter('completed');
        setActiveTab('transactions');
        break;
      case 'commission':
        setTypeFilter('payment');
        setStatusFilter('completed');
        setActiveTab('transactions');
        break;
      case 'pending':
        setShowVendorBalancesDialog(true);
        break;
    }
  };

  const getPayoutStatusBadge = (status?: string) => {
    const variants = {
      pending: <Badge variant="secondary" className="bg-gray-100 text-gray-800">Pending</Badge>,
      queued: <Badge className="bg-blue-100 text-blue-800">Queued</Badge>,
      processing: <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>,
      paid: <Badge className="bg-green-100 text-green-800">Paid</Badge>,
      completed: <Badge className="bg-green-100 text-green-800">Paid</Badge>,
      approved: <Badge className="bg-green-100 text-green-800">Approved</Badge>,
      rejected: <Badge variant="destructive">Rejected</Badge>,
      failed: <Badge variant="destructive">Failed</Badge>
    };
    return variants[status as keyof typeof variants] || variants.pending;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: <Badge className="bg-green-100 text-green-800">Completed</Badge>,
      pending: <Badge variant="secondary">Pending</Badge>,
      failed: <Badge variant="destructive">Failed</Badge>,
      processing: <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>
    };
    return variants[status as keyof typeof variants] || variants.pending;
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      payment: <ArrowDownLeft className="w-4 h-4 text-green-600" />,
      refund: <ArrowUpRight className="w-4 h-4 text-red-600" />,
      payout: <Wallet className="w-4 h-4 text-blue-600" />,
      commission: <DollarSign className="w-4 h-4 text-purple-600" />
    };
    return icons[type as keyof typeof icons] || <DollarSign className="w-4 h-4" />;
  };

  const stats = calculateStats();
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

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
          <h2 className="text-2xl font-bold text-gray-900">Payments & Transactions</h2>
          <p className="text-gray-600">Monitor financial transactions and manage payouts</p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={loadData} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            className="gap-2 bg-orange-600 hover:bg-orange-700"
            onClick={() => setShowGeneratePayoutDialog(true)}
          >
            <Send className="w-4 h-4" />
            Generate Payouts
          </Button>
        </div>
      </div>

      {/* Stats Cards - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className="border-0 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => handleMetricCardClick('revenue')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">₹{stats.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Click to view details</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-0 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => handleMetricCardClick('refunds')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Refunds</p>
                <p className="text-2xl font-bold text-red-600">₹{stats.totalRefunds.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Click to view details</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-0 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => handleMetricCardClick('commission')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Commission Earned</p>
                <p className="text-2xl font-bold text-purple-600">₹{stats.totalCommission.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Click to view details</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-0 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => handleMetricCardClick('pending')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Payouts</p>
                <p className="text-2xl font-bold text-orange-600">₹{stats.pendingPayouts.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Click for vendor breakdown</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Wallet className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        {['transactions', 'batches', 'analytics'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-2 px-1 font-medium capitalize ${activeTab === tab
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filters */}
      {activeTab === 'transactions' && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by ID, customer, vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="payment">Payments</SelectItem>
              <SelectItem value="refund">Refunds</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={payoutStatusFilter} onValueChange={setPayoutStatusFilter}>
            <SelectTrigger>
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

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Transactions Table */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {paginatedTransactions.length} of {filteredTransactions.length} transactions
            </p>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>

          <AnimatePresence>
            {paginatedTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.02 }}
              >
                <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 flex-1">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(transaction.type)}
                          <div>
                            <h3 className="font-semibold text-lg">{transaction.orderNumber}</h3>
                            <p className="text-sm text-gray-600">
                              {transaction.createdAt.toLocaleDateString()} • {transaction.createdAt.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>

                        <div className="hidden md:block">
                          <div className="text-sm text-gray-500">Customer</div>
                          <div className="font-medium">{transaction.customerName}</div>
                        </div>

                        <div className="hidden md:block">
                          <div className="text-sm text-gray-500">Vendor</div>
                          <div className="font-medium">{transaction.restaurantName}</div>
                        </div>

                        <div className="hidden md:block">
                          <div className="text-sm text-gray-500">Method</div>
                          <div className="font-medium uppercase">{transaction.paymentMethod}</div>
                        </div>

                        <div className="hidden lg:block">
                          <div className="text-sm text-gray-500">Vendor Earnings</div>
                          <div className="font-medium text-green-600">₹{transaction.vendorEarnings || 0}</div>
                        </div>

                        <div className="hidden lg:block">
                          <div className="text-sm text-gray-500">Payout Status</div>
                          {getPayoutStatusBadge(transaction.payoutStatus)}
                        </div>

                        {transaction.payoutBatchId && (
                          <div className="hidden xl:block">
                            <div className="text-sm text-gray-500">Batch ID</div>
                            <div className="font-mono text-xs">{transaction.payoutBatchId.slice(0, 8)}</div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${transaction.type === 'refund' ? 'text-red-600' : 'text-green-600'
                            }`}>
                            {transaction.type === 'refund' ? '-' : '+'}₹{transaction.amount.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">{transaction.transactionId}</div>
                        </div>

                        <div>{getStatusBadge(transaction.status)}</div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}

          {filteredTransactions.length === 0 && (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                <p className="text-gray-600">Try adjusting your filters or search criteria.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}



      {/* Payout Batches Tab */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          {payoutBatches.map((batch, index) => (
            <motion.div
              key={batch.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{batch.batchNumber}</h3>
                      <p className="text-sm text-gray-600">
                        Created: {batch.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-600">{batch.vendorPayouts.length} vendors</div>
                      </div>
                      {getPayoutStatusBadge(batch.status)}

                      {batch.status === 'queued' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                            onClick={() => handleDeleteBatch(batch.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleProcessBatch(batch)}
                          >
                            Process Batch
                          </Button>
                        </div>
                      )}

                      {batch.status === 'processing' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => setProcessingBatch(batch)}
                        >
                          Complete Payout
                        </Button>
                      )}
                    </div>
                  </div>


                  <div className="space-y-2">
                    {batch.vendorPayouts.map((vp) => (
                      <div key={vp.vendorId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{vp.vendorName}</div>
                          <div className="text-sm text-gray-600">{vp.transactionCount} orders</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold text-green-600">₹{vp.amount.toLocaleString()}</div>
                            {vp.utrNumber && (
                              <div className="text-xs text-gray-500">UTR: {vp.utrNumber}</div>
                            )}
                          </div>
                          {getPayoutStatusBadge(vp.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div >
          ))
          }
        </div >
      )}

      {/* Generate Payout Dialog */}
      <Dialog open={showGeneratePayoutDialog} onOpenChange={setShowGeneratePayoutDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Generate Payout Batch</DialogTitle>
            <DialogDescription>
              Select vendors to include in this payout batch. Review the total amount before generating.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Payout Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Total Vendors:</span>
                  <span className="font-bold ml-2">{selectedVendors.length}</span>
                </div>
                <div>
                  <span className="text-blue-700">Total Amount:</span>
                  <span className="font-bold ml-2">
                    ₹{vendorBalances
                      .filter(v => selectedVendors.includes(v.vendorId))
                      .reduce((sum, v) => sum + v.pendingBalance, 0)
                      .toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {vendorBalances.map((vendor) => (
                <div
                  key={vendor.vendorId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedVendors.includes(vendor.vendorId)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedVendors([...selectedVendors, vendor.vendorId]);
                        } else {
                          setSelectedVendors(selectedVendors.filter(id => id !== vendor.vendorId));
                        }
                      }}
                    />
                    <div>
                      <div className="font-medium">{vendor.vendorName}</div>
                      <div className="text-sm text-gray-600">{vendor.orderCount} pending orders</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">₹{vendor.pendingBalance.toLocaleString()}</div>
                    {vendor.lastPayoutDate && (
                      <div className="text-xs text-gray-500">
                        Last: {vendor.lastPayoutDate.toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGeneratePayoutDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGeneratePayouts}
              disabled={selectedVendors.length === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Generate Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vendor Balances Dialog */}
      <Dialog open={showVendorBalancesDialog} onOpenChange={setShowVendorBalancesDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vendor Pending Balances</DialogTitle>
            <DialogDescription>
              View detailed breakdown of pending balances and payout history for each vendor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {vendorBalances.map((vendor) => (
              <Card key={vendor.vendorId} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{vendor.vendorName}</h4>
                          <p className="text-sm text-gray-600">{vendor.orderCount} pending orders</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-orange-600">
                            ₹{vendor.pendingBalance.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">Pending</div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedVendor(
                          expandedVendor === vendor.vendorId ? null : vendor.vendorId
                        )}
                        className="gap-2"
                      >
                        {expandedVendor === vendor.vendorId ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Show Details
                          </>
                        )}
                      </Button>

                      {expandedVendor === vendor.vendorId && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Earnings:</span>
                            <span className="font-medium">₹{vendor.totalEarnings.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Payouts:</span>
                            <span className="font-medium">₹{vendor.totalPayouts.toLocaleString()}</span>
                          </div>
                          {vendor.lastPayoutDate && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Last Payout Date:</span>
                                <span className="font-medium">{vendor.lastPayoutDate.toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Last Payout Amount:</span>
                                <span className="font-medium">₹{vendor.lastPayoutAmount?.toLocaleString()}</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Details Dialog */}
      {
        selectedTransaction && (
          <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Transaction Details</DialogTitle>
                <DialogDescription>
                  Detailed information for transaction {selectedTransaction.transactionId}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Transaction ID</span>
                    <p className="font-semibold">{selectedTransaction.transactionId}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Order Number</span>
                    <p className="font-semibold">{selectedTransaction.orderNumber}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Type</span>
                    <p className="font-semibold capitalize">{selectedTransaction.type}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Status</span>
                    <div className="mt-1">{getStatusBadge(selectedTransaction.status)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Amount</span>
                    <p className="font-semibold text-green-600">₹{selectedTransaction.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Payment Method</span>
                    <p className="font-semibold uppercase">{selectedTransaction.paymentMethod}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Vendor Earnings</span>
                    <p className="font-semibold text-green-600">₹{selectedTransaction.vendorEarnings || 0}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Payout Status</span>
                    <div className="mt-1">{getPayoutStatusBadge(selectedTransaction.payoutStatus)}</div>
                  </div>
                </div>

                {selectedTransaction.payoutBatchId && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">Payout Information</h4>
                    <div className="text-sm">
                      <span className="text-blue-600">Batch ID: </span>
                      <span className="font-mono">{selectedTransaction.payoutBatchId}</span>
                    </div>
                  </div>
                )}

                {selectedTransaction.commission && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">Commission Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-purple-600">Commission: </span>
                        <span className="font-medium">₹{selectedTransaction.commission}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )
      }

      {/* Process Batch Dialog */}
      <Dialog open={!!processingBatch} onOpenChange={(open) => !open && setProcessingBatch(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Complete Payout Batch</DialogTitle>
            <DialogDescription>
              Enter UTR numbers for each vendor to mark this batch as completed.
            </DialogDescription>
          </DialogHeader>

          {processingBatch && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-blue-900">Batch Summary</h4>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                    {processingBatch.batchNumber}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Total Amount:</span>
                    <span className="font-bold ml-2">₹{processingBatch.totalAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Vendors:</span>
                    <span className="font-bold ml-2">{processingBatch.vendorPayouts.length}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {processingBatch.vendorPayouts.map((vp) => (
                  <div key={vp.vendorId} className="p-4 border rounded-lg bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-gray-900">{vp.vendorName}</div>
                        <div className="text-sm text-gray-600">{vp.transactionCount} orders</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">₹{vp.amount.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <details className="text-sm">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium select-none">
                          View {vp.orderIds?.length || 0} Orders
                        </summary>
                        <div className="mt-2 pl-2 border-l-2 border-blue-100 max-h-32 overflow-y-auto">
                          {vp.orderIds && vp.orderIds.length > 0 ? (
                            vp.orderIds.map((orderId, idx) => (
                              <div key={orderId} className="text-gray-600 py-0.5 font-mono text-xs">
                                {idx + 1}. {orderId}
                              </div>
                            ))
                          ) : (
                            <div className="text-gray-400 italic">No orders found in this batch</div>
                          )}
                        </div>
                      </details>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">
                        UTR / Transaction Number
                      </label>
                      <Input
                        className="text-gray-900 bg-white border-gray-300"
                        placeholder="Enter bank transaction ID"
                        value={utrInputs[vp.vendorId] || ''}
                        onChange={(e) => setUtrInputs(prev => ({
                          ...prev,
                          [vp.vendorId]: e.target.value
                        }))}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setProcessingBatch(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCompleteBatch}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={processingBatch.vendorPayouts.some(vp => !utrInputs[vp.vendorId])}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Payout
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div >
  );
}
