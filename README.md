# E-Commerce System

Monorepo with:

- `frontend`: Next.js + TypeScript + Tailwind CSS
- `backend`: Spring Boot + MySQL + Flyway + JWT

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
2. From `backend`:

```powershell
mvn spring-boot:run
```

Config defaults are in `backend/src/main/resources/application.properties`.
You can override with environment variables:

- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- `CORS_ALLOWED_ORIGINS`

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
