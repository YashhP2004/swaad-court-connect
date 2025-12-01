import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  CreditCard,
  MapPin,
  Clock,
  Utensils,
  User,
  LogIn,
  Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { VegNonVegIndicator } from '@/components/common/VegNonVegToggle';
import { PointsRedemption } from '@/components/loyalty/PointsRedemption';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

export default function Cart() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    getTotalPrice,
    getTotalItems,
    getRestaurantSubtotal
  } = useCart();

  // Loyalty points state
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);

  const handlePointsChange = (points: number, discount: number) => {
    setLoyaltyPointsToRedeem(points);
    setLoyaltyDiscount(discount);
  };

  // Group items by restaurant
  const itemsByRestaurant = items.reduce((acc, item) => {
    if (!acc[item.restaurantId]) {
      acc[item.restaurantId] = {
        restaurantName: item.restaurantName,
        items: []
      };
    }
    acc[item.restaurantId].items.push(item);
    return acc;
  }, {} as Record<string, { restaurantName: string; items: typeof items }>);

  const deliveryFee = 0; // Free delivery within mall
  const subtotal = getTotalPrice();
  const taxes = Math.round((subtotal - loyaltyDiscount) * 0.05); // 5% tax on discounted amount
  const totalAmount = subtotal - loyaltyDiscount + taxes;

  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      navigate('/login', {
        state: {
          from: '/checkout',
          message: 'Please log in to complete your order and track your purchases'
        }
      });
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-warm flex flex-col">
        {/* Header */}
        <div className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <h1 className="text-xl font-heading font-bold">Your Cart</h1>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center animate-fade-in">
            <div className="w-32 h-32 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center animate-float">
              <ShoppingBag className="h-16 w-16 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-heading font-bold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Add some delicious items to get started!</p>
            <Button variant="food" size="lg" asChild>
              <Link to="/restaurants">
                <Utensils className="h-5 w-5 mr-2" />
                Explore Restaurants
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-heading font-bold">Your Cart</h1>
                <p className="text-sm text-muted-foreground">
                  {getTotalItems()} items from {Object.keys(itemsByRestaurant).length} restaurant{Object.keys(itemsByRestaurant).length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {items.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearCart}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(itemsByRestaurant).map(([restaurantId, restaurant], index) => (
              <Card
                key={restaurantId}
                className="border-0 shadow-warm animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Utensils className="h-5 w-5 text-primary" />
                      {restaurant.restaurantName}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {restaurant.items.length} item{restaurant.items.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {restaurant.items.map((item, itemIndex) => (
                    <div key={`${item.id}-${itemIndex}`}>
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start gap-2 mb-1">
                            <VegNonVegIndicator isVeg={item.isVeg} size="sm" />
                            <h3 className="font-medium">{item.name}</h3>
                          </div>
                          <p className="text-sm font-bold text-primary">₹{item.price}</p>
                          {item.specialInstructions && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Note: {item.specialInstructions}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => updateQuantity(item.uniqueId, item.quantity - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium w-6 text-center">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => updateQuantity(item.uniqueId, item.quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => removeItem(item.uniqueId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {itemIndex < restaurant.items.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-warm sticky top-24 animate-fade-in animation-delay-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Order Summary
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Authentication Status */}
                {!isAuthenticated && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-amber-600" />
                      <p className="text-sm font-medium text-amber-800">Login Required</p>
                    </div>
                    <p className="text-xs text-amber-700 mb-3">
                      Please log in to complete your order and track your purchases
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
                      onClick={() => navigate('/login', {
                        state: {
                          from: '/checkout',
                          message: 'Please log in to complete your order and track your purchases'
                        }
                      })}
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Login to Continue
                    </Button>
                  </div>
                )}

                {/* User Info (when authenticated) */}
                {isAuthenticated && user && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-green-600" />
                      <div className="text-sm">
                        <p className="font-medium text-green-800">Logged in as</p>
                        <p className="text-green-700">{user.name || user.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loyalty Points Redemption */}
                {isAuthenticated && user && (
                  <PointsRedemption
                    availablePoints={user.loyaltyPoints || 0}
                    orderSubtotal={subtotal}
                    onPointsChange={handlePointsChange}
                  />
                )}

                {/* Location */}
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="font-medium">Dine-in at Mall Food Court</p>
                    <p className="text-muted-foreground">Level 2, Phoenix Mall</p>
                  </div>
                </div>

                {/* Timing */}
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="font-medium">Estimated Time</p>
                    <p className="text-muted-foreground">15-20 minutes</p>
                  </div>
                </div>

                <Separator />

                {/* Price Breakdown */}
                <div className="space-y-3">
                  {/* Restaurant-wise subtotals */}
                  {Object.entries(itemsByRestaurant).map(([restaurantId, restaurant]) => (
                    <div key={restaurantId} className="flex justify-between text-sm">
                      <span>{restaurant.restaurantName}</span>
                      <span>₹{getRestaurantSubtotal(restaurantId)}</span>
                    </div>
                  ))}

                  <Separator />

                  <div className="flex justify-between text-sm font-medium">
                    <span>Subtotal ({getTotalItems()} items)</span>
                    <span>₹{subtotal}</span>
                  </div>

                  {loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="flex items-center gap-1">
                        <Gift className="h-3 w-3" />
                        Loyalty Discount
                      </span>
                      <span>-₹{loyaltyDiscount.toFixed(0)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span>Taxes & Fees</span>
                    <span>₹{taxes}</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">₹{totalAmount}</span>
                  </div>
                </div>

                <Button
                  variant="food"
                  size="lg"
                  className={cn(
                    "w-full ripple-effect",
                    !isAuthenticated && "opacity-75"
                  )}
                  onClick={handleProceedToCheckout}
                >
                  {isAuthenticated ? (
                    "Proceed to Payment"
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Login to Pay
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By placing this order, you agree to our terms and conditions
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}