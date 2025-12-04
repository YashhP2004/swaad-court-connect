import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  Sun,
  Moon,
  Leaf,
  Beef,
  Plus,
  Minus,
  Trash2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from '@/context/theme-context';
import { useAuth } from '@/context/auth-context';
import { useCart } from '@/context/cart-context';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { VegNonVegIndicator } from '@/components/ui/veg-non-veg-indicator';

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function Header({ onMenuClick, showMenuButton = false }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { getTotalItems } = useCart();
  const location = useLocation();
  const totalItems = getTotalItems();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-navy-950/80 backdrop-blur-md shadow-lg shadow-black/20">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex h-16 sm:h-20 items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            {showMenuButton && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onMenuClick}
                className="md:hidden text-gray-300 hover:text-peach-400 hover:bg-white/5"
              >
                <Menu className="h-6 w-6" />
              </Button>
            )}

            <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-peach-500 to-peach-600 rounded-xl flex items-center justify-center shadow-lg shadow-peach-500/20 group-hover:scale-105 transition-transform">
                <span className="text-navy-950 font-extrabold text-lg sm:text-xl">S</span>
              </div>
              <span className="font-heading font-bold text-xl sm:text-2xl text-white tracking-tight group-hover:text-peach-400 transition-colors">
                Swaad<span className="text-peach-500">Court</span>
              </span>
            </Link>
          </div>

          {/* Center Section - Navigation (hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-8 bg-white/5 px-6 py-2 rounded-full border border-white/5 backdrop-blur-sm">
            <Link
              to="/"
              className={cn(
                "text-sm font-bold transition-all hover:text-peach-400 relative py-1",
                isActive('/') ? 'text-peach-400' : 'text-gray-300'
              )}
            >
              Home
              {isActive('/') && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-peach-500 rounded-full"
                />
              )}
            </Link>
            <Link
              to="/restaurants"
              className={cn(
                "text-sm font-bold transition-all hover:text-peach-400 relative py-1",
                isActive('/restaurants') ? 'text-peach-400' : 'text-gray-300'
              )}
            >
              Restaurants
              {isActive('/restaurants') && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-peach-500 rounded-full"
                />
              )}
            </Link>
            <Link
              to="/orders"
              className={cn(
                "text-sm font-bold transition-all hover:text-peach-400 relative py-1",
                isActive('/orders') ? 'text-peach-400' : 'text-gray-300'
              )}
            >
              Orders
              {isActive('/orders') && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-peach-500 rounded-full"
                />
              )}
            </Link>
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search */}
            <Button
              variant="ghost"
              size="icon-sm"
              asChild
              className="text-gray-300 hover:text-peach-400 hover:bg-white/5 h-10 w-10 sm:h-auto sm:w-auto"
            >
              <Link to="/search">
                <Search className="h-5 w-5" />
              </Link>
            </Button>

            {/* Cart with Sidebar */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="relative text-gray-300 hover:text-peach-400 hover:bg-white/5 h-10 w-10 sm:h-auto sm:w-auto"
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <AnimatePresence>
                      {totalItems > 0 && (
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          className="absolute -top-1.5 -right-1.5"
                        >
                          <Badge
                            className="h-5 w-5 flex items-center justify-center p-0 text-xs font-bold bg-peach-500 text-navy-950 border-2 border-navy-900"
                          >
                            {totalItems > 9 ? '9+' : totalItems}
                          </Badge>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </Button>
              </SheetTrigger>
              <CartSidebar />
            </Sheet>

            {/* User Menu */}
            {isAuthenticated ? (
              <Button
                variant="ghost"
                size="icon-sm"
                asChild
                className="ml-2"
              >
                <Link to="/profile">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-9 w-9 rounded-full object-cover border-2 border-peach-500/50 hover:border-peach-500 transition-colors"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-peach-400 border border-white/10 hover:bg-white/20 transition-colors">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                asChild
                className="ml-2 bg-peach-500 hover:bg-peach-600 text-navy-950 font-bold px-6"
              >
                <Link to="/login">Login</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function CartSidebar() {
  const { items, updateQuantity, removeItem, getTotalPrice } = useCart();
  const totalPrice = getTotalPrice();

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

  if (items.length === 0) {
    return (
      <SheetContent side="right" className="w-full sm:max-w-md p-4 sm:p-6">
        <SheetHeader className="text-left">
          <SheetTitle>Your Cart</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground mb-6">Add items to get started!</p>
            <Button variant="food" asChild>
              <Link to="/restaurants">
                <Plus className="h-4 w-4 mr-2" />
                Browse Restaurants
              </Link>
            </Button>
          </motion.div>
        </div>
      </SheetContent>
    );
  }

  return (
    <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-4 sm:p-6">
      <SheetHeader className="text-left">
        <SheetTitle>Your Cart</SheetTitle>
      </SheetHeader>

      <div className="mt-6 space-y-6">
        {Object.entries(itemsByRestaurant).map(([restaurantId, restaurant]) => (
          <div key={restaurantId} className="space-y-4">
            <h3 className="font-medium text-lg">{restaurant.restaurantName}</h3>
            <div className="space-y-3">
              {restaurant.items.map((item) => (
                <motion.div
                  key={item.uniqueId}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex gap-3 p-3 sm:p-4 border rounded-lg group hover:shadow-sm transition-all"
                >
                  <div className="relative min-w-[70px] h-[70px] sm:min-w-[60px] sm:h-[60px] rounded-md overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-0 left-0">
                      <VegNonVegIndicator isVeg={item.isVeg} size="sm" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        {item.customizations && item.customizations.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {item.customizations.map(c =>
                              c.selectedOptions.map(o => o.name).join(', ')
                            ).join(', ')}
                          </p>
                        )}
                        <div className="mt-1">
                          <span className="font-medium text-sm">₹{item.totalPrice.toFixed(0)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => updateQuantity(item.uniqueId, Math.max(1, item.quantity - 1))}
                          disabled={item.quantity <= 1}
                          className="h-8 w-8 sm:h-6 sm:w-6 rounded-full"
                        >
                          <Minus className="h-4 w-4 sm:h-3 sm:w-3" />
                        </Button>
                        <span className="text-sm font-medium w-6 sm:w-4 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => updateQuantity(item.uniqueId, item.quantity + 1)}
                          className="h-8 w-8 sm:h-6 sm:w-6 rounded-full"
                        >
                          <Plus className="h-4 w-4 sm:h-3 sm:w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeItem(item.uniqueId)}
                          className="h-8 w-8 sm:h-6 sm:w-6 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4 sm:h-3 sm:w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-background border-t">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>₹{totalPrice.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Delivery Fee</span>
            <span>FREE</span>
          </div>
          <div className="flex justify-between text-sm font-medium">
            <span>Total</span>
            <span>₹{totalPrice.toFixed(0)}</span>
          </div>
        </div>
        <Button className="w-full" size="lg" asChild>
          <Link to="/cart">Proceed to Checkout</Link>
        </Button>
      </div>
    </SheetContent>
  );
}