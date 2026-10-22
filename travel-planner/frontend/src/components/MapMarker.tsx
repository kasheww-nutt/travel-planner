import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import type { Place } from "../types/trip";
export default function MapMarker({
  place,
  selected,
  onSelect,
}: {
  place: Place;
  selected: boolean;
  onSelect: () => void;
}) {
  if (!place.coordinates) return null;
  const icon = L.divIcon({
    className: "custom-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `<span class="map-pin ${place.isChanged ? "changed" : ""} ${selected ? "selected" : ""}">${Number(place.order)}</span>`,
  });
  return (
    <Marker
      position={[place.coordinates.lat, place.coordinates.lng]}
      icon={icon}
      title={`Stop ${place.order}: ${place.name}`}
      eventHandlers={{ click: onSelect }}
    >
      <Tooltip direction="right" permanent>
        {place.name}
      </Tooltip>
    </Marker>
  );
}
