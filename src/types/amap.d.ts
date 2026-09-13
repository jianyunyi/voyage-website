declare namespace AMap {
  /** Base type for all overlay classes (Marker, Polyline, Polygon, etc.) */
  interface Overlay {
    setMap(map: Map | null): void;
    show(): void;
    hide(): void;
  }

  /** Base type for all control classes (ToolBar, Scale, etc.) */
  interface Control {
    show(): void;
    hide(): void;
  }

  /** Options shared across tile-layer subclasses */
  interface TileLayerOptions {
    zooms?: [number, number];
    opacity?: number;
    zIndex?: number;
    detectRetina?: boolean;
  }

  /** A single driving step within a route */
  interface DrivingStep {
    start_location: LngLat;
    end_location: LngLat;
    instruction: string;
    road: string;
    distance: number;
    time: number;
    path: LngLat[];
    action: string;
    assistant_action: string;
    orientation: string;
    tolls: number;
    toll_distance: number;
    toll_road: string;
  }

  class Map {
    constructor(container: HTMLElement, opts?: MapOptions);
    destroy(): void;
    add(obj: Overlay): void;
    remove(obj: Overlay): void;
    setFitView(objs?: Overlay[], immediate?: boolean, padding?: number[]): void;
    setCenter(center: [number, number]): void;
    setZoom(zoom: number): void;
    setPitch(pitch: number): void;
    setRotation(rotation: number): void;
    setLayers(layers: TileLayer[]): void;
    addControl(control: Control): void;
    on(event: string, handler: (e: MapEvent) => void): void;
  }

  interface MapOptions {
    zoom?: number;
    center?: [number, number];
  layers?: TileLayer[];
  pitch?: number;
  rotation?: number;
  viewMode?: string;
  }

  interface MapEvent {
    lnglat: LngLat;
    pixel: Pixel;
    target: Overlay | Map | object;
  }

  class LngLat {
    constructor(lng: number, lat: number);
    getLng(): number;
    getLat(): number;
  }

  class Pixel {
    constructor(x: number, y: number);
  }

  class Marker implements Overlay {
    constructor(opts?: MarkerOptions);
    setPosition(lnglat: LngLat): void;
    setLabel(label?: LabelOptions): void;
    setTitle(title: string): void;
    setMap(map: Map | null): void;
    show(): void;
    hide(): void;
  }

  interface MarkerOptions {
    position?: LngLat;
    title?: string;
    label?: LabelOptions;
    icon?: string | Icon;
    content?: string;
    offset?: Pixel;
  }

  interface LabelOptions {
    content?: string;
    direction?: string;
    offset?: Pixel;
  }

  class Icon {
    constructor(opts?: IconOptions);
  }

  interface IconOptions {
    size?: Size;
    image?: string;
    imageSize?: Size;
  }

  class Size {
    constructor(width: number, height: number);
  }

  class Driving {
    constructor(opts?: DrivingOptions);
    search(
      origin: DrivingPoint[],
      destination: DrivingPoint[],
      callback: (status: string, result: DrivingResult) => void
    ): void;
    clear(): void;
    setMap(map: Map): void;
  }

  interface DrivingOptions {
    map?: Map;
    hideMarkers?: boolean;
    showTraffic?: boolean;
    panel?: HTMLElement | string;
  }

  interface DrivingPoint {
    keyword?: string;
    city?: string;
  }

  interface DrivingResult {
    info?: string;
    routes?: DrivingRoute[];
  }

  interface DrivingRoute {
    time: number;
    distance: number;
    tolls: number;
    taxi_cost: number;
    steps: DrivingStep[];
  }

  class Geocoder {
    constructor(opts?: GeocoderOptions);
    getAddress(
      location: number[] | LngLat,
      callback: (status: string, result: GeocoderResult) => void
    ): void;
  }

  interface GeocoderOptions {
    city?: string;
    radius?: number;
  }

  interface GeocoderResult {
    info?: string;
    regeocode?: ReGeocode;
  }

  interface ReGeocode {
    addressComponent: AddressComponent;
  }

  interface AddressComponent {
    city: string;
    province: string;
    district: string;
    street: string;
  }

  interface ToolBarOptions {
    offset?: Pixel;
    position?: 'LT' | 'RT' | 'LB' | 'RB';
    ruler?: boolean;
    noStyle?: boolean;
    locate?: boolean;
    liteStyle?: boolean;
    direction?: boolean;
    autoPosition?: boolean;
    hideFloorBar?: boolean;
    zoomInText?: string;
    zoomInTitle?: string;
    zoomOutText?: string;
    zoomOutTitle?: string;
  }

  class ToolBar implements Control {
    constructor(opts?: ToolBarOptions);
    show(): void;
    hide(): void;
  }

  interface ScaleOptions {
    offset?: Pixel;
    position?: 'LT' | 'RT' | 'LB' | 'RB';
  }

  class Scale implements Control {
    constructor(opts?: ScaleOptions);
    show(): void;
    hide(): void;
  }

  class TileLayer {
    static Satellite?: new (opts?: TileLayerOptions) => TileLayer;
    static RoadNet?: new (opts?: TileLayerOptions) => TileLayer;
    constructor(opts?: TileLayerOptions);
  }

  interface BuildingsOptions {
    zooms?: [number, number];
    opacity?: number;
    zIndex?: number;
    heightFactor?: number;
    colorFactor?: number;
  }

  class Buildings {
    constructor(opts?: BuildingsOptions);
  }
}

/** Runtime AMap namespace object returned by AMapLoader.load() */
interface AMapNamespace {
  Map: typeof AMap.Map;
  LngLat: typeof AMap.LngLat;
  Pixel: typeof AMap.Pixel;
  Marker: typeof AMap.Marker;
  Icon: typeof AMap.Icon;
  Size: typeof AMap.Size;
  Driving: typeof AMap.Driving;
  Geocoder: typeof AMap.Geocoder;
  ToolBar: typeof AMap.ToolBar;
  Scale: typeof AMap.Scale;
  TileLayer: typeof AMap.TileLayer & {
    Satellite?: new (opts?: AMap.TileLayerOptions) => AMap.TileLayer;
    RoadNet?: new (opts?: AMap.TileLayerOptions) => AMap.TileLayer;
  };
  Buildings?: typeof AMap.Buildings;
}

declare module "@amap/amap-jsapi-loader" {
  interface AMapLoaderOptions {
    key: string;
    version: string;
    plugins?: string[];
    AMapUI?: { version?: string; plugins?: string[] };
    Loca?: { version?: string };
  }
  const AMapLoader: {
    load(options: AMapLoaderOptions): Promise<AMapNamespace>;
  };
  export default AMapLoader;
}

interface Window {
  _AMapSecurityConfig?: {
    securityJsCode: string;
  };
}
