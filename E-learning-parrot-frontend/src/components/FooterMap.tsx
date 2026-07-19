import { useMemo } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const pinIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const OFFICE = {
  label: "Kigali, Rwanda",
  lat: -1.9438,
  lon: 30.0619,
  zoom: 13,
  address: "Kigali, Rwanda — F&R Rwanda Ltd",
  directionsUrl:
    "https://www.openstreetmap.org/?mlat=-1.9438&mlon=30.0619#map=13/-1.9438/30.0619",
} as const;

const FooterMap = () => {
  const mapKey = useMemo(() => `${OFFICE.lat}-${OFFICE.lon}-${OFFICE.zoom}`, []);

  return (
    <div className="mt-10 rounded-xl overflow-hidden border border-white/10">
      <div className="relative h-48 w-full md:h-56 bg-[#dbeafe]">
        <MapContainer
          key={mapKey}
          center={[OFFICE.lat, OFFICE.lon]}
          zoom={OFFICE.zoom}
          scrollWheelZoom={false}
          dragging={true}
          zoomControl={true}
          className="h-full w-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[OFFICE.lat, OFFICE.lon]} icon={pinIcon}>
            <Popup>
              <strong>{OFFICE.label}</strong>
              <br />
              {OFFICE.address}
            </Popup>
          </Marker>
        </MapContainer>

        <div className="absolute bottom-2 left-2 right-2 z-[500] flex flex-wrap items-end justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto max-w-[90%] space-y-1">
            <a
              href={OFFICE.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0070D0]/95 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-[#0070D0] transition-colors"
            >
              <MapPin className="h-3 w-3 text-[#FCC400]" />
              {OFFICE.label}
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
            <p className="rounded-md bg-[#0070D0]/90 px-2.5 py-1 text-[10px] leading-snug text-white/90">
              {OFFICE.address}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FooterMap;
