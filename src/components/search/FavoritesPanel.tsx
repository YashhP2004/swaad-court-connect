import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Star, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTopRatedRestaurants, getTrendingRestaurants } from '@/lib/firebase';

export const FavoritesPanel = () => {
  const navigate = useNavigate();

  const { data: topRated = [], isLoading: isLoadingTopRated } = useQuery({
    queryKey: ['topRatedRestaurants'],
    queryFn: () => getTopRatedRestaurants(5),
  });

  const { data: trending = [], isLoading: isLoadingTrending } = useQuery({
    queryKey: ['trendingRestaurants'],
    queryFn: () => getTrendingRestaurants(5),
  });

  return (
    <div className="space-y-6">
      {/* Top Rated */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Top Rated
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTopRated ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : topRated.length > 0 ? (
            <div className="space-y-3">
              {topRated.map((restaurant) => (
                <div
                  key={restaurant.id}
                  onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                  className="flex items-start gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                >
                  <img
                    src={restaurant.image || '/placeholder-restaurant.jpg'}
                    alt={restaurant.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-1">
                      {restaurant.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        {restaurant.rating.toFixed(1)}
                      </span>
                      <span>•</span>
                      <span>{restaurant.prepTime} min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No restaurants found
            </p>
          )}
        </CardContent>
      </Card>

      {/* Trending */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Trending Now
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTrending ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : trending.length > 0 ? (
            <div className="space-y-3">
              {trending.map((restaurant) => (
                <div
                  key={restaurant.id}
                  onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                  className="flex items-start gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                >
                  <img
                    src={restaurant.image || '/placeholder-restaurant.jpg'}
                    alt={restaurant.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-1">
                      {restaurant.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        {restaurant.rating.toFixed(1)}
                      </span>
                      <span>•</span>
                      <span>{restaurant.cuisine}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No trending restaurants
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};