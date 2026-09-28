# Hotel Booking Management System

A full-stack, enterprise-grade Hotel Booking Management System built with **NestJS**, **TypeORM**, **MySQL 8.0**, **React 18**, **Vite**, **TypeScript**, and **Tailwind CSS**. Designed with role-based access control (RBAC), real-time WebSocket event broadcasting, dynamic pricing, business intelligence reporting, guest loyalty tiering, automated email notifications, customer self-service portal, and strict ownership security guards.

---

## 🚀 Key Features

### 🔐 Authentication & Security (Phase 0 & 1)
- **JWT & Rotating Refresh Tokens**: Short-lived access tokens with DB-backed rotating refresh tokens (`/auth/refresh`, `/auth/logout`, `/auth/logout-all`).
- **Self-Service Password Change**: `PATCH /auth/change-password` with bcrypt validation.
- **Strict Role-Based Access Control (RBAC)**: Enforced via `RolesGuard` for `ADMIN`, `RECEPTIONIST`, and `CUSTOMER` roles.
- **Customer Ownership Guards**: Enforces strict data isolation so customers can only access, view, or cancel their own reservations, invoices, payments, and guest profile.
- **Rate Limiting & Logging**: Configured via `@nestjs/throttler` and `pino` structured logging. Health check endpoint at `/api/health`.

### ⚡ Real-Time Operations & Front Desk Grid (Phase 2)
- **WebSockets Gateway**: Real-time Socket.IO broadcasts for room status transitions, booking events, check-ins, check-outs, and payments.
- **Visual Front Desk Board**: `RoomStatusBoard.tsx` displaying real-time room statuses (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `CLEANING`, `MAINTENANCE`, `OUT_OF_SERVICE`).
- **Interactive Reservation Timeline**: `ReservationTimeline.tsx` with drag-and-drop room re-assignment backed by pessimistic DB write locks.

### 📊 Revenue & Business Intelligence Engine (Phase 3)
- **Dynamic Pricing Engine**: Computes demand occupancy surge multipliers (+10% for >50%, +20% for >80%) and weekend surge multipliers (+15% for Fri/Sat).
- **Cryptographically Signed Price Quotes**: `GET /rooms/available` returns signed HMAC `quoteToken` ensuring price consistency between search and reservation creation.
- **BI Metrics & Reports**: Real-time Average Daily Rate (ADR) and Revenue Per Available Room (RevPAR) KPIs. CSV exports for Revenue, Occupancy, Bookings, and Cancellations.
- **Audit Log Inspection**: Filterable audit trail (`/audit-log`) for ADMIN role with pagination.

### 👑 Guest Loyalty & Automated Operations (Phase 4)
- **Guest Loyalty Tiering**: Auto-calculates guest stay metrics (`completedStays`, `totalNights`, `totalSpent`) and assigns tiers (`STANDARD`, `SILVER`, `GOLD`, `PLATINUM`) and VIP crown badges.
- **Automated Email Notifications**: Dispatcher (`EmailService`) for booking confirmations, check-in welcome notes, checkout receipts, and cancellation notices. Supports SMTP and Ethereal test inbox.
- **Customer Self-Service Portal**: `/my-bookings` portal for customer guests to view active stays, past history, and manage cancellations.

---

## 🛠️ Technology Stack

- **Backend**: NestJS, TypeORM, MySQL 8.0, Socket.IO, `@nestjs/throttler`, Pino, Nodemailer, Bcrypt, RxJS, Jest.
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide React.
- **DevOps**: Docker, Docker Compose, GitHub Actions CI pipeline.

---

## 📋 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_HOST` | MySQL Server Host | `localhost` |
| `DATABASE_PORT` | MySQL Port | `3306` |
| `DATABASE_USER` | MySQL Username | `hotel_user` |
| `DATABASE_PASSWORD` | MySQL Password | `hotel_password` |
| `DATABASE_NAME` | Database Name | `hotel_booking` |
| `JWT_SECRET` | Secret key for JWT and HMAC quotes | `hotel_booking_jwt_secret_key_2026_dev` |
| `JWT_EXPIRES_IN` | Access token expiration | `8h` |
| `PORT` | API Server Port | `3000` |
| `CORS_ORIGIN` | Allowed Frontend Origin | `http://localhost:5173` |
| `SMTP_HOST` | (Optional) SMTP Host | `smtp.example.com` |
| `SMTP_PORT` | (Optional) SMTP Port | `587` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API Base URL | `http://localhost:3000/api` |

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@hotel.com` | `Demo@1234` |
| **Receptionist** | `reception@hotel.com` | `Demo@1234` |

---

## ⚙️ Quick Start & Local Setup

### 1. Database Setup
Create MySQL database and user:
```sql
CREATE DATABASE hotel_booking;
CREATE USER 'hotel_user'@'localhost' IDENTIFIED BY 'hotel_password';
GRANT ALL PRIVILEGES ON hotel_booking.* TO 'hotel_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npm run migration:run
npm run seed
npm run start:dev
```
The NestJS API will run at `http://localhost:3000/api`.

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
The Vite React application will run at `http://localhost:5173/`.

---

## 🖼️ Screenshots

*(Add application UI screenshots here)*
