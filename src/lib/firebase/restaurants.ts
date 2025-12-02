import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    deleteDoc,
    Timestamp,
    onSnapshot
} from 'firebase/firestore';
import { db } from './config';
import { Restaurant, MenuItem } from '../types';

// Restaurant fetching functions
export async function getRestaurants(status?: string) {
    try {
        let restaurantQuery: any = collection(db, 'restaurants');

        if (status && status !== 'all') {
            restaurantQuery = query(restaurantQuery, where('status', '==', status));
        }

        const snapshot = await getDocs(restaurantQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    } catch (error) {
        console.error('Error getting restaurants:', error);
        throw error;
    }
};

export async function getTopRatedRestaurants(limitCount: number = 10) {
    try {
        const restaurantQuery = query(
            collection(db, 'restaurants'),
            orderBy('rating', 'desc'),
            limit(limitCount)
        );

        const snapshot = await getDocs(restaurantQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    } catch (error) {
        console.error('Error getting top rated restaurants:', error);
        throw error;
    }
};

export async function getTrendingRestaurants(limitCount: number = 10) {
    try {
        const restaurantQuery = query(
            collection(db, 'restaurants'),
            orderBy('totalRatings', 'desc'),
            limit(limitCount)
        );

        const snapshot = await getDocs(restaurantQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    } catch (error) {
        console.error('Error getting trending restaurants:', error);
        throw error;
    }
};

export async function fetchRestaurants(): Promise<Restaurant[]> {
    const restaurantsRef = collection(db, 'restaurants');
    const snapshot = await getDocs(restaurantsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
}

export function getRestaurantsRealtime(callback: (restaurants: Restaurant[]) => void): () => void {
    const restaurantsRef = collection(db, 'restaurants');

    return onSnapshot(restaurantsRef, (snapshot) => {
        const restaurants = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Restaurant));
        callback(restaurants);
    }, (error) => {
        console.error('Error getting realtime restaurants:', error);
    });
}

export async function fetchRestaurantMenu(restaurantId: string): Promise<MenuItem[]> {
    const menuRef = collection(db, `restaurants/${restaurantId}/menu`);
    const snapshot = await getDocs(menuRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
}

export async function fetchRestaurant(restaurantId: string): Promise<Restaurant | null> {
    const restaurantRef = collection(db, 'restaurants');
    const q = query(restaurantRef, where('__name__', '==', restaurantId));
    const snapshot = await getDocs(q);
    return snapshot.docs.length > 0 ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Restaurant : null;
}

export async function getMenuItems(restaurantId?: string, flagged?: boolean) {
    try {
        let menuQuery: any = collection(db, 'menuItems');
        const constraints = [];

        if (restaurantId) {
            constraints.push(where('restaurantId', '==', restaurantId));
        }
        if (flagged !== undefined) {
            constraints.push(where('flagged', '==', flagged));
        }

        if (constraints.length > 0) {
            menuQuery = query(menuQuery, ...constraints);
        }

        const snapshot = await getDocs(menuQuery);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as any)
        }));
    } catch (error) {
        console.error('Error getting menu items:', error);
        throw error;
    }
};

export async function getRestaurantMenuItems(restaurantId: string) {
    try {
        const menuQuery = query(
            collection(db, 'vendors', restaurantId, 'menuItems')
            // orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(menuQuery);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate()
        }));
    } catch (error) {
        console.error('Error getting restaurant menu items:', error);
        throw error;
    }
};

export async function searchRestaurants(query: string, filters: any): Promise<Restaurant[]> {
    try {
        if (!query.trim()) {
            return [];
        }

        const restaurantsRef = collection(db, 'restaurants');
        const snapshot = await getDocs(restaurantsRef);
        const queryLower = query.toLowerCase();

        let results = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...(doc.data() as any)
            }))
            .filter(restaurant => {
                const nameMatches = restaurant.name?.toLowerCase().includes(queryLower);
                const cuisineMatches = restaurant.cuisine?.some((c: string) =>
                    c.toLowerCase().includes(queryLower)
                );

                if (!nameMatches && !cuisineMatches) return false;

                if (filters.vegOnly && !restaurant.isVeg) return false;
                if (filters.minRating && restaurant.rating < filters.minRating) return false;
                if (filters.cuisine?.length > 0) {
                    const hasCuisine = filters.cuisine.some((c: string) =>
                        restaurant.cuisine?.some((rc: string) =>
                            rc.toLowerCase() === c.toLowerCase()
                        )
                    );
                    if (!hasCuisine) return false;
                }

                return true;
            });

        return results;
    } catch (error) {
        console.error('Error searching restaurants:', error);
        return [];
    }
}

export async function searchMenuItems(query: string, filters: any): Promise<MenuItem[]> {
    try {
        if (!query.trim()) {
            return [];
        }

        const menuItemsRef = collection(db, 'menuItems');
        const snapshot = await getDocs(menuItemsRef);
        const queryLower = query.toLowerCase();

        let results = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...(doc.data() as any)
            }))
            .filter((item: any) => {
                const nameMatches = item.name?.toLowerCase().includes(queryLower);
                const descriptionMatches = item.description?.toLowerCase().includes(queryLower);
                const categoryMatches = item.category?.toLowerCase().includes(queryLower);

                if (!nameMatches && !descriptionMatches && !categoryMatches) return false;

                if (filters.vegOnly && !item.isVeg) return false;
                if (filters.minRating && item.rating < filters.minRating) return false;
                if (filters.priceRange) {
                    const [minPrice, maxPrice] = filters.priceRange;
                    if (item.price < minPrice || item.price > maxPrice) return false;
                }

                return true;
            });

        return results;
    } catch (error) {
        console.error('Error searching menu items:', error);
        return [];
    }
}

export async function getAllRestaurantsForAdmin(status?: string) {
    try {
        let restaurantsQuery: any = collection(db, 'restaurants');

        if (status && status !== 'all') {
            restaurantsQuery = query(restaurantsQuery, where('status', '==', status));
        }

        // restaurantsQuery = query(restaurantsQuery, orderBy('createdAt', 'desc'));
        console.log('Fetching restaurants for admin...');
        const snapshot = await getDocs(restaurantsQuery);
        console.log(`Fetched ${snapshot.docs.length} restaurants`);

        return snapshot.docs.map(doc => {
            const data = doc.data() as any;
            return {
                id: doc.id,
                name: data.name || 'Unknown Restaurant',
                email: data.email || '',
                phone: data.phone || '',
                address: data.address || '',
                cuisine: data.cuisine || [],
                logo: data.image || data.logo || '',
                status: data.status || 'active',
                rating: data.rating || 0,
                prepTime: data.prepTime || '30-45 mins',
                distance: data.distance || 'N/A',
                isOpen: data.isOpen !== undefined ? data.isOpen : true,
                menuItemsCount: data.menuItemsCount || 0,
                flaggedItemsCount: data.flaggedItemsCount || 0,
                averagePrice: data.averagePrice || 0,
                stats: data.stats || {
                    totalOrders: 0,
                    totalRevenue: 0,
                    averageRating: 0,
                    completionRate: 0
                },
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate()
            };
        });
    } catch (error) {
        console.error('Error getting all restaurants for admin:', error);
        throw error;
    }
};
