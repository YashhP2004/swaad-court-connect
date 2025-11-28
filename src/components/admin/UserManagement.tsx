import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Eye,
  Ban,
  CheckCircle,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Star,
  ShoppingBag,
  DollarSign,
  Download,
  RefreshCw,
  UserCheck,
  UserX,
  Key
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
import { getAllCustomersForAdmin, updateCustomerStatus, sendCustomerPasswordReset } from '@/lib/firebase';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  profilePicture?: string;
  status: 'active' | 'suspended' | 'banned';
  joinedAt: Date;
  createdAt?: Date;
  lastActive?: Date;
  totalOrders: number;
  totalSpent: number;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, statusFilter, sortBy]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      console.log('Loading customer users from Firebase...');
      const customers = await getAllCustomersForAdmin();
      console.log('Loaded', customers.length, 'customers successfully');

      setUsers(customers);

      if (customers.length === 0) {
        toast.info('No customer users found in the database');
      } else {
        toast.success(`Loaded ${customers.length} customer users successfully`);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load user data from Firebase');
      setUsers([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone.includes(searchQuery)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return b.joinedAt.getTime() - a.joinedAt.getTime();
        case 'active':
          return b.lastActive.getTime() - a.lastActive.getTime();
        case 'orders':
          return b.totalOrders - a.totalOrders;
        case 'spent':
          return b.totalSpent - a.totalSpent;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredUsers(filtered);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: <Badge className="bg-green-100 text-green-800">Active</Badge>,
      suspended: <Badge className="bg-yellow-100 text-yellow-800">Suspended</Badge>,
      banned: <Badge variant="destructive">Banned</Badge>
    };
    return variants[status as keyof typeof variants] || variants.active;
  };

  const handleUserAction = async (userId: string, action: 'suspend' | 'activate' | 'ban') => {
    try {
      const newStatus = action === 'suspend' ? 'suspended' : action === 'ban' ? 'banned' : 'active';

      // Update status in Firebase
      await updateCustomerStatus(userId, newStatus);

      // Update local state
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, status: newStatus as any } : user
      ));

      const actionText = action === 'suspend' ? 'suspended' : action === 'ban' ? 'banned' : 'activated';
      toast.success(`User ${actionText} successfully`);
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast.error(`Failed to ${action} user. Please try again.`);
    }
  };

  const calculateStats = () => {
    const totalUsers = filteredUsers.length;
    const activeUsers = filteredUsers.filter(user => user.status === 'active').length;
    const suspendedUsers = filteredUsers.filter(user => user.status === 'suspended').length;
    const totalRevenue = filteredUsers.reduce((sum, user) => sum + user.totalSpent, 0);

    return { totalUsers, activeUsers, suspendedUsers, totalRevenue };
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
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">Monitor and manage customer accounts</p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={loadUsers} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button className="gap-2">
            <Download className="w-4 h-4" />
            Export Users
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white-900">{stats.totalUsers}</div>
            <div className="text-sm text-gray-600-bold">Total Users</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
            <div className="text-sm text-gray-600-bold">Active Users</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.suspendedUsers}</div>
            <div className="text-sm text-gray-600-bold">Suspended</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">₹{stats.totalRevenue}</div>
            <div className="text-sm text-gray-600-bold">Total Revenue</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="User Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger>
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently Joined</SelectItem>
            <SelectItem value="active">Last Active</SelectItem>
            <SelectItem value="orders">Most Orders</SelectItem>
            <SelectItem value="spent">Highest Spent</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          More Filters
        </Button>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-orange-100 text-orange-600 font-semibold">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <h3 className="font-semibold text-lg">{user.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600-bold">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.phone}
                          </span>
                        </div>
                      </div>

                      <div className="hidden md:block text-center">
                        <div className="text-lg font-bold text-blue-600">{user.totalOrders}</div>
                        <div className="text-sm text-gray-600-bold">Orders</div>
                      </div>

                      <div className="hidden md:block text-center">
                        <div className="text-lg font-bold text-green-600">₹{user.totalSpent}</div>
                        <div className="text-sm text-gray-600-bold">Spent</div>
                      </div>


                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div>{getStatusBadge(user.status)}</div>
                        <div className="text-sm text-gray-600-bold mt-1">
                          Joined {user.joinedAt.toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>

                        {user.status === 'active' ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleUserAction(user.id, 'suspend')}
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleUserAction(user.id, 'activate')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Activate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mobile view additional info */}
                  <div className="md:hidden mt-4 grid grid-cols-2 gap-4 text-center text-sm">
                    <div>
                      <div className="font-bold text-blue-600">{user.totalOrders}</div>
                      <div className="text-gray-600">Orders</div>
                    </div>
                    <div>
                      <div className="font-bold text-green-600">₹{user.totalSpent}</div>
                      <div className="text-gray-600">Spent</div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredUsers.length === 0 && !isLoading && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {users.length === 0 ? 'No customer users found' : 'No users match your criteria'}
              </h3>
              <p className="text-gray-600">
                {users.length === 0
                  ? 'No customers have registered yet or none have the role "customer" in Firebase.'
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
              {users.length === 0 && (
                <Button
                  variant="outline"
                  onClick={loadUsers}
                  className="mt-4"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* User Details Dialog */}
      {selectedUser && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Details - {selectedUser.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedUser.avatar} />
                  <AvatarFallback className="bg-orange-100 text-orange-600 text-lg font-semibold">
                    {selectedUser.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedUser.name}</h3>
                  <p className="text-gray-600">{selectedUser.email}</p>
                  <p className="text-gray-600">{selectedUser.phone}</p>
                  <div className="mt-2">{getStatusBadge(selectedUser.status)}</div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{selectedUser.totalOrders}</div>
                  <div className="text-sm text-blue-800">Total Orders</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">₹{selectedUser.totalSpent}</div>
                  <div className="text-sm text-green-800">Total Spent</div>
                </div>

              </div>

              {/* Account Info */}
              <div>
                <h4 className="font-semibold mb-3">Account Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Member Since:</span>
                    <span className="font-medium">{selectedUser.joinedAt.toLocaleDateString()}</span>
                  </div>
                  {selectedUser.lastActive && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Active:</span>
                      <span className="font-medium">{selectedUser.lastActive.toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {selectedUser.status === 'active' ? (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleUserAction(selectedUser.id, 'suspend');
                      setShowDetailsDialog(false);
                    }}
                    className="flex-1"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Suspend User
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      handleUserAction(selectedUser.id, 'activate');
                      setShowDetailsDialog(false);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Activate User
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
