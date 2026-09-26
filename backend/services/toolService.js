const TAVILY_URL = "https://api.tavily.com/search";
const OPEN_METEO_GEOCODING = "https://geocoding-api.open-meteo.com/v1/search";
const OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast";

const toolCatalog = [
  { name: "calculator", description: "Evaluate a safe arithmetic expression.", input: "expression" },
  { name: "weather", description: "Get current weather for a city or location using Open-Meteo.", input: "location" },
  { name: "web_search", description: "Search the web using Tavily.", input: "query" },
  { name: "current_time", description: "Get the current time for an IANA timezone.", input: "timeZone" },
  { name: "unit_convert", description: "Convert common length, weight, and temperature units.", input: "value,from,to" },
  { name: "api_get", description: "GET JSON from a small allow-listed set of public API hosts.", input: "url" }
];

const units = {
  length: {
    m: 1, meter: 1, meters: 1,
    km: 1000, kilometer: 1000, kilometers: 1000,
    cm: 0.01, centimeter: 0.01, centimeters: 0.01,
    mm: 0.001, millimeter: 0.001, millimeters: 0.001,
    in: 0.0254, inch: 0.0254, inches: 0.0254,
    ft: 0.3048, foot: 0.3048, feet: 0.3048,
    yd: 0.9144, yard: 0.9144, yards: 0.9144,
    mi: 1609.344, mile: 1609.344, miles: 1609.344
  },
  weight: {
    mg: 0.001, milligram: 0.001, milligrams: 0.001,
    g: 1, gram: 1, grams: 1,
    kg: 1000, kilogram: 1000, kilograms: 1000,
    oz: 28.349523125, ounce: 28.349523125, ounces: 28.349523125,
    lb: 453.59237, lbs: 453.59237, pound: 453.59237, pounds: 453.59237
  }
};

function tokenize(expression) {
  const tokens = [];
  let index = 0;

  while (index < expression.length) {
    if (/\s/.test(expression[index])) {
      index += 1;
      continue;
    }

    const slice = expression.slice(index);
    const number = slice.match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (number) {
      tokens.push({ type: "number", value: Number(number[0]) });
      index += number[0].length;
      continue;
    }

    const operator = expression[index];
    if ("+-*/%^()".includes(operator)) {
      tokens.push({ type: operator, value: operator });
      index += 1;
      continue;
    }

    throw new Error("Calculator accepts numbers, parentheses, and + - * / % ^ only.");
  }

  if (!tokens.length) throw new Error("Enter an arithmetic expression.");
  return tokens;
}

function calculate(expression) {
  const tokens = tokenize(expression);
  let pos = 0;

  const peek = () => tokens[pos]?.type;
  const take = (type) => {
    if (peek() !== type) throw new Error("Expected " + type + ".");
    return tokens[pos++];
  };

  function primary() {
    if (peek() === "number") return take("number").value;
    if (peek() === "(") {
      take("(");
      const value = additive();
      take(")");
      return value;
    }
    throw new Error("Expected a number.");
  }

  function unary() {
    if (peek() === "+") {
      take("+");
      return unary();
    }
    if (peek() === "-") {
      take("-");
      return -unary();
    }
    return primary();
  }

  function power() {
    const left = unary();
    if (peek() === "^") {
      take("^");
      return Math.pow(left, power());
    }
    return left;
  }

  function multiplicative() {
    let value = power();
    while (["*", "/", "%"].includes(peek())) {
      const op = take(peek()).type;
      const right = power();

      if (op === "*") value *= right;
      if (op === "/") {
        if (right === 0) throw new Error("Division by zero.");
        value /= right;
      }
      if (op === "%") {
        if (right === 0) throw new Error("Division by zero.");
        value %= right;
      }
    }
    return value;
  }

  function additive() {
    let value = multiplicative();
    while (["+", "-"].includes(peek())) {
      const op = take(peek()).type;
      const right = multiplicative();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }

  const result = additive();
  if (pos !== tokens.length) throw new Error("Unexpected token in expression.");
  if (!Number.isFinite(result)) throw new Error("Result is not finite.");
  return result;
}

async function getWeather(location) {
  const place = String(location || "").trim();
  if (!place) throw new Error("Provide a location.");

  const geoUrl = new URL(OPEN_METEO_GEOCODING);
  geoUrl.searchParams.set("name", place);
  geoUrl.searchParams.set("count", "1");
  geoUrl.searchParams.set("language", "en");
  geoUrl.searchParams.set("format", "json");

  const geoResponse = await fetch(geoUrl);
  if (!geoResponse.ok) throw new Error("Weather location lookup failed.");

  const geo = await geoResponse.json();
  const result = geo.results?.[0];
  if (!result) throw new Error("Location not found: " + place);

  const weatherUrl = new URL(OPEN_METEO_FORECAST);
  weatherUrl.searchParams.set("latitude", result.latitude);
  weatherUrl.searchParams.set("longitude", result.longitude);
  weatherUrl.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m"
  );
  weatherUrl.searchParams.set("timezone", "auto");
  weatherUrl.searchParams.set("forecast_days", "1");

  const weatherResponse = await fetch(weatherUrl);
  if (!weatherResponse.ok) throw new Error("Weather API request failed.");

  const weather = await weatherResponse.json();

  return {
    location: [result.name, result.admin1, result.country].filter(Boolean).join(", "),
    timezone: weather.timezone,
    current: weather.current,
    units: weather.current_units
  };
}

async function webSearch(query) {
  if (!process.env.TAVILY_API_KEY || process.env.TAVILY_API_KEY === "your_tavily_key_here") {
    throw new Error("TAVILY_API_KEY is not configured. Add it to backend/.env to enable web search.");
  }

  const q = String(query || "").trim();
  if (!q) throw new Error("Provide a search query.");

  const response = await fetch(TAVILY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: q,
      search_depth: "basic",
      max_results: 5,
      include_answer: true
    })
  });

  if (!response.ok) throw new Error("Web search request failed.");

  const data = await response.json();
  return {
    query: q,
    answer: data.answer || null,
    results: (data.results || []).map((item) => ({
      title: item.title,
      url: item.url,
      content: item.content
    }))
  };
}

function currentTime(timeZone = "UTC") {
  try {
    const now = new Date();
    return {
      timeZone,
      iso: now.toISOString(),
      local: new Intl.DateTimeFormat("en-GB", {
        dateStyle: "full",
        timeStyle: "long",
        timeZone
      }).format(now)
    };
  } catch (_error) {
    throw new Error("Invalid IANA timezone. Example: Asia/Kolkata");
  }
}

function convertUnit(value, from, to) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new Error("Value must be a number.");

  const source = String(from || "").trim().toLowerCase();
  const target = String(to || "").trim().toLowerCase();

  const temperatureUnits = ["c", "celsius", "f", "fahrenheit", "k", "kelvin"];
  if (temperatureUnits.includes(source) || temperatureUnits.includes(target)) {
    const celsius = ["f", "fahrenheit"].includes(source)
      ? (numeric - 32) * 5 / 9
      : ["k", "kelvin"].includes(source)
        ? numeric - 273.15
        : numeric;

    const result = ["f", "fahrenheit"].includes(target)
      ? (celsius * 9 / 5) + 32
      : ["k", "kelvin"].includes(target)
        ? celsius + 273.15
        : ["c", "celsius"].includes(target)
          ? celsius
          : null;

    if (result === null) throw new Error("Unsupported temperature unit.");
    return { value: numeric, from: source, to: target, result };
  }

  const categoryEntry = Object.entries(units).find(([_, map]) => source in map && target in map);
  if (!categoryEntry) {
    throw new Error("Supported conversions: length, weight, temperature.");
  }

  const [category, map] = categoryEntry;
  const result = numeric * map[source] / map[target];
  return { value: numeric, from: source, to: target, result, category };
}

function validateApiUrl(rawUrl) {
  const url = new URL(String(rawUrl || ""));
  if (url.protocol !== "https:") throw new Error("API requests must use HTTPS.");

  const allowed = (process.env.ALLOWED_API_HOSTS ||
    "api.github.com,api.open-meteo.com,geocoding-api.open-meteo.com")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  if (!allowed.includes(url.hostname.toLowerCase())) {
    throw new Error("API host not allowed. Allowed hosts: " + allowed.join(", "));
  }

  return url;
}

async function apiGet(url) {
  const safeUrl = validateApiUrl(url);
  const response = await fetch(safeUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "FALCONS-AI/1.0"
    },
    signal: AbortSignal.timeout(8000)
  });

  const responseText = await response.text();
  if (!response.ok) throw new Error("API returned HTTP " + response.status + ".");

  try {
    return {
      url: safeUrl.toString(),
      status: response.status,
      data: JSON.parse(responseText)
    };
  } catch (_error) {
    return {
      url: safeUrl.toString(),
      status: response.status,
      data: responseText.slice(0, 12000)
    };
  }
}

export function listTools() {
  return toolCatalog;
}

export async function runTool(name, input = {}) {
  switch (name) {
    case "calculator":
      return {
        expression: String(input.expression || ""),
        result: calculate(String(input.expression || ""))
      };
    case "weather":
      return getWeather(input.location);
    case "web_search":
      return webSearch(input.query);
    case "current_time":
      return currentTime(input.timeZone || "UTC");
    case "unit_convert":
      return convertUnit(input.value, input.from, input.to);
    case "api_get":
      return apiGet(input.url);
    default:
      throw new Error("Unknown tool: " + name);
  }
}
