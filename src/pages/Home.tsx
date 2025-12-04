import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  TrendingUp,
  Utensils,
  Award,
  Plus,
  Minus,
  Star,
  MapPin,
  ChefHat,
  ArrowRight
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
  const navigate = useNavigate();
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
      <div className="relative h-[400px] md:h-[500px] lg:h-[600px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-900/60 to-transparent z-10" />
        <div className="absolute inset-0 bg-navy-950/30 z-10 mix-blend-multiply" />
        <img
          src={heroImage}
          alt="Food Court"
          className="w-full h-full object-cover scale-105 animate-slow-zoom"
        />
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4 sm:px-6">
          <div className="animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-4 md:mb-6 tracking-tight drop-shadow-2xl">
              Swaad<span className="text-transparent bg-clip-text bg-gradient-to-r from-peach-400 to-peach-600">Court</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-100 mb-6 md:mb-10 max-w-2xl mx-auto font-medium drop-shadow-lg px-2">
              Experience the future of food court dining. <br className="hidden sm:block" />
              <span className="text-peach-200">Order from multiple restaurants in a single cart.</span>
            </p>
          </div>

          <div className="w-full max-w-3xl relative group animate-fade-in-up delay-100">
            <div className="absolute inset-0 bg-peach-500/20 blur-2xl rounded-full group-hover:bg-peach-500/30 transition-all duration-500" />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const searchInput = e.currentTarget.querySelector('input');
                const query = searchInput?.value.trim();
                if (query) {
                  navigate(`/search?q=${encodeURIComponent(query)}`);
                }
              }}
              className="relative flex flex-col sm:flex-row items-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-full p-2 sm:p-2 shadow-2xl hover:shadow-peach-500/10 hover:border-peach-500/30 transition-all duration-300 gap-2 sm:gap-0"
            >
              <div className="flex items-center w-full sm:flex-1">
                <Search className="w-5 h-5 sm:w-6 sm:h-6 text-peach-200 ml-3 sm:ml-4" />
                <input
                  type="text"
                  placeholder="Search for restaurants, cuisines, or dishes..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-base sm:text-lg outline-none"
                />
              </div>
              <Button
                type="submit"
                className="w-full sm:w-auto rounded-full bg-gradient-to-r from-peach-500 to-peach-600 hover:from-peach-600 hover:to-peach-700 text-navy-950 font-bold px-6 sm:px-8 py-3 sm:py-6 text-base sm:text-lg shadow-lg shadow-peach-500/20 transition-all hover:scale-105"
              >
                Search
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-16">
        {/* Trending Now Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-peach-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-peach-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Trending Now</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {trendingItems.map((item) => (
              <Card key={item.id} className="bg-navy-900 border-white/10 overflow-hidden hover:border-peach-500/50 hover:shadow-lg hover:shadow-peach-500/10 transition-all duration-300 group relative">
                <div className="relative h-40 sm:h-48 md:h-52 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-transparent to-transparent z-10 opacity-60" />
                  <img
                    src={item.image || '/placeholder-food.jpg'}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-20 bg-black/20 backdrop-blur-sm p-1 rounded-full">
                    <VegNonVegIndicator isVeg={item.isVeg} />
                  </div>
                  {item.isPopular && (
                    <Badge className="absolute top-2 sm:top-3 left-2 sm:left-3 z-20 bg-peach-500 text-white border-none shadow-lg shadow-peach-500/20 font-bold text-xs">
                      Popular
                    </Badge>
                  )}
                  <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 sm:px-2.5 py-1 rounded-lg border border-white/10">
                    <Star className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-bold text-white">{item.rating}</span>
                  </div>
                </div>
                <CardContent className="p-4 sm:p-5 relative">
                  <div className="mb-3">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-lg font-bold text-white group-hover:text-peach-400 transition-colors line-clamp-1">
                        {item.name}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-400 font-medium flex items-center gap-1">
                      <ChefHat className="w-3 h-3" /> {item.restaurantName}
                    </p>
                  </div>

                  <p className="text-gray-500 text-sm mb-5 line-clamp-2 h-10 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Price</span>
                      <span className="text-xl font-bold text-peach-400">₹{item.price}</span>
                    </div>
                    <Button
                      size="sm"
                      className="bg-white text-navy-950 hover:bg-peach-50 hover:text-peach-600 font-bold px-6 shadow-md transition-all active:scale-95"
                      onClick={() => handleAddToCart(item)}
                    >
                      Add +
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
              <div className="p-2 bg-peach-500/10 rounded-lg">
                <Utensils className="w-6 h-6 text-peach-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Popular Restaurants</h2>
            </div>
            <div className="flex items-center gap-4">
              <VegNonVegToggle isVeg={isVegOnly} onToggle={() => setIsVegOnly(!isVegOnly)} />
              <Link to="/restaurants">
                <Button variant="ghost" className="text-peach-500 hover:text-peach-400 hover:bg-peach-500/10">
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
        {/* Features Section */}
        <section className="py-20 border-t border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-navy-950/50 z-0" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-peach-500/5 rounded-full blur-3xl z-0" />

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="flex flex-col items-center text-center p-6 md:p-8 bg-navy-900/50 backdrop-blur-md border border-white/5 hover:border-peach-500/50 hover:shadow-xl hover:shadow-peach-500/10 transition-all duration-300 group rounded-none">
              <div className="p-3 md:p-4 bg-navy-950 border border-white/10 group-hover:border-peach-500/30 transition-colors mb-4 md:mb-6 rounded-none shadow-lg">
                <Utensils className="w-8 h-8 md:w-10 md:h-10 text-peach-500 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3 group-hover:text-peach-400 transition-colors">Multi-Restaurant Ordering</h3>
              <p className="text-sm md:text-base text-gray-400 leading-relaxed">Order from multiple restaurants in a single cart. No more separate orders.</p>
            </div>

            <div className="flex flex-col items-center text-center p-6 md:p-8 bg-navy-900/50 backdrop-blur-md border border-white/5 hover:border-peach-500/50 hover:shadow-xl hover:shadow-peach-500/10 transition-all duration-300 group rounded-none">
              <div className="p-3 md:p-4 bg-navy-950 border border-white/10 group-hover:border-peach-500/30 transition-colors mb-4 md:mb-6 rounded-none shadow-lg">
                <MapPin className="w-8 h-8 md:w-10 md:h-10 text-peach-500 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3 group-hover:text-peach-400 transition-colors">Live Order Tracking</h3>
              <p className="text-sm md:text-base text-gray-400 leading-relaxed">Track your food in real-time from preparation to pickup.</p>
            </div>

            <div className="flex flex-col items-center text-center p-6 md:p-8 bg-navy-900/50 backdrop-blur-md border border-white/5 hover:border-peach-500/50 hover:shadow-xl hover:shadow-peach-500/10 transition-all duration-300 group rounded-none">
              <div className="p-3 md:p-4 bg-navy-950 border border-white/10 group-hover:border-peach-500/30 transition-colors mb-4 md:mb-6 rounded-none shadow-lg">
                <Award className="w-8 h-8 md:w-10 md:h-10 text-peach-500 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3 group-hover:text-peach-400 transition-colors">Exclusive Deals</h3>
              <p className="text-sm md:text-base text-gray-400 leading-relaxed">Get the best offers and discounts from your favorite restaurants.</p>
            </div>
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
                  <p className="text-peach-500 font-bold mt-1">₹{selectedMenuItem.price}</p>
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
                  className="bg-neutral-950 border-neutral-800 focus:border-peach-500 min-h-[80px]"
                />
              </div>

              <Button
                className="w-full bg-peach-500 hover:bg-peach-600 text-navy-900 font-semibold py-6"
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


