import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Bell,
  Send,
  MessageSquare,
  Users,
  Store,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Plus,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAdminNotifications,
  createAdminNotification,
  getAdminMessages,
  updateMessageStatus,
  replyToMessage as replyToMessageApi,
  getAllVendors
} from '@/lib/firebase/admin';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  recipients: 'all' | 'customers' | 'vendors';
  targetVendorId?: string;
  targetVendorName?: string;
  status: 'draft' | 'sent' | 'scheduled';
  createdAt: Date;
  scheduledAt?: Date;
  sentAt?: Date;
  readCount: number;
  totalRecipients: number;
}

interface Message {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  type: 'support' | 'complaint' | 'inquiry' | 'feedback';
  status: 'unread' | 'read' | 'replied' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
  reply?: {
    content: string;
    createdAt: any;
  };
}

export default function NotificationsCommunication() {
  const [activeTab, setActiveTab] = useState('notifications');
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // New notification form
  const [newNotification, setNewNotification] = useState<{
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    recipients: 'all' | 'customers' | 'vendors';
    targetVendorId: string;
    scheduledAt: string;
    targetVendorName?: string;
  }>({
    title: '',
    message: '',
    type: 'info',
    recipients: 'all',
    targetVendorId: 'all',
    scheduledAt: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedNotifications, fetchedMessages, fetchedVendors] = await Promise.all([
        getAdminNotifications(),
        getAdminMessages(),
        getAllVendors()
      ]);

      setNotifications(fetchedNotifications as Notification[]);
      setMessages(fetchedMessages as Message[]);
      setVendors(fetchedVendors);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const sendNotification = async () => {
    if (!newNotification.title || !newNotification.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const notificationData: any = { ...newNotification };

      // If specific vendor is selected, add vendor name for display
      if (newNotification.recipients === 'vendors' && newNotification.targetVendorId !== 'all') {
        const vendor = vendors.find(v => v.id === newNotification.targetVendorId);
        if (vendor) {
          notificationData.targetVendorName = vendor.restaurantName || vendor.name;
        }
      } else {
        delete notificationData.targetVendorId; // Remove if 'all' or not vendors
      }

      await createAdminNotification(notificationData);

      setNewNotification({
        title: '',
        message: '',
        type: 'info',
        recipients: 'all',
        targetVendorId: 'all',
        scheduledAt: ''
      });
      setIsCreateDialogOpen(false);
      toast.success(newNotification.scheduledAt ? 'Notification scheduled successfully' : 'Notification sent successfully');
      loadData(); // Refresh list
    } catch (error) {
      toast.error('Failed to send notification');
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      await updateMessageStatus(messageId, 'read');
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, status: 'read' as const, updatedAt: new Date() } : msg
        )
      );
      toast.success('Message marked as read');
    } catch (error) {
      toast.error('Failed to update message status');
    }
  };

  const handleReplyClick = (message: Message) => {
    setSelectedMessage(message);
    setReplyContent('');
    setReplyDialogOpen(true);
  };

  const sendReply = async () => {
    if (!selectedMessage || !replyContent) return;

    try {
      await replyToMessageApi(selectedMessage.id, replyContent);
      toast.success('Reply sent successfully');
      setReplyDialogOpen(false);
      loadData(); // Refresh to show updated status
    } catch (error) {
      toast.error('Failed to send reply');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'scheduled': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'draft': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      case 'success': return 'default';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || notification.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.from.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || message.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notifications & Communication</h1>
          <p className="text-muted-foreground">Manage platform communications and user messages</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Notification</DialogTitle>
              <DialogDescription>Send a notification to users on the platform</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newNotification.title}
                  onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Notification title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={newNotification.message}
                  onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Notification message"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select value={newNotification.type} onValueChange={(value: any) => setNewNotification(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Recipients</label>
                  <Select value={newNotification.recipients} onValueChange={(value: any) => setNewNotification(prev => ({ ...prev, recipients: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="customers">Customers</SelectItem>
                      <SelectItem value="vendors">Vendors</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Vendor Selection - Only show if recipients is 'vendors' */}
              {newNotification.recipients === 'vendors' && (
                <div>
                  <label className="text-sm font-medium">Specific Vendor (Optional)</label>
                  <Select
                    value={newNotification.targetVendorId}
                    onValueChange={(value: any) => setNewNotification(prev => ({ ...prev, targetVendorId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vendors</SelectItem>
                      {vendors.map(vendor => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.restaurantName || vendor.name || vendor.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Schedule (Optional)</label>
                <Input
                  type="datetime-local"
                  value={newNotification.scheduledAt}
                  onChange={(e) => setNewNotification(prev => ({ ...prev, scheduledAt: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={sendNotification} className="flex-1">
                  <Send className="h-4 w-4 mr-2" />
                  {newNotification.scheduledAt ? 'Schedule' : 'Send Now'}
                </Button>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search notifications and messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="h-4 w-4 mr-2" />
            Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          <div className="grid gap-4">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No notifications found
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <Card key={notification.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(notification.status)}
                        <div>
                          <CardTitle className="text-lg">{notification.title}</CardTitle>
                          <CardDescription>
                            To: {notification.targetVendorName ? `Vendor: ${notification.targetVendorName}` : notification.recipients} • {notification.createdAt.toLocaleDateString()}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getTypeColor(notification.type)}>{notification.type}</Badge>
                        <Badge variant="outline">{notification.status}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{notification.message}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {notification.status === 'sent' && (
                          <>Read by {notification.readCount} recipients</>
                        )}
                        {notification.status === 'scheduled' && (
                          <>Scheduled for {notification.scheduledAt?.toLocaleString()}</>
                        )}
                      </span>
                      <div className="flex gap-2">
                        {notification.recipients === 'all' && <Users className="h-3 w-3" />}
                        {notification.recipients === 'vendors' && <Store className="h-3 w-3" />}
                        {notification.recipients === 'customers' && <Users className="h-3 w-3" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <div className="grid gap-4">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No messages found
              </div>
            ) : (
              filteredMessages.map((message) => (
                <Card key={message.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{message.subject}</CardTitle>
                        <CardDescription>
                          From: {message.from} • {message.createdAt.toLocaleString()}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityColor(message.priority)}>{message.priority}</Badge>
                        <Badge variant="outline">{message.status}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{message.content}</p>
                    {message.reply && (
                      <div className="bg-muted p-3 rounded-md mb-4 text-sm">
                        <p className="font-semibold mb-1">Reply:</p>
                        <p>{message.reply.content}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{message.type}</Badge>
                      <div className="flex gap-2">
                        {message.status === 'unread' && (
                          <Button size="sm" variant="outline" onClick={() => markMessageAsRead(message.id)}>
                            Mark as Read
                          </Button>
                        )}
                        <Button size="sm" onClick={() => handleReplyClick(message)}>
                          <Mail className="h-3 w-3 mr-1" />
                          Reply
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Message</DialogTitle>
            <DialogDescription>
              Replying to: {selectedMessage?.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type your reply here..."
              rows={5}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>Cancel</Button>
              <Button onClick={sendReply}>Send Reply</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
