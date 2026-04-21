# Dataset Sources for NutriLens Dashboard

All dashboard data are pulled from Our World in Data grapher CSV endpoints.

## Indicator URLs
- Fruit supply per person:
  - `https://ourworldindata.org/grapher/fruit-consumption-per-capita.csv?csvType=full&useColumnShortNames=false`
- Vegetable supply per person:
  - `https://ourworldindata.org/grapher/vegetable-consumption-per-capita.csv?csvType=full&useColumnShortNames=false`
- Daily calorie supply per person:
  - `https://ourworldindata.org/grapher/daily-per-capita-caloric-supply.csv?csvType=full&useColumnShortNames=false`
- Adult obesity prevalence (%):
  - `https://ourworldindata.org/grapher/share-of-adults-defined-as-obese.csv?csvType=full&useColumnShortNames=false`
- Life expectancy:
  - `https://ourworldindata.org/grapher/life-expectancy.csv?csvType=full&useColumnShortNames=false`
- Total CVD deaths:
  - `https://ourworldindata.org/grapher/deaths-from-cardiovascular-disease-ghe.csv?csvType=full&useColumnShortNames=false`
- Population:
  - `https://ourworldindata.org/grapher/population.csv?csvType=full&useColumnShortNames=false`

## Processing Notes
- Country-level observations only (`Code` length 3; excludes OWID aggregate codes).
- Year window: 2000 to 2022.
- For each indicator, latest available year per country is selected.
- CVD metric is transformed to `deaths per 100k` using population for the same latest shared year.
- Composite scores are computed in `scripts/fetch-nutrition-health-data.ts`.

## License & Citation
Please review and cite OWID dataset sources in your report according to module referencing guidance.

