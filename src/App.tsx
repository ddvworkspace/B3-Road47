import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Map as MapIcon, 
  List, 
  Route as RouteIcon, 
  User as UserIcon,
  Camera,
  Navigation,
  Search,
  Filter,
  CheckCircle2,
  Trophy,
  Share2,
  LogOut,
  ChevronRight,
  MapPin,
  Clock,
  Plus,
  Trash2,
  FileDown,
  X,
  Edit2,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup
} from 'react-leaflet';
import L from 'leaflet';
import { useAppState } from './hooks/useAppState';
import { formatDistance, getDistance, openInYandex, openRouteInYandex } from './lib/geoUtils';
import { cn } from './lib/utils';
import { Point, Visit } from './types';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Navigation Tabs
type Tab = 'home' | 'map' | 'list' | 'route' | 'rating' | 'profile';

export default function App() {
  const state = useAppState();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);

  if (!state.authState.isAuthenticated) {
    return <AuthView login={state.login} />;
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-zinc-950 overflow-hidden relative">
      {/* Content Area */}
      <main className={cn(
        "flex-1 relative pb-24 custom-scrollbar",
        activeTab === 'map' ? "overflow-hidden" : "overflow-y-auto"
      )}>
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <Dashboard 
              key="home" 
              state={state} 
              onPointClick={(p) => setSelectedPoint(p)}
              onTabChange={setActiveTab}
            />
          )}
          {activeTab === 'map' && (
            <MapView 
              key="map" 
              state={state} 
              onPointClick={(p) => setSelectedPoint(p)}
            />
          )}
          {activeTab === 'list' && (
            <PointListView 
              key="list" 
              state={state} 
              onPointClick={(p) => setSelectedPoint(p)}
            />
          )}
          {activeTab === 'route' && (
            <RoutePlanner 
              key="route" 
              state={state} 
            />
          )}
          {activeTab === 'rating' && (
            <RatingView 
              key="rating" 
              state={state} 
            />
          )}
          {activeTab === 'profile' && (
            <ProfileView 
              key="profile" 
              state={state} 
            />
          )}
        </AnimatePresence>
      </main>

      {/* Point Details Modal */}
      <AnimatePresence>
        {selectedPoint && (
          <PointDetails 
            point={selectedPoint} 
            state={state} 
            onClose={() => setSelectedPoint(null)} 
          />
        )}
      </AnimatePresence>

      {/* User Profile Modal */}
      <AnimatePresence>
        {state.selectedUserProfile && (
          <PublicProfileView 
            user={state.selectedUserProfile} 
            onClose={() => state.setSelectedUserProfile(null)} 
            points={state.points}
          />
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-zinc-900 border-t border-zinc-800 px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] flex justify-between items-center z-50">
        <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home size={22} />} label="Дом" />
        <NavButton active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon={<MapIcon size={22} />} label="Карта" />
        <NavButton active={activeTab === 'list'} onClick={() => setActiveTab('list')} icon={<List size={22} />} label="Точки" />
        <NavButton active={activeTab === 'route'} onClick={() => setActiveTab('route')} icon={<RouteIcon size={22} />} label="Маршрут" />
        <NavButton active={activeTab === 'rating'} onClick={() => setActiveTab('rating')} icon={<Award size={22} />} label="Рейтинг" />
        <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserIcon size={22} />} label="Профиль" />
      </nav>
    </div>
  );
}

// --- Sub-Components ---

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-colors flex-1 min-w-0",
        active ? "text-amber-500" : "text-zinc-500"
      )}
    >
      {icon}
      <span className="text-[9px] font-bold uppercase truncate w-full">{label}</span>
    </button>
  );
}

function Dashboard({ state, onPointClick, onTabChange }: { state: any, onPointClick: (p: Point) => void, onTabChange: (t: Tab) => void, key?: string }) {
  const nearbyPoints = state.getPointsSortedByDistance().slice(0, 5);
  const myRank = state.getLeaderboard().findIndex((u: any) => u.isMe) + 1;
  
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-6 space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-amber-500">B3-ROAD47</h1>
          <p className="text-zinc-500 text-sm font-medium">Твой путь по ЛО</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{state.totalScore} <span className="text-xs font-normal text-zinc-500">Баллов</span></div>
          <p className="text-xs text-amber-500 font-bold">#{myRank} в рейтинге</p>
        </div>
      </header>

      {/* Big Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800">
          <CheckCircle2 className="text-emerald-500 mb-3" size={24} />
          <div className="text-2xl font-black">{state.visits.length}</div>
          <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Точек взято</div>
        </div>
         <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800">
          <Trophy className="text-amber-500 mb-3" size={24} />
          <div className="text-2xl font-black">{state.totalScore}</div>
          <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Всего баллов</div>
        </div>
      </div>

      <section>
        <div className="flex justify-between items-center mb-4 px-1">
          <h2 className="text-lg font-bold">Ближайшие цели</h2>
          <button onClick={() => onTabChange('list')} className="text-amber-500 text-xs font-bold uppercase underline-offset-4 underline">Весь список</button>
        </div>
        <div className="space-y-4">
          {nearbyPoints.map((point: Point) => (
            <div 
              key={point.id}
              onClick={() => onPointClick(point)}
              className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl flex items-center gap-4 active:scale-95 transition-all"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800 border border-zinc-700">
                <img src={point.image_url} alt="" className="w-full h-full object-cover grayscale-[0.3]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm truncate">{point.name}</h3>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-tight">
                  <MapPin size={10} className="text-blue-500" />
                  {state.userLocation ? formatDistance(getDistance(state.userLocation.lat, state.userLocation.lon, point.lat, point.lon)) : '...'}
                  <span className="text-amber-500">•</span>
                  {point.points} БАЛЛОВ
                </div>
              </div>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                state.isVisited(point.id) ? "bg-emerald-500/20 text-emerald-500" : "bg-zinc-800 text-zinc-500"
              )}>
                {state.isVisited(point.id) ? <CheckCircle2 size={16} /> : <ChevronRight size={16} />}
              </div>
            </div>
          ))}
        </div>
      </section>

      <button onClick={() => onTabChange('route')} className="w-full bg-zinc-100 text-zinc-950 font-black py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform uppercase tracking-wider">
        <RouteIcon size={20} />
        Спланировать выезд
      </button>
    </motion.div>
  );
}

function MapView({ state, onPointClick }: { state: any, onPointClick: (p: Point) => void, key?: string }) {
  const [map, setMap] = useState<L.Map | null>(null);
  const center: [number, number] = state.userLocation ? [state.userLocation.lat, state.userLocation.lon] : [59.9343, 30.3351];

  const markerHtml = (color: string, isVisited: boolean, points: number) => {
    const isGold = points >= 5;
    const pulseClass = isVisited ? "animate-pulse" : "";
    const glow = isGold ? '0 0 15px rgba(245, 158, 11, 0.8)' : `0 0 10px ${color}`;
    const innerColor = isVisited ? '#10b981' : color;
    const border = isGold ? 'border-amber-400' : 'border-zinc-900';
    
    return `<div class="${pulseClass} ${border} w-4 h-4 rounded-full border-2 shadow-xl" style="background-color: ${innerColor}; box-shadow: ${glow}"></div>`;
  };

  const centerOnUser = () => {
    if (state.userLocation && map) {
      map.setView([state.userLocation.lat, state.userLocation.lon], 13);
    }
  };

  const userMarkerHtml = () => {
    return `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-6 h-6 bg-blue-500/30 rounded-full animate-ping"></div>
        <div class="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
      </div>
    `;
  };

  return (
    <div className="h-full w-full relative">
      <MapContainer 
        center={center} 
        zoom={9} 
        className="h-full w-full invert-[0.9] hue-rotate-180 brightness-95" 
        zoomControl={false}
        ref={setMap}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {state.points.map((point: Point) => (
          <Marker 
            key={point.id} 
            position={[point.lat, point.lon]}
            icon={L.divIcon({ 
              className: 'custom-icon', 
              html: markerHtml(state.isVisited(point.id) ? '#10b981' : '#3b82f6', state.isVisited(point.id), point.points),
              iconSize: [16, 16]
            })}
            eventHandlers={{ click: () => onPointClick(point) }}
          />
        ))}
        {state.userLocation && (
           <Marker 
            position={[state.userLocation.lat, state.userLocation.lon]}
            zIndexOffset={1000}
            icon={L.divIcon({ 
              className: 'user-location-icon', 
              html: userMarkerHtml(),
              iconSize:[16, 16]
            })}
          />
        )}
      </MapContainer>
      
      <div className="absolute bottom-6 right-6 z-[1000]">
        <button 
          onClick={centerOnUser}
          className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-amber-500 shadow-2xl active:scale-95 transition-transform"
        >
          <Navigation size={24} />
        </button>
      </div>

      <div className="absolute top-6 left-6 right-6 pointer-events-none z-[1000]">
        <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 p-3 rounded-2xl inline-flex items-center gap-4 shadow-2xl">
           <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-[10px] font-bold uppercase text-zinc-400">Цели</span></div>
           <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[10px] font-bold uppercase text-zinc-400">Взято</span></div>
           <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span className="text-[10px] font-bold uppercase text-zinc-400">Вы</span></div>
        </div>
      </div>
    </div>
  );
}

function PointListView({ state, onPointClick }: { state: any, onPointClick: (p: Point) => void, key?: string }) {
  const [search, setSearch] = useState('');
  const [filterPoints, setFilterPoints] = useState<number | null>(null);
  const [hideVisited, setHideVisited] = useState(false);

  const points = state.getPointsSortedByDistance()
    .filter((p: Point) => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter((p: Point) => filterPoints ? p.points === filterPoints : true)
    .filter((p: Point) => hideVisited ? !state.isVisited(p.id) : true);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div className="sticky top-0 bg-zinc-950/95 backdrop-blur-md pt-2 pb-4 space-y-4 z-40 border-b border-zinc-900">
        <h2 className="text-2xl font-black tracking-tight">Все точки</h2>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            placeholder="Найти по названию..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/50"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          <button onClick={() => setFilterPoints(null)} className={cn("px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors", filterPoints === null ? "bg-amber-500 text-black" : "bg-zinc-900 text-zinc-500")}>Все</button>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setFilterPoints(n)} className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap", filterPoints === n ? "bg-amber-500 text-black" : "bg-zinc-900 text-zinc-500")}>{n} Б</button>
          ))}
          <button onClick={() => setHideVisited(!hideVisited)} className={cn("px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-colors whitespace-nowrap", hideVisited ? "bg-emerald-500 text-black" : "bg-zinc-900 text-zinc-500")}>Не взятые</button>
        </div>
      </div>

      <div className="space-y-4">
        {points.map((point: Point) => (
          <div key={point.id} onClick={() => onPointClick(point)} className="group bg-zinc-900 border border-zinc-800 p-4 rounded-3xl flex items-center gap-4 active:scale-95 transition-all">
             <div className="w-20 h-20 bg-zinc-800 rounded-2xl overflow-hidden flex-shrink-0">
               <img src={point.image_url} alt="" className="w-full h-full object-cover" />
             </div>
             <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-sm truncate pr-2">{point.name}</h3>
                  <div className="text-[10px] font-black text-amber-500 uppercase">{point.points}Б</div>
                </div>
                <p className="text-zinc-500 text-xs line-clamp-2 leading-relaxed mb-2">{point.description}</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                    <MapPin size={10} />
                    {state.userLocation ? formatDistance(getDistance(state.userLocation.lat, state.userLocation.lon, point.lat, point.lon)) : '...'}
                  </div>
                  {state.isVisited(point.id) && <span className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1"><CheckCircle2 size={10}/>Взято</span>}
                </div>
             </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function PointDetails({ point, state, onClose }: { point: Point, state: any, onClose: () => void }) {
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const handleCheckIn = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        state.checkIn(point.id, reader.result as string);
        setIsCheckingIn(false);
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-zinc-950/90 backdrop-blur flex flex-col pt-10">
      <div className="flex-1 overflow-y-auto max-w-md mx-auto w-full px-6 pb-12">
        <div className="flex justify-end mb-4">
           <button onClick={onClose} className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-500"><X size={24} /></button>
        </div>
        
        <div className="space-y-6">
          <div className="aspect-square w-full rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl relative">
            {state.isVisited(point.id) ? (
              <img src={state.visits.find((v: Visit) => v.pointId === point.id)?.photoBase64 || point.image_url} alt={point.name} className="w-full h-full object-cover" />
            ) : (
              <img src={point.image_url} alt={point.name} className="w-full h-full object-cover" />
            )}
            <div className="absolute top-4 left-4 bg-amber-500 text-black px-4 py-2 rounded-full font-black text-xs shadow-xl">{point.points} БАЛЛОВ</div>
          </div>

          <div className="space-y-4">
             <h2 className="text-3xl font-black leading-none">{point.name}</h2>
             <div className="flex items-center gap-4 text-sm font-bold text-zinc-500 uppercase tracking-widest">
               <span className="flex items-center gap-1"><MapPin size={16} className="text-blue-500" /> {state.userLocation ? formatDistance(getDistance(state.userLocation.lat, state.userLocation.lon, point.lat, point.lon)) : '...'}</span>
               {state.isVisited(point.id) && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={16}/> Посещено</span>}
             </div>
             <p className="text-zinc-400 leading-relaxed text-lg font-medium">{point.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <button onClick={() => openInYandex(point.lat, point.lon)} className="bg-zinc-800 text-zinc-100 font-bold py-4 rounded-2xl flex flex-col items-center gap-1 active:bg-zinc-700">
              <Navigation size={20} className="text-amber-500" />
              <span className="text-[10px] uppercase">Навигатор</span>
            </button>
            <button 
              onClick={() => { state.addToRoute(point.id); onClose(); }} 
              disabled={state.isVisited(point.id)}
              className="bg-zinc-800 text-zinc-100 font-bold py-4 rounded-2xl flex flex-col items-center gap-1 disabled:opacity-50 active:bg-zinc-700"
            >
              <Plus size={20} className="text-blue-500" />
              <span className="text-[10px] uppercase">В маршрут</span>
            </button>
          </div>

          {!state.isVisited(point.id) && (
            <div className="pt-2">
              <button 
                onClick={() => setIsCheckingIn(true)}
                className="w-full bg-amber-500 text-zinc-950 font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-2xl shadow-amber-500/20 active:scale-95 transition-transform uppercase tracking-wider"
              >
                <Camera size={24} />
                Отметить посещение
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isCheckingIn && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed inset-x-0 bottom-0 bg-zinc-900 rounded-t-[40px] p-8 space-y-6 border-t border-zinc-800 z-[110] max-w-md mx-auto">
             <div className="text-center space-y-2">
                <h3 className="text-2xl font-black underline underline-offset-8 decoration-amber-500">Загрузка доказательств</h3>
                <p className="text-zinc-500 text-sm">Сделай фото своего стального коня на фоне этой точки</p>
             </div>
             <label className="block w-full bg-zinc-100 text-zinc-950 font-black py-5 rounded-2xl text-center cursor-pointer active:bg-white shadow-xl uppercase tracking-widest">
                Сделать фото
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCheckIn} />
             </label>
             <button onClick={() => setIsCheckingIn(false)} className="w-full text-zinc-500 font-bold py-2">Отмена</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RoutePlanner({ state }: { state: any, key?: string }) {
  const routePoints = state.currentRoute.map((id: number) => state.points.find((p: Point) => p.id === id)).filter(Boolean);
  const lastPoint = routePoints.length > 0 ? routePoints[routePoints.length - 1] : null;
  const recommendations = state.getRecommendation(lastPoint?.id);
  const totalRoutePoints = routePoints.reduce((acc: number, p: Point) => acc + p.points, 0);

  const startRoute = () => {
    if (routePoints.length === 0) return;
    openRouteInYandex(routePoints, state.userLocation);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black italic tracking-tighter">План прохвата</h2>
        {routePoints.length > 0 && <button onClick={state.clearRoute} className="text-zinc-600 font-bold text-xs uppercase flex items-center gap-1 underline"><Trash2 size={14}/> Сброс</button>}
      </div>

      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 rounded-[32px] border border-zinc-800 shadow-2xl flex justify-between items-center">
         <div>
           <div className="text-4xl font-black text-amber-500">{totalRoutePoints}</div>
           <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Ожидаемый улов</div>
         </div>
         {routePoints.length > 0 && (
           <button 
             onClick={startRoute}
             className="bg-amber-500 text-black px-4 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 active:scale-95 transition-transform"
           >
             <Navigation size={16} />
             В навигатор
           </button>
         )}
         <div className="text-right">
           <div className="text-4xl font-black text-blue-500">{routePoints.length}</div>
           <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Точек в плане</div>
         </div>
      </div>

      <section className="space-y-4">
        {routePoints.map((p: Point, i: number) => (
          <div key={p.id} className="relative flex items-center gap-4 group">
            {i !== routePoints.length - 1 && <div className="absolute left-[23px] top-[46px] bottom-[-16px] w-0.5 bg-zinc-800" />}
            <div className="w-12 h-12 bg-zinc-900 border-2 border-zinc-800 rounded-full flex items-center justify-center font-black text-zinc-500 z-10">{i+1}</div>
            <div className="flex-1 bg-zinc-900 p-4 rounded-3xl border border-zinc-800 flex justify-between items-center shadow-lg group-active:border-blue-500/50">
               <div>
                 <h4 className="font-bold text-sm">{p.name}</h4>
                 <div className="flex items-center gap-2 mt-1">
                   <span className="text-[9px] font-bold bg-amber-500/20 text-amber-500 px-1.5 rounded-full">{p.points}Б</span>
                   {i === 0 && state.userLocation && <span className="text-[9px] text-zinc-600 font-bold uppercase">{formatDistance(getDistance(state.userLocation.lat, state.userLocation.lon, p.lat, p.lon))}</span>}
                 </div>
               </div>
               <button onClick={() => openInYandex(p.lat, p.lon)} className="p-2 text-zinc-500 active:text-amber-500 transition-colors"><Navigation size={20} /></button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4 bg-zinc-900/40 p-6 rounded-[32px] border border-dashed border-zinc-800">
         <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 text-center">Умные рекомендации</h4>
         <div className="space-y-3">
            {recommendations.map((p: Point) => (
              <div key={p.id} className="bg-zinc-900 p-3 rounded-2xl flex items-center justify-between border border-zinc-800/50">
                <div className="min-w-0 pr-4">
                  <h5 className="font-bold text-xs truncate">{p.name}</h5>
                  <p className="text-[9px] text-zinc-600 font-bold uppercase mt-0.5">Всего {lastPoint ? formatDistance(getDistance(lastPoint.lat, lastPoint.lon, p.lat, p.lon)) : '...'} от {lastPoint ? 'последней цели' : 'вас'}</p>
                </div>
                <button onClick={() => state.addToRoute(p.id)} className="w-8 h-8 bg-zinc-800 text-amber-500 rounded-xl flex items-center justify-center active:scale-95 transition-transform"><Plus size={18}/></button>
              </div>
            ))}
         </div>
      </section>
    </motion.div>
  );
}

function RatingView({ state }: { state: any, key?: string }) {
  const leaderboard = state.getLeaderboard();
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-8">
      <h2 className="text-3xl font-black italic tracking-tighter">Рейтинг воинов</h2>
      
      <div className="space-y-3">
        {leaderboard.map((user: any, i: number) => (
          <div 
            key={user.id} 
            onClick={() => state.setSelectedUserProfile(user)}
            className={cn(
              "p-4 rounded-3xl flex items-center gap-4 border transition-all active:scale-[0.98] cursor-pointer",
              user.isMe ? "bg-amber-500 border-amber-500 shadow-lg shadow-amber-500/20" : "bg-zinc-900 border-zinc-800"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl",
              user.isMe ? "bg-black text-amber-500" : "bg-zinc-800 text-zinc-400"
            )}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={cn("font-bold truncate", user.isMe ? "text-black" : "text-zinc-100")}>{user.fullName}</h4>
              <p className={cn("text-xs font-bold uppercase tracking-tighter", user.isMe ? "text-zinc-800" : "text-zinc-600")}>{user.motorcycle}</p>
            </div>
            <div className="text-right flex items-center gap-3">
              <div>
                <div className={cn("text-xl font-black", user.isMe ? "text-black" : "text-zinc-100")}>{user.totalPoints}</div>
                <div className={cn("text-[8px] font-black uppercase tracking-widest", user.isMe ? "text-zinc-800" : "text-zinc-600")}>Очков</div>
              </div>
              {state.isAdmin && !user.isMe && !user.id.startsWith('hof') && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Удалить участника ${user.fullName}?`)) {
                      state.deleteUser(user.id);
                    }
                  }}
                  className="p-2 bg-red-500/20 text-red-500 rounded-xl active:scale-95 transition-transform"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ProfileView({ state }: { state: any, key?: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: state.authState.user.fullName,
    phone: state.authState.user.phone,
    motorcycle: state.authState.user.motorcycle,
    avatarBase64: state.authState.user.avatarBase64
  });
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  const handleUpdate = () => {
    state.updateProfile(formData.fullName, formData.phone, formData.motorcycle, formData.avatarBase64);
    setIsEditing(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatarBase64: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${state.authState.user.id}`;
    navigator.clipboard.writeText(link);
    alert('Ссылка на регистрацию скопирована!');
  };

  const handleExport = () => {
    const data = state.visits.map((v: Visit) => {
      const p = state.points.find((p: Point) => p.id === v.pointId);
      return {
        point: p?.name,
        points: p?.points,
        date: new Date(v.timestamp).toLocaleString()
      };
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_road_log.json`;
    a.click();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-10">
      <div className="relative flex flex-col items-center gap-4 text-center">
        {state.authState.user.avatarBase64 ? (
          <img src={state.authState.user.avatarBase64} alt="" className="w-24 h-24 rounded-[35%] object-cover border-2 border-amber-500 shadow-2xl" />
        ) : (
          <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-500 rounded-[35%] flex items-center justify-center text-4xl font-black text-black shadow-2xl">
            {state.authState.user.fullName[0]}
          </div>
        )}
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight">{state.authState.user.fullName}</h2>
          <p className="text-amber-500 font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">
            {state.authState.user.motorcycle}
            {state.isAdmin && <span className="bg-emerald-500 text-black px-2 py-0.5 rounded text-[8px]">ADMIN</span>}
          </p>
        </div>
        <button onClick={() => setIsEditing(true)} className="absolute top-0 right-0 p-3 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500 active:text-amber-500">
          <Edit2 size={20} />
        </button>
      </div>

      <div className="bg-zinc-900 p-6 rounded-[32px] border border-zinc-800 space-y-4">
        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 pr-2">
          <Share2 size={14}/> Твоя ссылка для друзей
        </h3>
        <div className="flex gap-2">
          <input 
            readOnly 
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-[10px] font-mono text-zinc-500 overflow-hidden text-ellipsis"
            value={`${window.location.origin}?ref=${state.authState.user.id}`} 
          />
          <button onClick={copyReferralLink} className="bg-amber-500 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap">Копировать</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 p-6 rounded-[32px] border border-zinc-800 text-center">
           <Trophy className="text-amber-500 mx-auto mb-2" size={24} />
           <div className="text-2xl font-black leading-none">{state.totalScore}</div>
           <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-2">Баллов</div>
        </div>
        <div className="bg-zinc-900 p-6 rounded-[32px] border border-zinc-800 text-center">
           <CheckCircle2 className="text-emerald-500 mx-auto mb-2" size={24} />
           <div className="text-2xl font-black leading-none">{state.visits.length}</div>
           <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-2">Точек взято</div>
        </div>
      </div>

      <section className="bg-zinc-900 p-6 rounded-[32px] border border-zinc-800 space-y-4">
        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><UserIcon size={14}/> Личные данные</h3>
        <div className="grid grid-cols-1 gap-4 text-sm font-medium">
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-500">Email</span>
            <span className="text-zinc-100">{state.authState.user.email}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-500">Телефон</span>
            <span className="text-zinc-100">{state.authState.user.phone}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-500">Мотоцикл</span>
            <span className="text-zinc-100">{state.authState.user.motorcycle}</span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
         <div className="flex justify-between items-center px-1">
            <h3 className="text-xl font-black italic tracking-tighter">Журнал прохвата</h3>
            <button onClick={handleExport} className="text-zinc-500 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest underline"><FileDown size={14}/> Экспорт</button>
         </div>
         <div className="bg-zinc-900 rounded-[32px] border border-zinc-800 overflow-hidden divide-y divide-zinc-800">
            {state.visits.length === 0 ? (
              <div className="p-10 text-center text-zinc-600 text-sm italic font-medium">Вы еще не брали точек. Время в путь!</div>
            ) : (
              state.visits.map((v: Visit) => {
                const p = state.points.find((p: Point) => p.id === v.pointId);
                return (
                  <div key={v.pointId} onClick={() => setSelectedVisit(v)} className="p-5 flex items-center gap-4 group cursor-pointer active:bg-zinc-800/50">
                     {v.photoBase64 ? <img src={v.photoBase64} alt="" className="w-12 h-12 rounded-xl object-cover border border-zinc-700" /> : <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center"><MapPin size={20} className="text-zinc-600"/></div>}
                     <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate">{p?.name}</h4>
                        <p className="text-[10px] font-bold text-zinc-600 uppercase">{new Date(v.timestamp).toLocaleDateString()}</p>
                     </div>
                     <div className="text-amber-500 font-black">+{p?.points}</div>
                  </div>
                );
              })
            )}
         </div>
      </section>

      <button onClick={state.logout} className="w-full text-zinc-600 font-bold uppercase text-xs tracking-widest border border-zinc-800 py-4 rounded-3xl active:text-red-500 transition-colors">
        Покинуть лагерь (Выход)
      </button>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-zinc-900 p-8 rounded-[40px] w-full max-w-sm border border-zinc-800 space-y-6">
                <h3 className="text-2xl font-black italic underline underline-offset-8 decoration-amber-500">Правка профиля</h3>
                <div className="flex justify-center">
                   <div className="relative w-20 h-20">
                     {formData.avatarBase64 ? (
                        <img src={formData.avatarBase64} alt="" className="w-full h-full rounded-2xl object-cover border-2 border-amber-500" />
                     ) : (
                        <div className="w-full h-full rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-500">
                           <UserIcon size={32} />
                        </div>
                     )}
                     <label className="absolute -bottom-2 -right-2 p-2 bg-amber-500 rounded-full text-black cursor-pointer shadow-lg active:scale-90 transition-transform">
                        <Camera size={16} />
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                     </label>
                   </div>
                </div>
                <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">ФИО</label>
                      <input 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 outline-none focus:border-amber-500" 
                        value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})}
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Мотоцикл</label>
                      <input 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 outline-none focus:border-amber-500" 
                        value={formData.motorcycle} onChange={e => setFormData({...formData, motorcycle: e.target.value})}
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Телефон</label>
                      <input 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 outline-none focus:border-amber-500" 
                        value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                   </div>
                </div>
                <div className="flex gap-3">
                   <button onClick={() => setIsEditing(false)} className="flex-1 text-zinc-500 font-bold">Отмена</button>
                   <button onClick={handleUpdate} className="flex-1 bg-amber-500 text-black font-black py-4 rounded-2xl shadow-xl shadow-amber-500/20">Сохранить</button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedVisit && (
          <VisitDetails 
            visit={selectedVisit} 
            point={state.points.find((p: Point) => p.id === selectedVisit.pointId)!} 
            onClose={() => setSelectedVisit(null)}
            onCancel={(pid) => {
              state.cancelCheckIn(pid);
              setSelectedVisit(null);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function VisitDetails({ visit, point, onClose, onCancel }: { visit: Visit, point: Point, onClose: () => void, onCancel: (pid: number) => void }) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex flex-col pt-10">
      <div className="flex-1 overflow-y-auto max-w-md mx-auto w-full px-6 pb-12">
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-xl font-black italic tracking-tighter text-amber-500">Достижение</h3>
           <button onClick={onClose} className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-500"><X size={24} /></button>
        </div>

        <div className="space-y-8">
           {visit.photoBase64 ? (
              <div className="aspect-square w-full rounded-[40px] overflow-hidden border border-zinc-800 shadow-2xl relative">
                <img src={visit.photoBase64} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-8">
                   <div className="text-2xl font-black">{point.name}</div>
                   <div className="text-zinc-400 text-xs font-bold uppercase tracking-widest">{new Date(visit.timestamp).toLocaleString()}</div>
                </div>
              </div>
           ) : (
              <div className="aspect-square w-full rounded-[40px] bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center gap-4">
                 <Camera size={48} className="text-zinc-700" />
                 <p className="text-zinc-600 font-bold uppercase text-xs tracking-widest">Нет фотографии</p>
              </div>
           )}

           <div className="bg-zinc-900 p-8 rounded-[40px] border border-zinc-800 space-y-6">
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center font-black">+{point.points}</div>
                    <div className="text-zinc-400 font-medium">Получено баллов за эту точку</div>
                 </div>
              </div>
              
              {!showConfirm ? (
                <button 
                  onClick={() => setShowConfirm(true)}
                  className="w-full py-4 text-red-500 font-black uppercase text-xs tracking-widest border border-red-500/20 rounded-2xl active:bg-red-500/10 transition-colors"
                >
                  Отменить взятие
                </button>
              ) : (
                <div className="space-y-3">
                   <p className="text-[10px] font-black text-red-500 uppercase text-center">Вы уверены? Баллы будут списаны.</p>
                   <div className="flex gap-2">
                     <button onClick={() => setShowConfirm(false)} className="flex-1 py-4 bg-zinc-800 text-zinc-400 font-bold rounded-2xl text-xs uppercase">Нет</button>
                     <button onClick={() => onCancel(visit.pointId)} className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl text-xs uppercase shadow-lg shadow-red-500/20">Да, удалить</button>
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>
    </motion.div>
  );
}

function AuthView({ login }: { login: any }) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [motorcycle, setMotorcycle] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setIsNewUser(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    const referrerId = params.get('ref') || undefined;
    login(email, fullName, phone, motorcycle, referrerId);
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-zinc-950 p-8 text-zinc-100">
      <div className="flex-1 flex flex-col justify-center space-y-12">
        <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-amber-500 rounded-[35%] rotate-12 flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(245,158,11,0.2)]">
               <Navigation size={48} className="-rotate-12 text-black fill-black" />
            </div>
            <div>
              <h1 className="text-5xl font-black italic tracking-tighter text-zinc-100">B3-ROAD47</h1>
              <p className="text-amber-500 font-black tracking-[0.3em] text-[10px] mt-1 ml-1 uppercase">St.Petersburg & Leo Region</p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="email" placeholder="Email" required
            className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl py-4 px-7 font-medium outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all"
            value={email} onChange={e => setEmail(e.target.value)}
          />
          {isNewUser && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-4 overflow-hidden">
              <input 
                placeholder="ФИО" required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl py-4 px-7 font-medium outline-none focus:border-amber-500"
                value={fullName} onChange={e => setFullName(e.target.value)}
              />
              <input 
                placeholder="Телефон" required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl py-4 px-7 font-medium outline-none focus:border-amber-500"
                value={phone} onChange={e => setPhone(e.target.value)}
              />
              <input 
                placeholder="Модель мотоцикла" required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl py-4 px-7 font-medium outline-none focus:border-amber-500"
                value={motorcycle} onChange={e => setMotorcycle(e.target.value)}
              />
            </motion.div>
          )}
          <button 
            type="submit"
            className="w-full bg-amber-500 text-black font-black py-5 rounded-[2rem] text-xl shadow-2xl shadow-amber-500/20 active:scale-95 transition-all uppercase tracking-widest"
          >
            {isNewUser ? 'Завести мотор' : 'В гараж'}
          </button>
        </form>

        <div className="text-center">
          <button 
            type="button"
            onClick={() => setIsNewUser(!isNewUser)}
            className="text-zinc-500 font-black text-xs uppercase tracking-widest underline underline-offset-8"
          >
            {isNewUser ? 'Уже есть допуск?' : 'Стать участником'}
          </button>
        </div>
      </div>
      
      <p className="text-center text-zinc-800 text-[10px] font-black uppercase tracking-[0.4em] mt-12 py-4">Built for open roads</p>
    </div>
  );
}

function PublicProfileView({ user, onClose, points }: { user: any, onClose: () => void, points: Point[] }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col pt-10">
      <div className="flex-1 overflow-y-auto max-w-md mx-auto w-full px-6 pb-12">
        <div className="flex justify-end mb-4">
           <button onClick={onClose} className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-500"><X size={24} /></button>
        </div>

        <div className="space-y-10">
          <div className="flex flex-col items-center gap-4 text-center">
            {user.avatarBase64 ? (
              <img src={user.avatarBase64} alt="" className="w-24 h-24 rounded-[35%] object-cover border-2 border-amber-500 shadow-2xl" />
            ) : (
              <div className="w-24 h-24 bg-zinc-800 rounded-[35%] flex items-center justify-center text-4xl font-black text-amber-500 border border-zinc-700 shadow-2xl">
                {user.fullName[0]}
              </div>
            )}
            <div className="space-y-1">
              <h2 className="text-3xl font-black tracking-tight">{user.fullName}</h2>
              <p className="text-amber-500 font-black uppercase text-xs tracking-widest">{user.motorcycle}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900 p-6 rounded-[32px] border border-zinc-800 text-center">
               <Trophy className="text-amber-500 mx-auto mb-2" size={24} />
               <div className="text-2xl font-black leading-none">{user.totalPoints}</div>
               <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-2">Баллов</div>
            </div>
          </div>

          <section className="bg-zinc-900 p-6 rounded-[32px] border border-zinc-800 space-y-4">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><UserIcon size={14}/> О райдере</h3>
            <div className="grid grid-cols-1 gap-4 text-sm font-medium">
               {user.email !== 'N/A' && (
                 <div className="flex justify-between border-b border-zinc-800 pb-2">
                   <span className="text-zinc-500">Email</span>
                   <span className="text-zinc-100">{user.email}</span>
                 </div>
               )}
               {user.phone !== 'N/A' && (
                 <div className="flex justify-between border-b border-zinc-800 pb-2">
                   <span className="text-zinc-500">Телефон</span>
                   <span className="text-zinc-100">{user.phone}</span>
                 </div>
               )}
               <div className="flex justify-between border-b border-zinc-800 pb-2">
                 <span className="text-zinc-500">Мотоцикл</span>
                 <span className="text-zinc-100">{user.motorcycle}</span>
               </div>
            </div>
          </section>

          <p className="text-center text-zinc-600 text-sm font-medium italic">Подробный журнал посещений доступен только владельцу профиля.</p>
        </div>
      </div>
    </motion.div>
  );
}
