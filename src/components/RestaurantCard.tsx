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
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card
        className="cursor-pointer overflow-hidden group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-navy-900 relative rounded-none"
        onClick={handleClick}
      >
        <CardContent className="p-0 relative h-full">
          {/* Badges Container */}
          <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-start pointer-events-none p-3">
            {restaurant.discount ? (
              <Badge className="bg-red-600 text-white border-0 shadow-lg animate-in fade-in zoom-in duration-300 rounded-none font-bold uppercase tracking-wider">
                {restaurant.discount}
              </Badge>
            ) : <div />}

            {restaurant.isPopular && (
              <Badge className="bg-peach-500 text-navy-950 font-bold border-0 shadow-lg shadow-peach-500/20 animate-pulse-slow rounded-none uppercase tracking-wider">
                Popular
              </Badge>
            )}
          </div>

          {/* Image Container */}
          <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/40 to-transparent z-10" />
            <img
              src={restaurant.image || '/placeholder-restaurant.jpg'}
              alt={restaurant.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.fallback-bg')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'fallback-bg absolute inset-0 bg-gradient-to-br from-peach-500/20 to-navy-800 flex items-center justify-center';
                  fallback.innerHTML = `<div class="text-6xl font-bold text-white/30">${restaurant.name.charAt(0)}</div>`;
                  parent.insertBefore(fallback, parent.firstChild);
                }
              }}
            />

            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5 z-20 transform transition-transform duration-300">
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-white font-heading font-bold text-2xl tracking-tight text-shadow-sm group-hover:text-peach-400 transition-colors duration-300">
                  {restaurant.name}
                </h3>
                <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 border border-white/10">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-white font-bold text-sm">{restaurant.rating?.toFixed(1) || '4.0'}</span>
                </div>
              </div>

              {/* Demand & Wait Time */}
              <div className="mb-4 flex items-center gap-3">
                <DemandBadge
                  level={demandLevel}
                  waitTime={waitTime}
                  size="sm"
                  className="bg-white/10 backdrop-blur-md border-white/10 shadow-sm rounded-none"
                />
              </div>

              {/* Cuisine Tags */}
              <div className="flex gap-2 flex-wrap">
                {Array.isArray(restaurant.cuisine) ? (
                  restaurant.cuisine.slice(0, 3).map((type, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-white/5 backdrop-blur-sm border-white/20 text-gray-200 text-xs hover:bg-white/10 transition-colors rounded-none"
                    >
                      {type}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="bg-white/5 backdrop-blur-sm border-white/20 text-gray-200 text-xs rounded-none">
                    {restaurant.cuisine}
                  </Badge>
                )}
                {Array.isArray(restaurant.cuisine) && restaurant.cuisine.length > 3 && (
                  <Badge variant="outline" className="bg-white/5 backdrop-blur-sm border-white/20 text-gray-200 text-xs rounded-none">
                    +{restaurant.cuisine.length - 3}
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
