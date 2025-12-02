import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  Clock,
  MapPin,
  Plus,
  Minus,
  Heart,
  Share2,
  ChefHat,
  Award,
  Info,
  AlertCircle,
  Utensils
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { VegNonVegIndicator, VegNonVegToggle } from '@/components/common/VegNonVegToggle';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useCart } from '@/context/cart-context';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  fetchRestaurantMenu,
  MenuItem,
  MenuItemCustomization,
  fetchRestaurant
} from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface SelectedCustomization {
  customizationId: string;
  selectedOptions: {
    id: string;
    name: string;
    price: number;
    isVeg: boolean;
  }[];
}

export default function Restaurant() {
  const { id } = useParams();
  const { addItem, canAddToCart } = useCart();
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedCustomizations, setSelectedCustomizations] = useState<SelectedCustomization[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [showNutritionInfo, setShowNutritionInfo] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Fetch restaurant data
  const { data: restaurantData } = useQuery({
    queryKey: ['restaurant', id],
    queryFn: () => fetchRestaurant(id!),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true
  });

  // Fetch restaurant menu
  const { data: menuItems, isLoading } = useQuery({
    queryKey: ['restaurantMenu', id],
    queryFn: () => fetchRestaurantMenu(id!),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true
  }
  );

  const categories = menuItems
    ? ['All', ...Array.from(new Set(menuItems.map(item => item.category)))]
    : ['All'];

  const filteredItems = menuItems?.filter(item => {
    const categoryMatch = selectedCategory === 'All' || item.category === selectedCategory;
    const vegMatch = !isVegOnly || item.isVeg;
    return categoryMatch && vegMatch;
  }) || [];

  const handleCustomizationChange = (customizationId: string, optionId: string, isRadio: boolean) => {
    setSelectedCustomizations(prev => {
      const customization = selectedItem?.customizations?.find(c => c.id === customizationId);
      if (!customization) return prev;

      const option = customization.options.find(o => o.id === optionId);
      if (!option) return prev;

      const existingCustomization = prev.find(c => c.customizationId === customizationId);

      if (isRadio) {
        // For radio buttons, replace the existing option
        if (existingCustomization) {
          return prev.map(c =>
            c.customizationId === customizationId
              ? { ...c, selectedOptions: [option] }
              : c
          );
        }
        return [...prev, { customizationId, selectedOptions: [option] }];
      } else {
        // For checkboxes, toggle the option
        if (existingCustomization) {
          const hasOption = existingCustomization.selectedOptions.some(o => o.id === optionId);
          const maxSelections = customization.maxSelections || Infinity;

          if (hasOption) {
            // Remove the option
            const updatedOptions = existingCustomization.selectedOptions.filter(o => o.id !== optionId);
            return prev.map(c =>
              c.customizationId === customizationId
                ? { ...c, selectedOptions: updatedOptions }
                : c
            );
          } else if (existingCustomization.selectedOptions.length < maxSelections) {
            // Add the option if under max selections
            return prev.map(c =>
              c.customizationId === customizationId
                ? { ...c, selectedOptions: [...c.selectedOptions, option] }
                : c
            );
          }
          return prev;
        }
        return [...prev, { customizationId, selectedOptions: [option] }];
      }
    });
  };

  const handleAddToCart = () => {
    if (!selectedItem || !id) return;

    const cartCheck = canAddToCart(id);
    if (!cartCheck.allowed) {
      toast({
        title: 'Cannot add item',
        description: cartCheck.message,
        variant: 'destructive'
      });
      return;
    }

    // Validate required customizations
    const missingRequired = selectedItem.customizations?.filter(customization => {
      if (!customization.required) return false;
      const selected = selectedCustomizations.find(c => c.customizationId === customization.id);
      return !selected || selected.selectedOptions.length === 0;
    });

    if (missingRequired && missingRequired.length > 0) {
      toast({
        title: 'Missing required selections',
        description: `Please select options for: ${missingRequired.map(c => c.name).join(', ')}`,
        variant: 'destructive'
      });
      return;
    }

    try {
      for (let i = 0; i < quantity; i++) {
        addItem(selectedItem, id, restaurantData?.name || 'Restaurant Name', selectedCustomizations, specialInstructions);
      }

      toast({
        title: 'Item added to cart',
        description: `${quantity}x ${selectedItem.name} added to your cart`,
      });

      // Reset state
      setSelectedItem(null);
      setSelectedCustomizations([]);
      setSpecialInstructions('');
      setQuantity(1);
    } catch (error) {
      toast({
        title: 'Error adding item',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading restaurant menu..." type="cooking" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Header with Cover Image */}
      <motion.div
        className="relative h-64 overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <img
          src={restaurantData?.image || '/placeholder-restaurant.jpg'}
          alt={restaurantData?.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/20" />

        {/* Back Button */}
        <motion.div
          className="absolute top-4 left-4 z-10"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button variant="secondary" size="sm" className="bg-white/20 backdrop-blur-sm" asChild>
            <Link to="/restaurants">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="absolute top-4 right-4 z-10 flex gap-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button variant="secondary" size="sm" className="bg-white/20 backdrop-blur-sm">
            <Heart className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" className="bg-white/20 backdrop-blur-sm">
            <Share2 className="h-4 w-4" />
          </Button>
        </motion.div>
      </motion.div>

      {/* Controls */}
      <motion.div
        className="sticky top-16 bg-background/80 backdrop-blur-sm border-b z-40 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <VegNonVegToggle
              isVeg={isVegOnly}
              onToggle={setIsVegOnly}
              className="animate-float"
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ChefHat className="h-4 w-4" />
              <span>Fresh & Made to Order</span>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category, index) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Button
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="whitespace-nowrap ripple-effect"
                >
                  {category}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Menu Items */}
      <div className="container mx-auto px-4 py-8">
        <motion.div
          className="space-y-6"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
        >
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              transition={{ duration: 0.5 }}
            >
              <Card
                className="group hover:shadow-lg transition-shadow duration-300 border-0 shadow-food"
                onClick={() => setSelectedItem(item)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-2 mb-2">
                        <VegNonVegIndicator isVeg={item.isVeg} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{item.name}</h3>
                            {item.isPopular && (
                              <Badge variant="destructive" className="text-xs animate-pulse">
                                <Award className="h-3 w-3 mr-1" />
                                Popular
                              </Badge>
                            )}
                            {item.isRecommended && (
                              <Badge variant="secondary" className="text-xs">
                                <ChefHat className="h-3 w-3 mr-1" />
                                Chef's Special
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mb-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span>{item.rating}</span>
                            </div>
                            {item.preparationTime && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{item.preparationTime}</span>
                              </div>
                            )}
                            {item.spiceLevel && (
                              <div className="flex items-center gap-1">
                                <span className="text-red-500">🌶️</span>
                                <span>Spice Level {item.spiceLevel}</span>
                              </div>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground mb-3">{item.description}</p>

                          <div className="flex items-center justify-between">
                            <span className="text-xl font-bold text-primary">₹{item.price}</span>

                            <Button
                              variant="default"
                              size="sm"
                              className="ripple-effect"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem(item);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="relative w-24 h-24 rounded-lg overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Customization Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => {
        setSelectedItem(null);
        setSelectedCustomizations([]);
        setSpecialInstructions('');
        setQuantity(1);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <VegNonVegIndicator isVeg={selectedItem?.isVeg || false} />
              {selectedItem?.name}
            </DialogTitle>
            <DialogDescription>{selectedItem?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Customizations */}
            {selectedItem?.customizations?.map((customization) => (
              <div key={customization.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    {customization.name}
                    {customization.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  {customization.maxSelections && (
                    <span className="text-sm text-muted-foreground">
                      Max {customization.maxSelections}
                    </span>
                  )}
                </div>

                {customization.required ? (
                  <RadioGroup
                    onValueChange={(value) =>
                      handleCustomizationChange(customization.id, value, true)
                    }
                    value={selectedCustomizations
                      .find(c => c.customizationId === customization.id)
                      ?.selectedOptions[0]?.id
                    }
                  >
                    {customization.options.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id} className="flex items-center gap-2">
                          {option.isVeg && <VegNonVegIndicator isVeg={true} />}
                          {option.name}
                          {option.price > 0 && (
                            <span className="text-sm text-muted-foreground">
                              +₹{option.price}
                            </span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-2">
                    {customization.options.map((option) => {
                      const isSelected = selectedCustomizations
                        .find(c => c.customizationId === customization.id)
                        ?.selectedOptions
                        .some(o => o.id === option.id);

                      return (
                        <div key={option.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={option.id}
                            checked={isSelected}
                            onCheckedChange={() =>
                              handleCustomizationChange(customization.id, option.id, false)
                            }
                          />
                          <Label htmlFor={option.id} className="flex items-center gap-2">
                            {option.isVeg && <VegNonVegIndicator isVeg={true} />}
                            {option.name}
                            {option.price > 0 && (
                              <span className="text-sm text-muted-foreground">
                                +₹{option.price}
                              </span>
                            )}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            <Separator />

            {/* Special Instructions */}
            <div className="space-y-2">
              <Label className="text-base">Special Instructions</Label>
              <Textarea
                placeholder="Any special requests?"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
              />
            </div>

            {/* Nutrition Info */}
            {selectedItem?.nutritionInfo && (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowNutritionInfo(!showNutritionInfo)}
                >
                  <Info className="h-4 w-4 mr-2" />
                  Nutrition Information
                </Button>
                <AnimatePresence>
                  {showNutritionInfo && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-muted rounded-lg">
                        <div>
                          <span className="text-muted-foreground">Calories:</span>
                          <span className="font-medium ml-2">
                            {selectedItem.nutritionInfo.calories} kcal
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Protein:</span>
                          <span className="font-medium ml-2">
                            {selectedItem.nutritionInfo.protein}g
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Carbs:</span>
                          <span className="font-medium ml-2">
                            {selectedItem.nutritionInfo.carbs}g
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fat:</span>
                          <span className="font-medium ml-2">
                            {selectedItem.nutritionInfo.fat}g
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Allergen Info */}
            {selectedItem?.allergens && selectedItem.allergens.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span>Contains: {selectedItem.allergens.join(', ')}</span>
              </div>
            )}

            {/* Quantity and Add to Cart */}
            <div className="flex items-center justify-between gap-4">
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
                onClick={handleAddToCart}
              >
                <Utensils className="h-4 w-4 mr-2" />
                Add to Cart • ₹{selectedItem ? (selectedItem.price * quantity) : 0}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}