import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());

// Initialize Gemini SDK with named parameters
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
let geminiDisabledUntil = 0; // Timestamp to temporarily disable Gemini when rate-limited or quota-exhausted

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log("Gemini API initialized successfully.");
  } catch (err) {
    console.log("Failed to initialize Gemini API:", err);
  }
} else {
  console.log("No valid GEMINI_API_KEY found. Falling back to deterministic simulation.");
}

// Helper to wrap a promise with a timeout and prevent unhandled promise rejections
async function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
  });

  // Attach catch handler directly to original promise to avoid unhandled rejections if it rejects later
  promise.catch((err) => {
    // Just swallow it silently to avoid flooding console logs
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

// Deterministic randomizer based on city name to keep weather stable for searches
function getDeterministicRandom(str: string, index: number) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const val = Math.sin(hash + index) * 10000;
  return val - Math.floor(val);
}

// Timezone and Time helpers
function getTimezoneOffsetForCity(cityName: string): number {
  const name = cityName.toLowerCase().trim();
  if (name.includes("phnom penh") || name.includes("cambodia") || name.includes("bangkok") || name.includes("thailand") || name.includes("vietnam") || name.includes("hanoi") || name.includes("jakarta")) {
    return 7;
  }
  if (name.includes("tokyo") || name.includes("kyoto") || name.includes("japan") || name.includes("seoul") || name.includes("korea")) {
    return 9;
  }
  if (name.includes("york") || name.includes("ny") || name.includes("nyc") || name.includes("boston") || name.includes("miami") || name.includes("toronto") || name.includes("montreal")) {
    return -4; // Eastern Daylight Time (July is Daylight Savings)
  }
  if (name.includes("london") || name.includes("dublin") || name.includes("uk") || name.includes("ireland")) {
    return 1; // British Summer Time
  }
  if (name.includes("paris") || name.includes("berlin") || name.includes("rome") || name.includes("madrid") || name.includes("amsterdam") || name.includes("brussels") || name.includes("vienna") || name.includes("france") || name.includes("germany") || name.includes("italy") || name.includes("spain")) {
    return 2; // Central European Summer Time
  }
  if (name.includes("sydney") || name.includes("melbourne") || name.includes("canberra") || name.includes("australia")) {
    return 10;
  }
  if (name.includes("moscow") || name.includes("istanbul") || name.includes("baghdad") || name.includes("nairobi") || name.includes("saudi")) {
    return 3;
  }
  if (name.includes("mumbai") || name.includes("delhi") || name.includes("india") || name.includes("calcutta")) {
    return 5.5;
  }
  if (name.includes("reykjavik") || name.includes("iceland") || name.includes("lisbon") || name.includes("portugal")) {
    return 0;
  }
  if (name.includes("los angeles") || name.includes("la") || name.includes("san francisco") || name.includes("seattle") || name.includes("vancouver") || name.includes("california") || name.includes("pdt")) {
    return -7; // Pacific Daylight Time
  }
  if (name.includes("chicago") || name.includes("houston") || name.includes("mexico") || name.includes("dallas")) {
    return -5; // Central Daylight Time
  }
  if (name.includes("denver") || name.includes("salt lake") || name.includes("phoenix") || name.includes("arizona")) {
    return -6; // Mountain Time
  }
  if (name.includes("singapore") || name.includes("manila") || name.includes("beijing") || name.includes("shanghai") || name.includes("hong kong") || name.includes("china") || name.includes("taiwan") || name.includes("taipei")) {
    return 8;
  }
  if (name.includes("dubai") || name.includes("abu dhabi") || name.includes("uae") || name.includes("baku")) {
    return 4;
  }
  if (name.includes("rio") || name.includes("sao paulo") || name.includes("brazil") || name.includes("buenos aires") || name.includes("argentina")) {
    return -3;
  }
  return 0; // default UTC
}

function getTimezoneOffsetByCoords(latNum: number, lonNum: number): number {
  let approxOffset = lonNum / 15;
  let rounded = Math.round(approxOffset);
  
  if (latNum > 5 && latNum < 25 && lonNum > 95 && lonNum < 110) return 7; // Indochina
  if (latNum > 20 && latNum < 45 && lonNum > 120 && lonNum < 150) return 9; // Japan/Korea
  if (latNum > 24 && latNum < 50 && lonNum > -125 && lonNum < -65) {
    if (lonNum < -114) return -7;
    if (lonNum < -104) return -6;
    if (lonNum < -85) return -5;
    return -4;
  }
  if (latNum > 35 && latNum < 60 && lonNum > -10 && lonNum < 30) {
    if (lonNum < 2) return 1;
    return 2;
  }
  return rounded;
}

function getFormattedDateTime(offsetHours: number): { dateText: string, timeText: string, isNight: boolean } {
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const localDate = new Date(utcMs + (offsetHours * 3600000));
  
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short' };
  const dateText = localDate.toLocaleDateString('en-US', options);
  
  const hours = localDate.getHours();
  let hoursStr = hours % 12 || 12;
  let ampm = hours >= 12 ? 'PM' : 'AM';
  let mins = String(localDate.getMinutes()).padStart(2, '0');
  const timeText = `${hoursStr}:${mins} ${ampm}`;
  
  const isNight = hours >= 18 || hours < 6;
  
  return { dateText, timeText, isNight };
}

// Local mock generator for fallback
function generateMockWeather(cityName: string, offsetHours: number = 0): any {
  const cleanCity = cityName.trim();
  const nameLower = cleanCity.toLowerCase();
  
  // Base default conditions depending on city
  let baseTemp = 18;
  let condition: 'Sunny' | 'Cloudy' | 'Rainy' | 'Snowy' | 'Stormy' = 'Cloudy';
  let country = "World";

  if (nameLower.includes("phnom penh") || nameLower.includes("cambodia") || nameLower === "pp") {
    baseTemp = 31;
    condition = "Sunny";
    country = "Cambodia";
  } else if (nameLower.includes("york") || nameLower === "ny" || nameLower === "nyc") {
    baseTemp = 24;
    condition = "Sunny";
    country = "USA";
  } else if (nameLower.includes("london") || nameLower === "lon") {
    baseTemp = 15;
    condition = "Rainy";
    country = "UK";
  } else if (nameLower.includes("tokyo") || nameLower === "tyo") {
    baseTemp = 21;
    condition = "Sunny";
    country = "Japan";
  } else if (nameLower.includes("paris")) {
    baseTemp = 19;
    condition = "Cloudy";
    country = "France";
  } else if (nameLower.includes("sydney")) {
    baseTemp = 22;
    condition = "Sunny";
    country = "Australia";
  } else if (nameLower.includes("moscow")) {
    baseTemp = 2;
    condition = "Snowy";
    country = "Russia";
  } else if (nameLower.includes("mumbai") || nameLower.includes("bombay")) {
    baseTemp = 32;
    condition = "Stormy";
    country = "India";
  } else {
    // Generate deterministic settings
    const r1 = getDeterministicRandom(cleanCity, 1);
    baseTemp = Math.round(5 + r1 * 30); // 5 to 35 C
    
    const r2 = getDeterministicRandom(cleanCity, 2);
    if (r2 < 0.25) condition = "Sunny";
    else if (r2 < 0.5) condition = "Cloudy";
    else if (r2 < 0.75) condition = "Rainy";
    else if (r2 < 0.9) condition = "Stormy";
    else condition = "Snowy";

    if (baseTemp < 0) condition = "Snowy"; // force snowy in freezing temps
    
    // Attempt to guess country
    country = "Region";
  }

  // Generate 7 day forecast
  const days = ["Today", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const conditionsPool: Array<'Sunny' | 'Cloudy' | 'Rainy' | 'Snowy' | 'Stormy'> = ["Sunny", "Cloudy", "Rainy", "Snowy", "Stormy"];
  
  const forecast7Days = days.map((day, idx) => {
    const rDay1 = getDeterministicRandom(cleanCity, idx * 10);
    const rDay2 = getDeterministicRandom(cleanCity, idx * 11);
    
    const offset = Math.round((rDay1 - 0.5) * 8);
    const high = baseTemp + offset + 2;
    const low = baseTemp + offset - 4;
    
    let cond = condition;
    if (idx > 0) {
      const condIdx = Math.floor(rDay2 * conditionsPool.length);
      cond = conditionsPool[condIdx];
      if (high < 0) cond = "Snowy";
    }
    
    return { day, condition: cond, high, low };
  });

  // Generate 24 hour forecast
  const hours = ["Now", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM"];
  const forecast24Hours = hours.map((time, idx) => {
    const rHour = getDeterministicRandom(cleanCity, idx * 20);
    const offset = Math.round((rHour - 0.5) * 4);
    
    let cond = condition;
    if (idx > 0 && rHour > 0.7) {
      cond = conditionsPool[Math.floor(rHour * conditionsPool.length)];
    }
    
    return {
      time,
      condition: cond,
      temp: baseTemp + offset,
      precipProb: cond === "Rainy" ? 80 : cond === "Stormy" ? 95 : cond === "Snowy" ? 70 : 10
    };
  });

  // Generate metrics
  const rM1 = getDeterministicRandom(cleanCity, 100);
  const uvVal = Math.round(rM1 * 10);
  let uvLabel = "Low";
  if (uvVal > 7) uvLabel = "Very High";
  else if (uvVal > 5) uvLabel = "High";
  else if (uvVal > 2) uvLabel = "Moderate";

  const humidityVal = Math.round(30 + getDeterministicRandom(cleanCity, 101) * 60);
  const dewPointVal = Math.round(baseTemp - (100 - humidityVal) / 5);

  const windSpeedVal = Math.round(5 + getDeterministicRandom(cleanCity, 102) * 35);
  const windDirVal = Math.round(getDeterministicRandom(cleanCity, 103) * 360);

  const visibilityVal = condition === "Rainy" || condition === "Cloudy" ? 8 : condition === "Stormy" || condition === "Snowy" ? 3 : 10;
  const visibilityDesc = visibilityVal >= 10 ? "Clear view" : visibilityVal >= 7 ? "Misty" : "Low visibility";

  const pressureVal = Math.round(990 + getDeterministicRandom(cleanCity, 104) * 40);
  const trends: Array<'Stable' | 'Rising' | 'Falling'> = ["Stable", "Rising", "Falling"];
  const pressureTrend = trends[Math.floor(getDeterministicRandom(cleanCity, 105) * 3)];

  const aqiVal = Math.round(10 + getDeterministicRandom(cleanCity, 106) * 140);
  let aqiLabel = "Good";
  if (aqiVal > 100) aqiLabel = "Unhealthy";
  else if (aqiVal > 50) aqiLabel = "Moderate";

  // Create cozy advise based on condition
  let cozyAdvice = "Perfect day to grab a warm matcha latte and wear your favorite knit sweater! 🍵🍂";
  if (condition === "Sunny") {
    cozyAdvice = "A bright, sunny day! Put on your favorite sunglasses, grab an iced tea, and enjoy a cozy stroll in the park. 🕶️🍃";
  } else if (condition === "Rainy") {
    cozyAdvice = "Raindrops are falling. Light a scented candle, put on some lo-fi beats, and snuggle up with a hot cup of chamomile tea. 🌧️🕯️📖";
  } else if (condition === "Stormy") {
    cozyAdvice = "The sky is excitingly dark! Stay tucked under a warm blanket with a mug of hot cocoa and enjoy the thunder's rumble. ⛈️🍫🛋️";
  } else if (condition === "Snowy") {
    cozyAdvice = "A magical winter wonderland. Wrap yourself in a heavy scarf, enjoy the soft falling snow, and warm up with spicy hot cider. ❄️🧣☕";
  } else if (condition === "Cloudy") {
    cozyAdvice = "Pleasantly overcast and soft. The perfect weather for oversized hoodies, comfortable socks, and starting a new novel. ☁️🧦📚";
  }

  const { dateText, timeText, isNight } = getFormattedDateTime(offsetHours);

  return {
    city: cleanCity.charAt(0).toUpperCase() + cleanCity.slice(1),
    country,
    condition,
    tempCelsius: baseTemp,
    feelsLikeCelsius: baseTemp + (condition === "Sunny" ? 2 : -2),
    dateText,
    timeText,
    isNight,
    forecast7Days,
    forecast24Hours,
    metrics: {
      uvIndex: { value: uvVal, label: uvLabel },
      humidity: { value: humidityVal, dewPoint: dewPointVal },
      wind: { speed: windSpeedVal, direction: windDirVal },
      visibility: { value: visibilityVal, description: visibilityDesc },
      pressure: { value: pressureVal, trend: pressureTrend },
      aqi: { value: aqiVal, label: aqiLabel }
    },
    cozyAdvice,
    isFallback: true
  };
}

// API schema for Gemini
const weatherReportSchema = {
  type: Type.OBJECT,
  properties: {
    city: { type: Type.STRING },
    country: { type: Type.STRING },
    condition: { 
      type: Type.STRING,
      description: "Must be one of: 'Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Stormy'"
    },
    tempCelsius: { type: Type.INTEGER },
    feelsLikeCelsius: { type: Type.INTEGER },
    dateText: { type: Type.STRING, description: "Formatted like: 'Monday, 23 Oct'" },
    timeText: { type: Type.STRING, description: "Formatted like: '10:45 AM'" },
    forecast7Days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.STRING, description: "e.g., 'Today', 'Tue', 'Wed', etc." },
          condition: { 
            type: Type.STRING,
            description: "Must be one of: 'Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Stormy'"
          },
          high: { type: Type.INTEGER },
          low: { type: Type.INTEGER },
        },
        required: ["day", "condition", "high", "low"]
      }
    },
    forecast24Hours: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          time: { type: Type.STRING, description: "e.g., 'Now', '11 AM', '12 PM', etc." },
          condition: { 
            type: Type.STRING,
            description: "Must be one of: 'Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Stormy'"
          },
          temp: { type: Type.INTEGER },
          precipProb: { type: Type.INTEGER }
        },
        required: ["time", "condition", "temp"]
      }
    },
    metrics: {
      type: Type.OBJECT,
      properties: {
        uvIndex: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.INTEGER },
            label: { type: Type.STRING, description: "e.g., 'Low', 'Moderate', 'High', 'Very High'" }
          },
          required: ["value", "label"]
        },
        humidity: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.INTEGER, description: "percentage, e.g. 45" },
            dewPoint: { type: Type.INTEGER }
          },
          required: ["value", "dewPoint"]
        },
        wind: {
          type: Type.OBJECT,
          properties: {
            speed: { type: Type.INTEGER, description: "in km/h" },
            direction: { type: Type.INTEGER, description: "degrees from 0 to 360" }
          },
          required: ["speed", "direction"]
        },
        visibility: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.INTEGER, description: "in km" },
            description: { type: Type.STRING, description: "e.g., 'Clear view', 'Misty', 'Foggy'" }
          },
          required: ["value", "description"]
        },
        pressure: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.INTEGER, description: "in mb" },
            trend: { 
              type: Type.STRING,
              description: "Must be one of: 'Stable', 'Rising', 'Falling'"
            }
          },
          required: ["value", "trend"]
        },
        aqi: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.INTEGER, description: "AQI score" },
            label: { 
              type: Type.STRING,
              description: "Must be one of: 'Good', 'Moderate', 'Unhealthy', 'Very Unhealthy', 'Hazardous'"
            }
          },
          required: ["value", "label"]
        }
      },
      required: ["uvIndex", "humidity", "wind", "visibility", "pressure", "aqi"]
    },
    cozyAdvice: { 
      type: Type.STRING, 
      description: "A friendly, whimsical, aesthetic styling or action advice based on the weather. Focus on 'stay cozy', warm colors, delicious hot or iced drinks, knit sweaters, books, lo-fi music, walking, etc." 
    }
  },
  required: [
    "city", "country", "condition", "tempCelsius", "feelsLikeCelsius", 
    "dateText", "timeText", "forecast7Days", "forecast24Hours", "metrics", "cozyAdvice"
  ]
};

// Weather Fetch Endpoint
app.get("/api/weather", async (req, res) => {
  const city = req.query.city as string;
  if (!city) {
    return res.status(400).json({ error: "City parameter is required." });
  }

  // Check if Gemini is enabled and valid, and not temporarily disabled due to quota limits
  if (ai && Date.now() > geminiDisabledUntil) {
    try {
      console.log(`Querying Gemini API for city: ${city}`);
      const prompt = `Generate a cozy, highly aesthetic weather report for the city of "${city}".
Provide realistic weather data that fits the current seasonal climate of this region.
Also provide custom 7-day and 24-hour forecasts, detailed metrics (UV Index, Humidity, Wind speed & direction, Visibility, Pressure), and a delightful, sweet piece of 'Stay Cozy' styling/lifestyle advice tailored specifically to this weather condition.`;

      // 6-second timeout race to keep the UX extremely responsive
      const generatePromise = ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: weatherReportSchema,
          systemInstruction: "You are AetherWeather AI, a cozy and warm meteorologist that provides beautifully detailed weather reports combined with snuggly, delightful styling suggestions and offline cozy tips. Your outputs must be highly structured and accurate to the geographic seasonal norms.",
        },
      });

      const response = await withTimeout(
        generatePromise,
        6000,
        "Gemini API request timed out after 6 seconds"
      );

      if (response && response.text) {
        const data = JSON.parse(response.text.trim());
        const offset = getTimezoneOffsetForCity(city);
        const { dateText, timeText, isNight } = getFormattedDateTime(offset);
        data.dateText = dateText;
        data.timeText = timeText;
        data.isNight = isNight;
        return res.json(data);
      }
    } catch (err: any) {
      const errMsg = String(err?.message || err || "").toLowerCase();
      const isQuotaOrTimeout = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("exhausted") || errMsg.includes("timeout") || errMsg.includes("time out");
      
      if (isQuotaOrTimeout) {
        console.log("Gemini API rate limit or timeout. Bypassing Gemini API and using local deterministic weather generator for the next 5 minutes.");
        geminiDisabledUntil = Date.now() + 5 * 60 * 1000;
      } else {
        console.log("Gemini API error, falling back to mock generator.");
      }
    }
  } else if (ai) {
    console.log(`Gemini API temporarily bypassed for city: ${city} (resuming in ${Math.round((geminiDisabledUntil - Date.now()) / 1000)}s)`);
  }

  // Fallback to local mock generator
  console.log(`Using deterministic weather generator for: ${city}`);
  const offset = getTimezoneOffsetForCity(city);
  const report = generateMockWeather(city, offset);
  return res.json(report);
});

// Reverse Geocoding Weather Endpoint
app.get("/api/weather/by-location", async (req, res) => {
  const lat = req.query.lat as string;
  const lon = req.query.lon as string;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Latitude and Longitude are required." });
  }

  if (ai && Date.now() > geminiDisabledUntil) {
    try {
      console.log(`Querying Gemini API for location lat:${lat}, lon:${lon}`);
      const prompt = `Identify the nearest major city/region for coordinates latitude: ${lat}, longitude: ${lon}. 
Then generate a cozy, highly aesthetic weather report for this region.
Provide realistic weather data that fits the current seasonal climate of this region.
Include custom 7-day and 24-hour forecasts, detailed metrics (UV Index, Humidity, Wind speed & direction, Visibility, Pressure), and a delightful piece of 'Stay Cozy' styling advice.`;

      // 6-second timeout race to keep the UX extremely responsive
      const generatePromise = ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: weatherReportSchema,
          systemInstruction: "You are AetherWeather AI, a cozy and warm meteorologist that provides beautifully detailed weather reports combined with snuggly, delightful styling suggestions and offline cozy tips.",
        },
      });

      const response = await withTimeout(
        generatePromise,
        6000,
        "Gemini API request timed out after 6 seconds"
      );

      if (response && response.text) {
        const data = JSON.parse(response.text.trim());
        const offset = getTimezoneOffsetByCoords(parseFloat(lat), parseFloat(lon));
        const { dateText, timeText, isNight } = getFormattedDateTime(offset);
        data.dateText = dateText;
        data.timeText = timeText;
        data.isNight = isNight;
        return res.json(data);
      }
    } catch (err: any) {
      const errMsg = String(err?.message || err || "").toLowerCase();
      const isQuotaOrTimeout = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("exhausted") || errMsg.includes("timeout") || errMsg.includes("time out");
      
      if (isQuotaOrTimeout) {
        console.log("Gemini reverse-geo weather rate limit or timeout. Bypassing Gemini API for the next 5 minutes.");
        geminiDisabledUntil = Date.now() + 5 * 60 * 1000;
      } else {
        console.log("Gemini reverse-geo weather error, falling back to Phnom Penh.");
      }
    }
  } else if (ai) {
    console.log(`Gemini API temporarily bypassed for coords lat:${lat}, lon:${lon} (resuming in ${Math.round((geminiDisabledUntil - Date.now()) / 1000)}s)`);
  }

  // Fallback to deterministic coordinates or close mock
  const offset = getTimezoneOffsetByCoords(parseFloat(lat), parseFloat(lon));
  console.log(`Using default location or mock for fallback coordinates: lat=${lat}, lon=${lon}, offset=${offset}`);
  const report = generateMockWeather("Local Region", offset);
  return res.json(report);
});

export default app;
