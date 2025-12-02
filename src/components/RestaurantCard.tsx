import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Restaurant } from '@/lib/firebase';
import { DemandBadge } from '@/components/demand/DemandBadge';
import {
  calculateDemandScore,
  getDemandLevel,
  calculateDynamicWaitTime
} from '@/utils/demandCalculations';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export const RestaurantCard = ({ restaurant }: RestaurantCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/restaurant/${restaurant.id}`);
  };

  // Calculate demand metrics
  const activeOrders = restaurant.activeOrders || 0;
  const maxCapacity = restaurant.maxCapacity || 10;
  const orderVelocity = restaurant.orderVelocity || 1;

  // Parse prepTime (e.g., "30-40" -> 35)
  const prepTimeStr = restaurant.prepTime || '15';
  const baseWaitTime = parseInt(prepTimeStr.split('-')[0]) || 15;

  const demandScore = calculateDemandScore(activeOrders, maxCapacity, orderVelocity);
  const demandLevel = getDemandLevel(demandScore);
  const waitTime = calculateDynamicWaitTime(baseWaitTime, demandScore);

  return (
    <motion.div
      whileHover={{ y: -8, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <Card
        className="cursor-pointer overflow-hidden group rounded-xl hover:shadow-lg transition-shadow"
        onClick={handleClick}
      >
        <CardContent className="p-0 relative">
          {/* Badges */}
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

          {/* Image */}
          <div className="relative overflow-hidden">
            <img
              src={restaurant.image || '/placeholder-restaurant.jpg'}
              alt={restaurant.name}
              className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <h3 className="text-white font-semibold text-lg mb-1">{restaurant.name}</h3>

              {/* Info Row - Only Star Rating */}
              <div className="flex items-center gap-2 text-white text-sm mb-2">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span>{restaurant.rating?.toFixed(1) || '4.0'}</span>
                </div>
              </div>

              {/* Demand Badge */}
              <div className="mb-2">
                <DemandBadge
                  level={demandLevel}
                  waitTime={waitTime}
                  size="sm"
                  className="bg-black/40 backdrop-blur-sm"
                />
              </div>

              {/* Cuisine Tags */}
              <div className="flex gap-2 flex-wrap">
                {Array.isArray(restaurant.cuisine) ? (
                  restaurant.cuisine.slice(0, 3).map((type, index) => (
                    <Badge key={index} variant="outline" className="text-white border-white text-xs">
                      {type}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="text-white border-white text-xs">
                    {restaurant.cuisine}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};