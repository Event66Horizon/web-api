# Oral Q&A Preparation (5 Minutes)

## Likely Questions and High-Scoring Answer Direction

1. Why did you choose this stack?
- Explain trade-offs: Express ecosystem maturity, TypeScript safety, SQL data integrity, Zod validation consistency.

2. Why SQL instead of NoSQL?
- Structured entities (users, recipes, ingredients, many-to-many links) map naturally to relational schema.
- Referential integrity and deterministic analytics are easier with SQL joins.

3. How is security handled?
- Password hashing (`bcrypt`), short-lived access tokens, refresh-token rotation, revocation table, rate limiting, validation, and role checks.

4. How do you ensure API robustness?
- Consistent error model, semantic HTTP status codes, validation on input boundaries, integration tests.

5. What makes this beyond baseline CRUD?
- Added analytics domain: nutrition scoring, cost tiering, leaderboard metrics, personalized recommendations.

6. How did you use GenAI responsibly?
- Clarify where AI accelerated design/implementation, and how outputs were verified, corrected, and documented.

7. Limitations?
- Current storage engine choice for portability, limited production scalability, recommendation model is heuristic.

8. What would you build next?
- Stronger RBAC, OpenAPI-driven SDK generation, CI/CD pipeline, hosted database, observability stack.

