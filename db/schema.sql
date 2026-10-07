-- db.sql
-- Users table for the ecomm auth and role system.
-- Safe to re-run: every statement uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS users (
    -- Auto-incrementing numeric ID. Never changes, even if the email does.
    -- Because it is guessable, access control must never rely on hiding IDs.
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    first_name TEXT NOT NULL,
    last_name  TEXT NOT NULL,

    -- Uniqueness is enforced case-insensitively by an index below.
    email TEXT NOT NULL,

    -- Optional. Unique when present; many NULLs are allowed.
    phone_number VARCHAR(20)
        CHECK (phone_number IS NULL OR phone_number <> ''),

    -- bcrypt/argon2 hash. The plain password is never stored.
    password_hash TEXT NOT NULL,

    -- CHECK instead of ENUM: easier to change and re-run.
    -- Default is merchant; only the admin registration route sets 'admin'.
    user_role TEXT NOT NULL DEFAULT 'merchant'
        CHECK (user_role IN ('merchant', 'admin')),

    is_verified BOOLEAN NOT NULL DEFAULT FALSE,

    -- SHA-256 hex hashes (64 chars) of the random tokens sent by email.
    -- Both are NULL until requested, and cleared after use.
    email_verification_token_hash VARCHAR(64),
    email_verification_expires_at TIMESTAMPTZ,

    password_reset_token_hash VARCHAR(64),
    password_reset_expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- The default only applies on insert. UPDATE queries must set this themselves.
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- A token hash and its expiry must both exist or both be NULL.
    CONSTRAINT email_token_pair_check
        CHECK ((email_verification_token_hash IS NULL) = (email_verification_expires_at IS NULL)),
    CONSTRAINT reset_token_pair_check
        CHECK ((password_reset_token_hash IS NULL) = (password_reset_expires_at IS NULL))
);

-- Case-insensitive uniqueness: Favour@gmail.com and favour@gmail.com collide.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx
    ON users (LOWER(email));

-- Unique phone numbers (NULLs are ignored by unique indexes).
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_number_idx
    ON users (phone_number);

-- Partial indexes for token lookups. Only rows that currently hold a token are indexed.
CREATE INDEX IF NOT EXISTS users_email_token_idx
    ON users (email_verification_token_hash)
    WHERE email_verification_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_reset_token_idx
    ON users (password_reset_token_hash)
    WHERE password_reset_token_hash IS NOT NULL;
