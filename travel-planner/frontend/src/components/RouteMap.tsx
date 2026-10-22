import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import { useEffect, useState } from "react";
import { Plus, Minus, Navigation, TrainFront, Map } from "lucide-react";
import type { Place, WeatherEvent } from "../types/trip";
import MapMarker from "./MapMarker";
import WeatherAlert from "./WeatherAlert";
import "leaflet/dist/leaflet.css";

function Controls({
  places,
  selectedId,
}: {
  places: Place[];
  selectedId: string | null;
}) {
  const map = useMap();
  const fit = () => {
    const points = places.flatMap((p) =>
      p.coordinates
        ? [[p.coordinates.lat, p.coordinates.lng] as [number, number]]
        : [],
    );
    if (points.length)
      map.fitBounds(points, {
        paddingTopLeft: [55, 115],
        paddingBottomRight: [150, 55],
        maxZoom: 13,
        animate: false,
      });
  };
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
      fit();
    });
    observer.observe(map.getContainer());
    const timer = setTimeout(() => {
      map.invalidateSize({ pan: false });
      fit();
    }, 100);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [places, map]);
  useEffect(() => {
    const p = places.find((p) => p.id === selectedId);
    if (p?.coordinates)
      map.panTo([p.coordinates.lat, p.coordinates.lng], { animate: false });
  }, [selectedId, places, map]);
  return (
    <div className="map-zoom-controls">
      <button onClick={() => map.zoomIn()} aria-label="Zoom in">
        <Plus size={20} />
      </button>
      <button onClick={() => map.zoomOut()} aria-label="Zoom out">
        <Minus size={20} />
      </button>
      <button onClick={fit} aria-label="Fit all stops">
        <Navigation size={17} fill="currentColor" />
      </button>
    </div>
  );
}
export default function RouteMap({
  places,
  weather,
  selectedId,
  onSelect,
  onWeather,
  onTransport,
}: {
  places: Place[];
  weather: WeatherEvent | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onWeather: () => void;
  onTransport: () => void;
}) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const points = places.flatMap((p) =>
    p.coordinates
      ? [[p.coordinates.lat, p.coordinates.lng] as [number, number]]
      : [],
  );
  return (
    <section className="route-map card" aria-label="Illustrative itinerary map">
      {points.length ? (
        <MapContainer
          center={[35.683, 139.764]}
          zoom={12}
          zoomControl={false}
          zoomAnimation={false}
          fadeAnimation={false}
          markerZoomAnimation={false}
          preferCanvas
          scrollWheelZoom={false}
          className="leaflet-map"
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            eventHandlers={{
              tileerror: () => setTilesFailed(true),
              tileload: () => setTilesFailed(false),
            }}
          />
          <Polyline
            positions={points}
            pathOptions={{ color: "#214d3b", weight: 3, opacity: 0.9 }}
          />
          {places.map((place, i) =>
            place.isChanged &&
            i > 0 &&
            place.coordinates &&
            places[i - 1].coordinates ? (
              <Polyline
                key={`detour-${place.id}`}
                positions={[
                  [
                    places[i - 1].coordinates!.lat,
                    places[i - 1].coordinates!.lng,
                  ],
                  [place.coordinates.lat, place.coordinates.lng],
                ]}
                pathOptions={{ color: "#b44b30", weight: 4, dashArray: "7 6" }}
              />
            ) : null,
          )}
          {places.map((place) => (
            <MapMarker
              key={place.id}
              place={place}
              selected={selectedId === place.id}
              onSelect={() => onSelect(place.id)}
            />
          ))}
          <Controls places={places} selectedId={selectedId} />
        </MapContainer>
      ) : (
        <div className="empty-state">
          <Map size={32} />
          <h3>Your route, all in one place.</h3>
          <p>
            {places.length
              ? "These AI suggestions have no verified coordinates yet. Your itinerary remains available."
              : "Plan a day to see your stops here."}
          </p>
        </div>
      )}
      {weather && <WeatherAlert weather={weather} onOpen={onWeather} />}
      {!!points.length && (
        <>
          <span className="map-caption">
            Schematic route · approximate locations
          </span>
          <button className="transport-button" onClick={onTransport}>
            <TrainFront size={16} />
            View transport options
          </button>
        </>
      )}
      {tilesFailed && (
        <div className="tile-warning" role="status">
          Map tiles unavailable. All stops are listed in your itinerary.
        </div>
      )}
    </section>
  );
}
