import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Clock,
  Package,
  Save,
  X,
  ChefHat,
  Leaf,
  Grid3x3,
  List,
  Filter,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import {
  getVendorMenuItems,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getMenuCategories,
  addMenuCategory
} from '@/lib/firebase';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  isVeg: boolean;
  isAvailable: boolean;
  preparationTime: number;
  rating?: number;
  totalOrders?: number;
}

interface Category {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  itemCount?: number;
}

export default function MenuManagement() {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);

  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    price: 0,
    category: '',
    image: '',
    isVeg: true,
    isAvailable: true,
    preparationTime: 15
  });

  const [newCategory, setNewCategory] = useState<Partial<Category>>({
    name: '',
    description: '',
    isActive: true,
    sortOrder: 0
  });

  useEffect(() => {
    if (user?.uid) {
      loadMenuData();
    }
  }, [user]);

  const loadMenuData = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      const [menuItemsData, categoriesData] = await Promise.all([
        getVendorMenuItems(user.uid),
        getMenuCategories(user.uid)
      ]);

      setMenuItems(menuItemsData);
      setCategories(categoriesData.map((cat: any) => ({
        id: cat.id,
        name: cat.name || 'Unnamed Category',
        description: cat.description || '',
        isActive: cat.isActive !== undefined ? cat.isActive : true,
        sortOrder: cat.sortOrder || 0,
        itemCount: menuItemsData.filter((item: any) => item.category === cat.name).length
      })));
    } catch (error) {
      console.error('Error loading menu data:', error);
      toast.error('Failed to load menu data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.price || !newItem.category || !user?.uid) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const itemId = await addMenuItem(user.uid, newItem);
      await loadMenuData();

      setNewItem({
        name: '',
        description: '',
        price: 0,
        category: '',
        image: '',
        isVeg: true,
        isAvailable: true,
        preparationTime: 15
      });
      setIsAddItemOpen(false);
      toast.success('Menu item added successfully');
    } catch (error) {
      console.error('Error adding menu item:', error);
      toast.error('Failed to add menu item');
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !user?.uid) return;

    try {
      await updateMenuItem(user.uid, editingItem.id, editingItem);
      await loadMenuData();
      setEditingItem(null);
      toast.success('Menu item updated successfully');
    } catch (error) {
      console.error('Error updating menu item:', error);
      toast.error('Failed to update menu item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!user?.uid) return;

    try {
      await deleteMenuItem(user.uid, itemId);
      await loadMenuData();
      toast.success('Menu item deleted successfully');
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast.error('Failed to delete menu item');
    }
  };

  const toggleItemAvailability = async (itemId: string) => {
    if (!user?.uid) return;

    try {
      const item = menuItems.find(item => item.id === itemId);
      if (!item) return;

      await updateMenuItem(user.uid, itemId, { isAvailable: !item.isAvailable });
      await loadMenuData();
      toast.success('Item availability updated');
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name || !user?.uid) {
      toast.error('Please enter category name');
      return;
    }

    try {
      await addMenuCategory(user.uid, newCategory);
      await loadMenuData();

      setNewCategory({
        name: '',
        description: '',
        isActive: true,
        sortOrder: 0
      });
      setIsAddCategoryOpen(false);
      toast.success('Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-3 text-gray-600">Loading menu...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white rounded-full blur-3xl opacity-10"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-white rounded-full blur-3xl opacity-10"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold mb-2">Menu Management</h2>
            <p className="text-white/90">Manage your restaurant's menu items and categories</p>
            <div className="flex gap-6 mt-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                <span className="font-semibold">{menuItems.length} Items</span>
              </div>
              <div className="flex items-center gap-2">
                <Grid3x3 className="w-5 h-5" />
                <span className="font-semibold">{categories.length} Categories</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setIsAddCategoryOpen(true)}
              variant="secondary"
              className="gap-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <Package className="w-4 h-4" />
              Add Category
            </Button>

            <Button
              onClick={() => setIsAddItemOpen(true)}
              className="gap-2 bg-white text-orange-600 hover:bg-white/90"
            >
              <Plus className="w-4 h-4" />
              Add Menu Item
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 border-gray-200 focus:border-orange-500"
                />
              </div>
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-64 h-12">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name} ({category.itemCount || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className="h-12 w-12"
              >
                <Grid3x3 className="w-5 h-5" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
                className="h-12 w-12"
              >
                <List className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items */}
      {filteredItems.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
                <ChefHat className="w-10 h-10 text-orange-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No menu items found</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery || selectedCategory !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Start by adding your first menu item'}
                </p>
                {!searchQuery && selectedCategory === 'all' && (
                  <Button onClick={() => setIsAddItemOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Your First Item
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid'
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          : "space-y-4"
        }>
          <AnimatePresence>
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                {viewMode === 'grid' ? (
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                    <div className="relative h-48 overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                          <ChefHat className="w-16 h-16 text-orange-300" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex gap-2">
                        <Badge variant={item.isVeg ? "default" : "secondary"} className="text-xs bg-white/90 backdrop-blur-sm">
                          {item.isVeg ? <Leaf className="w-3 h-3 mr-1 text-green-600" /> : <ChefHat className="w-3 h-3 mr-1" />}
                          {item.isVeg ? 'Veg' : 'Non-Veg'}
                        </Badge>
                        {!item.isAvailable && (
                          <Badge variant="destructive" className="text-xs">
                            Out of Stock
                          </Badge>
                        )}
                      </div>
                      <div className="absolute top-3 right-3">
                        <Switch
                          checked={item.isAvailable}
                          onCheckedChange={() => toggleItemAvailability(item.id)}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </div>
                    </div>

                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{item.name}</h3>
                        {item.rating && (
                          <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full">
                            <Star className="w-3 h-3 text-green-600 fill-current" />
                            <span className="text-xs font-semibold text-green-600">{item.rating}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>

                      <div className="flex justify-between items-center mb-4">
                        <span className="text-2xl font-bold text-green-600">₹{item.price}</span>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          {item.preparationTime} min
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingItem(item)}
                          className="flex-1 gap-1 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex gap-4">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex items-center justify-center">
                            <ChefHat className="w-10 h-10 text-orange-300" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
                              <p className="text-gray-600 text-sm">{item.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold text-green-600">₹{item.price}</span>
                              <Switch
                                checked={item.isAvailable}
                                onCheckedChange={() => toggleItemAvailability(item.id)}
                                className="data-[state=checked]:bg-green-500"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {item.preparationTime} min
                            </div>
                            {item.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                {item.rating}
                              </div>
                            )}
                            <Badge variant={item.isVeg ? "default" : "secondary"} className="text-xs">
                              {item.isVeg ? 'Veg' : 'Non-Veg'}
                            </Badge>
                            {!item.isAvailable && (
                              <Badge variant="destructive" className="text-xs">
                                Out of Stock
                              </Badge>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingItem(item)}
                              className="gap-1 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Add New Menu Item</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-sm font-semibold">Item Name *</Label>
                <Input
                  id="name"
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter item name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="price" className="text-sm font-semibold">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={newItem.price}
                  onChange={(e) => setNewItem(prev => ({ ...prev, price: Number(e.target.value) }))}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
              <Textarea
                id="description"
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your menu item"
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category" className="text-sm font-semibold">Category *</Label>
                <Select value={newItem.category} onValueChange={(value) => setNewItem(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="prepTime" className="text-sm font-semibold">Preparation Time (min)</Label>
                <Input
                  id="prepTime"
                  type="number"
                  value={newItem.preparationTime}
                  onChange={(e) => setNewItem(prev => ({ ...prev, preparationTime: Number(e.target.value) }))}
                  placeholder="15"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="image" className="text-sm font-semibold">Image URL</Label>
              <Input
                id="image"
                value={newItem.image}
                onChange={(e) => setNewItem(prev => ({ ...prev, image: e.target.value }))}
                placeholder="https://example.com/image.jpg"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                <Switch
                  id="isVeg"
                  checked={newItem.isVeg}
                  onCheckedChange={(checked) => setNewItem(prev => ({ ...prev, isVeg: checked }))}
                />
                <Label htmlFor="isVeg" className="font-semibold cursor-pointer">Vegetarian</Label>
              </div>
              <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                <Switch
                  id="isAvailable"
                  checked={newItem.isAvailable}
                  onCheckedChange={(checked) => setNewItem(prev => ({ ...prev, isAvailable: checked }))}
                />
                <Label htmlFor="isAvailable" className="font-semibold cursor-pointer">Available</Label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleAddItem} className="flex-1 h-12 gap-2">
                <Save className="w-4 h-4" />
                Add Item
              </Button>
              <Button variant="outline" onClick={() => setIsAddItemOpen(false)} className="h-12 gap-2">
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Add New Category</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="categoryName" className="text-sm font-semibold">Category Name *</Label>
              <Input
                id="categoryName"
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter category name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="categoryDesc" className="text-sm font-semibold">Description</Label>
              <Textarea
                id="categoryDesc"
                value={newCategory.description}
                onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this category"
                rows={2}
                className="mt-1"
              />
            </div>

            <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
              <Switch
                id="categoryActive"
                checked={newCategory.isActive}
                onCheckedChange={(checked) => setNewCategory(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="categoryActive" className="font-semibold cursor-pointer">Active</Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleAddCategory} className="flex-1 h-12 gap-2">
                <Save className="w-4 h-4" />
                Add Category
              </Button>
              <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)} className="h-12 gap-2">
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Edit Menu Item</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editName" className="text-sm font-semibold">Item Name *</Label>
                  <Input
                    id="editName"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                    placeholder="Enter item name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="editPrice" className="text-sm font-semibold">Price (₹) *</Label>
                  <Input
                    id="editPrice"
                    type="number"
                    value={editingItem.price}
                    onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, price: Number(e.target.value) }) : null)}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="editDescription" className="text-sm font-semibold">Description</Label>
                <Textarea
                  id="editDescription"
                  value={editingItem.description}
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                  placeholder="Describe your menu item"
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editCategory" className="text-sm font-semibold">Category *</Label>
                  <Select
                    value={editingItem.category}
                    onValueChange={(value) => setEditingItem(prev => prev ? ({ ...prev, category: value }) : null)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editPrepTime" className="text-sm font-semibold">Preparation Time (min)</Label>
                  <Input
                    id="editPrepTime"
                    type="number"
                    value={editingItem.preparationTime}
                    onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, preparationTime: Number(e.target.value) }) : null)}
                    placeholder="15"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="editImage" className="text-sm font-semibold">Image URL</Label>
                <Input
                  id="editImage"
                  value={editingItem.image}
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, image: e.target.value }) : null)}
                  placeholder="https://example.com/image.jpg"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                  <Switch
                    id="editIsVeg"
                    checked={editingItem.isVeg}
                    onCheckedChange={(checked) => setEditingItem(prev => prev ? ({ ...prev, isVeg: checked }) : null)}
                  />
                  <Label htmlFor="editIsVeg" className="font-semibold cursor-pointer">Vegetarian</Label>
                </div>
                <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                  <Switch
                    id="editIsAvailable"
                    checked={editingItem.isAvailable}
                    onCheckedChange={(checked) => setEditingItem(prev => prev ? ({ ...prev, isAvailable: checked }) : null)}
                  />
                  <Label htmlFor="editIsAvailable" className="font-semibold cursor-pointer">Available</Label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleUpdateItem} className="flex-1 h-12 gap-2">
                  <Save className="w-4 h-4" />
                  Update Item
                </Button>
                <Button variant="outline" onClick={() => setEditingItem(null)} className="h-12 gap-2">
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
