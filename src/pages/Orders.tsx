import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Receipt, 
  ChefHat,
  CheckCircle,
  XCircle,
  Utensils,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/auth-context';
import { 
  getUserOrders, 
  getOngoingOrders, 
  getPastOrders, 
  getOrderStatusColor,
  Order,
  OrderItem 
} from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';

const EmptyState = ({ type }: { type: 'ongoing' | 'past' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 px-4"
  >
    <div className="w-32 h-32 mb-6 rounded-full bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900 flex items-center justify-center">
      {type === 'ongoing' ? (
        <ChefHat className="w-16 h-16 text-orange-500" />
      ) : (
        <Receipt className="w-16 h-16 text-gray-500" />
      )}
    </div>
    <h3 className="text-xl font-semibold mb-2">
      {type === 'ongoing' ? 'No ongoing orders' : 'No past orders'}
    </h3>
    <p className="text-muted-foreground text-center max-w-sm">
      {type === 'ongoing' 
        ? 'When you place an order, it will appear here with real-time updates.'
        : 'Your completed and cancelled orders will be shown here.'
      }
    </p>
  </motion.div>
);

const groupOrdersByRestaurant = (orders: Order[]) => {
  const map = new Map<string, { id: string; name: string; orders: Order[] }>();
  orders.forEach(order => {
    order.items.forEach(item => {
      const key = `${item.id}-${item.restaurantId || order.restaurantId || item.restaurantName}`;
      const restaurantName = item.restaurantName || order.restaurantName;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: restaurantName,
          orders: []
        });
      }
      map.get(key)!.orders.push({
        ...order,
        restaurantId: item.restaurantId || order.restaurantId,
        restaurantName,
        items: [item]
      });
    });
  });
  return Array.from(map.values());
};

const OrderItemsList = ({ items }: { items: OrderItem[] }) => (
  <div className="space-y-2">
    {items.map((item, index) => (
      <div key={index} className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-xs font-medium">
            {item.quantity}
          </span>
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">{item.name}</span>
          </div>
        </div>
        <span className="text-muted-foreground">₹{item.unitPrice * item.quantity}</span>
      </div>
    ))}
  </div>
);

const OrderCard = ({ order }: { order: Order }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Placed':
        return <Clock className="w-4 h-4" />;
      case 'Confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'Preparing':
        return <ChefHat className="w-4 h-4" />;
      case 'Ready to Serve':
        return <Utensils className="w-4 h-4" />;
      case 'Served':
        return <CheckCircle className="w-4 h-4" />;
      case 'Completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'Cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{order.restaurantName}</h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDistanceToNow(order.createdAt, { addSuffix: true })}
                </div>
              </div>
            </div>
            <Badge 
              className={`${getOrderStatusColor(order.status)} flex items-center gap-1`}
              variant="secondary"
            >
              {getStatusIcon(order.status)}
              {order.status}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <OrderItemsList items={order.items} />
          
          <Separator className="my-4" />
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
            </span>
            <span className="font-semibold text-lg">₹{order.totalAmount}</span>
          </div>
          
          {order.notes && (
            <div className="mt-3 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> {order.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ongoing');

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = getUserOrders(user.uid, (fetchedOrders) => {
      setOrders(fetchedOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const ongoingOrders = getOngoingOrders(orders);
  const pastOrders = getPastOrders(orders);
  const groupedOngoingOrders = useMemo(() => groupOrdersByRestaurant(ongoingOrders), [ongoingOrders]);
  const groupedPastOrders = useMemo(() => groupOrdersByRestaurant(pastOrders), [pastOrders]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">My Orders</h1>
        <p className="text-muted-foreground">Track your dine-in orders in real-time</p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="ongoing" className="flex items-center gap-2">
            <ChefHat className="w-4 h-4" />
            Ongoing Orders
            {ongoingOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {ongoingOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Past Orders
            {pastOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pastOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ongoing">
          <AnimatePresence mode="wait">
            {groupedOngoingOrders.length === 0 ? (
              <EmptyState type="ongoing" />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {groupedOngoingOrders.map((group, groupIndex) => {
                  const total = group.orders.reduce((sum, order) => sum + order.totalAmount, 0);
                  return (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: groupIndex * 0.05 }}
                      className="space-y-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <h2 className="text-2xl font-semibold">{group.name}</h2>
                          <p className="text-sm text-muted-foreground">
                            {group.orders.length} order{group.orders.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-muted-foreground block">Total Value</span>
                          <span className="text-lg font-semibold">₹{total.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {group.orders.map((order) => (
                          <OrderCard key={order.id} order={order} />
                        ))}
                      </div>
                      {groupIndex < groupedOngoingOrders.length - 1 && <Separator />}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="past">
          <AnimatePresence mode="wait">
            {groupedPastOrders.length === 0 ? (
              <EmptyState type="past" />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {groupedPastOrders.map((group, groupIndex) => {
                  const total = group.orders.reduce((sum, order) => sum + order.totalAmount, 0);
                  return (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: groupIndex * 0.05 }}
                      className="space-y-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <h2 className="text-2xl font-semibold">{group.name}</h2>
                          <p className="text-sm text-muted-foreground">
                            {group.orders.length} order{group.orders.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-muted-foreground block">Total Value</span>
                          <span className="text-lg font-semibold">₹{total.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {group.orders.map((order) => (
                          <OrderCard key={order.id} order={order} />
                        ))}
                      </div>
                      {groupIndex < groupedPastOrders.length - 1 && <Separator />}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
}