export interface ForecastDay {
  day: string;
  condition: 'Sunny' | 'Cloudy' | 'Rainy' | 'Snowy' | 'Stormy';
  high: number;
  low: number;
}

export interface HourlyForecast {
  time: string;
  condition: 'Sunny' | 'Cloudy' | 'Rainy' | 'Snowy' | 'Stormy';
  temp: number;
  precipProb?: number; // Precipitation probability in %
}

export interface DetailedMetrics {
  uvIndex: {
    value: number;
    label: string;
  };
  humidity: {
    value: number;
    dewPoint: number;
  };
  wind: {
    speed: number;
    direction: number; // in degrees for pointer rotation
  };
  visibility: {
    value: number;
    description: string;
  };
  pressure: {
    value: number;
    trend: 'Stable' | 'Rising' | 'Falling';
  };
}

export interface WeatherReport {
  city: string;
  country: string;
  condition: 'Sunny' | 'Cloudy' | 'Rainy' | 'Snowy' | 'Stormy';
  tempCelsius: number;
  feelsLikeCelsius: number;
  dateText: string;
  timeText: string;
  forecast7Days: ForecastDay[];
  forecast24Hours: HourlyForecast[];
  metrics: DetailedMetrics;
  cozyAdvice: string;
}

export interface FavoriteCity {
  city: string;
  country: string;
  tempCelsius: number;
  condition: 'Sunny' | 'Cloudy' | 'Rainy' | 'Snowy' | 'Stormy';
}

export interface SearchHistoryItem {
  id: string;
  city: string;
  country: string;
  timestamp: string;
  tempCelsius: number;
  condition: string;
}
