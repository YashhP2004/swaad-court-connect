import React, { useState, useEffect } from 'react';
import {
  Store,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  Plus,
  Phone,
  Mail,
  MapPin,
  Star,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  AlertTriangle,
  Ban,
  Play,
  Pause,
  Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  getAllVendors,
  approveVendorById,
  rejectVendorById,
  suspendVendorById,
  activateVendorById,
  sendVendorPasswordReset,
  getVendorInfoForPasswordReset
} from '@/lib/firebase';

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  cuisine: string[];
  logo?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending' | 'approved' | 'rejected';
  rating: number;
  isOpen: boolean;
  menuItemsCount: number;
  flaggedItemsCount: number;
  createdAt?: Date;
  updatedAt?: Date;
  restaurantStatus?: string;
}

export default function VendorManagement() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showSuspensionDialog, setShowSuspensionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [commissionRate, setCommissionRate] = useState(10);
  const [showPasswordResetDialog, setShowPasswordResetDialog] = useState(false);
  const [passwordResetEmail, setPasswordResetEmail] = useState('');

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    filterVendors();
  }, [vendors, statusFilter, searchQuery]);

  const loadVendors = async () => {
    setIsLoading(true);
    try {
      const vendorsData = await getAllVendors();
      setVendors(vendorsData as Vendor[]);
    } catch (error) {
      console.error('Error loading vendors:', error);
      toast.error('Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  };

  const filterVendors = () => {
    let filtered = vendors;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(vendor => vendor.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(vendor =>
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vendor.email && vendor.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        vendor.cuisine.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredVendors(filtered);
  };

  const handleApprove = async (vendorId: string) => {
    setActionLoading(vendorId);
    try {
      await approveVendorById(vendorId, commissionRate);
      setVendors(prev => prev.map(vendor =>
        vendor.id === vendorId
          ? { ...vendor, status: 'approved' as const, approvedAt: new Date(), commissionRate }
          : vendor
      ));
      toast.success('Vendor approved successfully');
      setShowApprovalDialog(false);
    } catch (error) {
      console.error('Error approving vendor:', error);
      toast.error('Failed to approve vendor');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (vendorId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionLoading(vendorId);
    try {
      await rejectVendorById(vendorId, rejectionReason);
      setVendors(prev => prev.map(vendor =>
        vendor.id === vendorId
          ? { ...vendor, status: 'rejected' as const, rejectedAt: new Date(), rejectionReason }
          : vendor
      ));
      toast.success('Vendor rejected');
      setShowRejectionDialog(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting vendor:', error);
      toast.error('Failed to reject vendor');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (vendorId: string) => {
    if (!suspensionReason.trim()) {
      toast.error('Please provide a suspension reason');
      return;
    }

    setActionLoading(vendorId);
    try {
      await suspendVendorById(vendorId, suspensionReason);
      setVendors(prev => prev.map(vendor =>
        vendor.id === vendorId
          ? { ...vendor, status: 'suspended' as const, suspendedAt: new Date(), suspensionReason }
          : vendor
      ));
      toast.success('Vendor suspended');
      setShowSuspensionDialog(false);
      setSuspensionReason('');
    } catch (error) {
      console.error('Error suspending vendor:', error);
      toast.error('Failed to suspend vendor');
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (vendorId: string) => {
    setActionLoading(vendorId);
    try {
      await activateVendorById(vendorId);
      setVendors(prev => prev.map(vendor =>
        vendor.id === vendorId
          ? { ...vendor, status: 'approved' as const, suspendedAt: undefined, suspensionReason: undefined }
          : vendor
      ));
      toast.success('Vendor activated successfully');
    } catch (error) {
      console.error('Error activating vendor:', error);
      toast.error('Failed to activate vendor');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePasswordReset = async () => {
    if (!passwordResetEmail.trim()) {
      toast.error('Please enter vendor email address');
      return;
    }

    setActionLoading('password-reset');
    try {
      // First verify the vendor exists
      const vendorInfo = await getVendorInfoForPasswordReset(passwordResetEmail);

      if (!vendorInfo) {
        toast.error('No vendor found with this email address');
        return;
      }

      // Send password reset email
      await sendVendorPasswordReset(passwordResetEmail);

      toast.success(`Password reset email sent to ${passwordResetEmail}`);
      setShowPasswordResetDialog(false);
      setPasswordResetEmail('');

    } catch (error) {
      console.error('Error sending password reset:', error);
      toast.error('Failed to send password reset email');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: 'default' as const, color: 'text-green-700 bg-green-100' },
      inactive: { variant: 'secondary' as const, color: 'text-gray-700 bg-gray-100' },
      suspended: { variant: 'destructive' as const, color: 'text-orange-700 bg-orange-100' }
    };

    const config = variants[status as keyof typeof variants] || variants.active;

    return (
      <Badge variant={config.variant} className={`text-xs ${config.color}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive':
        return <Pause className="w-4 h-4 text-gray-500" />;
      case 'suspended':
        return <Ban className="w-4 h-4 text-orange-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getVendorStats = () => {
    return {
      total: vendors.length,
      active: vendors.filter(v => v.status === 'active').length,
      inactive: vendors.filter(v => v.status === 'inactive').length,
      suspended: vendors.filter(v => v.status === 'suspended').length,
      open: vendors.filter(v => v.isOpen).length
    };
  };

  const stats = getVendorStats();

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
          <h2 className="text-2xl font-bold text-gray-900">Restaurant Management</h2>
          <p className="text-gray-600">Manage restaurant listings and status</p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={loadVendors} className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Refresh
          </Button>
          <Button className="gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white-900">{stats.total}</div>
            <div className="text-sm text-gray-600-bold">Total Restaurants</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-600-bold">Active</div>
          </CardContent>
        </Card>



        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.inactive}</div>
            <div className="text-sm text-gray-600-bold">Inactive</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.suspended}</div>
            <div className="text-sm text-gray-600-bold">Suspended</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search restaurants by name, email, or cuisine..."
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
            <SelectItem value="all">All Restaurants</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vendors List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredVendors.map((vendor, index) => (
            <motion.div
              key={vendor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Vendor Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={vendor.logo} />
                            <AvatarFallback className="bg-orange-100 text-orange-600 text-lg font-semibold">
                              {vendor.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          <div>
                            <h3 className="text-xl font-semibold text-White-900">{vendor.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusIcon(vendor.status)}
                              {getStatusBadge(vendor.status)}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {vendor.cuisine.map((c, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {c}
                                </Badge>
                              ))}
                            </div>

                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {vendor.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600-bold">
                            <Mail className="w-4 h-4" />
                            {vendor.email}
                          </div>
                        )}
                        {vendor.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600-bold">
                            <Phone className="w-4 h-4" />
                            {vendor.phone}
                          </div>
                        )}
                        {vendor.address && (
                          <div className="flex items-center gap-2 text-sm text-gray-600-bold">
                            <MapPin className="w-4 h-4" />
                            {vendor.address}
                          </div>
                        )}

                      </div>

                      {/* Restaurant Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-900">{vendor.menuItemsCount}</div>
                          <div className="text-xs text-gray-600">Menu Items</div>
                        </div>
                        {vendor.flaggedItemsCount > 0 && (
                          <div className="text-center">
                            <div className="text-lg font-semibold text-orange-600">{vendor.flaggedItemsCount}</div>
                            <div className="text-xs text-gray-600">Flagged Items</div>
                          </div>
                        )}
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-900 flex items-center justify-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            {vendor.rating.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-600">Rating</div>
                        </div>
                      </div>


                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 lg:w-48">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedVendor(vendor)}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </Button>

                      {/* Password Reset Button - Available for all vendors */}
                      <Dialog open={showPasswordResetDialog && selectedVendor?.id === vendor.id} onOpenChange={setShowPasswordResetDialog}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedVendor(vendor);
                              setPasswordResetEmail(vendor.email || '');
                            }}
                            className="gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
                            disabled={actionLoading === 'password-reset'}
                          >
                            <Key className="w-4 h-4" />
                            Reset Password
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Send Password Reset Email</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                              <div className="flex items-start gap-3">
                                <Key className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div>
                                  <h4 className="font-medium text-blue-900">Secure Password Reset</h4>
                                  <p className="text-sm text-blue-700 mt-1">
                                    This will send a secure password reset link to the vendor's email.
                                    They can use this link to create a new password safely.
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="resetEmail">Vendor Email Address</Label>
                              <Input
                                id="resetEmail"
                                type="email"
                                value={passwordResetEmail}
                                onChange={(e) => setPasswordResetEmail(e.target.value)}
                                placeholder="Enter vendor email address"
                                className="mt-1"
                              />
                            </div>

                            <div className="flex gap-3">
                              <Button
                                onClick={handlePasswordReset}
                                disabled={actionLoading === 'password-reset' || !passwordResetEmail.trim()}
                                className="flex-1 bg-orange-600 hover:bg-orange-700"
                              >
                                {actionLoading === 'password-reset' ? 'Sending...' : 'Send Reset Email'}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setShowPasswordResetDialog(false);
                                  setPasswordResetEmail('');
                                }}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {vendor.status === 'pending' && (
                        <>
                          <Dialog open={showApprovalDialog && selectedVendor?.id === vendor.id} onOpenChange={setShowApprovalDialog}>
                            <DialogTrigger asChild>
                              <Button
                                onClick={() => setSelectedVendor(vendor)}
                                className="gap-2 bg-green-600 hover:bg-green-700"
                                disabled={actionLoading === vendor.id}
                              >
                                <CheckCircle className="w-4 h-4" />
                                Approve
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Approve Vendor</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="commission">Commission Rate (%)</Label>
                                  <Input
                                    id="commission"
                                    type="number"
                                    value={commissionRate}
                                    onChange={(e) => setCommissionRate(Number(e.target.value))}
                                    min="0"
                                    max="30"
                                  />
                                </div>
                                <div className="flex gap-3">
                                  <Button
                                    onClick={() => handleApprove(vendor.id)}
                                    disabled={actionLoading === vendor.id}
                                    className="flex-1"
                                  >
                                    Confirm Approval
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => setShowApprovalDialog(false)}
                                    className="flex-1"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog open={showRejectionDialog && selectedVendor?.id === vendor.id} onOpenChange={setShowRejectionDialog}>
                            <DialogTrigger asChild>
                              <Button
                                variant="destructive"
                                onClick={() => setSelectedVendor(vendor)}
                                className="gap-2"
                                disabled={actionLoading === vendor.id}
                              >
                                <XCircle className="w-4 h-4" />
                                Reject
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Reject Vendor Application</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="rejection-reason">Rejection Reason</Label>
                                  <Textarea
                                    id="rejection-reason"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Please provide a detailed reason for rejection..."
                                    rows={4}
                                  />
                                </div>
                                <div className="flex gap-3">
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleReject(vendor.id)}
                                    disabled={actionLoading === vendor.id || !rejectionReason.trim()}
                                    className="flex-1"
                                  >
                                    Confirm Rejection
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => setShowRejectionDialog(false)}
                                    className="flex-1"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}

                      {vendor.status === 'approved' && (
                        <Dialog open={showSuspensionDialog && selectedVendor?.id === vendor.id} onOpenChange={setShowSuspensionDialog}>
                          <DialogTrigger asChild>
                            <Button
                              variant="destructive"
                              onClick={() => setSelectedVendor(vendor)}
                              className="gap-2"
                              disabled={actionLoading === vendor.id}
                            >
                              <Pause className="w-4 h-4" />
                              Suspend
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Suspend Vendor</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="suspension-reason">Suspension Reason</Label>
                                <Textarea
                                  id="suspension-reason"
                                  value={suspensionReason}
                                  onChange={(e) => setSuspensionReason(e.target.value)}
                                  placeholder="Please provide a reason for suspension..."
                                  rows={4}
                                />
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  variant="destructive"
                                  onClick={() => handleSuspend(vendor.id)}
                                  disabled={actionLoading === vendor.id || !suspensionReason.trim()}
                                  className="flex-1"
                                >
                                  Confirm Suspension
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setShowSuspensionDialog(false)}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      {vendor.status === 'suspended' && (
                        <Button
                          onClick={() => handleActivate(vendor.id)}
                          className="gap-2 bg-green-600 hover:bg-green-700"
                          disabled={actionLoading === vendor.id}
                        >
                          <Play className="w-4 h-4" />
                          Activate
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredVendors.length === 0 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No vendors found</h3>
              <p className="text-gray-600">
                {statusFilter === 'all'
                  ? 'No vendors registered yet.'
                  : `No ${statusFilter} vendors found.`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
