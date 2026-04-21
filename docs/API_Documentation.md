# NutriPlanner API Documentation

## 1) Base URLs and Entry Endpoints

- Service root: `http://localhost:3000/`
- API base: `http://localhost:3000/api/v1`
- Health check: `GET http://localhost:3000/health`
- Static docs: `GET http://localhost:3000/docs/API_Documentation.pdf`
- Insights dashboard: `GET http://localhost:3000/insights/`

Important:
- This project is API-first. There is no HTML login page.
- All business endpoints below are relative to `/api/v1`.

## 2) Response Envelope

Success:
```json
{
  "success": true,
  "data": {}
}
```

Error:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": []
  }
}
```

## 3) Authentication

### `POST /auth/register`
Create user and return token pair.

Validation:
- `email`: valid email
- `name`: 2-80 chars
- `password`: 8-128 chars, must include at least one letter and one number

Request:
```json
{
  "email": "student@example.com",
  "name": "Student Demo",
  "password": "StrongPass123"
}
```

Response `201`:
```json
{
  "success": true,
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<sessionId.secret>",
    "tokenType": "Bearer",
    "expiresInMinutes": 15,
    "user": {
      "id": 2,
      "email": "student@example.com",
      "name": "Student Demo",
      "role": "user"
    }
  }
}
```

### `POST /auth/login`
Login and issue fresh token pair.

### `POST /auth/refresh`
Rotate refresh token and return new token pair.

Request:
```json
{
  "refreshToken": "<sessionId.secret>"
}
```

### `POST /auth/logout`
Revoke refresh session.

### `GET /auth/me`
Get current user profile.

Header:
```text
Authorization: Bearer <access_token>
```

## 4) Ingredients

### `GET /ingredients`
List ingredients with filters and pagination.

Query params:
- `name` optional
- `category` optional
- `allergen` optional
- `limit` integer, default `20`, max `100`
- `offset` integer, default `0`

### `GET /ingredients/:id`
Get one ingredient by numeric id.

### `POST /ingredients` (auth required)
Create ingredient.

Validation:
- `name`: 2-120 chars
- `category`: 2-60 chars
- `kcalPer100g`, `proteinPer100g`, `carbsPer100g`, `fatPer100g`, `costPer100g`: non-negative numbers
- `allergens`: up to 20 strings
- `source`: 2-120 chars (default `"manual"`)

### `PATCH /ingredients/:id` (auth required)
Partial update, at least one field required.

### `DELETE /ingredients/:id` (admin required)
Delete ingredient.

## 5) Recipes

### `GET /recipes`
List recipes with filters and pagination.

Query params:
- `search` optional (title/description)
- `difficulty` optional: `easy|medium|hard`
- `createdBy` optional (user id)
- `limit` integer, default `20`, max `100`
- `offset` integer, default `0`

### `GET /recipes/:id`
Get recipe with detailed ingredient nutrition contribution.

### `POST /recipes` (auth required)
Create recipe.

Validation:
- `title`: 3-120 chars
- `description`: 5-600 chars
- `difficulty`: `easy|medium|hard`
- `servings`: int `1-50`
- `prepMinutes`: int `0-1440`
- `instructions`: 10-4000 chars
- `ingredients`: 1-30 items
- each ingredient: `ingredientId` positive int, `grams` > 0 and <= 5000

Request example:
```json
{
  "title": "Chicken Rice Bowl",
  "description": "High-protein balanced meal.",
  "difficulty": "easy",
  "servings": 2,
  "prepMinutes": 25,
  "instructions": "Cook rice. Grill chicken. Steam vegetables.",
  "ingredients": [
    { "ingredientId": 1, "grams": 220 },
    { "ingredientId": 2, "grams": 180 }
  ]
}
```

### `PATCH /recipes/:id` (auth required)
Partial update, at least one field required.

If `ingredients` is provided, the recipe ingredient list is replaced with the new list.

### `DELETE /recipes/:id` (auth required)
Delete recipe.

## 6) Analytics

### `GET /analytics/recipes/:id/nutrition`
Compute:
- totals: calories/protein/carbs/fat/cost
- per-serving values
- macro ratios (%)
- quality scores (`macroBalance`, `proteinDensity`)
- allergen summary

### `GET /analytics/recipes/:id/cost`
Compute:
- `totalCost`
- `costPerServing`
- `costTier`: `budget|moderate|premium`
- explanatory notes

### `GET /analytics/leaderboard`
Rank recipes.

Query params:
- `metric`: `proteinDensity` or `costEfficiency` (default `proteinDensity`)
- `limit`: default `10`, max `50`

### `POST /analytics/recommendations` (auth required)
Return recommendation list under constraints.

Request:
```json
{
  "targetCaloriesPerServing": 500,
  "minProteinPerServing": 20,
  "maxCostPerServing": 4,
  "excludeAllergens": ["peanut"]
}
```

Current scoring logic:
```text
score =
  0.35 * macroBalance
  + 1.6 * proteinDensity
  - 8 * costPerServing
  - 35 * caloriePenalty
```

where:
- `caloriePenalty = abs(actual - target) / target` (only when target is provided)
- allergen and numeric constraints are applied before ranking
- top 10 are returned

Response example:
```json
{
  "success": true,
  "data": {
    "totalCandidates": 2,
    "items": [
      {
        "recipeId": 4,
        "title": "High Protein Bowl",
        "score": 87.42,
        "highlights": {
          "caloriesPerServing": 502.3,
          "proteinPerServing": 38.6,
          "costPerServing": 3.2,
          "allergens": []
        }
      }
    ]
  }
}
```

## 7) Common Error Codes

- `400` validation/domain constraint failure
- `401` missing or invalid auth token / refresh token failure
- `403` authenticated but insufficient role
- `404` resource or route not found
- `409` conflict (for example duplicate email/ingredient)
- `500` internal server error

Route-not-found example:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested route does not exist."
  }
}
```

If you see this while testing recommendations, verify exact path:
- correct: `POST /api/v1/analytics/recommendations`
- wrong: `POST /api/v1/analytics/recommendation` or missing `/api/v1`

## 8) Security and Middleware Notes

- Password hashing: `bcryptjs`
- Access token: short-lived JWT
- Refresh token: server-side stored hash + rotation
- Request validation: `zod`
- Security middleware: `helmet`, `cors`, `express-rate-limit`
