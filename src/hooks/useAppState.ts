import { useState, useEffect, useCallback } from 'react';
import { POINTS_DATA } from '../data/points';
import { Point, Visit, User, AuthState } from '../types';
import { getDistance } from '../lib/geoUtils';
import { db, auth } from '../lib/firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const STORAGE_KEY_AUTH = 'b3_road47_auth';
const STORAGE_KEY_ROUTE = 'b3_road47_current_route';

export function useAppState() {
  const [points] = useState<Point[]>(POINTS_DATA);
  const [visits, setVisits] = useState<Visit[]>(() => {
    const saved = localStorage.getItem('b3_road47_visits');
    return saved ? JSON.parse(saved) : [];
  });
  const [hasLoadedVisits, setHasLoadedVisits] = useState(false);
  const [authState, setAuthState] = useState<AuthState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_AUTH);
    return saved ? JSON.parse(saved) : { isAuthenticated: false, user: null };
  });
  const [currentRoute, setCurrentRoute] = useState<number[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ROUTE);
    return saved ? JSON.parse(saved) : [];
  });
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const isAdmin = authState.user?.email === 'ddvworkspace@gmail.com';

  // Sync Auth State
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(authState));
  }, [authState]);

  // Sync Current Route
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ROUTE, JSON.stringify(currentRoute));
  }, [currentRoute]);

  // Sync Visits to LocalStorage
  useEffect(() => {
    localStorage.setItem('b3_road47_visits', JSON.stringify(visits));
  }, [visits]);

  // Firebase Auth Initial Sign-in - Simplified
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      // In this environment, we might already have a user, or we might not need sign-in 
      // if rules are open during debugging. Removing forced signInAnonymously to avoid errors.
      if (fbUser) {
        console.log("Authenticated as:", fbUser.uid);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Fetch All Users (for Rating and Admin)
  useEffect(() => {
    if (!isAuthReady) return;
    // Removing orderBy from Firestore to ensure users without totalPoints field are still fetched
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ 
        ...doc.data(), 
        id: doc.id 
      } as User));
      setAllUsers(usersList);
      setIsLoading(false);
    }, (error) => {
      console.error("Snapshot error:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [isAuthReady]);

  // Sync Current User to Firestore (Migration/Recovery)
  useEffect(() => {
    if (isAuthReady && authState.isAuthenticated && authState.user) {
      const normalizedEmail = (authState.user?.email || '').toLowerCase().trim();
      const expectedId = normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_');
      
      if (expectedId && authState.user?.id !== expectedId) {
        console.log("Migrating user ID format...");
        const updatedUser = { ...authState.user, id: expectedId } as User;
        setAuthState(prev => ({ ...prev, user: updatedUser }));
        return; 
      }

      // Sync to Firestore without waiting for allUsers
      if (!isLoading) {
        const userRef = doc(db, 'users', authState.user!.id);
        const syncData: any = {
          ...authState.user,
          totalPoints: authState.user!.totalPoints || 0
        };
        if (auth.currentUser) {
          syncData.uid = auth.currentUser.uid;
        }
        
        setDoc(userRef, syncData, { merge: true })
          .catch(err => {
            console.error("User sync error:", err);
            // If it's a permission error, it might be because the rules are still propagating
          });
      }
    }
  }, [isAuthReady, authState.isAuthenticated, authState.user?.id, isLoading]);

  // Fetch Current User's Visits
  useEffect(() => {
    if (authState.user?.id) {
      const q = query(collection(db, 'users', authState.user.id, 'visits'), orderBy('timestamp', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const visitsList = snapshot.docs.map(doc => doc.data() as Visit);
        setVisits(visitsList);
        setHasLoadedVisits(true);
      });
      return () => unsubscribe();
    } else {
      setVisits([]);
      setHasLoadedVisits(false);
    }
  }, [authState.user?.id]);

  // Sync Total Points to Firestore
  useEffect(() => {
    if (authState.user?.id && hasLoadedVisits) {
      const currentScore = visits.reduce((acc, v) => acc + (POINTS_DATA.find(p => p.id === v.pointId)?.points || 0), 0);
      if (authState.user.totalPoints !== currentScore) {
        setDoc(doc(db, 'users', authState.user.id), { totalPoints: currentScore }, { merge: true })
          .catch(err => console.error("Score sync error:", err));
        setAuthState(prev => prev.user ? { ...prev, user: { ...prev.user, totalPoints: currentScore } } : prev);
      }
    }
  }, [visits, authState.user?.id, hasLoadedVisits]);

  // Geolocation
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => console.error("Error getting location:", error),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const login = async (email: string) => {
    // Standardize email
    const normalizedEmail = email.toLowerCase().trim();
    const userDoc = await getDoc(doc(db, 'users', normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_')));
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as User;
      setAuthState({ isAuthenticated: true, user: userData });
      return { success: true };
    }
    return { success: false, message: 'Пользователь не найден. Пожалуйста, зарегистрируйтесь.' };
  };

  const register = async (email: string, fullName: string, phone: string, motorcycle: string, referrerId?: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    const userId = normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return { success: false, message: 'Этот email уже зарегистрирован.' };
    }

    const newUser: User = {
      id: userId,
      uid: auth.currentUser?.uid, // Store the Firebase UID for security rules
      email: normalizedEmail,
      fullName,
      phone,
      motorcycle,
      totalPoints: 0,
      referredBy: referrerId || null
    } as User;

    try {
      await setDoc(userRef, newUser);
      setAuthState({ isAuthenticated: true, user: newUser });
      return { success: true };
    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, message: 'Ошибка при сохранении данных. Попробуйте еще раз.' };
    }
  };

  const logout = () => {
    setAuthState({ isAuthenticated: false, user: null });
  };

  const checkIn = async (pointId: number, photoBase64: string) => {
    if (!authState.user) return;
    if (visits.some(v => v.pointId === pointId)) return;
    
    const visitId = pointId.toString();
    const visitData: Visit = {
      pointId,
      timestamp: Date.now(),
      photoBase64
    };

    // Optimistic update
    setVisits(prev => [...prev, visitData]);

    try {
      await setDoc(doc(db, 'users', authState.user.id, 'visits', visitId), visitData);
    } catch (error) {
      console.error("Check-in error:", error);
      // Revert if failed
      setVisits(prev => prev.filter(v => v.pointId !== pointId));
    }
  };

  const cancelCheckIn = async (pointId: number) => {
    if (!authState.user) return;
    
    // Optimistic update
    const previousVisits = [...visits];
    setVisits(prev => prev.filter(v => v.pointId !== pointId));

    try {
      await deleteDoc(doc(db, 'users', authState.user.id, 'visits', pointId.toString()));
    } catch (error) {
      console.error("Cancel check-in error:", error);
      setVisits(previousVisits);
    }
  };

  const addToRoute = (pointId: number) => {
    if (!currentRoute.includes(pointId)) {
      setCurrentRoute([...currentRoute, pointId]);
    }
  };

  const removeFromRoute = (pointId: number) => {
    setCurrentRoute(currentRoute.filter(id => id !== pointId));
  };

  const clearRoute = () => {
    setCurrentRoute([]);
  };

  const isVisited = (pointId: number) => visits.some(v => v.pointId === pointId);

  const getPointsSortedByDistance = useCallback(() => {
    if (!userLocation) return points;
    return [...points].sort((a, b) => {
      const distA = getDistance(userLocation.lat, userLocation.lon, a.lat, a.lon);
      const distB = getDistance(userLocation.lat, userLocation.lon, b.lat, b.lon);
      return distA - distB;
    });
  }, [points, userLocation]);

  const getRecommendation = useCallback((lastPointId?: number) => {
    const p = lastPointId ? points.find(p => p.id === lastPointId) : null;
    const baseLat = p ? p.lat : userLocation?.lat;
    const baseLon = p ? p.lon : userLocation?.lon;

    if (!baseLat || !baseLon) return [];

    return points
      .filter(p => !isVisited(p.id) && !currentRoute.includes(p.id))
      .sort((a, b) => {
        const distA = getDistance(baseLat, baseLon, a.lat, a.lon);
        const distB = getDistance(baseLat, baseLon, b.lat, b.lon);
        return distA - distB;
      })
      .slice(0, 3);
  }, [points, visits, currentRoute, userLocation]);

  const totalScore = visits.reduce((acc, v) => acc + (POINTS_DATA.find(p => p.id === v.pointId)?.points || 0), 0);

  const updateProfile = async (fullName: string, phone: string, motorcycle: string, avatarBase64?: string) => {
    if (!authState.user) return;
    const updates: any = { fullName, phone, motorcycle };
    if (avatarBase64) updates.avatarBase64 = avatarBase64;
    
    await updateDoc(doc(db, 'users', authState.user.id), updates);
    setAuthState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...updates } : null
    }));
  };

  const deleteUser = async (userId: string) => {
    if (!isAdmin) return;
    await deleteDoc(doc(db, 'users', userId));
  };

  const getLeaderboard = () => {
    return allUsers.map(u => ({ 
      ...u, 
      isMe: u.id === authState.user?.id,
      totalPoints: u.totalPoints || 0
    })).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return (a.fullName || '').localeCompare(b.fullName || '');
    });
  };

  return {
    points,
    visits,
    authState,
    currentRoute,
    userLocation,
    selectedUserProfile,
    setSelectedUserProfile,
    login,
    register,
    logout,
    updateProfile,
    checkIn,
    addToRoute,
    removeFromRoute,
    clearRoute,
    isVisited,
    getPointsSortedByDistance,
    getRecommendation,
    getLeaderboard,
    deleteUser,
    isAdmin,
    cancelCheckIn,
    totalScore,
    isLoading,
    allUsers
  };
}
