import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Leaf } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import type { MenuItem } from '@/lib/firebase';

interface DishCardProps {
  dish: MenuItem & { restaurantName?: string; restaurantId?: string };
}

export const DishCard = ({ dish }: DishCardProps) => {
  const navigate = useNavigate();
  const { addItem, updateQuantity, items } = useCart();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const cartItem = items.find(item => item.id === dish.id);
  const quantity = cartItem?.quantity || 0;

  const handleAddToCart = async () => {
    if (!dish.restaurantId) {
      toast({
        title: 'Error',
        description: 'Restaurant information not available',
        variant: 'destructive',
      });
      return;
    }

    setIsAdding(true);
    try {
      await addItem(
        dish,
        dish.restaurantId,
        dish.restaurantName || 'Unknown Restaurant'
      );
      toast({
        title: 'Added to cart',
        description: `${dish.name} has been added to your cart`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add item to cart',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleIncrement = () => {
    if (cartItem) {
      updateQuantity(dish.id, quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (cartItem && quantity > 0) {
      updateQuantity(dish.id, quantity - 1);
    }
  };

  const handleCardClick = () => {
    if (dish.restaurantId) {
      navigate(`/restaurant/${dish.restaurantId}`);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group bg-navy-900 border-white/5 rounded-none">
      <div onClick={handleCardClick}>
        {/* Image */}
        <div className="relative h-56 bg-navy-950 overflow-hidden">
          {dish.image ? (
            <img
              src={dish.image}
              alt={dish.name}
              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 bg-navy-950">
              No image
            </div>
          )}

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-transparent to-transparent opacity-80" />

          {dish.isVeg && (
            <Badge className="absolute top-3 left-3 bg-green-600 hover:bg-green-700 text-white border-none rounded-none font-bold uppercase tracking-wider text-[10px] px-2 py-1 shadow-lg">
              <Leaf className="h-3 w-3 mr-1" />
              Veg
            </Badge>
          )}
        </div>

        <CardContent className="p-5 relative">
          {/* Dish Name */}
          <h3 className="font-heading font-bold text-xl mb-1 line-clamp-1 text-white group-hover:text-peach-400 transition-colors">{dish.name}</h3>

          {/* Restaurant Name */}
          {dish.restaurantName && (
            <p className="text-sm text-gray-400 mb-3 font-medium">{dish.restaurantName}</p>
          )}

          {/* Description */}
          {dish.description && (
            <p className="text-sm text-gray-400 mb-4 line-clamp-2 h-10">
              {dish.description}
            </p>
          )}

          {/* Price and Add Button */}
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
            <span className="text-xl font-extrabold text-peach-400">₹{dish.price}</span>

            {quantity > 0 ? (
              <div className="flex items-center gap-3 bg-navy-950/50 p-1 rounded-none border border-white/10" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDecrement}
                  className="h-8 w-8 p-0 text-gray-300 hover:text-peach-400 hover:bg-white/5 rounded-none"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="font-bold w-6 text-center text-white">{quantity}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleIncrement}
                  className="h-8 w-8 p-0 text-gray-300 hover:text-peach-400 hover:bg-white/5 rounded-none"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCart();
                }}
                disabled={isAdding || !dish.available}
                className="bg-peach-500 hover:bg-peach-600 text-navy-950 font-bold rounded-none px-6 shadow-lg shadow-peach-500/20 transition-all hover:scale-105"
              >
                {isAdding ? 'Adding...' : dish.available ? 'Add' : 'Unavailable'}
              </Button>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
};