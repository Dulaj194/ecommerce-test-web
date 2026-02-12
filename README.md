# E-Commerce System

Monorepo with:

- `frontend`: Next.js + TypeScript + Tailwind CSS
- `backend`: Spring Boot + MySQL + Flyway + JWT + Redis cache/rate-limit + pluggable storage (Local/S3)

## Features

- User auth (register/login/JWT)
- Product listing + search
- Cart add/update/remove
- Checkout + order history
- Admin product management
- Admin order management
- Admin home-banner upload/update/delete
- Home page full-screen menu (`=` open, `X` close + navigate home)

## Default Admin

- Email: `admin@shop.com`
- Password: `Admin@123`

Created automatically at backend startup if not already present.

## Run Backend

1. Create MySQL database user and update env vars if needed.
2. Start Redis (required for cache + rate-limit/session store).
3. From `backend`:

```powershell
mvn spring-boot:run
```

Config defaults are in `backend/src/main/resources/application.properties`.
You can override with environment variables:

- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- `CORS_ALLOWED_ORIGINS`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `STORAGE_PROVIDER` (`local` or `s3`)
- `AWS_REGION`
- `AWS_S3_BUCKET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_ENDPOINT` (optional, for MinIO/custom endpoint)
- `AWS_S3_PUBLIC_BASE_URL` (optional CDN/public URL)
- `AWS_S3_KEY_PREFIX`

## Run Frontend

1. From `frontend`, create `.env.local` using `.env.example`.
2. Install and run:

```powershell
npm install
npm run dev
```

App URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`

## Production Notes

- Architecture is frozen to `Next.js + Spring Boot + MySQL + Redis + S3`.
- Public product/banner APIs are Redis-cached for faster responses.
- Auth, cart, and checkout endpoints are Redis rate-limited.
- Banner image storage is provider-based:
  - `local`: files served under `/uploads/**`
  - `s3`: files uploaded to S3 and returned as public URLs
