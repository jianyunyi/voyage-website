import { useEffect, useRef, useState } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { CheckCircle2, ChevronRight, Clock3, Info, MapPin, Navigation, Satellite, Star, TriangleAlert } from 'lucide-react';
import { ActionButton } from '../components/ActionButton';
import { ImmersiveBackdrop } from '../components/ImmersiveBackdrop';
import { canPlanRoute } from './mapPlannerState';

type City = {
  id: string;
  name: string;
  keyword: string;
  lnglat: [number, number];
};

type MapStatus = 'unavailable' | 'loading' | 'ready' | 'error';

type RouteInfo = {
  time: string;
  distance: string;
  tolls: string;
  taxiCost: string;
};

const initialCities: City[] = [
  { id: 'c1', name: '北京', keyword: '北京市', lnglat: [116.397428, 39.90923] },
  { id: 'c2', name: '上海', keyword: '上海市', lnglat: [121.473701, 31.230416] },
  { id: 'c3', name: '广州', keyword: '广州市', lnglat: [113.280637, 23.125178] },
  { id: 'c4', name: '成都', keyword: '成都市', lnglat: [104.065735, 30.659462] },
  { id: 'c5', name: '西安', keyword: '西安市', lnglat: [108.940174, 34.341568] },
];

type ClientEnvironment = Record<string, string | undefined>;

const clientEnvironment = (import.meta as ImportMeta & { env?: ClientEnvironment }).env;
const amapKey = clientEnvironment?.VITE_AMAP_KEY?.trim();
const amapSecurityCode = clientEnvironment?.VITE_AMAP_SECURITY_JS_CODE?.trim();
const hasAmapCredentials = Boolean(amapKey && amapSecurityCode);

export default function MapPlanner() {
  const [availableCities, setAvailableCities] = useState<City[]>(initialCities);
  const [origin, setOrigin] = useState('c1');
  const [destination, setDestination] = useState('c4');
  const [selectingType, setSelectingType] = useState<'origin' | 'destination'>('origin');
  const [showRoutes, setShowRoutes] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [mapStatus, setMapStatus] = useState<MapStatus>(hasAmapCredentials ? 'loading' : 'unavailable');
  const [isPlanning, setIsPlanning] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState('r1');

  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<AMap.Map | null>(null);
  const [amap, setAmap] = useState<AMapNamespace | null>(null);
  const drivingRef = useRef<AMap.Driving | null>(null);
  const originMarkerRef = useRef<AMap.Marker | null>(null);
  const destinationMarkerRef = useRef<AMap.Marker | null>(null);
  const stateRef = useRef({ selectingType, origin, destination });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    stateRef.current = { selectingType, origin, destination };
  }, [destination, origin, selectingType]);

  const clearRoute = () => {
    setShowRoutes(false);
    setRouteInfo(null);
    setIsPlanning(false);
    drivingRef.current?.clear();
  };

  const updateSelection = (cityId: string) => {
    if (stateRef.current.selectingType === 'origin') {
      setOrigin(cityId);
      setSelectingType('destination');
    } else {
      setDestination(cityId);
      setSelectingType('origin');
    }
    clearRoute();
  };

  useEffect(() => {
    let disposed = false;
    let createdMap: AMap.Map | null = null;

    if (!hasAmapCredentials) {
      setMapStatus('unavailable');
      return undefined;
    }

    setMapStatus('loading');
    window._AMapSecurityConfig = { securityJsCode: amapSecurityCode! };

    AMapLoader.load({
      key: amapKey!,
      version: '2.0',
      plugins: ['AMap.Driving', 'AMap.ToolBar', 'AMap.Scale', 'AMap.Geocoder'],
    })
      .then((AMap) => {
        if (disposed || !mapRef.current) return;

        const map = new AMap.Map(mapRef.current, {
          zoom: 5,
          center: [104.1954, 35.8617],
        });
        createdMap = map;
        map.addControl(new AMap.ToolBar());
        map.addControl(new AMap.Scale());

        const driving = new AMap.Driving({ map, hideMarkers: false, showTraffic: true });
        drivingRef.current = driving;

        map.on('click', (event: AMap.MapEvent) => {
          const lnglat: [number, number] = [event.lnglat.getLng(), event.lnglat.getLat()];
          const geocoder = new AMap.Geocoder({ city: '全国', radius: 1000 });

          geocoder.getAddress(lnglat, (status, result) => {
            if (disposed || status !== 'complete' || result.info !== 'OK') return;

            const address = result.regeocode?.addressComponent;
            const cityName = address?.city || address?.province;
            if (!cityName) return;

            const cleanName = cityName.replace(/市$/, '').replace(/省$/, '');
            setAvailableCities((cities) => {
              const existingCity = cities.find((city) => city.name === cleanName || city.keyword === cityName);
              const city = existingCity ?? {
                id: `c_${Date.now()}`,
                name: cleanName,
                keyword: cityName,
                lnglat,
              };

              window.setTimeout(() => {
                if (!disposed) updateSelection(city.id);
              }, 0);

              return existingCity ? cities : [...cities, city];
            });
          });
        });

        setAmap(AMap);
        setMapInstance(map);
        setMapStatus('ready');
      })
      .catch((error: unknown) => {
        console.error('高德地图加载失败', error);
        if (!disposed) setMapStatus('error');
      });

    return () => {
      disposed = true;
      drivingRef.current = null;
      createdMap?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!mapInstance || !amap) return;

    if (originMarkerRef.current) {
      mapInstance.remove(originMarkerRef.current);
      originMarkerRef.current = null;
    }
    if (destinationMarkerRef.current) {
      mapInstance.remove(destinationMarkerRef.current);
      destinationMarkerRef.current = null;
    }
    if (showRoutes) return;

    const originCity = availableCities.find((city) => city.id === origin);
    const destinationCity = availableCities.find((city) => city.id === destination);
    const markers: AMap.Marker[] = [];

    if (originCity) {
      const marker = new amap.Marker({
        position: new amap.LngLat(...originCity.lnglat),
        title: `出发地: ${originCity.name}`,
        label: { content: `起: ${originCity.name}`, direction: 'top' },
      });
      mapInstance.add(marker);
      originMarkerRef.current = marker;
      markers.push(marker);
    }

    if (destinationCity) {
      const marker = new amap.Marker({
        position: new amap.LngLat(...destinationCity.lnglat),
        title: `目的地: ${destinationCity.name}`,
        label: { content: `终: ${destinationCity.name}`, direction: 'top' },
      });
      mapInstance.add(marker);
      destinationMarkerRef.current = marker;
      markers.push(marker);
    }

    if (markers.length) mapInstance.setFitView(markers, false, [72, 72, 72, 72]);
  }, [amap, availableCities, destination, mapInstance, origin, showRoutes]);

  const originCity = availableCities.find((city) => city.id === origin);
  const destinationCity = availableCities.find((city) => city.id === destination);
  const mapReady = mapStatus === 'ready' && Boolean(mapInstance && amap && drivingRef.current);
  const routeEnabled = canPlanRoute({ origin, destination, mapReady });

  const handleSearch = () => {
    if (!routeEnabled || !originCity || !destinationCity || !drivingRef.current) return;

    setIsPlanning(true);
    setShowRoutes(true);
    setRouteInfo(null);
    originMarkerRef.current && mapInstance?.remove(originMarkerRef.current);
    destinationMarkerRef.current && mapInstance?.remove(destinationMarkerRef.current);
    originMarkerRef.current = null;
    destinationMarkerRef.current = null;
    drivingRef.current.clear();

    try {
      drivingRef.current.search(
        [{ keyword: originCity.keyword, city: originCity.name }],
        [{ keyword: destinationCity.keyword, city: destinationCity.name }],
        (status, result) => {
          if (!mountedRef.current) return;

          if (status === 'complete' && result.routes?.length) {
            const route = result.routes[0];
            const hours = Math.floor(route.time / 3600);
            const minutes = Math.floor((route.time % 3600) / 60);
            setRouteInfo({
              time: hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`,
              distance: `${(route.distance / 1000).toFixed(1)}公里`,
              tolls: route.tolls ? `¥${route.tolls}` : '免费',
              taxiCost: route.taxi_cost ? `约 ¥${Math.round(route.taxi_cost)}` : '未知',
            });
          } else {
            console.error('获取路线数据失败：', result);
            setShowRoutes(false);
          }
          setIsPlanning(false);
        },
      );
    } catch (error) {
      console.error('发起路线规划失败', error);
      setShowRoutes(false);
      setIsPlanning(false);
    }
  };

  const routes = [
    {
      id: 'r1',
      name: '驾车路线',
      detail: routeInfo ? routeInfo.time : isPlanning ? '正在读取实时路况' : '高德实时路线',
      value: routeInfo ? routeInfo.distance : '实时',
      note: routeInfo ? `过路费 ${routeInfo.tolls}，出租车 ${routeInfo.taxiCost}` : '高德地图实时计算',
    },
    { id: 'r2', name: '高铁预估', detail: '8.5 小时', value: '¥680', note: '用于行程比较' },
    { id: 'r3', name: '飞机预估', detail: '3 小时', value: '¥850', note: '用于行程比较' },
  ];

  const mapMessage = mapStatus === 'unavailable'
    ? '未配置高德地图凭据。请设置 VITE_AMAP_KEY 和 VITE_AMAP_SECURITY_JS_CODE 后重新启动开发服务器。'
    : mapStatus === 'error'
      ? '地图服务暂时不可用。请检查高德地图凭据和网络连接后重试。'
      : mapStatus === 'loading'
        ? '正在连接地图服务…'
        : '';

  return (
    <section className="voyage-planner" aria-labelledby="planner-title">
      <ImmersiveBackdrop pathname="/planner" />
      <div className="voyage-planner__frame">
        <aside className="voyage-planner__rail" aria-label="路线规划控制台">
          <header className="voyage-planner__heading">
            <p className="voyage-planner__eyebrow">Wayfinding Observatory</p>
            <h1 id="planner-title">路线观察台</h1>
            <p>为你的下一段旅程整理方向、时间与决策线索。</p>
          </header>

          <form className="voyage-planner__form" onSubmit={(event) => { event.preventDefault(); handleSearch(); }}>
            <div className="voyage-planner__hint" role="status">
              <Info aria-hidden="true" size={17} />
              <span>{mapReady ? `可在地图点击选择${selectingType === 'origin' ? '出发地' : '目的地'}` : mapMessage}</span>
            </div>

            <div className="voyage-planner__field">
              <label htmlFor="planner-origin">出发地</label>
              <div className="voyage-planner__field-control">
                <MapPin aria-hidden="true" size={18} />
                <select
                  id="planner-origin"
                  value={origin}
                  disabled={!mapReady}
                  onFocus={() => setSelectingType('origin')}
                  onChange={(event) => {
                    setOrigin(event.target.value);
                    setSelectingType('destination');
                    clearRoute();
                  }}
                >
                  <option value="">选择出发地</option>
                  {availableCities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                </select>
              </div>
            </div>

            <div className="voyage-planner__field">
              <label htmlFor="planner-destination">目的地</label>
              <div className="voyage-planner__field-control voyage-planner__field-control--destination">
                <Navigation aria-hidden="true" size={18} />
                <select
                  id="planner-destination"
                  value={destination}
                  disabled={!mapReady}
                  onFocus={() => setSelectingType('destination')}
                  onChange={(event) => {
                    setDestination(event.target.value);
                    setSelectingType('origin');
                    clearRoute();
                  }}
                >
                  <option value="">选择目的地</option>
                  {availableCities.map((city) => <option key={city.id} value={city.id} disabled={city.id === origin}>{city.name}</option>)}
                </select>
              </div>
            </div>

            <ActionButton
              action="plan-route"
              pending={isPlanning}
              type="submit"
              disabled={!routeEnabled}
              className="voyage-planner__submit"
            />
          </form>

          <section className="voyage-planner__results" aria-labelledby="planner-results-title">
            <div className="voyage-planner__results-heading">
              <div>
                <p className="voyage-planner__eyebrow">Route signals</p>
                <h2 id="planner-results-title">路线建议</h2>
              </div>
              {showRoutes && routeInfo && <CheckCircle2 aria-label="实时路线已更新" size={18} />}
            </div>

            {showRoutes ? (
              <div className="voyage-planner__route-list">
                {routes.map((route) => (
                  <button
                    key={route.id}
                    type="button"
                    className="voyage-planner__route"
                    data-selected={selectedRouteId === route.id}
                    aria-pressed={selectedRouteId === route.id}
                    aria-label={`选择${route.name}，${route.detail}，${route.value}`}
                    onClick={() => setSelectedRouteId(route.id)}
                  >
                    <span className="voyage-planner__route-main">
                      <span>{route.name}</span>
                      <small>{route.detail}</small>
                    </span>
                    <span className="voyage-planner__route-value">{route.value}</span>
                    <span className="voyage-planner__route-note">{route.note}<ChevronRight aria-hidden="true" size={16} /></span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="voyage-planner__empty">
                <Star aria-hidden="true" size={20} />
                <p>{mapReady ? '选择两座城市后，观察台会给出路线信号。' : '地图就绪后，可从这里开始规划路线。'}</p>
              </div>
            )}
          </section>
        </aside>

        <section className="voyage-planner__map-region" aria-label="高德地图路线视图">
          <div ref={mapRef} className="voyage-planner__map" aria-hidden={!mapReady} />
          {mapStatus !== 'ready' && (
            <div className="voyage-planner__map-fallback" role="status" tabIndex={0}>
              <TriangleAlert aria-hidden="true" size={22} />
              <strong>{mapStatus === 'loading' ? '地图载入中' : '地图暂不可用'}</strong>
              <span>{mapMessage}</span>
            </div>
          )}

          {showRoutes && mapReady && mapInstance && amap && (
            <div className="voyage-planner__map-tools" aria-label="地图图层">
              <button type="button" onClick={() => { mapInstance.setLayers([new amap.TileLayer()]); mapInstance.setPitch(0); mapInstance.setRotation(0); }}>标准</button>
              <button
                type="button"
                onClick={() => {
                  const SatelliteLayer = amap.TileLayer.Satellite;
                  const RoadNetLayer = amap.TileLayer.RoadNet;
                  if (!SatelliteLayer || !RoadNetLayer) return;
                  mapInstance.setLayers([new SatelliteLayer(), new RoadNetLayer()]);
                  mapInstance.setPitch(0);
                  mapInstance.setRotation(0);
                }}
              >
                <Satellite aria-hidden="true" size={15} /> 卫星
              </button>
              <button type="button" onClick={() => { mapInstance.setLayers([new amap.TileLayer()]); mapInstance.setPitch(55); mapInstance.setRotation(35); }}>3D 视角</button>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
