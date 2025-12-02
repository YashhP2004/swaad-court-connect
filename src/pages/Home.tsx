import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  TrendingUp,
  Utensils,
  Award,
  Plus,
  Minus,
  Star,
  MapPin
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VegNonVegIndicator, VegNonVegToggle } from '@/components/common/VegNonVegToggle';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import heroImage from '@/assets/hero-food-court.jpg';
import { cn } from '@/lib/utils';
import { fetchRestaurants, fetchRestaurantMenu, Restaurant, MenuItem, getRestaurantsRealtime } from '@/lib/firebase';
import { RestaurantCard } from '@/components/RestaurantCard';

interface FoodItem extends MenuItem {
  restaurantName: string;
}

export default function Home() {
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [trendingItems, setTrendingItems] = useState<FoodItem[]>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAddToCartOpen, setIsAddToCartOpen] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const { addItem } = useCart();

  const handleAddToCart = (item: FoodItem) => {
    setSelectedMenuItem(item);
    setQuantity(1);
    setSpecialInstructions('');
    setIsAddToCartOpen(true);
  };

  const handleConfirmAddToCart = () => {
    if (!selectedMenuItem) return;

    try {
      // Add items to cart based on quantity
      for (let i = 0; i < quantity; i++) {
        addItem(
          selectedMenuItem,
          selectedMenuItem.restaurantId,
          selectedMenuItem.restaurantName || 'Unknown Restaurant', // Provide a fallback name
          [],
          specialInstructions
        );
      }

      toast({
        title: 'Item added to cart',
        description: `${quantity}x ${selectedMenuItem.name} from ${selectedMenuItem.restaurantName} added to your cart`,
      });

      setIsAddToCartOpen(false);
      setSelectedMenuItem(null);
      setQuantity(1);
      setSpecialInstructions('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add item to cart',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    let isInitialLoad = true;

    // Real-time listener for restaurants
    const unsubscribe = getRestaurantsRealtime(async (updatedRestaurants) => {
      setRestaurants(updatedRestaurants);

      // Only fetch menu items on initial load to prevent excessive reads
      if (isInitialLoad) {
        try {
          // Fetch menu items from each restaurant
          const menuPromises = updatedRestaurants.map(async (restaurant) => {
            const menuItems = await fetchRestaurantMenu(restaurant.id);
            return menuItems.map(item => ({
              ...item,
              restaurantName: restaurant.name
            }));
          });

          const allMenuItems = await Promise.all(menuPromises);
          const trendingMenuItems = allMenuItems
            .flat()
            .filter(item => item.isPopular)
            .slice(0, 3);

          setTrendingItems(trendingMenuItems);
          setIsLoading(false);
        } catch (error) {
          console.error('Error loading data:', error);
          setIsLoading(false);
        } finally {
          isInitialLoad = false;
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const filteredRestaurants = restaurants.filter(restaurant => {
    if (isVegOnly && !restaurant.isVeg) return false;
    return true;
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-[500px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-transparent z-10" />
        <img
          src={heroImage}
          alt="Food Court"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Swaad<span className="text-orange-500">Court</span>
          </h1>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl">
            Experience the future of food court dining. Order from multiple restaurants in a single cart.
          </p>

          <div className="w-full max-w-2xl relative group">
            <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full group-hover:bg-orange-500/30 transition-all" />
            <div className="relative flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-2 shadow-2xl">
              <Search className="w-6 h-6 text-gray-400 ml-4" />
              <input
                type="text"
                placeholder="Search for restaurants, cuisines, or dishes..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-gray-400 px-4 py-2"
              />
              <Button className="rounded-full bg-orange-500 hover:bg-orange-600 text-white px-8">
                Search
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-16">
        {/* Trending Now Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Trending Now</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingItems.map((item) => (
              <Card key={item.id} className="bg-neutral-900 border-neutral-800 overflow-hidden hover:border-neutral-700 transition-all group">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={item.image || '/placeholder-food.jpg'}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute top-3 right-3">
                    <VegNonVegIndicator isVeg={item.isVeg} />
                  </div>
                  {item.isPopular && (
                    <Badge className="absolute top-3 left-3 bg-orange-500">
                      Popular
                    </Badge>
                  )}
                </div>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-orange-500 transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-400">{item.restaurantName}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-neutral-800 px-2 py-1 rounded-md">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-medium text-white">{item.rating}</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{item.description}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-lg font-bold text-white">₹{item.price}</span>
                    <Button
                      size="sm"
                      className="bg-white text-black hover:bg-gray-200"
                      onClick={() => handleAddToCart(item)}
                    >
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Popular Restaurants Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Utensils className="w-6 h-6 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Popular Restaurants</h2>
            </div>
            <div className="flex items-center gap-4">
              <VegNonVegToggle isVeg={isVegOnly} onToggle={() => setIsVegOnly(!isVegOnly)} />
              <Link to="/restaurants">
                <Button variant="ghost" className="text-orange-500 hover:text-orange-400 hover:bg-orange-500/10">
                  View All <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredRestaurants.map((restaurant) => (
              <Link key={restaurant.id} to={`/restaurant/${restaurant.id}`}>
                <RestaurantCard restaurant={restaurant} />
              </Link>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12 border-t border-neutral-800">
          <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800">
            <div className="p-4 bg-orange-500/10 rounded-full">
              <Utensils className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-xl font-semibold text-white">Multi-Restaurant Ordering</h3>
            <p className="text-gray-400">Order from multiple restaurants in a single cart. No more separate orders.</p>
          </div>
          <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800">
            <div className="p-4 bg-orange-500/10 rounded-full">
              <MapPin className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-xl font-semibold text-white">Live Order Tracking</h3>
            <p className="text-gray-400">Track your food in real-time from preparation to pickup.</p>
          </div>
          <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800">
            <div className="p-4 bg-orange-500/10 rounded-full">
              <Award className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-xl font-semibold text-white">Exclusive Deals</h3>
            <p className="text-gray-400">Get the best offers and discounts from your favorite restaurants.</p>
          </div>
        </section>
      </div>

      <Footer />

      {/* Add to Cart Dialog */}
      <Dialog open={isAddToCartOpen} onOpenChange={setIsAddToCartOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add to Cart</DialogTitle>
          </DialogHeader>

          {selectedMenuItem && (
            <div className="space-y-6 pt-4">
              <div className="flex items-start gap-4">
                <img
                  src={selectedMenuItem.image || '/placeholder-food.jpg'}
                  alt={selectedMenuItem.name}
                  className="w-20 h-20 rounded-lg object-cover bg-neutral-800"
                />
                <div>
                  <h3 className="font-semibold text-lg">{selectedMenuItem.name}</h3>
                  <p className="text-sm text-gray-400">{selectedMenuItem.restaurantName}</p>
                  <p className="text-orange-500 font-bold mt-1">₹{selectedMenuItem.price}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Quantity</label>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-neutral-700 hover:bg-neutral-800"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="font-medium w-8 text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-neutral-700 hover:bg-neutral-800"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Special Instructions (Optional)</label>
                <Textarea
                  placeholder="E.g., less spicy, extra sauce..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="bg-neutral-950 border-neutral-800 focus:border-orange-500 min-h-[80px]"
                />
              </div>

              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-6"
                onClick={handleConfirmAddToCart}
              >
                Add to Cart - ₹{selectedMenuItem.price * quantity}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}