import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where
} from 'firebase/firestore';
import { db } from './firebase-config';
import { Restaurant, MenuItem } from './firebase-types';

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