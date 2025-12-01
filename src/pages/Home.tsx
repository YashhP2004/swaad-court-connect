import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Star,
  Clock,
  MapPin,
  TrendingUp,
  Utensils,
  Award,
  Plus,
  Minus
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
import { fetchRestaurants, fetchRestaurantMenu, Restaurant, MenuItem } from '@/lib/firebase';

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
    async function loadData() {
      try {
        // Fetch restaurants
        const fetchedRestaurants = await fetchRestaurants();
        setRestaurants(fetchedRestaurants);

        // Fetch menu items from each restaurant
        const menuPromises = fetchedRestaurants.map(async (restaurant) => {
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
      }
    }

    loadData();
  }, []);

  const filteredRestaurants = isVegOnly
    ? restaurants.filter(r => r.isVeg)
    : restaurants;

  const filteredTrendingItems = isVegOnly
    ? trendingItems.filter(item => item.isVeg)
    : trendingItems;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading delicious food..." type="cooking" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm animate-page-enter">
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Food Court"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        </div>

        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center">
          <div className="max-w-2xl animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-4 text-glow animate-fade-in animation-delay-200">
              Savor Every
              <span className="bg-gradient-primary bg-clip-text text-transparent block animate-fade-in animation-delay-400">
                Bite
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8 font-medium animate-fade-in animation-delay-600">
              Order from multiple restaurants in one place.
              <br className="hidden md:block" />
              Unified cart, single payment, endless flavor!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in animation-delay-800">
              <Button
                variant="food"
                size="lg"
                className="group"
                asChild
              >
                <Link to="/restaurants">
                  <Utensils className="mr-2 h-5 w-5 group-hover:animate-food-bounce" />
                  Explore Food Court
                </Link>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                asChild
              >
                <Link to="/search">
                  <Search className="mr-2 h-5 w-5" />
                  Search Restaurants
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Floating food icons */}
        <div className="absolute top-20 right-10 w-12 h-12 bg-accent/20 rounded-full animate-float hidden md:block" />
        <div className="absolute bottom-40 left-10 w-8 h-8 bg-secondary/20 rounded-full animate-float animation-delay-300 hidden md:block" />
        <div className="absolute top-40 left-1/3 w-6 h-6 bg-primary/20 rounded-full animate-float animation-delay-600 hidden md:block" />
      </section>

      {/* Controls Section */}
      <section className="py-6 border-b bg-background/80 backdrop-blur-sm sticky top-16 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <VegNonVegToggle
              isVeg={isVegOnly}
              onToggle={setIsVegOnly}
              className=""
            />

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Mall Food Court</span>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Food Categories */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Utensils className="h-6 w-6 text-secondary animate-food-pulse" />
              <h2 className="text-2xl font-heading font-bold">Food Categories</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {['Burgers', 'Pizza', 'Indian', 'Chinese', 'Desserts', 'Beverages'].map((category, index) => (
              <Button
                key={category}
                variant="outline"
                size="lg"
                className="h-24 flex flex-col items-center justify-center gap-2 bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 group"
                asChild
              >
                <Link to={`/restaurants?category=${category.toLowerCase()}`}>
                  <span className="text-lg font-medium group-hover:text-primary transition-colors">{category}</span>
                </Link>
              </Button>
            ))}
          </div>
        </section>

        {/* Trending Items */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary animate-food-pulse" />
              <h2 className="text-2xl font-heading font-bold">Trending Now</h2>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/trending">View All</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrendingItems.map((item, index) => (
              <Card
                key={item.id}
                className="group dish-hover cursor-pointer border-0 shadow-food"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-0">
                  <div className="relative overflow-hidden rounded-t-lg">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <VegNonVegIndicator isVeg={item.isVeg} />
                      {item.isTrending && (
                        <Badge variant="destructive" className="animate-food-pulse">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Trending
                        </Badge>
                      )}
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="bg-white/90 text-black">
                        <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                        {item.rating}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-primary">₹{item.price}</span>
                        <p className="text-xs text-muted-foreground">{item.restaurantName}</p>
                      </div>
                      <Button
                        variant="food"
                        size="sm"
                        className="ripple-effect"
                        onClick={() => handleAddToCart(item)}
                      >
                        Add to Cart
                      </Button>

                      {/* Add to Cart Dialog */}
                      <Dialog open={isAddToCartOpen} onOpenChange={setIsAddToCartOpen}>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add to Cart</DialogTitle>
                          </DialogHeader>

                          {selectedMenuItem && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                                  {selectedMenuItem.image && (
                                    <img
                                      src={selectedMenuItem.image}
                                      alt={selectedMenuItem.name}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </div>

                                <div>
                                  <h3 className="font-medium">{selectedMenuItem.name}</h3>
                                  <p className="text-sm font-bold text-primary">₹{selectedMenuItem.price}</p>
                                </div>
                              </div>

                              {/* Special Instructions */}
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium">Special Instructions</h4>
                                <Textarea
                                  placeholder="Any allergies or special requests?"
                                  value={specialInstructions}
                                  onChange={(e) => setSpecialInstructions(e.target.value)}
                                  className="h-24"
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="w-8 text-center">{quantity}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => setQuantity(quantity + 1)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="font-medium">Total: ₹{selectedMenuItem.price * quantity}</p>
                              </div>

                              <Button
                                variant="food"
                                className="w-full"
                                onClick={handleConfirmAddToCart}
                              >
                                Add to Cart • ₹{selectedMenuItem.price * quantity}
                              </Button>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Popular Restaurants */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Award className="h-6 w-6 text-secondary animate-food-pulse" />
              <h2 className="text-2xl font-heading font-bold">Popular Restaurants</h2>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/restaurants">View All</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredRestaurants.map((restaurant, index) => (
              <Card
                key={restaurant.id}
                className="group dish-hover cursor-pointer border-0 shadow-warm"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <CardContent className="p-0">
                  <div className="relative overflow-hidden rounded-t-lg">
                    <img
                      src={restaurant.image}
                      alt={restaurant.name}
                      className="w-full h-40 object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {restaurant.offers && (
                      <div className="absolute top-3 left-3">
                        <Badge variant="destructive" className="animate-food-pulse">
                          {restaurant.offers}
                        </Badge>
                      </div>
                    )}
                    {restaurant.isPopular && (
                      <div className="absolute top-3 right-3">
                        <Badge variant="secondary" className="bg-accent text-accent-foreground">
                          <Award className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{restaurant.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{restaurant.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{restaurant.prepTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{restaurant.distance}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {Array.isArray(restaurant.cuisine) ? (
                        restaurant.cuisine.map((type) => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {type}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {restaurant.cuisine}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full ripple-effect"
                      asChild
                    >
                      <Link to={`/restaurant/${restaurant.id}`}>
                        View Menu
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}