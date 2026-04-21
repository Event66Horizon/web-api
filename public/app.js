const state = {
  dataset: null,
  filteredCountries: [],
  selectedCountryCode: null
};

const elements = {
  countrySelect: document.getElementById("countrySelect"),
  riskFilter: document.getElementById("riskFilter"),
  topN: document.getElementById("topN"),
  metricCards: document.getElementById("metricCards"),
  selectedCountryDetail: document.getElementById("selectedCountryDetail"),
  methodList: document.getElementById("methodList"),
  dashboardError: document.getElementById("dashboardError")
};

const showDashboardError = (message) => {
  if (!elements.dashboardError) return;
  elements.dashboardError.innerHTML = `<p>${message}</p>`;
  elements.dashboardError.style.display = "block";
};

const clearDashboardError = () => {
  if (!elements.dashboardError) return;
  elements.dashboardError.innerHTML = "";
  elements.dashboardError.style.display = "none";
};

const riskBucket = (score) => {
  if (score < 33) return "low";
  if (score < 66) return "mid";
  return "high";
};

const getCorrelation = (x, y) => {
  const n = x.length;
  if (n === 0 || y.length !== n) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let varianceX = 0;
  let varianceY = 0;

  for (let i = 0; i < n; i += 1) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    varianceX += dx * dx;
    varianceY += dy * dy;
  }

  const denominator = Math.sqrt(varianceX * varianceY);
  if (denominator === 0) return 0;
  return numerator / denominator;
};

const mean = (values) => values.reduce((acc, v) => acc + v, 0) / (values.length || 1);

const normalizeByRange = (value, min, max) => {
  if (max - min < 1e-9) return 50;
  return ((value - min) / (max - min)) * 100;
};

const formatNumber = (value, digits = 1) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);

const computeRanges = (countries) => {
  const metrics = [
    "fruitVegetableCombined",
    "calorieBalanceScore",
    "obesityPercent",
    "cvdDeathsPer100k",
    "lifeExpectancyYears",
    "overallWellbeingScore"
  ];
  const ranges = {};
  metrics.forEach((metric) => {
    ranges[metric] = {
      min: Math.min(...countries.map((c) => c[metric])),
      max: Math.max(...countries.map((c) => c[metric]))
    };
  });
  return ranges;
};

const renderMetrics = (countries) => {
  const cards = [
    { label: "Countries Covered", value: countries.length, suffix: "" },
    { label: "Avg Life Expectancy", value: mean(countries.map((x) => x.lifeExpectancyYears)), suffix: " yrs" },
    { label: "Avg Obesity Rate", value: mean(countries.map((x) => x.obesityPercent)), suffix: "%" },
    { label: "Avg Fruit+Veg", value: mean(countries.map((x) => x.fruitVegetableCombined)), suffix: " g/day" },
    { label: "Avg CVD Deaths", value: mean(countries.map((x) => x.cvdDeathsPer100k)), suffix: " /100k" }
  ];

  elements.metricCards.innerHTML = cards
    .map(
      (card) => `
      <article class="metric glass">
        <h3>${card.label}</h3>
        <p>${formatNumber(card.value)}${card.suffix}</p>
      </article>
    `
    )
    .join("");
};

const renderScatter3d = (countries) => {
  const trace = {
    type: "scatter3d",
    mode: "markers",
    x: countries.map((x) => x.fruitVegetableCombined),
    y: countries.map((x) => x.obesityPercent),
    z: countries.map((x) => x.lifeExpectancyYears),
    text: countries.map((x) => `${x.country}<br>Wellbeing: ${x.overallWellbeingScore}`),
    hovertemplate: "%{text}<br>Fruit+Veg: %{x:.1f} g/day<br>Obesity: %{y:.1f}%<br>Life expectancy: %{z:.1f} yrs<extra></extra>",
    marker: {
      size: countries.map((x) => 6 + x.overallWellbeingScore / 16),
      color: countries.map((x) => x.cvdDeathsPer100k),
      colorscale: "Turbo",
      opacity: 0.85,
      colorbar: {
        title: "CVD deaths/100k"
      }
    }
  };

  Plotly.newPlot(
    "scatter3d",
    [trace],
    {
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      margin: { l: 0, r: 0, t: 10, b: 0 },
      scene: {
        xaxis: { title: "Fruit + Vegetable (g/day)" },
        yaxis: { title: "Obesity (%)" },
        zaxis: { title: "Life expectancy (years)" },
        bgcolor: "rgba(0,0,0,0)"
      },
      font: { color: "#dbe7ff" }
    },
    { responsive: true, displayModeBar: false }
  );
};

const renderRanking = (countries) => {
  const topN = Math.min(30, Math.max(5, Number(elements.topN.value) || 12));
  const ranked = [...countries].sort((a, b) => b.overallWellbeingScore - a.overallWellbeingScore).slice(0, topN);

  Plotly.newPlot(
    "rankingChart",
    [
      {
        type: "bar",
        orientation: "h",
        y: ranked.map((x) => x.country).reverse(),
        x: ranked.map((x) => x.overallWellbeingScore).reverse(),
        marker: {
          color: ranked.map((x) => x.overallWellbeingScore).reverse(),
          colorscale: "Viridis"
        },
        hovertemplate: "%{y}<br>Wellbeing score: %{x:.2f}<extra></extra>"
      }
    ],
    {
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      margin: { l: 120, r: 12, t: 8, b: 36 },
      xaxis: { title: "Overall wellbeing score (0-100)" },
      yaxis: { automargin: true },
      font: { color: "#dbe7ff" }
    },
    { responsive: true, displayModeBar: false }
  );
};

const renderCorrelation = (countries) => {
  const labels = ["Fruit+Veg", "Calories", "Obesity", "CVD/100k", "Life Exp", "Wellbeing"];
  const vectors = [
    countries.map((x) => x.fruitVegetableCombined),
    countries.map((x) => x.caloriesPerDay),
    countries.map((x) => x.obesityPercent),
    countries.map((x) => x.cvdDeathsPer100k),
    countries.map((x) => x.lifeExpectancyYears),
    countries.map((x) => x.overallWellbeingScore)
  ];

  const matrix = vectors.map((row) => vectors.map((col) => Number(getCorrelation(row, col).toFixed(2))));

  Plotly.newPlot(
    "correlationChart",
    [
      {
        type: "heatmap",
        x: labels,
        y: labels,
        z: matrix,
        colorscale: "RdBu",
        reversescale: true,
        zmin: -1,
        zmax: 1,
        hovertemplate: "%{x} vs %{y}: %{z}<extra></extra>"
      }
    ],
    {
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      margin: { l: 80, r: 10, t: 10, b: 50 },
      font: { color: "#dbe7ff" }
    },
    { responsive: true, displayModeBar: false }
  );
};

const renderRadar = (country, ranges) => {
  if (!country) return;

  const labels = ["Diet Quantity", "Calorie Balance", "Low Obesity", "Low CVD", "Longevity", "Wellbeing"];
  const values = [
    normalizeByRange(country.fruitVegetableCombined, ranges.fruitVegetableCombined.min, ranges.fruitVegetableCombined.max),
    country.calorieBalanceScore,
    100 - normalizeByRange(country.obesityPercent, ranges.obesityPercent.min, ranges.obesityPercent.max),
    100 - normalizeByRange(country.cvdDeathsPer100k, ranges.cvdDeathsPer100k.min, ranges.cvdDeathsPer100k.max),
    normalizeByRange(country.lifeExpectancyYears, ranges.lifeExpectancyYears.min, ranges.lifeExpectancyYears.max),
    country.overallWellbeingScore
  ];

  Plotly.newPlot(
    "radarChart",
    [
      {
        type: "scatterpolar",
        r: [...values, values[0]],
        theta: [...labels, labels[0]],
        fill: "toself",
        line: { color: "#2bd1ff", width: 2 },
        fillcolor: "rgba(43, 209, 255, 0.26)",
        hovertemplate: "%{theta}: %{r:.1f}<extra></extra>"
      }
    ],
    {
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      margin: { l: 40, r: 40, t: 20, b: 20 },
      polar: {
        bgcolor: "rgba(0,0,0,0)",
        radialaxis: {
          visible: true,
          range: [0, 100]
        }
      },
      font: { color: "#dbe7ff" },
      showlegend: false
    },
    { responsive: true, displayModeBar: false }
  );
};

const renderSelectedCountryDetail = (country) => {
  if (!country) return;
  elements.selectedCountryDetail.innerHTML = `
    <p><strong>${country.country}</strong> (${country.code}) | reference year: ${country.year}</p>
    <p>Fruit + Vegetable supply: <strong>${formatNumber(country.fruitVegetableCombined)} g/day</strong></p>
    <p>Obesity prevalence: <strong>${formatNumber(country.obesityPercent)}%</strong></p>
    <p>Cardiovascular deaths: <strong>${formatNumber(country.cvdDeathsPer100k)} per 100k</strong></p>
    <p>Life expectancy: <strong>${formatNumber(country.lifeExpectancyYears)} years</strong></p>
    <p>Composite wellbeing score: <strong>${formatNumber(country.overallWellbeingScore, 2)}</strong></p>
    <p>Recommendation: ${country.recommendation}</p>
  `;
};

const renderMethods = () => {
  if (!state.dataset) return;
  const notes = [
    `Dataset generated: ${new Date(state.dataset.metadata.generatedAt).toLocaleString()}`,
    `Country coverage: ${state.dataset.metadata.countryCount} countries`,
    "Window: latest country values between 2000 and 2022",
    "CVD metric normalized from total deaths using population (deaths per 100k)",
    "Wellbeing score combines diet quality, longevity, and inverse risk"
  ];

  const sourceNames = state.dataset.metadata.sources.map((x) => x.name);
  notes.push(`Sources: ${sourceNames.join("; ")}`);

  elements.methodList.innerHTML = notes.map((note) => `<li>${note}</li>`).join("");
};

const applyFilters = () => {
  const risk = elements.riskFilter.value;
  const base = state.dataset.countries;
  if (risk === "all") {
    state.filteredCountries = base;
    return;
  }
  state.filteredCountries = base.filter((x) => riskBucket(x.cardiometabolicRiskScore) === risk);
};

const updateSelect = () => {
  const selected = state.selectedCountryCode || state.filteredCountries[0]?.code || "";
  elements.countrySelect.innerHTML = state.filteredCountries
    .map((x) => `<option value="${x.code}" ${x.code === selected ? "selected" : ""}>${x.country}</option>`)
    .join("");
  state.selectedCountryCode = selected;
};

const renderAll = () => {
  applyFilters();
  if (state.filteredCountries.length === 0) return;

  updateSelect();
  renderMetrics(state.filteredCountries);
  renderScatter3d(state.filteredCountries);
  renderRanking(state.filteredCountries);
  renderCorrelation(state.filteredCountries);

  const ranges = computeRanges(state.filteredCountries);
  const selectedCountry =
    state.filteredCountries.find((x) => x.code === state.selectedCountryCode) || state.filteredCountries[0];
  renderRadar(selectedCountry, ranges);
  renderSelectedCountryDetail(selectedCountry);
  renderMethods();
};

const bindEvents = () => {
  elements.countrySelect.addEventListener("change", (event) => {
    state.selectedCountryCode = event.target.value;
    renderAll();
  });

  elements.riskFilter.addEventListener("change", () => {
    state.selectedCountryCode = null;
    renderAll();
  });

  elements.topN.addEventListener("input", () => {
    renderAll();
  });
};

const init = async () => {
  try {
    const response = await fetch("./data/nutrition-health-merged.json");
    if (!response.ok) {
      throw new Error(`数据加载失败：${response.status} ${response.statusText}`);
    }
    state.dataset = await response.json();
    state.filteredCountries = state.dataset.countries;
    state.selectedCountryCode = state.filteredCountries[0]?.code ?? null;
    clearDashboardError();
    bindEvents();
    renderAll();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    showDashboardError("仪表盘加载失败，请打开浏览器开发者工具查看控制台错误信息。若 Plotly 未加载，请检查网络或刷新页面。");
  }
};

if (window.Plotly) {
  init();
} else {
  showDashboardError("Plotly 图表库未加载，图表无法显示。请检查网络连接，或者尝试刷新页面。");
}

