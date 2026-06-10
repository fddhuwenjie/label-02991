/// <reference types="vite/client" />

declare namespace AMap {
  class Map {
    constructor(container: HTMLElement | string, options?: Record<string, unknown>);
    setCenter(center: [number, number]): void;
    setFitView(overlays: unknown[]): void;
    destroy(): void;
  }
  class Marker {
    constructor(options?: Record<string, unknown>);
    setMap(map: Map | null): void;
    setPosition(position: [number, number]): void;
  }
  class Polyline {
    constructor(options?: Record<string, unknown>);
    setMap(map: Map | null): void;
    setPath(path: [number, number][]): void;
  }
}

interface Window {
  AMap: typeof AMap;
}
