# E-commerce Auth API

A REST API for authentication and role-based access control, built with Node.js, Express and PostgreSQL. It handles sign-up, email verification, login, password reset and secret-key admin registration, protected by hashed tokens and rate limiting. It covers accounts and roles only, with no products, cart or orders.

## Live demo

- **API docs (Swagger UI):** https://ecomm-auth-api-0312.onrender.com/api-docs
- **Hosting:** the API runs on Render (free web service) and the database on Neon (free PostgreSQL).

The free web service sleeps when idle, so the first request after a quiet period can take up to about a minute. Later requests are fast. Please use fake data when trying the routes.

## Stack

- **Runtime:** Node.js, Express
- **Database:** PostgreSQL, raw SQL through `pg` (no ORM)
- **Auth:** `bcrypt` (password hashing), `jsonwebtoken` (JWT, HS256)
- **Security:** `helmet`, `cors` (origin allowlist), `express-rate-limit`
- **Email:** Nodemailer, sending through Gmail SMTP
- **API docs:** OpenAPI 3.0.3 (`openapi.yaml`), served with `swagger-ui-express` and `yaml`
- **Hosting:** Render (API), Neon (PostgreSQL)
- **Dev tools:** `nodemon`, Postman for manual testing

## Project structure

```
ecomm-project/
├── index.js                     # app setup, middleware, router mounting, Swagger UI
├── openapi.yaml                 # API documentation (OpenAPI spec, hand-written)
├── db/
│   ├── index.js                 # pg Pool (reads DATABASE_URL), exports { query }
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
│   └── mailer.js                # sendEmail, sendVerificationEmail (Nodemailer)
├── .env.example                 # variable names only
└── NOTES.md                     # design decisions in my own words
```

## Setup (local)

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
   On a hosted database (for example Neon) you can instead paste `db/schema.sql` into the provider's SQL editor.
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
| `PORT` | Port the server listens on. Set it locally. Render provides it in production |
| `DATABASE_URL` | PostgreSQL connection string, for example `postgresql://user:password@localhost:5432/ecomm_auth`. Special characters in the password (such as `@`) must be URL-encoded, for example `@` becomes `%40` |
| `JWT_SECRET` | Signs JWTs. Random, at least 32 characters |
| `JWT_EXPIRES_IN` | Token lifetime, for example `1h` |
| `ADMIN_SECRET_KEY` | Secret for admin registration. Random, at least 32 characters, different from `JWT_SECRET` |
| `APP_URL` | Base URL used in emailed links, with no trailing slash. Locally it includes the port (`http://localhost:3000`). In production it is the public URL with no port |
| `SMTP_HOST` | SMTP server host, `smtp.gmail.com` for Gmail |
| `SMTP_PORT` | SMTP port: `465` (secure connection from the start) or `587` (upgrades after connecting) |
| `SMTP_USER` | The Gmail address used to send. Use a dedicated account for this project, not a personal one |
| `SMTP_PASS` | A Gmail **app password** (needs 2-step verification), never the normal account password |
| `EMAIL_FROM` | Sender address. With Gmail it must be the same address as `SMTP_USER`, because Gmail overrides a different sender |
| `CORS_ORIGINS` | Comma-separated list of allowed browser origins, with no trailing slashes |

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Deployment

The API is deployed as a Render web service, with its database on Neon.

- **Build command:** `npm install`
- **Start command:** `npm start`
- **Database:** create the tables once by running `db/schema.sql` against Neon. Use Neon's direct connection string for that one-off step, and the pooled connection string as `DATABASE_URL` for the running app.
- **Environment variables:** set every variable in the table above in Render's environment settings, except `PORT`. Use new production secrets for `JWT_SECRET` and `ADMIN_SECRET_KEY`, never the local ones.
- **Proxy:** the app sets `app.set('trust proxy', 1)` so rate limits see each visitor's real IP behind Render's proxy.
- **URLs:** `APP_URL` and `CORS_ORIGINS` must match the public Render URL, without a trailing slash.
- **Email:** the `SMTP_*` variables and `EMAIL_FROM` are set in Render like any other secret. Some hosts block outbound SMTP ports (25, 465, 587), including on free plans, so check Render's current policy. If SMTP is blocked, mail works locally and fails after deployment (see Known limits).

Variable names are case-sensitive on Render (Linux), so `DATABASE_URL` and `database_url` are different names.

## API documentation

Interactive documentation is served by Swagger UI by the running server:

- **Live:** https://ecomm-auth-api-0312.onrender.com/api-docs
- **Local:** http://localhost:3000/api-docs

It is generated from [`openapi.yaml`](./openapi.yaml) in the project root. Every route is documented with its request fields, the status codes it really returns, and fake example data. The page lists both servers, so use the **Servers** dropdown to choose local or live. The docs describe the API only; they do not host it.

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
- **Rate limiting** counts per IP, not per account, so an attacker cannot lock a real user out. Login counts only failed attempts. `trust proxy` is set so the count uses the real client IP behind Render.
- **Headers and CORS.** `helmet` sets security headers. CORS allows only listed origins, and unlisted origins get no permission header.
- **Parameterized queries** everywhere, and 500 responses never expose error details.
- **Email credentials** are a Gmail app password in a dedicated account, stored only in environment variables. A failed send is logged, and never fails registration.
- **Secrets stay out of git.** `.env` is ignored, production secrets live only in Render's environment settings, and the database connection string is never committed.

The reasoning behind each decision is in [NOTES.md](./NOTES.md).

## Known limits

- **Email delivery:** mail is sent through a Gmail account over SMTP, which suits a demo with a handful of users, not production volume. Gmail has its own sending limits, and the sender is a Gmail address, not a custom domain.
- **SMTP on the host:** if the host blocks outbound SMTP ports, verification emails will not leave the deployed app. Registration still succeeds (201) and the error is logged, but users cannot verify by email until the host allows SMTP or the app switches to an email provider that uses an HTTPS API.
- **Cold starts:** the free Render web service sleeps when idle, and the free Neon database suspends its compute after a few minutes of inactivity. The first request after a quiet period can be slow.
- **Free-tier limits:** both hosts change their free plans from time to time, so check their current limits before relying on this deployment long term.
- **Rate limit storage** is in memory, so counts reset on restart and are not shared between multiple server instances.
- **No automated tests yet.** Routes were tested manually with Postman, `curl` and Swagger UI.
- **Out of scope:** products, carts, orders, refresh tokens and logout.

## Author

Favour Chibuike Ewoh