import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { SearchFilters as SearchFiltersType } from '@/pages/Search';

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
}

const CUISINES = [
  'North Indian',
  'South Indian',
  'Chinese',
  'Italian',
  'Mexican',
  'Continental',
  'Fast Food',
  'Desserts',
  'Beverages',
];

export const SearchFilters = ({ filters, onFiltersChange }: SearchFiltersProps) => {
  const handleCuisineToggle = (cuisine: string) => {
    const newCuisines = filters.cuisine.includes(cuisine)
      ? filters.cuisine.filter((c) => c !== cuisine)
      : [...filters.cuisine, cuisine];
    onFiltersChange({ ...filters, cuisine: newCuisines });
  };

  const handleRatingChange = (value: number[]) => {
    onFiltersChange({ ...filters, minRating: value[0] });
  };

  const handleDeliveryTimeChange = (value: number[]) => {
    onFiltersChange({ ...filters, maxDeliveryTime: value[0] });
  };

  const handleVegOnlyToggle = (checked: boolean) => {
    onFiltersChange({ ...filters, vegOnly: checked });
  };

  const handlePriceRangeChange = (value: number[]) => {
    onFiltersChange({ ...filters, priceRange: [value[0], value[1]] });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      cuisine: [],
      minRating: 0,
      maxDeliveryTime: 60,
      vegOnly: false,
      priceRange: [0, 1000],
    });
  };

  const hasActiveFilters =
    filters.cuisine.length > 0 ||
    filters.minRating > 0 ||
    filters.maxDeliveryTime < 60 ||
    filters.vegOnly ||
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < 1000;

  return (
    <Card className="bg-navy-900/50 backdrop-blur-md border-white/10 rounded-none shadow-xl">
      <CardHeader className="pb-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-white">Filters</CardTitle>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-peach-400 hover:text-peach-300 hover:underline transition-colors font-medium"
            >
              Clear all
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-8 pt-6">
        {/* Cuisine Filter */}
        <div>
          <Label className="text-base font-bold mb-4 block text-white">Cuisine</Label>
          <div className="space-y-3">
            {CUISINES.map((cuisine) => (
              <div key={cuisine} className="flex items-center space-x-3 group">
                <Checkbox
                  id={cuisine}
                  checked={filters.cuisine.includes(cuisine)}
                  onCheckedChange={() => handleCuisineToggle(cuisine)}
                  className="border-white/20 data-[state=checked]:bg-peach-500 data-[state=checked]:border-peach-500 data-[state=checked]:text-navy-950 rounded-sm h-5 w-5"
                />
                <label
                  htmlFor={cuisine}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-gray-300 group-hover:text-peach-400 transition-colors"
                >
                  {cuisine}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Veg Only Filter */}
        <div>
          <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-none border border-white/5 hover:border-peach-500/30 transition-colors">
            <Checkbox
              id="vegOnly"
              checked={filters.vegOnly}
              onCheckedChange={handleVegOnlyToggle}
              className="border-white/20 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 data-[state=checked]:text-white rounded-sm h-5 w-5"
            />
            <label
              htmlFor="vegOnly"
              className="text-base font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-white"
            >
              Vegetarian Only
            </label>
          </div>
        </div>

        {/* Rating Filter */}
        <div>
          <Label className="text-base font-bold mb-4 block text-white flex justify-between">
            <span>Minimum Rating</span>
            <span className="text-peach-400">{filters.minRating.toFixed(1)}⭐</span>
          </Label>
          <Slider
            value={[filters.minRating]}
            onValueChange={handleRatingChange}
            min={0}
            max={5}
            step={0.5}
            className="w-full [&>.relative>.absolute]:bg-peach-500 [&>.relative]:bg-white/10 [&>span]:border-peach-500 [&>span]:bg-navy-950 [&>span]:ring-offset-navy-950"
          />
        </div>

        {/* Delivery Time Filter */}
        <div>
          <Label className="text-base font-bold mb-4 block text-white flex justify-between">
            <span>Max Delivery Time</span>
            <span className="text-peach-400">{filters.maxDeliveryTime} min</span>
          </Label>
          <Slider
            value={[filters.maxDeliveryTime]}
            onValueChange={handleDeliveryTimeChange}
            min={15}
            max={60}
            step={5}
            className="w-full [&>.relative>.absolute]:bg-peach-500 [&>.relative]:bg-white/10 [&>span]:border-peach-500 [&>span]:bg-navy-950 [&>span]:ring-offset-navy-950"
          />
        </div>

        {/* Price Range Filter */}
        <div>
          <Label className="text-base font-bold mb-4 block text-white flex justify-between">
            <span>Price Range</span>
            <span className="text-peach-400">₹{filters.priceRange[0]} - ₹{filters.priceRange[1]}</span>
          </Label>
          <Slider
            value={filters.priceRange}
            onValueChange={handlePriceRangeChange}
            min={0}
            max={1000}
            step={50}
            className="w-full [&>.relative>.absolute]:bg-peach-500 [&>.relative]:bg-white/10 [&>span]:border-peach-500 [&>span]:bg-navy-950 [&>span]:ring-offset-navy-950"
          />
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="pt-4 border-t border-white/10">
            <Label className="text-sm font-bold mb-3 block text-gray-400 uppercase tracking-wider">Active Filters</Label>
            <div className="flex flex-wrap gap-2">
              {filters.cuisine.map((cuisine) => (
                <Badge key={cuisine} variant="secondary" className="gap-1 bg-peach-500/10 text-peach-400 border-peach-500/20 hover:bg-peach-500/20 rounded-none">
                  {cuisine}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleCuisineToggle(cuisine)}
                  />
                </Badge>
              ))}
              {filters.vegOnly && (
                <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20 rounded-none">
                  Veg Only
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleVegOnlyToggle(false)}
                  />
                </Badge>
              )}
              {filters.minRating > 0 && (
                <Badge variant="secondary" className="gap-1 bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20 rounded-none">
                  {filters.minRating}⭐+
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleRatingChange([0])}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};