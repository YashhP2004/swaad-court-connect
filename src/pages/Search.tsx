import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { searchRestaurants, searchMenuItems } from '@/lib/firebase';
import { RestaurantCard } from '@/components/RestaurantCard';
import { DishCard } from '@/components/search/DishCard';
import { SearchFilters } from '@/components/search/SearchFilters';
import { FavoritesPanel } from '@/components/search/FavoritesPanel';

export interface SearchFilters {
  cuisine: string[];
  minRating: number;
  maxDeliveryTime: number;
  vegOnly: boolean;
  priceRange: [number, number];
}

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'restaurants' | 'dishes'>('restaurants');
  const [filters, setFilters] = useState<SearchFilters>({
    cuisine: [],
    minRating: 0,
    maxDeliveryTime: 60,
    vegOnly: false,
    priceRange: [0, 1000],
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      if (searchQuery) {
        setSearchParams({ q: searchQuery });
      } else {
        setSearchParams({});
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, setSearchParams]);

  // Search restaurants
  const { data: restaurants = [], isLoading: isLoadingRestaurants } = useQuery({
    queryKey: ['searchRestaurants', debouncedQuery, filters],
    queryFn: () => searchRestaurants(debouncedQuery, filters),
    enabled: activeTab === 'restaurants',
  });

  // Search dishes
  const { data: dishes = [], isLoading: isLoadingDishes } = useQuery({
    queryKey: ['searchDishes', debouncedQuery, filters],
    queryFn: () => searchMenuItems(debouncedQuery, filters),
    enabled: activeTab === 'dishes',
  });

  const isLoading = activeTab === 'restaurants' ? isLoadingRestaurants : isLoadingDishes;
  const hasResults = activeTab === 'restaurants' ? restaurants.length > 0 : dishes.length > 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Section with Gradient Background */}
      <div className="relative bg-navy-950 pt-8 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900/50 to-transparent z-0" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-peach-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="container mx-auto px-4 relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-white tracking-tight">
            Find your <span className="text-transparent bg-clip-text bg-gradient-to-r from-peach-400 to-peach-600">craving</span>
          </h1>

          {/* Search Input */}
          <div className="relative max-w-2xl">
            <div className="absolute inset-0 bg-peach-500/20 blur-xl rounded-full opacity-50" />
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-peach-200 h-6 w-6" />
              <Input
                type="text"
                placeholder="Search for restaurants, cuisines, or dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg bg-white/10 backdrop-blur-xl border-white/20 text-white placeholder-gray-300 focus:ring-2 focus:ring-peach-500/50 focus:border-peach-500 rounded-none shadow-xl transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-8 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <SearchFilters filters={filters} onFiltersChange={setFilters} />
            <div className="mt-6">
              <FavoritesPanel />
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'restaurants' | 'dishes')}>
              <TabsList className="w-full grid grid-cols-2 mb-8 bg-navy-900/50 backdrop-blur-md border border-white/10 p-1 h-auto rounded-none">
                <TabsTrigger
                  value="restaurants"
                  className="py-3 text-base font-bold data-[state=active]:bg-peach-500 data-[state=active]:text-navy-950 data-[state=active]:shadow-lg transition-all rounded-none"
                >
                  Restaurants {restaurants.length > 0 && `(${restaurants.length})`}
                </TabsTrigger>
                <TabsTrigger
                  value="dishes"
                  className="py-3 text-base font-bold data-[state=active]:bg-peach-500 data-[state=active]:text-navy-950 data-[state=active]:shadow-lg transition-all rounded-none"
                >
                  Dishes {dishes.length > 0 && `(${dishes.length})`}
                </TabsTrigger>
              </TabsList>

              {/* Restaurants Tab */}
              <TabsContent value="restaurants" className="mt-0">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-12 w-12 animate-spin text-peach-500 mb-4" />
                    <p className="text-gray-400 animate-pulse">Searching for delicious spots...</p>
                  </div>
                ) : hasResults ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {restaurants.map((restaurant) => (
                      <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                    ))}
                  </div>
                ) : debouncedQuery ? (
                  <div className="text-center py-20 bg-navy-900/30 border border-white/5 rounded-none">
                    <SearchIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No restaurants found</h3>
                    <p className="text-gray-400">
                      We couldn't find any restaurants matching "{debouncedQuery}"
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-20 bg-navy-900/30 border border-white/5 rounded-none">
                    <SearchIcon className="h-16 w-16 text-peach-500/50 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Start your food journey</h3>
                    <p className="text-gray-400">
                      Search for your favorite restaurants or cuisines
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Dishes Tab */}
              <TabsContent value="dishes" className="mt-0">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-12 w-12 animate-spin text-peach-500 mb-4" />
                    <p className="text-gray-400 animate-pulse">Finding tasty dishes...</p>
                  </div>
                ) : hasResults ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dishes.map((dish) => (
                      <DishCard key={dish.id} dish={dish} />
                    ))}
                  </div>
                ) : debouncedQuery ? (
                  <div className="text-center py-20 bg-navy-900/30 border border-white/5 rounded-none">
                    <SearchIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No dishes found</h3>
                    <p className="text-gray-400">
                      We couldn't find any dishes matching "{debouncedQuery}"
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-20 bg-navy-900/30 border border-white/5 rounded-none">
                    <SearchIcon className="h-16 w-16 text-peach-500/50 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Hungry for something specific?</h3>
                    <p className="text-gray-400">
                      Enter a dish name to find exactly what you're craving
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search;