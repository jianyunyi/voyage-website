export interface RoutePlanningState {
  origin: string;
  destination: string;
  mapReady: boolean;
}

export function canPlanRoute({ origin, destination, mapReady }: RoutePlanningState): boolean {
  return mapReady && Boolean(origin) && Boolean(destination) && origin !== destination;
}
