export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}м`;
  }
  return `${km.toFixed(1)}км`;
}

export function openInYandex(lat: number, lon: number, mode: 'maps' | 'navigator' = 'maps') {
  const deepLink = mode === 'navigator' 
    ? `yandexnavi://build_route_on_map?lat_to=${lat}&lon_to=${lon}`
    : `yandexmaps://build_route-on-map?lat_to=${lat}&lon_to=${lon}`;
    
  const webUrl = `https://yandex.ru/maps/?rtext=~${lat},${lon}&rtt=auto`;
  
  // Try to open deep link
  window.location.href = deepLink;
  
  // Fallback after 1000ms if not in deep link capability (or show web maps)
  if (mode === 'maps') {
    setTimeout(() => {
      window.open(webUrl, '_blank');
    }, 1000);
  }
}

export function openRouteInYandex(points: { lat: number, lon: number }[], userLoc: { lat: number, lon: number } | null = null, mode: 'maps' | 'navigator' = 'maps') {
  if (points.length === 0) return;

  const routePoints = userLoc ? [userLoc, ...points] : points;
  const rtext = routePoints.map(p => `${p.lat},${p.lon}`).join('~');
  
  let deepLink = '';
  if (mode === 'navigator') {
    // Navigator format for multi-point is often just to and points
    const lastPoint = routePoints[routePoints.length - 1];
    deepLink = `yandexnavi://build_route_on_map?lat_to=${lastPoint.lat}&lon_to=${lastPoint.lon}`;
  } else {
    deepLink = `yandexmaps://maps.yandex.ru/?rtext=${rtext}&rtt=auto`;
  }

  const webUrl = `https://yandex.ru/maps/?rtext=${rtext}&rtt=auto`;

  window.location.href = deepLink;

  if (mode === 'maps') {
    setTimeout(() => {
      window.open(webUrl, '_blank');
    }, 1000);
  }
}

export function openInGoogle(lat: number, lon: number) {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
}
