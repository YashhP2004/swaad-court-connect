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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            {showMenuButton && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onMenuClick}
                className="md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}

            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">S</span>
              </div>
              <span className="font-heading font-bold text-xl bg-gradient-primary bg-clip-text text-transparent">
                Swaadcourt
              </span>
            </Link>
          </div>

          {/* Center Section - Navigation (hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive('/') ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              Home
            </Link>
            <Link
              to="/restaurants"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive('/restaurants') ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              Restaurants
            </Link>
            <Link
              to="/orders"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive('/orders') ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              Orders
            </Link>
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleTheme}
              className="food-pulse"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>

            {/* Search */}
            <Button
              variant="ghost"
              size="icon-sm"
              asChild
            >
              <Link to="/search">
                <Search className="h-4 w-4" />
              </Link>
            </Button>

            {/* Cart with Sidebar */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="relative"
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <AnimatePresence>
                      {totalItems > 0 && (
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          className="absolute -top-1 -right-1"
                        >
                          <Badge
                            variant="destructive"
                            className="h-5 w-5 flex items-center justify-center p-0 text-xs animate-cart-bounce"
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
              >
                <Link to="/profile">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </Link>
              </Button>
            ) : (
              <Button variant="food" size="sm" asChild>
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
      <SheetContent side="right" className="w-full sm:max-w-md">
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
    <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
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
                  className="flex gap-3 p-3 border rounded-lg group hover:shadow-sm transition-all"
                >
                  <div className="relative min-w-[60px] h-[60px] rounded-md overflow-hidden">
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
                          className="h-6 w-6 rounded-full"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => updateQuantity(item.uniqueId, item.quantity + 1)}
                          className="h-6 w-6 rounded-full"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeItem(item.uniqueId)}
                          className="h-6 w-6 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
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

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
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