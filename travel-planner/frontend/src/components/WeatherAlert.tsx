import { CloudRain } from "lucide-react";
import type { WeatherEvent } from "../types/trip";
export default function WeatherAlert({
  weather,
  onOpen,
}: {
  weather: WeatherEvent;
  onOpen: () => void;
}) {
  return (
    <button
      className="map-weather"
      onClick={onOpen}
      aria-label="View sample weather details"
    >
      <CloudRain size={30} />
      <span>
        <strong>{weather.title}</strong>
        <span>{weather.description}</span>
        <small>Sample weather · not a forecast</small>
      </span>
    </button>
  );
}
