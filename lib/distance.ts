export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Distancia geodésica aproximada en metros (fórmula de Haversine). */
export function straightLineDistanceMeters(
  origin: Coordinates,
  destination: Coordinates
): number {
  const earthRadiusMeters = 6_371_000;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(destination.latitude - origin.latitude);
  const longitudeDelta = radians(destination.longitude - origin.longitude);
  const originLatitude = radians(origin.latitude);
  const destinationLatitude = radians(destination.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  const boundedHaversine = Math.min(1, Math.max(0, haversine));

  return Math.ceil(
    earthRadiusMeters *
      2 *
      Math.atan2(Math.sqrt(boundedHaversine), Math.sqrt(1 - boundedHaversine))
  );
}

export function formatDistance(distanceMeters: number): string {
  return distanceMeters < 10_000
    ? `${distanceMeters} m`
    : `${(distanceMeters / 1000).toLocaleString("es-CL", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} km`;
}
