import { useState, useEffect, useCallback } from 'react';
import { POINTS_DATA } from '../data/points';
import { Point, Visit, User, AuthState } from '../types';
import { getDistance } from '../lib/geoUtils';

const STORAGE_KEY_VISITS = 'b3_road47_visits';
const STORAGE_KEY_AUTH = 'b3_road47_auth';
const STORAGE_KEY_ROUTE = 'b3_road47_current_route';
const STORAGE_KEY_USERS = 'b3_road47_users';

export function useAppState() {
  const [points] = useState<Point[]>(POINTS_DATA);
  const [visits, setVisits] = useState<Visit[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_VISITS);
    return saved ? JSON.parse(saved) : [];
  });
  const [authState, setAuthState] = useState<AuthState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_AUTH);
    return saved ? JSON.parse(saved) : { isAuthenticated: false, user: null };
  });
  const [currentRoute, setCurrentRoute] = useState<number[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ROUTE);
    return saved ? JSON.parse(saved) : [];
  });
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    return saved ? JSON.parse(saved) : [];
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any | null>(null);

  const isAdmin = authState.user?.email === 'ddvworkspace@gmail.com';

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(visits));
    if (authState.user) {
      const currentScore = visits.reduce((acc, v) => acc + (POINTS_DATA.find(p => p.id === v.pointId)?.points || 0), 0);
      if (authState.user.totalPoints !== currentScore) {
        setAuthState(prev => {
          if (!prev.user) return prev;
          return {
            ...prev,
            user: { ...prev.user, totalPoints: currentScore }
          };
        });
        setAllUsers(prev => prev.map(u => u.id === authState.user?.id ? { ...u, totalPoints: currentScore } : u));
      }
    }
  }, [visits, authState.user?.id]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(authState));
  }, [authState]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ROUTE, JSON.stringify(currentRoute));
  }, [currentRoute]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(allUsers));
  }, [allUsers]);

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

  const login = (email: string, fullName: string, phone: string, motorcycle: string, referrerId?: string) => {
    setAllUsers(prev => {
      let user = prev.find(u => u.email === email);
      if (!user) {
        user = {
          id: Math.random().toString(36).substr(2, 9),
          email,
          fullName,
          phone,
          motorcycle,
          totalPoints: 0,
          referredBy: referrerId
        };
        const newUsers = [...prev, user];
        setAuthState({ isAuthenticated: true, user });
        return newUsers;
      }
      setAuthState({ isAuthenticated: true, user });
      return prev;
    });
  };

  const logout = () => {
    setAuthState({ isAuthenticated: false, user: null });
  };

  const checkIn = (pointId: number, photoBase64: string) => {
    setVisits(prev => {
       if (prev.some(v => v.pointId === pointId)) return prev;
       return [...prev, { pointId, timestamp: Date.now(), photoBase64 }];
    });
  };

  const cancelCheckIn = (pointId: number) => {
    setVisits(prev => prev.filter(v => v.pointId !== pointId));
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

  const updateProfile = (fullName: string, phone: string, motorcycle: string, avatarBase64?: string) => {
    setAuthState(prev => {
      const newUser = prev.user ? { 
        ...prev.user, 
        fullName, 
        phone, 
        motorcycle,
        avatarBase64: avatarBase64 || prev.user.avatarBase64 
      } : null;
      if (newUser) {
        setAllUsers(users => users.map(u => u.id === newUser.id ? newUser : u));
      }
      return { ...prev, user: newUser };
    });
  };

  const deleteUser = (userId: string) => {
    if (!isAdmin) return;
    setAllUsers(allUsers.filter(u => u.id !== userId));
  };

  const getLeaderboard = () => {
    return allUsers.map(u => ({ 
      ...u, 
      isMe: u.id === authState.user?.id 
    })).sort((a, b) => b.totalPoints - a.totalPoints);
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
    totalScore
  };
}
