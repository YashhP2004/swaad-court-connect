import React from 'react';
import { Bell, ShoppingBag, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

interface Order {
    id: string;
    orderNumber?: string;
    status: string;
    createdAt: any;
    totalAmount: number;
    items: any[];
}

interface VendorNotificationsProps {
    orders: Order[];
    onOrderClick: () => void;
}

export function VendorNotifications({ orders, onOrderClick }: VendorNotificationsProps) {
    // Filter for pending/preparing orders
    const activeOrders = orders.filter(order =>
        ['pending', 'accepted', 'preparing', 'ready'].includes(order.status?.toLowerCase())
    );

    // Sort by newest first
    const sortedOrders = [...activeOrders].sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
    });

    const unreadCount = sortedOrders.filter(o => o.status === 'pending').length;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 relative border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-[10px] animate-pulse">
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b bg-orange-50/50">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Bell className="w-4 h-4 text-orange-500" />
                        Notifications
                        {unreadCount > 0 && (
                            <Badge variant="secondary" className="ml-auto text-xs bg-orange-100 text-orange-700 hover:bg-orange-200">
                                {unreadCount} New
                            </Badge>
                        )}
                    </h4>
                </div>
                <ScrollArea className="h-[300px]">
                    {sortedOrders.length > 0 ? (
                        <div className="divide-y">
                            {sortedOrders.map((order) => (
                                <div
                                    key={order.id}
                                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={onOrderClick}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-medium text-sm text-gray-900">
                                            Order #{order.orderNumber || order.id.slice(-6)}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {order.createdAt?.toDate
                                                ? formatDistanceToNow(order.createdAt.toDate(), { addSuffix: true })
                                                : 'Just now'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <Badge variant={
                                            order.status === 'pending' ? 'destructive' :
                                                order.status === 'completed' ? 'default' : 'secondary'
                                        } className="text-[10px] uppercase">
                                            {order.status}
                                        </Badge>
                                        <span className="text-sm font-semibold text-gray-700">₹{order.totalAmount}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 line-clamp-1">
                                        {order.items?.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">No new notifications</p>
                        </div>
                    )}
                </ScrollArea>
                <div className="p-2 border-t bg-gray-50">
                    <Button variant="ghost" size="sm" className="w-full text-xs text-gray-500 hover:text-orange-600" onClick={onOrderClick}>
                        View All Orders
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
