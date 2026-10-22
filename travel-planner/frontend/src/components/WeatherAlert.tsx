import { Cloud, CloudRain } from "lucide-react";
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
      aria-label={
        weather.source
          ? "View live forecast details"
          : "View sample weather details"
      }
    >
      {weather.source ? <Cloud size={30} /> : <CloudRain size={30} />}
      <span>
        <strong>{weather.title}</strong>
        <span>{weather.description}</span>
        <small>
          {weather.source
            ? "Open-Meteo · city-wide daily forecast"
            : "Sample weather · not a forecast"}
        </small>
      </span>
    </button>
  );
}
