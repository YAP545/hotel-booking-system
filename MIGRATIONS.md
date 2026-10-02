# Database Migrations Guide

This project uses TypeORM migrations to manage the database schema. **`synchronize` is strictly set to `false`** in production and development to prevent accidental data loss. Migrations act as the single source of truth for our schema.

### First-Time Setup
Before seeding the database or starting the application manually, you must run migrations to create the tables:
```bash
cd backend
npm run migration:run
```
*(Note: If using Docker Compose, the `backend` service runs this automatically before startup).*

### Making Schema Changes
When you add a new entity or modify an existing one, generate a new migration:
```bash
cd backend
npm run migration:generate --name=AddYourFeature
```
This compares your entities against the current database and generates the necessary SQL in `src/database/migrations/`. 
Always review the generated migration file before committing!

### Reverting Migrations
If you need to undo the last migration locally:
```bash
cd backend
npm run migration:revert
```
