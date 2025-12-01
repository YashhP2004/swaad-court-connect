import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { fetchRestaurants, fetchRestaurantMenu, Restaurant, MenuItem } from '@/lib/firebase';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from '@/context/cart-context';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, ShoppingCart, Star, Clock, MapPin, Utensils } from 'lucide-react';
import { VegNonVegIndicator } from '@/components/ui/veg-non-veg-indicator';

export function RestaurantList() {
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAddToCartOpen, setIsAddToCartOpen] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const { addItem, canAddToCart } = useCart();
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch restaurants
  const { data: restaurants, isLoading: isLoadingRestaurants, error: restaurantsError } =
    useQuery({
      queryKey: ['restaurants'],
      queryFn: fetchRestaurants,
      refetchOnMount: true,
      staleTime: 0
    });

  // Fetch menu items for selected restaurant
  const { data: menuItems, isLoading: isLoadingMenu } =
    useQuery({
      queryKey: ['menu', selectedRestaurant],
      queryFn: () => selectedRestaurant ? fetchRestaurantMenu(selectedRestaurant) : Promise.resolve([]),
      enabled: !!selectedRestaurant,
      staleTime: 0,
      refetchOnMount: true
    });

  const handleRestaurantClick = (restaurantId: string) => {
    setSelectedRestaurant(restaurantId);
    setIsSheetOpen(true);
  };

  const handleAddToCart = (item: MenuItem, restaurantId: string, restaurantName: string) => {
    const cartCheck = canAddToCart(restaurantId);
    if (!cartCheck.allowed) {
      toast({
        title: 'Cannot add item',
        description: cartCheck.message,
        variant: 'destructive'
      });
      return;
    }

    setSelectedMenuItem(item);
    setQuantity(1);
    setIsAddToCartOpen(true);
  };

  const handleConfirmAddToCart = () => {
    if (!selectedMenuItem || !selectedRestaurant) return;

    try {
      for (let i = 0; i < quantity; i++) {
        const restaurant = restaurants?.find(r => r.id === selectedRestaurant);
        if (!restaurant) return;
        addItem(selectedMenuItem, selectedRestaurant, restaurant.name, [], specialInstructions);
      }

      toast({
        title: 'Item added to cart',
        description: `${quantity}x ${selectedMenuItem.name} added to your cart`,
      });

      setIsAddToCartOpen(false);
      setSelectedMenuItem(null);
      setQuantity(1);
      setSpecialInstructions('');
    } catch (error) {
      toast({
        title: 'Error adding item',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  // Reset scroll position when menu items load
  useEffect(() => {
    if (menuRef.current) {
      menuRef.current.scrollTop = 0;
    }
  }, [menuItems]);

  if (isLoadingRestaurants) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading restaurants...</div>
      </div>
    );
  }

  if (restaurantsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-red-500">Error loading restaurants</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Popular Restaurants</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {restaurants?.map((restaurant) => (
          <Sheet key={restaurant.id} open={isSheetOpen && selectedRestaurant === restaurant.id} onOpenChange={(open) => {
            setIsSheetOpen(open);
            if (!open) setSelectedRestaurant(null);
          }}>
            <SheetTrigger asChild>
              <motion.div
                whileHover={{ y: -8, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Card
                  className="cursor-pointer overflow-hidden group rounded-xl"
                  onClick={() => handleRestaurantClick(restaurant.id)}
                >
                  <CardContent className="p-0 relative">
                    {restaurant.discount && (
                      <Badge className="absolute top-3 left-3 bg-red-500 z-10">
                        {restaurant.discount}
                      </Badge>
                    )}
                    {restaurant.isPopular && (
                      <Badge className="absolute top-3 right-3 bg-yellow-500 z-10">
                        Popular
                      </Badge>
                    )}
                    <div className="relative overflow-hidden">
                      <img
                        src={restaurant.image}
                        alt={restaurant.name}
                        className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                        <h3 className="text-white font-semibold text-lg mb-1">{restaurant.name}</h3>
                        <div className="flex items-center justify-between text-white">
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-400">★</span>
                            <span>{restaurant.rating}</span>
                            <span>•</span>
                            <span>{restaurant.prepTime}</span>
                          </div>

                        </div>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {restaurant.tags?.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-white border-white text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </SheetTrigger>

            <SheetContent side="right" className="w-full sm:max-w-md md:max-w-xl overflow-y-auto">
              <SheetHeader className="text-left">
                <div className="relative h-40 w-full overflow-hidden rounded-lg mb-4">
                  <img
                    src={restaurant.coverImage || restaurant.image}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <SheetTitle className="text-white text-2xl font-bold mb-2">{restaurant.name}</SheetTitle>
                    <div className="flex items-center gap-4 text-white text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span>{restaurant.rating} ({restaurant.totalRatings})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{restaurant.prepTime}</span>
                      </div>

                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-2 mb-6">
                <p className="text-muted-foreground text-sm">{restaurant.description}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {Array.isArray(restaurant.cuisine) ? (
                    restaurant.cuisine.map((type, index) => (
                      <Badge key={index} variant="outline">{type}</Badge>
                    ))
                  ) : (
                    <Badge variant="outline">{restaurant.cuisine}</Badge>
                  )}
                </div>
              </div>

              <Separator className="my-4" />

              {isLoadingMenu ? (
                <div className="flex items-center justify-center min-h-[200px]">
                  <div className="text-lg">Loading menu...</div>
                </div>
              ) : (
                <div ref={menuRef} className="space-y-6 pb-20">
                  <h3 className="text-xl font-semibold sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">Menu</h3>

                  {/* Group menu items by category */}
                  {Array.from(new Set(menuItems?.map(item => item.category))).map(category => (
                    <div key={category} className="space-y-4">
                      <h4 className="font-medium text-lg">{category}</h4>
                      <div className="space-y-4">
                        {menuItems?.filter(item => item.category === category).map((item, index) => (
                          <motion.div
                            key={item.id}
                            className="flex gap-3 p-3 border rounded-lg hover:shadow-md transition-all group"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.3 }}
                          >
                            <div className="relative min-w-[80px] h-[80px] rounded-md overflow-hidden">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                              <div className="absolute top-1 left-1">
                                <VegNonVegIndicator isVeg={item.isVeg} size="sm" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-semibold group-hover:text-primary transition-colors">{item.name}</h4>
                                  <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                                  <div className="mt-1 flex items-center gap-2">
                                    <span className="font-medium">₹{item.price}</span>
                                    {item.isPopular && (
                                      <Badge variant="secondary" className="text-xs">Popular</Badge>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  className="rounded-full h-8 w-8 p-0 bg-primary hover:bg-primary/90 text-primary-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToCart(item, restaurant.id, restaurant.name);
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>

                                {/* Add to Cart Dialog */}
                                <Dialog open={isAddToCartOpen} onOpenChange={setIsAddToCartOpen}>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Add to Cart</DialogTitle>
                                    </DialogHeader>

                                    {selectedMenuItem && (
                                      <div className="space-y-4">
                                        <div className="flex gap-4 items-start">
                                          <div className="relative w-24 h-24 rounded-lg overflow-hidden">
                                            <img
                                              src={selectedMenuItem.image}
                                              alt={selectedMenuItem.name}
                                              className="w-full h-full object-cover"
                                            />
                                            <div className="absolute top-1 left-1">
                                              <VegNonVegIndicator isVeg={selectedMenuItem.isVeg} size="sm" />
                                            </div>
                                          </div>

                                          <div className="flex-1">
                                            <h3 className="font-medium">{selectedMenuItem.name}</h3>
                                            <p className="text-sm text-muted-foreground line-clamp-2">{selectedMenuItem.description}</p>
                                            <p className="font-medium mt-1">₹{selectedMenuItem.price}</p>
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
                                          {selectedMenuItem?.allergens && (
                                            <div className="text-sm text-muted-foreground">
                                              <span className="font-medium">Contains:</span> {selectedMenuItem.allergens.join(', ')}
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0"
                                              onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                              disabled={quantity <= 1}
                                            >
                                              <Minus className="h-4 w-4" />
                                            </Button>
                                            <span className="text-sm font-medium w-6 text-center">{quantity}</span>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0"
                                              onClick={() => setQuantity(quantity + 1)}
                                            >
                                              <Plus className="h-4 w-4" />
                                            </Button>
                                          </div>

                                          <Button
                                            className="flex-1 ripple-effect"
                                            onClick={handleConfirmAddToCart}
                                          >
                                            <Utensils className="h-4 w-4 mr-2" />
                                            Add to Cart • ₹{selectedMenuItem.price * quantity}
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SheetContent>
          </Sheet>
        ))}
      </div>

      {restaurants?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">
            No restaurants found.
          </p>
        </div>
      )}
    </div>
  );
}