import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { STATUT_LABELS, STATUT_COLORS, type Mission, type MissionStatut } from './types';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

// ---------------------------------------------------------------------------
// Color map for markers
// ---------------------------------------------------------------------------

const MARKER_COLORS: Record<MissionStatut, string> = {
  planifiee: '#f59e0b',
  assignee:  '#3b82f6',
  terminee:  '#10b981',
  annulee:   '#ef4444',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  missions: Mission[];
  loading: boolean;
  onMissionClick: (m: Mission) => void;
}

export function MissionMap({ missions, loading, onMissionClick }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [selected, setSelected] = useState<Mission | null>(null);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [2.3522, 46.8566], // France
      zoom: 5,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const geoMissions = missions.filter((m) => m.latitude && m.longitude);

    geoMissions.forEach((mission) => {
      const el = document.createElement('div');
      el.className = 'mission-marker';
      el.style.cssText = `
        width: 32px; height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        cursor: pointer;
        background: ${MARKER_COLORS[mission.statut] ?? '#6b7280'};
        transition: transform 0.15s, box-shadow 0.15s;
      `;

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'rotate(-45deg) scale(1.15)';
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'rotate(-45deg) scale(1)';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';
      });
      el.addEventListener('click', () => {
        setSelected(mission);
        onMissionClick(mission);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([mission.longitude!, mission.latitude!])
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds if missions
    if (geoMissions.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      geoMissions.forEach((m) => bounds.extend([m.longitude!, m.latitude!]));
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 800 });
    }
  }, [missions, onMissionClick]);

  const geocoded = missions.filter((m) => m.latitude && m.longitude);
  const notGeocoded = missions.length - geocoded.length;

  return (
    <div className="space-y-3">
      {notGeocoded > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {notGeocoded} mission{notGeocoded > 1 ? 's' : ''} sans coordonnées GPS (adresse non géocodée)
        </p>
      )}

      <div className="relative rounded-xl overflow-hidden border" style={{ height: 520 }}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/60">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        )}
        <div ref={mapContainer} className="h-full w-full" />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 rounded-lg border bg-card/90 backdrop-blur-sm p-3 shadow-sm">
          <p className="text-xs font-semibold mb-2">Légende</p>
          <div className="space-y-1.5">
            {Object.entries(STATUT_LABELS).map(([statut, label]) => (
              <div key={statut} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ background: MARKER_COLORS[statut as MissionStatut] }}
                />
                <span className="text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {geocoded.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <MapPin className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">Aucune mission géocodée à afficher.</p>
          <p className="text-xs mt-1">Les missions apparaissent sur la carte quand leurs adresses ont des coordonnées GPS.</p>
        </div>
      )}
    </div>
  );
}
