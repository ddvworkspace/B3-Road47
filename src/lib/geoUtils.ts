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

export function openInYandex(lat: number, lon: number) {
  const url = `yandexmaps://build_route-on-map?lat_to=${lat}&lon_to=${lon}`;
  const webUrl = `https://yandex.ru/maps/?rtext=~${lat},${lon}&rtt=auto`;
  
  // Try to open deep link
  window.location.href = url;
  
  // Fallback after 500ms
  setTimeout(() => {
    window.open(webUrl, '_blank');
  }, 500);
}

export function openRouteInYandex(points: { lat: number, lon: number }[], userLoc: { lat: number, lon: number } | null = null) {
  if (points.length === 0) return;

  const routePoints = userLoc ? [userLoc, ...points] : points;

  // Format: rtext=lat_from,lon_from~lat_via1,lon_via1~lat_to,lon_to
  const rtext = routePoints.map(p => `${p.lat},${p.lon}`).join('~');
  const webUrl = `https://yandex.ru/maps/?rtext=${rtext}&rtt=auto`;
  
  const deepLink = `yandexmaps://maps.yandex.ru/?rtext=${rtext}&rtt=auto`;

  window.location.href = deepLink;

  setTimeout(() => {
    window.open(webUrl, '_blank');
  }, 500);
}

export function openInGoogle(lat: number, lon: number) {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
}
