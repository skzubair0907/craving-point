/// <reference types="@types/google.maps" />

/**
 * Initialize a Google Map instance
 * @param containerRef - Ref to the DOM element that will contain the map
 * @param options - Map options (center, zoom, etc.)
 * @returns Google Maps map instance
 */
export function initMap(
  containerRef: HTMLDivElement | null,
  options: google.maps.MapOptions
): google.maps.Map {
  if (!containerRef) {
    throw new Error('Map container ref is null');
  }
  return new google.maps.Map(containerRef, options);
}

/**
 * Add a marker to the map
 * @param map - Google Maps map instance
 * @param position - Latitude and longitude for the marker
 * @param options - Marker options
 * @returns Marker instance
 */
export function addMarker(
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  options: google.maps.MarkerOptions = {}
): google.maps.Marker {
  return new google.maps.Marker({
    ...options,
    position,
    map,
  });
}

/**
 * Update the position of an existing marker
 * @param marker - Marker instance to update
 * @param position - New latitude and longitude
 */
export function updateMarker(
  marker: google.maps.Marker,
  position: google.maps.LatLngLiteral
): void {
  marker.setPosition(position);
}

/**
 * Add a polyline to the map
 * @param map - Google Maps map instance
 * @param path - Array of LatLngLiteral points
 * @param options - Polyline options
 * @returns Polyline instance
 */
export function addPolyline(
  map: google.maps.Map,
  path: google.maps.LatLngLiteral[],
  options: google.maps.PolylineOptions = {}
): google.maps.Polyline {
  return new google.maps.Polyline({
    ...options,
    path,
    map,
  });
}

/**
 * Update the path of an existing polyline
 * @param polyline - Polyline instance to update
 * @param path - New array of LatLngLiteral points
 */
export function updatePolyline(
  polyline: google.maps.Polyline,
  path: google.maps.LatLngLiteral[]
): void {
  polyline.setPath(path);
}

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 - Latitude of point 1
 * @param lng1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lng2 - Longitude of point 2
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate bearing (direction) from point 1 to point 2
 * @param lat1 - Latitude of point 1
 * @param lng1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lng2 - Longitude of point 2
 * @returns Bearing in degrees from north
 */
export function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  let θ = Math.atan2(y, x);
  θ = (θ * 180) / Math.PI; // Convert to degrees
  return (θ + 360) % 360; // Normalize to 0-360
}

/**
 * No Google Maps API key is used in this project.
 * The public location page uses the free iframe embed instead.
 */
export function loadGoogleMapsApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google && (window as any).google.maps) {
      resolve();
      return;
    }

    reject(new Error('Google Maps API is not used in this app. Using the iframe-based location fallback.'));
  });
}