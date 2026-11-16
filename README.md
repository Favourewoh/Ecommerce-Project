# E-commerce Auth API

A REST API for authentication and role-based access control, built with Node.js, Express and PostgreSQL. It handles sign-up, email verification, login, password reset and secret-key admin registration, protected by hashed tokens and rate limiting. It covers accounts and roles only, with no products, cart or orders.

## Stack

- **Runtime:** Node.js, Express
- **Database:** PostgreSQL, raw SQL through `pg` (no ORM)
- **Auth:** `bcrypt` (password hashing), `jsonwebtoken` (JWT, HS256)
- **Security:** `helmet`, `cors` (origin allowlist), `express-rate-limit`
- **Email:** Resend
- **API docs:** OpenAPI 3.0.3 (`openapi.yaml`), served with `swagger-ui-express` and `yaml`
- **Dev tools:** `nodemon`, Postman for manual testing

## Project structure

```
ecomm-project/
├── index.js                     # app setup, middleware, router mounting, Swagger UI
├── openapi.yaml                 # API documentation (OpenAPI spec, hand-written)
├── db/
│   ├── index.js                 # pg Pool, exports { query }
│   └── schema.sql               # users table and indexes
├── routes/
│   ├── auth.js                  # auth URLs and the middleware that runs before each handler
│   └── dashboard.js             # dashboard URLs and the middleware that runs before each handler
├── controllers/
│   ├── authController.js        # handler logic
│   └── dashboardController.js   # handler logic
├── middleware/
│   ├── auth.js                  # authenticateToken
│   ├── authorize.js             # authorizeRoles
│   └── limiter.js               # rate limiters
├── utils/
│   ├── authHelpers.js           # validation, password hashing, verification tokens
│   ├── security.js              # admin key check (timing-safe)
│   └── mailer.js                # sendEmail, sendVerificationEmail
├── .env.example                 # variable names only
└── NOTES.md                     # design decisions in my own words
```

## Setup

1. Clone the repository and install dependencies:
   ```bash
   git clone <your-repo-url>
   cd ecomm-project
   npm install
   ```
2. Create a PostgreSQL database named `ecomm_auth`.
3. Run the schema against it:
   ```bash
   psql -U <your-user> -d ecomm_auth -f db/schema.sql
   ```
4. Copy `.env.example` to `.env` and fill in every value (see below).
5. Start the server:
   ```bash
   npm run dev
   ```

The server refuses to start if a required secret is missing or too short.

## Environment variables

Names only. Never commit real values.

| Variable | Purpose |
|---|---|
| `PORT` | Port the server listens on |
| `PG_USER`, `PG_HOST`, `PG_DB`, `PG_PASS`, `PG_PORT` | PostgreSQL connection |
| `JWT_SECRET` | Signs JWTs. Random, at least 32 characters |
| `JWT_EXPIRES_IN` | Token lifetime, for example `1h` |
| `ADMIN_SECRET_KEY` | Secret for admin registration. Random, at least 32 characters, different from `JWT_SECRET` |
| `APP_URL` | Base URL used in emailed links, including the port and with no trailing slash |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | Sender address for outgoing email |
| `CORS_ORIGINS` | Comma-separated list of allowed browser origins |

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## API documentation

Interactive documentation is served by Swagger UI while the server runs:

**http://localhost:3000/api-docs**

It is generated from [`openapi.yaml`](./openapi.yaml) in the project root. Every route is documented with its request fields, the status codes it really returns, and fake example data. The docs describe the API only; they do not host it.

### Trying a protected route in Swagger UI

1. Open `POST /api/v1/auth/login`, press **Try it out**, and log in with a verified account. Copy the token from the response.
2. Press **Authorize** at the top of the page.
3. Under `bearerAuth`, paste the token (only the token, Swagger adds the word `Bearer`) and confirm.
4. Call a dashboard route. The token is now sent automatically.

For `POST /api/v1/auth/admin-register`, enter the admin key under `adminSecret` in the same **Authorize** dialog. It is sent in the `x-admin-secret` header.

Use fake data when trying routes, and never paste a real production key or token into the docs page.

### Keeping the docs accurate

When a route's status codes, fields or messages change, update `openapi.yaml` in the same commit. The docs are only useful while they match the code.

## Endpoints

Auth routes are under `/api/v1/auth`. Dashboard routes are under `/api/v1/dashboard`.

| Method | Path | Who can call it | What it does |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Anyone | Creates a `merchant` account and emails a verification link |
| POST | `/api/v1/auth/admin-register` | Anyone with the `x-admin-secret` header; limited to 5 requests per 15 minutes per IP | Creates an `admin` account. Admins also verify by email |
| GET | `/api/v1/auth/verify-email?token=...` | Anyone with a valid link | Marks the account verified. A link works once |
| POST | `/api/v1/auth/login` | Anyone; limited to 10 failed attempts per 15 minutes per IP | Returns a JWT for a verified account |
| POST | `/api/v1/auth/forgot-password` | Anyone; limited to 3 requests per 15 minutes per IP | Sends a reset link. Same response whether or not the account exists |
| POST | `/api/v1/auth/reset-password` | Anyone with a valid reset token | Sets a new password. The token works once |
| POST | `/api/v1/auth/resend-verification` | Anyone; limited to 3 requests per 15 minutes per IP | Sends a new verification link to an unverified account. Same response in every case |
| GET | `/api/v1/dashboard/user` | Any logged-in user (`authenticateToken`) | Returns the caller's id and role |
| GET | `/api/v1/dashboard/admin` | Admins only (`authenticateToken`, then `authorizeRoles("admin")`) | Admin-only test route |

Protected routes expect `Authorization: Bearer <token>`.

### Status codes

| Code | Meaning here |
|---|---|
| 200 / 201 | Success / account created |
| 400 | Bad input, or an invalid or expired token |
| 401 | Not authenticated: missing or bad token, wrong login, wrong admin key |
| 403 | Authenticated but not allowed: wrong role, or email not verified |
| 409 | Email already registered |
| 429 | Rate limit reached |
| 500 | Server error (fixed message, no internal details) |

## Security decisions

- **Passwords** are hashed with `bcrypt`. Verification and reset tokens are random, stored only as SHA-256 hashes, and expire (24 hours for verification, 30 minutes for reset).
- **Single-use tokens are atomic.** Verify-email and reset-password use one `UPDATE ... WHERE hash = $1 AND expires_at > NOW() RETURNING id`, so two simultaneous requests cannot both use the same token.
- **Validation runs before a token is consumed**, so a mistyped password does not burn the reset link.
- **No account enumeration.** Login returns the same 401 for a wrong email or a wrong password. Forgot-password and resend-verification return the same 200 whether or not the account exists.
- **Admin registration** needs a secret key sent in a header. The key is checked before the body is read, compared with `crypto.timingSafeEqual` on SHA-256 hashes, and every failure returns the same 401.
- **Fail-fast configuration.** The server will not start without `JWT_SECRET` or `ADMIN_SECRET_KEY`, or if they are too short.
- **JWT payload** holds only `id` and `role`. Roles are read from the verified token, never from the request body.
- **Rate limiting** counts per IP, not per account, so an attacker cannot lock a real user out. Login counts only failed attempts.
- **Headers and CORS.** `helmet` sets security headers. CORS allows only listed origins, and unlisted origins get no permission header.
- **Parameterized queries** everywhere, and 500 responses never expose error details.

The reasoning behind each decision is in [NOTES.md](./NOTES.md).

## Known limits

- **Email delivery:** until a sending domain is verified in Resend, mail can only be delivered to the account owner's own address. Other users will register but not receive a verification email.
- **Rate limit storage** is in memory, so counts reset on restart and are not shared between multiple server instances.
- **Behind a proxy** (Render, Railway and similar), `trust proxy` must be set so limits see real client IPs. This is not configured yet.
- **API docs server list:** `openapi.yaml` only lists `http://localhost:3000`. A production server entry will be added after deployment.
- **No automated tests yet.** Routes were tested manually with Postman, `curl` and Swagger UI.
- **Out of scope:** products, carts, orders, refresh tokens and logout.

## Author

Favour Chibuike Ewoh