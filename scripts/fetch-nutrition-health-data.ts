import fs from "node:fs/promises";
import path from "node:path";

type Row = string[];

type SeriesPoint = {
  entity: string;
  code: string;
  year: number;
  value: number;
};

type CountrySnapshot = {
  country: string;
  code: string;
  year: number;
  fruitGPerDay: number;
  vegetableGPerDay: number;
  caloriesPerDay: number;
  obesityPercent: number;
  lifeExpectancyYears: number;
  cvdDeathsPer100k: number;
  fruitVegetableCombined: number;
  calorieBalanceScore: number;
  dietQualityScore: number;
  cardiometabolicRiskScore: number;
  longevityScore: number;
  overallWellbeingScore: number;
  recommendation: string;
};

const SOURCES = {
  fruit: "https://ourworldindata.org/grapher/fruit-consumption-per-capita.csv?csvType=full&useColumnShortNames=false",
  vegetable:
    "https://ourworldindata.org/grapher/vegetable-consumption-per-capita.csv?csvType=full&useColumnShortNames=false",
  calories:
    "https://ourworldindata.org/grapher/daily-per-capita-caloric-supply.csv?csvType=full&useColumnShortNames=false",
  obesity:
    "https://ourworldindata.org/grapher/share-of-adults-defined-as-obese.csv?csvType=full&useColumnShortNames=false",
  lifeExpectancy: "https://ourworldindata.org/grapher/life-expectancy.csv?csvType=full&useColumnShortNames=false",
  cvdDeaths:
    "https://ourworldindata.org/grapher/deaths-from-cardiovascular-disease-ghe.csv?csvType=full&useColumnShortNames=false",
  population: "https://ourworldindata.org/grapher/population.csv?csvType=full&useColumnShortNames=false"
};

const OUTPUT_PATH = path.resolve(process.cwd(), "public", "data", "nutrition-health-merged.json");

const MIN_YEAR = 2000;
const MAX_YEAR = 2022;

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));

const parseCsv = (csvText: string): Row[] => {
  const rows: Row[] = [];
  let currentRow: Row = [];
  let currentField = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentField);
      currentField = "";
      if (currentRow.length > 1 || currentRow[0] !== "") {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
};

const isAggregateEntity = (entity: string): boolean => {
  const lowered = entity.toLowerCase();
  if (["world", "europe", "asia", "africa", "oceania", "north america", "south america"].includes(lowered)) {
    return true;
  }
  if (lowered.includes("income") || lowered.includes("countries") || lowered.includes("union")) {
    return true;
  }
  return false;
};

const parseSeries = async (url: string): Promise<SeriesPoint[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const text = await response.text();
  const rows = parseCsv(text);

  const points: SeriesPoint[] = [];
  for (const row of rows.slice(1)) {
    const entity = row[0]?.trim();
    const code = row[1]?.trim();
    const year = Number(row[2]);
    const value = Number(row[3]);

    if (!entity || !code || !Number.isFinite(year) || !Number.isFinite(value)) {
      continue;
    }
    if (code.startsWith("OWID") || code.length !== 3 || isAggregateEntity(entity)) {
      continue;
    }
    if (year < MIN_YEAR || year > MAX_YEAR) {
      continue;
    }

    points.push({ entity, code, year, value });
  }
  return points;
};

const pickLatestByCountry = (series: SeriesPoint[]): Map<string, SeriesPoint> => {
  const best = new Map<string, SeriesPoint>();
  for (const point of series) {
    const existing = best.get(point.code);
    if (!existing || point.year > existing.year) {
      best.set(point.code, point);
    }
  }
  return best;
};

const pickLatestSharedYearRate = (numerator: SeriesPoint[], denominator: SeriesPoint[]): Map<string, SeriesPoint> => {
  const numeratorMap = new Map<string, Map<number, SeriesPoint>>();
  const denominatorMap = new Map<string, Map<number, SeriesPoint>>();

  for (const row of numerator) {
    if (!numeratorMap.has(row.code)) numeratorMap.set(row.code, new Map());
    numeratorMap.get(row.code)!.set(row.year, row);
  }
  for (const row of denominator) {
    if (!denominatorMap.has(row.code)) denominatorMap.set(row.code, new Map());
    denominatorMap.get(row.code)!.set(row.year, row);
  }

  const result = new Map<string, SeriesPoint>();
  for (const [code, numYears] of numeratorMap.entries()) {
    const denYears = denominatorMap.get(code);
    if (!denYears) continue;

    const commonYears: number[] = [];
    for (const year of numYears.keys()) {
      if (denYears.has(year)) commonYears.push(year);
    }
    if (commonYears.length === 0) continue;

    const latestYear = Math.max(...commonYears);
    const num = numYears.get(latestYear)!;
    const den = denYears.get(latestYear)!;
    if (den.value <= 0) continue;

    result.set(code, {
      entity: num.entity,
      code,
      year: latestYear,
      value: (num.value / den.value) * 100_000
    });
  }

  return result;
};

const normalize = (value: number, min: number, max: number): number => {
  if (max - min < 1e-9) return 50;
  return ((value - min) / (max - min)) * 100;
};

const toFixed = (value: number): number => Number(value.toFixed(2));

const generateRecommendation = (entry: {
  fruitVegetableCombined: number;
  obesityPercent: number;
  cvdDeathsPer100k: number;
  caloriesPerDay: number;
}): string => {
  if (entry.obesityPercent >= 30 || entry.cvdDeathsPer100k >= 250) {
    return "Priority: reduce cardiometabolic risk with lower ultra-processed intake and more high-fiber foods.";
  }
  if (entry.fruitVegetableCombined < 400) {
    return "Priority: increase fruit and vegetable availability toward WHO 400g/day guidance.";
  }
  if (entry.caloriesPerDay > 3200) {
    return "Priority: improve calorie quality and portion balance while preserving micronutrient density.";
  }
  return "Pattern is comparatively protective; maintain diet diversity and monitor long-term risk markers.";
};

const main = async (): Promise<void> => {
  const [fruitSeries, vegetableSeries, caloriesSeries, obesitySeries, lifeSeries, cvdSeries, populationSeries] =
    await Promise.all([
      parseSeries(SOURCES.fruit),
      parseSeries(SOURCES.vegetable),
      parseSeries(SOURCES.calories),
      parseSeries(SOURCES.obesity),
      parseSeries(SOURCES.lifeExpectancy),
      parseSeries(SOURCES.cvdDeaths),
      parseSeries(SOURCES.population)
    ]);

  const fruit = pickLatestByCountry(fruitSeries);
  const vegetables = pickLatestByCountry(vegetableSeries);
  const calories = pickLatestByCountry(caloriesSeries);
  const obesity = pickLatestByCountry(obesitySeries);
  const life = pickLatestByCountry(lifeSeries);
  const cvdRate = pickLatestSharedYearRate(cvdSeries, populationSeries);

  const merged: CountrySnapshot[] = [];
  for (const code of fruit.keys()) {
    const rowFruit = fruit.get(code);
    const rowVeg = vegetables.get(code);
    const rowCalories = calories.get(code);
    const rowObesity = obesity.get(code);
    const rowLife = life.get(code);
    const rowCvd = cvdRate.get(code);
    if (!rowFruit || !rowVeg || !rowCalories || !rowObesity || !rowLife || !rowCvd) {
      continue;
    }

    const year = Math.min(rowFruit.year, rowVeg.year, rowCalories.year, rowObesity.year, rowLife.year, rowCvd.year);
    const fruitVegetableCombined = rowFruit.value + rowVeg.value;
    const calorieBalanceScore = clamp(100 - (Math.abs(rowCalories.value - 2500) / 2500) * 100);
    const dietQuantityScore = clamp((fruitVegetableCombined / 400) * 100);
    const dietQualityScore = dietQuantityScore * 0.7 + calorieBalanceScore * 0.3;

    merged.push({
      country: rowFruit.entity,
      code,
      year,
      fruitGPerDay: rowFruit.value,
      vegetableGPerDay: rowVeg.value,
      caloriesPerDay: rowCalories.value,
      obesityPercent: rowObesity.value,
      lifeExpectancyYears: rowLife.value,
      cvdDeathsPer100k: rowCvd.value,
      fruitVegetableCombined,
      calorieBalanceScore,
      dietQualityScore,
      cardiometabolicRiskScore: 0,
      longevityScore: 0,
      overallWellbeingScore: 0,
      recommendation: ""
    });
  }

  const obesityRange = {
    min: Math.min(...merged.map((x) => x.obesityPercent)),
    max: Math.max(...merged.map((x) => x.obesityPercent))
  };
  const cvdRange = {
    min: Math.min(...merged.map((x) => x.cvdDeathsPer100k)),
    max: Math.max(...merged.map((x) => x.cvdDeathsPer100k))
  };
  const lifeRange = {
    min: Math.min(...merged.map((x) => x.lifeExpectancyYears)),
    max: Math.max(...merged.map((x) => x.lifeExpectancyYears))
  };

  for (const entry of merged) {
    const obesityRisk = normalize(entry.obesityPercent, obesityRange.min, obesityRange.max);
    const cvdRisk = normalize(entry.cvdDeathsPer100k, cvdRange.min, cvdRange.max);
    const riskScore = obesityRisk * 0.55 + cvdRisk * 0.45;
    const longevityScore = normalize(entry.lifeExpectancyYears, lifeRange.min, lifeRange.max);
    const overallWellbeing = clamp(entry.dietQualityScore * 0.35 + longevityScore * 0.45 + (100 - riskScore) * 0.2);

    entry.cardiometabolicRiskScore = toFixed(riskScore);
    entry.longevityScore = toFixed(longevityScore);
    entry.overallWellbeingScore = toFixed(overallWellbeing);
    entry.fruitGPerDay = toFixed(entry.fruitGPerDay);
    entry.vegetableGPerDay = toFixed(entry.vegetableGPerDay);
    entry.caloriesPerDay = toFixed(entry.caloriesPerDay);
    entry.obesityPercent = toFixed(entry.obesityPercent);
    entry.lifeExpectancyYears = toFixed(entry.lifeExpectancyYears);
    entry.cvdDeathsPer100k = toFixed(entry.cvdDeathsPer100k);
    entry.fruitVegetableCombined = toFixed(entry.fruitVegetableCombined);
    entry.calorieBalanceScore = toFixed(entry.calorieBalanceScore);
    entry.dietQualityScore = toFixed(entry.dietQualityScore);
    entry.recommendation = generateRecommendation(entry);
  }

  merged.sort((a, b) => b.overallWellbeingScore - a.overallWellbeingScore);

  const payload = {
    metadata: {
      generatedAt: new Date().toISOString(),
      minYear: MIN_YEAR,
      maxYear: MAX_YEAR,
      countryCount: merged.length,
      indicators: [
        "fruit_g_per_day",
        "vegetable_g_per_day",
        "daily_calorie_supply",
        "adult_obesity_percent",
        "life_expectancy_years",
        "cardiovascular_deaths_per_100k"
      ],
      sources: [
        { name: "OWID Fruit supply per person", url: SOURCES.fruit },
        { name: "OWID Vegetable supply per person", url: SOURCES.vegetable },
        { name: "OWID Daily calorie supply per person", url: SOURCES.calories },
        { name: "OWID Adult obesity prevalence", url: SOURCES.obesity },
        { name: "OWID Life expectancy", url: SOURCES.lifeExpectancy },
        { name: "OWID CVD deaths (GHE)", url: SOURCES.cvdDeaths },
        { name: "OWID Population", url: SOURCES.population }
      ]
    },
    countries: merged
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2), "utf8");
  // eslint-disable-next-line no-console
  console.log(`Merged dataset created: ${OUTPUT_PATH}`);
  // eslint-disable-next-line no-console
  console.log(`Countries included: ${merged.length}`);
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});

