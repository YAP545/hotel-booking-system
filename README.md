# Grand Hotel - Full-Stack Hotel Booking & Management System

[![CI](https://github.com/YAP545/hotel-booking-system/actions/workflows/ci.yml/badge.svg)](https://github.com/YAP545/hotel-booking-system/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-grade, full-stack Hotel Booking and Property Management System (PMS) built with **NestJS**, **TypeScript**, **React**, **TypeORM**, **MySQL**, **Redis**, and **Socket.IO**. Featuring role-based access control (RBAC), signed dynamic pricing quote tokens, real-time availability updates, Razorpay online payments with HMAC signature verification, automated invoice generation, and comprehensive financial reports.

---

## 🌟 Key Features by Role

### 👤 Customer
- **Room Availability Search**: Filter rooms by date range, guest capacity, and price with real-time dynamic pricing.
- **Signed Price Quotes**: Lock in quoted rates using cryptographic HMAC quote tokens to protect against occupancy surge pricing.
- **Self-Service Registration & Booking**: Registration automatically forces `CUSTOMER` role. Bookings automatically link to the customer's `Guest` record by email.
- **Personal Booking Management**: View personal booking history via `/my-bookings` with complete access isolation.
- **Online Payments**: Secure online payments via Razorpay test mode with server-side HMAC SHA-256 signature verification.
- **Self-Cancellation & Refunds**: Cancel eligible bookings with automatic server-calculated refund tracking.

### 🛎️ Receptionist
- **Visual Reservation Timeline**: Interactive timeline chart for tracking room allocations and stay dates.
- **Check-In Workflow**: Verify guest identity, assign room keys, and transition rooms from `RESERVED` to `OCCUPIED`.
- **Check-Out & Invoicing**: Calculate stay duration, apply taxes/discounts, issue itemized invoices, and transition rooms to `CLEANING`.
- **Payment Processing**: Record cash or credit card payments against outstanding reservation balances.
- **Guest Profiles**: Search, create, and update guest details.

### 🛡️ Admin
- **Executive Dashboard**: Real-time KPI summary (occupancy rate, today's arrivals/departures, today's revenue, ADR, RevPAR).
- **Staff Management**: Provision and manage `ADMIN` and `RECEPTIONIST` accounts via protected `/users` endpoints.
- **Inventory Control**: Create, update, or decommission rooms and room categories (`RoomType`).
- **Financial & Occupancy Reports**: Granular revenue breakdowns, occupancy metrics, and CSV report export.
- **System Settings**: Configure hotel-wide parameters such as tax percentage (`taxPercent`) and check-in/out times.
- **Audit Logs**: Inspect detailed system activity logs for security and auditing compliance.

---

## 🛠️ Tech Stack

### Backend
- **Framework**: [NestJS](https://nestjs.com/) (TypeScript)
- **Database & ORM**: [MySQL 8.0](https://www.mysql.com/) with [TypeORM](https://typeorm.io/)
- **Caching & Rate Limiting**: [Redis 7](https://redis.io/) & `@nestjs/throttler`
- **Real-Time Communication**: [Socket.IO](https://socket.io/) (`@nestjs/websockets`)
- **Authentication**: JWT Access Tokens, Database Refresh Tokens (with rotation), `passport-jwt`, and `bcrypt`
- **Payments**: Official `razorpay` SDK & Node `crypto` HMAC verification
- **Email Service**: `nodemailer` (SMTP support with fallback mock logger)
- **Logging**: `pino` structured logger (`nestjs-pino`)

### Frontend
- **Framework & Build**: [React 18](https://react.dev/), [Vite](https://vitejs.dev/), TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), Lucide React Icons
- **Charts & Data Viz**: [Recharts](https://recharts.org/) (Responsive Revenue & Occupancy trends)
- **HTTP & Sockets**: Axios (with JWT refresh interceptor), `socket.io-client`

### DevOps & Testing
- **Containers**: Docker & Docker Compose (MySQL, Redis, Backend, Frontend)
- **CI/CD**: GitHub Actions (`.github/workflows/ci.yml`)
- **Unit Testing**: Jest & `ts-jest` (11 test suites, 45 unit tests)

---

## 📁 Repository Structure

```text
hotel-booking-system/
├── .github/
│   └── workflows/
│       └── ci.yml            # GitHub Actions CI pipeline
├── backend/                  # NestJS REST API Server
│   ├── src/
│   │   ├── auth/             # Authentication, JWT, Refresh Token Rotation, RBAC
│   │   ├── check-in/         # Guest check-in service & controller
│   │   ├── check-out/        # Check-out & invoicing service
│   │   ├── common/           # Audit logs, Cache, Dynamic Pricing, Email, WebSockets
│   │   ├── database/         # TypeORM config, Migrations, Seeders
│   │   ├── guests/           # Guest entity & profile endpoints
│   │   ├── health/           # System health check endpoints
│   │   ├── invoices/         # Invoice calculation & generation
│   │   ├── payments/         # Payment recording & Razorpay integration
│   │   ├── reports/          # Financial, occupancy & CSV export service
│   │   ├── reservations/     # Reservation management & refund logic
│   │   ├── room-types/       # Room categories & capacity
│   │   ├── rooms/            # Room inventory & status state machine
│   │   ├── settings/         # Hotel configuration settings
│   │   └── users/            # Staff & User administration
│   └── package.json
├── docs/                     # Documentation & Architecture diagrams placeholder
│   └── README.md
├── frontend/                 # React + Vite Web Application
│   ├── src/
│   │   ├── components/       # Reusable UI components & Modals
│   │   ├── context/          # React Auth Context & Session Management
│   │   ├── hooks/            # Socket.IO & Custom Hooks
│   │   ├── pages/            # Dashboard, Timeline, Booking, Reports pages
│   │   ├── services/         # Axios API Service Modules
│   │   └── utils/            # Razorpay Checkout SDK wrapper
│   └── package.json
├── docker-compose.yml        # Multi-container environment (MySQL, Redis, Backend, Frontend)
├── .env.example              # Environment variables template
├── LICENSE                   # MIT License
└── README.md                 # Project documentation
```

---

## ⚡ Quickstart & Installation

### Option 1: Docker Compose (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/YAP545/hotel-booking-system.git
   cd hotel-booking-system
   ```

2. Start all services using Docker Compose:
   ```bash
   docker-compose up -d --build
   ```

3. Access the application:
   - **Frontend**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:3000/api](http://localhost:3000/api)

---

### Option 2: Local Manual Setup

#### Prerequisites
- Node.js v20+
- MySQL Server 8.0+
- Redis Server 7.0+

#### 1. Backend Setup
```bash
cd backend
npm install

# Configure environment variables
cp ../.env.example .env
# Edit .env with your MySQL and Redis credentials

# Run database seed (creates demo users & room inventory)
npm run seed

# Start development server
npm run start:dev
```
Backend API will be running on `http://localhost:3000/api`.

#### 2. Frontend Setup
```bash
cd ../frontend
npm install

# Start Vite dev server
npm run dev
```
Frontend web application will be running on `http://localhost:5173`.

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` in the `backend/` directory and configure the variables:

| Variable Name | Default / Sample | Description |
|---|---|---|
| `DATABASE_HOST` | `localhost` | MySQL host address |
| `DATABASE_PORT` | `3306` | MySQL port |
| `DATABASE_USER` | `hotel_user` | MySQL database username |
| `DATABASE_PASSWORD` | `hotel_password` | MySQL database password |
| `DATABASE_NAME` | `hotel_booking` | MySQL database name |
| `REDIS_HOST` | `localhost` | Redis host address |
| `REDIS_PORT` | `6379` | Redis port |
| `PORT` | `3000` | Backend HTTP port |
| `NODE_ENV` | `development` | Application environment (`development` / `production`) |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin URL |
| `JWT_SECRET` | `your_secret_key` | Secret key for JWT signing & pricing quote HMAC |
| `JWT_EXPIRES_IN` | `15m` | Access token expiration duration |
| `SMTP_HOST` | `smtp.ethereal.email` | SMTP server host (leave empty for mock logging mode) |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_SECURE` | `false` | Use SSL/TLS for SMTP |
| `SMTP_USER` | `user@example.com` | SMTP username |
| `SMTP_PASS` | `password` | SMTP password |
| `SMTP_FROM` | `noreply@grandhotel.com` | Sender email address |
| `RAZORPAY_KEY_ID` | `rzp_test_xxxx` | Razorpay Key ID (Test/Live mode) |
| `RAZORPAY_KEY_SECRET` | `xxxxsecret` | Razorpay Key Secret |
| `VITE_API_URL` | `http://localhost:3000/api` | Frontend API base URL |
| `VITE_RAZORPAY_KEY_ID` | `rzp_test_xxxx` | Frontend Razorpay public Key ID |

---

## 📡 REST API Endpoints

### Authentication & Users
| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Self-registration (forces `CUSTOMER` role) |
| `POST` | `/api/auth/login` | Public | Authenticate user, returns JWT & refresh token |
| `POST` | `/api/auth/refresh` | Public | Rotate refresh token for new access token |
| `POST` | `/api/auth/logout` | Authenticated | Revoke active refresh token |
| `POST` | `/api/auth/logout-all` | Authenticated | Revoke all refresh tokens for current user |
| `GET` | `/api/auth/me` | Authenticated | Get current logged-in user profile |
| `GET` | `/api/users` | `ADMIN` | List all system user accounts |
| `POST` | `/api/users` | `ADMIN` | Provision new `ADMIN`, `RECEPTIONIST`, or `CUSTOMER` account |

### Rooms & Inventory
| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `GET` | `/api/rooms/available` | Public / Authenticated | Search available rooms by date/capacity with signed price quote |
| `GET` | `/api/rooms` | Public / Authenticated | List all rooms in hotel inventory |
| `POST` | `/api/rooms` | `ADMIN` | Add new room to inventory |
| `PATCH` | `/api/rooms/:id` | `RECEPTIONIST`, `ADMIN` | Update room status or price |
| `GET` | `/api/room-types` | Public / Authenticated | List room categories |
| `POST` | `/api/room-types` | `ADMIN` | Create new room category |

### Reservations & Guests
| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `POST` | `/api/reservations` | All Roles | Create booking (Customer `guestId` automatically derived) |
| `GET` | `/api/reservations` | `RECEPTIONIST`, `ADMIN` | List/filter all hotel reservations |
| `GET` | `/api/my-bookings` | `CUSTOMER` | View customer's own booking history |
| `GET` | `/api/reservations/:id` | Owned / Staff | Get detailed reservation record |
| `POST` | `/api/reservations/:id/cancel` | Owned / Staff | Cancel reservation & calculate eligible refund |
| `GET` | `/api/guests` | `RECEPTIONIST`, `ADMIN` | Search & list guest profiles |

### Check-In, Check-Out & Invoices
| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `POST` | `/api/check-in` | `RECEPTIONIST`, `ADMIN` | Process guest check-in & flip room to `OCCUPIED` |
| `POST` | `/api/check-out` | `RECEPTIONIST`, `ADMIN` | Process check-out, issue invoice & flip room to `CLEANING` |
| `GET` | `/api/invoices` | Owned / Staff | List generated invoices |
| `GET` | `/api/invoices/:id` | Owned / Staff | View detailed invoice |

### Payments & Reports
| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `POST` | `/api/payments` | `RECEPTIONIST`, `ADMIN` | Record manual cash or card payment |
| `POST` | `/api/payments/razorpay/create-order` | Owned / Staff | Create Razorpay order for outstanding balance |
| `POST` | `/api/payments/razorpay/verify` | Owned / Staff | Verify Razorpay payment signature & record payment |
| `GET` | `/api/reports/dashboard` | `RECEPTIONIST`, `ADMIN` | Executive dashboard analytics & metrics |
| `GET` | `/api/reports/revenue` | `ADMIN` | Revenue reports with net calculation (PAID minus REFUNDED) |

---

## 🔄 Booking & Stay Lifecycle Workflow

```text
[Customer Search] ──► [Quote Signed] ──► [Reservation Created] ──► [Check-In (Staff)]
                                                                           │
                                                                           ▼
[Room Needs Cleaning] ◄── [Check-Out & Invoice] ◄── [Payment Verified] ◄── [Stay Active]
```

1. **Room Search & Price Quote**: Customer queries `/api/rooms/available`. Server evaluates occupancy metrics and returns an HMAC-signed `quoteToken` locking in the price.
2. **Booking Creation**: Customer submits `/api/reservations`. The backend auto-links the user's email to a `Guest` record, preventing guest ID spoofing.
3. **Check-In**: Receptionist executes `/api/check-in`. The room state transitions to `OCCUPIED`.
4. **Online Payment**: Customer pays outstanding balance via Razorpay modal. The backend verifies `razorpay_order_id|razorpay_payment_id` against `razorpay_signature` before recording payment as `PAID`.
5. **Check-Out & Cleaning**: Receptionist executes `/api/check-out`. Server validates balance settlement, generates an itemized `Invoice`, and transitions room status to `CLEANING` (`NEEDS_CLEANING`).
6. **Refund Calculation**: If a booking is cancelled via `/api/reservations/:id/cancel`:
   $$\text{Refund Amount} = \max(0, \min(\text{Total Paid} - \text{Cancellation Fee}, \text{Total Paid}))$$
   If `refundAmount > 0`, a payment record with `paymentStatus = REFUNDED` is saved, ensuring net revenue reports remain accurate.

---

## 🧪 Testing & Verification

Run the full NestJS unit test suite:

```bash
cd backend
npm test
```

**Test Suite Coverage**:
- `auth.service.spec.ts` (Forced CUSTOMER role on self-registration)
- `customer-authorization.spec.ts` (Customer data isolation & endpoint protection)
- `reservations.refund.spec.ts` (Unpaid, partial, full payment & fee refund calculations)
- `reports.revenue.spec.ts` (Net revenue auditing: `PAID` minus `REFUNDED`)
- `dynamic-pricing.service.spec.ts` (HMAC quote signing & surge protection)
- `email.service.spec.ts` (SMTP dispatch & mock logging fallback)
- `check-in.service.spec.ts` & `check-out.service.spec.ts` (Status transitions)

---

## 🛡️ Security Measures

- **Zero-Trust Client Payloads**: Self-registration forces `CUSTOMER` role. Booking creation ignores client-supplied `guestId`.
- **HMAC Payment Signature Verification**: Server computes SHA-256 HMAC of Razorpay payloads before accepting payment status updates.
- **Role-Based Access Control (RBAC)**: All routes protected with JWT Auth Guards and `@Roles()` authorization decorators.
- **Refresh Token Rotation**: Refresh tokens are single-use and stored securely in the database with instant revocation capabilities.
- **Rate Limiting**: Rate limits enforced via `@nestjs/throttler` against brute-force attacks.

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

Developed by **[YAP545](https://github.com/YAP545)**
