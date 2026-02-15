import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { MapIcon } from '@heroicons/react/24/outline';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface SidebarMapPreviewProps {
  center: [number, number];
  label: string;
  onClick: () => void;
}

const SidebarMapPreview: React.FC<SidebarMapPreviewProps> = ({ center, label, onClick }) => {
  return (
    <div
      className="relative h-24 sm:h-32 w-full rounded-xl overflow-hidden mb-6 cursor-pointer group shadow-sm hover:shadow-md transition-shadow border border-gray-200"
      onClick={onClick}
    >
      <div className="absolute inset-0 pointer-events-none">
        <MapContainer
          center={center}
          zoom={13}
          zoomControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          attributionControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={center} />
        </MapContainer>
      </div>
      <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors flex items-center justify-center">
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-colors pointer-events-none">
          <MapIcon className="h-4 w-4" />
          {label}
        </button>
      </div>
    </div>
  );
};

export default SidebarMapPreview;
