import { useEffect, useRef } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";

type LeafletLib = typeof import("leaflet");

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  inRange: boolean;
};

type Props = {
  lat: number;
  lng: number;
  radiusKm: number;
  pins: MapPin[];
  onMove?: (lat: number, lng: number) => void;
};

const TILE = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO';

function zoomFor(km: number) {
  if (km <= 1) return 15;
  if (km <= 2) return 14;
  if (km <= 4) return 13;
  if (km <= 7) return 12;
  return 11;
}

export function RangeMap({ lat, lng, radiusKm, pins, onMove }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const groupRef = useRef<LayerGroup | null>(null);
  const propsRef = useRef({ lat, lng, radiusKm, pins, onMove });
  propsRef.current = { lat, lng, radiusKm, pins, onMove };
  const pinsKey = pins.map((p) => `${p.id}:${p.inRange ? 1 : 0}:${p.lat.toFixed(4)}:${p.lng.toFixed(4)}`).join("|");

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;
    void (async () => {
      const mod = (await import("leaflet")) as LeafletLib & { default?: LeafletLib };
      const L = mod.default ?? mod;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !hostRef.current) return;
      const start = propsRef.current;
      map = L.map(hostRef.current, { zoomControl: false, attributionControl: true }).setView(
        [start.lat, start.lng],
        zoomFor(start.radiusKm),
      );
      L.tileLayer(TILE, { attribution: ATTR, maxZoom: 19, subdomains: "abcd" }).addTo(map);
      const group = L.layerGroup().addTo(map);
      mapRef.current = map;
      groupRef.current = group;
      paint(L, map, group, start);
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      groupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = groupRef.current;
    if (!map || !group) return;
    void import("leaflet").then((mod) => {
      const lib = mod as LeafletLib & { default?: LeafletLib };
      paint(lib.default ?? lib, map, group, { lat, lng, radiusKm, pins, onMove });
    });
  }, [lat, lng, radiusKm, pinsKey, onMove, pins]);

  return <div ref={hostRef} className="h-full w-full" />;
}

function paint(L: LeafletLib, map: LeafletMap, group: LayerGroup, props: Props) {
  group.clearLayers();
  L.circle([props.lat, props.lng], {
    radius: props.radiusKm * 1000,
    color: "#c4621a",
    weight: 1.5,
    fillColor: "#c4621a",
    fillOpacity: 0.12,
  }).addTo(group);

  const me = L.marker([props.lat, props.lng], {
    draggable: Boolean(props.onMove),
    icon: L.divIcon({
      className: "aas-icon",
      html: `<div class="aas-me"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    }),
  });
  if (props.onMove) {
    const move = props.onMove;
    me.on("dragend", () => {
      const p = me.getLatLng();
      move(p.lat, p.lng);
    });
  }
  me.addTo(group);

  for (const pin of props.pins) {
    const marker = L.marker([pin.lat, pin.lng], {
      icon: L.divIcon({
        className: "aas-icon",
        html: `<div class="aas-room${pin.inRange ? " in" : ""}"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
    });
    marker.bindTooltip(pin.title, { direction: "top", opacity: 0.95 });
    marker.addTo(group);
  }

  const center = map.getCenter();
  const shifted = Math.abs(center.lat - props.lat) > 0.0004 || Math.abs(center.lng - props.lng) > 0.0004;
  if (shifted) map.panTo([props.lat, props.lng], { animate: true, duration: 0.4 });
}
