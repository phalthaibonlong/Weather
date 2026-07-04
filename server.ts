import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with named parameters
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

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
    console.error("Failed to initialize Gemini API:", err);
  }
} else {
  console.log("No valid GEMINI_API_KEY found. Falling back to deterministic simulation.");
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

// Local mock generator for fallback
function generateMockWeather(cityName: string): any {
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

  // Format today's date
  const dateObj = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short' };
  const dateText = dateObj.toLocaleDateString('en-US', options);
  
  let hoursStr = dateObj.getHours() % 12 || 12;
  let ampm = dateObj.getHours() >= 12 ? 'PM' : 'AM';
  let mins = String(dateObj.getMinutes()).padStart(2, '0');
  const timeText = `${hoursStr}:${mins} ${ampm}`;

  return {
    city: cleanCity.charAt(0).toUpperCase() + cleanCity.slice(1),
    country,
    condition,
    tempCelsius: baseTemp,
    feelsLikeCelsius: baseTemp + (condition === "Sunny" ? 2 : -2),
    dateText,
    timeText,
    forecast7Days,
    forecast24Hours,
    metrics: {
      uvIndex: { value: uvVal, label: uvLabel },
      humidity: { value: humidityVal, dewPoint: dewPointVal },
      wind: { speed: windSpeedVal, direction: windDirVal },
      visibility: { value: visibilityVal, description: visibilityDesc },
      pressure: { value: pressureVal, trend: pressureTrend }
    },
    cozyAdvice
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
        }
      },
      required: ["uvIndex", "humidity", "wind", "visibility", "pressure"]
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

  // Check if Gemini is enabled and valid
  if (ai) {
    try {
      console.log(`Querying Gemini API for city: ${city}`);
      const prompt = `Generate a cozy, highly aesthetic weather report for the city of "${city}".
Provide realistic weather data that fits the current seasonal climate of this region.
Also provide custom 7-day and 24-hour forecasts, detailed metrics (UV Index, Humidity, Wind speed & direction, Visibility, Pressure), and a delightful, sweet piece of 'Stay Cozy' styling/lifestyle advice tailored specifically to this weather condition.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: weatherReportSchema,
          systemInstruction: "You are AetherWeather AI, a cozy and warm meteorologist that provides beautifully detailed weather reports combined with snuggly, delightful styling suggestions and offline cozy tips. Your outputs must be highly structured and accurate to the geographic seasonal norms.",
        },
      });

      if (response && response.text) {
        const data = JSON.parse(response.text.trim());
        return res.json(data);
      }
    } catch (err) {
      console.error("Gemini API error, falling back to mock generator:", err);
    }
  }

  // Fallback to local mock generator
  console.log(`Using deterministic weather generator for: ${city}`);
  const report = generateMockWeather(city);
  return res.json(report);
});

// Reverse Geocoding Weather Endpoint
app.get("/api/weather/by-location", async (req, res) => {
  const lat = req.query.lat as string;
  const lon = req.query.lon as string;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Latitude and Longitude are required." });
  }

  if (ai) {
    try {
      console.log(`Querying Gemini API for location lat:${lat}, lon:${lon}`);
      const prompt = `Identify the nearest major city/region for coordinates latitude: ${lat}, longitude: ${lon}. 
Then generate a cozy, highly aesthetic weather report for this region.
Provide realistic weather data that fits the current seasonal climate of this region.
Include custom 7-day and 24-hour forecasts, detailed metrics (UV Index, Humidity, Wind speed & direction, Visibility, Pressure), and a delightful piece of 'Stay Cozy' styling advice.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: weatherReportSchema,
          systemInstruction: "You are AetherWeather AI, a cozy and warm meteorologist that provides beautifully detailed weather reports combined with snuggly, delightful styling suggestions and offline cozy tips.",
        },
      });

      if (response && response.text) {
        const data = JSON.parse(response.text.trim());
        return res.json(data);
      }
    } catch (err) {
      console.error("Gemini reverse-geo weather error, falling back to Phnom Penh:", err);
    }
  }

  // Fallback to deterministic Phnom Penh coordinates or close mock
  console.log("Using default location (Phnom Penh, Cambodia) for fallback coordinates");
  const report = generateMockWeather("Phnom Penh");
  return res.json(report);
});

// Vite Middleware Setup for Development / Static serving for Production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AetherWeather Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
