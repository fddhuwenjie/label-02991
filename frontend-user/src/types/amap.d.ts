declare namespace AMap {
  class Map {
    constructor(container: string | HTMLElement, opts?: Record<string, unknown>);
    setCenter(pos: LngLat): void;
    setFitBounds(bounds: Bounds): void;
    destroy(): void;
    on(event: string, handler: () => void): void;
  }
  class Marker {
    constructor(opts?: Record<string, unknown>);
    setPosition(pos: LngLat): void;
    setMap(map: Map | null): void;
  }
  class Polyline {
    constructor(opts?: Record<string, unknown>);
    setPath(path: LngLat[]): void;
    setMap(map: Map | null): void;
  }
  class LngLat {
    constructor(lng: number, lat: number);
    getLng(): number;
    getLat(): number;
  }
  class Bounds {
    constructor(southWest: LngLat, northEast: LngLat);
  }
  class Pixel {
    constructor(x: number, y: number);
  }
}

interface Window {
  AMap?: typeof AMap;
  _AMapSecurityConfig?: { securityJsCode: string };
}
