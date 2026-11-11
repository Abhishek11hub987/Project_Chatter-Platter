# Security Policy & Production Hardening Guide

Thank you for using and contributing to **Chatter & Platter Cafe OS**! Because this repository is open source and designed for quick local trials out of the box, please follow these hardening steps before deploying to a public internet URL.

## Pre-Production Checklist

1. **Never Commit `.env` or Runtime Data**:
   - Keep all API keys in `.env.local` (ignored by `.gitignore`).
   - Do not commit `data/cafe-db.json` (contains runtime orders and customer names).
2. **Change Default Terminal PINs**:
   - Set strong custom PINs in `.env.local` (or disable `/?role=reception` and `/?role=chef` direct routes in favor of `/login` Supabase Auth):
     ```env
     VITE_RECEPTION_PIN=your_custom_pin
     VITE_CHEF_PIN=your_custom_pin
     ```
3. **Harden Supabase Row-Level Security (RLS)**:
   - `supabase_schema.sql` ships with permissive policies so unauthenticated QR terminals and PIN routes work immediately during MVP trials.
   - Before exposing your Supabase project publicly, update the `menu`, `orders`, and `cafe_settings` write policies in Supabase SQL Editor to require `public.is_staff()` for staff mutations and restrict customer order reads/cancellations as appropriate.
4. **Firebase Realtime Database Rules**:
   - If using `VITE_FIREBASE_DB_URL`, replace open test rules with validated read/write rules in the Firebase Console.
5. **Local Wi-Fi Mode (`npm run dev:host`)**:
   - When using the built-in Cafe Disk DB (`server/cafeDbPlugin.js`), run it only on your trusted cafe LAN/Wi-Fi network rather than exposing Vite's dev server directly to the public internet.

## Reporting a Vulnerability

If you discover a security vulnerability, please open a private security advisory on the GitHub repository rather than posting exploit details in a public issue.
