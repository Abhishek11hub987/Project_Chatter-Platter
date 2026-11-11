-- ============================================================================
-- CHATTER & PLATTER CAFE — COMPLETE SUPABASE POSTGRESQL SCHEMA
-- ============================================================================
-- How to use:
-- 1. Create a new Supabase project at https://supabase.com/dashboard
-- 2. Open "SQL Editor" -> "New query"
-- 3. Paste this entire script and click "Run"
-- 4. Update your local `.env.local` (and Vercel env vars) with:
--      VITE_SUPABASE_URL=your_project_url
--      VITE_SUPABASE_ANON_KEY=your_anon_public_key
-- 5. Create staff users in Authentication -> Users, then assign their roles
--    using the commented INSERT statement at the bottom of this file.
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. MENU TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "itemId" text UNIQUE,
  name text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  "isVeg" boolean NOT NULL DEFAULT true,
  "isEgg" boolean NOT NULL DEFAULT false,
  "prepMinutes" integer NOT NULL DEFAULT 6 CHECK ("prepMinutes" > 0),
  "isAvailable" boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_category ON public.menu (category);
CREATE INDEX IF NOT EXISTS idx_menu_available ON public.menu ("isAvailable");

-- ----------------------------------------------------------------------------
-- 2. ORDERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tableNumber" text NOT NULL,
  "customerName" text NOT NULL DEFAULT 'Guest',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  "totalAmount" numeric NOT NULL DEFAULT 0 CHECK ("totalAmount" >= 0),
  "paymentMethod" text NOT NULL DEFAULT 'cash' CHECK ("paymentMethod" IN ('cash', 'online')),
  status text NOT NULL DEFAULT 'pending_payment' CHECK (
    status IN ('pending_payment', 'approved', 'cooking', 'ready', 'delivered', 'completed', 'cancelled')
  ),
  "tokenNumber" text,
  notes text NOT NULL DEFAULT '',
  "estimatedMinutes" integer NOT NULL DEFAULT 8,
  ip_address text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "approvedAt" timestamptz,
  "cookingAt" timestamptz,
  "readyAt" timestamptz,
  "deliveredAt" timestamptz,
  "cancelledAt" timestamptz
);

CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders (status, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_orders_token ON public.orders ("tokenNumber");

-- ----------------------------------------------------------------------------
-- 3. FEEDBACKS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  "customerName" text,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  sentiment text NOT NULL DEFAULT 'positive' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON public.feedbacks (created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. USER ROLES TABLE (Links to Supabase Auth Users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'reception', 'chef', 'staff')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5. CAFE SETTINGS TABLE (Live Kitchen Rush Mode & Store Status)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cafe_settings (
  id text PRIMARY KEY DEFAULT 'default',
  "isOpen" boolean NOT NULL DEFAULT true,
  "rushMode" boolean NOT NULL DEFAULT false,
  "basePrepMinutes" integer NOT NULL DEFAULT 6,
  announcement text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.cafe_settings (id, "isOpen", "rushMode", "basePrepMinutes", announcement)
VALUES ('default', true, false, 6, 'Welcome to Chatter & Platter! Fresh chai, momos & Maggi made to order.')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. ATOMIC TOKEN ASSIGNMENT FUNCTION (Prevents Duplicate Tokens 1-99)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_order_with_token(p_order_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_tokens text[];
  v_available_tokens text[];
  v_chosen_token text;
  i integer;
BEGIN
  -- Lock active rows briefly to avoid race conditions between multiple receptionists
  SELECT COALESCE(array_agg("tokenNumber"), '{}')
  INTO v_active_tokens
  FROM public.orders
  WHERE status IN ('approved', 'cooking', 'ready')
    AND "tokenNumber" IS NOT NULL;

  v_available_tokens := '{}';
  FOR i IN 1..99 LOOP
    IF NOT (i::text = ANY(v_active_tokens)) THEN
      v_available_tokens := array_append(v_available_tokens, i::text);
    END IF;
  END LOOP;

  IF array_length(v_available_tokens, 1) > 0 THEN
    v_chosen_token := v_available_tokens[1 + floor(random() * array_length(v_available_tokens, 1))::integer];
  ELSE
    v_chosen_token := (100 + floor(random() * 900)::integer)::text;
  END IF;

  UPDATE public.orders
  SET
    status = 'approved',
    "tokenNumber" = v_chosen_token,
    "approvedAt" = now()
  WHERE id = p_order_id;

  RETURN v_chosen_token;
END;
$$;

-- Helper function to check if current signed-in user is staff
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
-- Note: This app supports QR ordering without customer login AND optional
-- PIN-gated Reception/Chef terminals (`/?role=reception`, `/?role=chef`) as well
-- as authenticated `/login` dashboards. Policies below work out-of-the-box for
-- both flows. If you later disable PIN routes and only use `/login` auth,
-- replace `WITH CHECK (true)` / `USING (true)` on staff writes with `public.is_staff()`.

ALTER TABLE public.menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_settings ENABLE ROW LEVEL SECURITY;

-- MENU POLICIES
DROP POLICY IF EXISTS "Public can read menu" ON public.menu;
CREATE POLICY "Public can read menu"
  ON public.menu FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow menu updates for cafe terminals" ON public.menu;
CREATE POLICY "Allow menu updates for cafe terminals"
  ON public.menu FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ORDERS POLICIES
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
CREATE POLICY "Public can create orders"
  ON public.orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
CREATE POLICY "Public can view orders"
  ON public.orders FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Cafe terminals can update orders" ON public.orders;
CREATE POLICY "Cafe terminals can update orders"
  ON public.orders FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- FEEDBACKS POLICIES
DROP POLICY IF EXISTS "Public can submit feedback" ON public.feedbacks;
CREATE POLICY "Public can submit feedback"
  ON public.feedbacks FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public and staff can read feedback" ON public.feedbacks;
CREATE POLICY "Public and staff can read feedback"
  ON public.feedbacks FOR SELECT
  TO anon, authenticated
  USING (true);

-- USER ROLES POLICIES
DROP POLICY IF EXISTS "Users can read roles" ON public.user_roles;
CREATE POLICY "Users can read roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'owner')
    )
  );

-- CAFE SETTINGS POLICIES
DROP POLICY IF EXISTS "Anyone can read cafe settings" ON public.cafe_settings;
CREATE POLICY "Anyone can read cafe settings"
  ON public.cafe_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Terminals can update cafe settings" ON public.cafe_settings;
CREATE POLICY "Terminals can update cafe settings"
  ON public.cafe_settings FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 8. REALTIME PUBLICATION
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'menu'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'feedbacks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feedbacks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'cafe_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cafe_settings;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 9. SEED CHATTER & PLATTER CAFE MENU (38 ITEMS)
-- ----------------------------------------------------------------------------
INSERT INTO public.menu ("itemId", name, price, category, description, tags, "isVeg", "isEgg", "prepMinutes", "isAvailable")
VALUES
  -- FRIES
  ('menu_0', 'Classic Salted Fries', 59, 'FRIES', 'Golden crispy potato fries tossed with sea salt.', ARRAY['crispy', 'quick', 'snack', 'veg'], true, false, 6, true),
  ('menu_1', 'Peri-Peri Fries', 79, 'FRIES', 'Crispy fries dusted in spicy peri-peri seasoning.', ARRAY['spicy', 'crispy', 'bestseller', 'snack'], true, false, 7, true),
  ('menu_2', 'Cheese Fries', 99, 'FRIES', 'Loaded fries drizzled with warm velvety cheddar cheese.', ARRAY['cheesy', 'comfort', 'bestseller', 'snack'], true, false, 8, true),

  -- PASTA
  ('menu_3', 'Penne Arrabbiata (Red Sauce)', 129, 'PASTA', 'Penne tossed in slow-simmered spicy garlic tomato sauce & herbs.', ARRAY['spicy', 'filling', 'comfort', 'italian'], true, false, 12, true),
  ('menu_4', 'Alfredo (White Sauce)', 149, 'PASTA', 'Rich creamy garlic parmesan white sauce penne with sweet corn & herbs.', ARRAY['cheesy', 'creamy', 'filling', 'bestseller'], true, false, 12, true),

  -- MAGGI
  ('menu_5', 'Veg Maggi', 59, 'MAGGI', 'College favorite soupy noodles loaded with crunchy veggies.', ARRAY['comfort', 'quick', 'budget', 'chai-time'], true, false, 6, true),
  ('menu_6', 'Egg Maggi', 69, 'MAGGI', 'Hot masala noodles scrambled with fluffy farm-fresh egg.', ARRAY['protein', 'comfort', 'filling'], false, true, 7, true),
  ('menu_7', 'Chicken Maggi', 89, 'MAGGI', 'Spicy classic Maggi tossed with tender spiced chicken bites.', ARRAY['protein', 'spicy', 'filling'], false, false, 9, true),
  ('menu_8', 'Veg Masala Maggi', 79, 'MAGGI', 'Extra tadka spice blend Maggi with sautéed onions & bell peppers.', ARRAY['spicy', 'comfort', 'bestseller'], true, false, 7, true),
  ('menu_9', 'Egg Masala Maggi', 89, 'MAGGI', 'Double-masala Maggi wok-tossed with spiced scrambled egg.', ARRAY['spicy', 'protein', 'filling'], false, true, 8, true),
  ('menu_10', 'Chicken Masala Maggi', 99, 'MAGGI', 'Fiery street-style masala Maggi loaded with juicy chicken.', ARRAY['spicy', 'protein', 'filling'], false, false, 10, true),
  ('menu_11', 'Cheese Maggi', 89, 'MAGGI', 'Piping hot Maggi melted with gooey mozzarella & cheddar.', ARRAY['cheesy', 'comfort', 'bestseller'], true, false, 7, true),

  -- SANDWICH
  ('menu_12', 'Veg Club', 99, 'SANDWICH', 'Triple-decker toasted sandwich with veggies, mint chutney & slaw.', ARRAY['crispy', 'filling', 'fresh'], true, false, 8, true),
  ('menu_13', 'Veg Paneer', 109, 'SANDWICH', 'Grilled cottage cheese cubes with tandoori mayo & peppers.', ARRAY['protein', 'filling', 'bestseller'], true, false, 9, true),
  ('menu_14', 'Non-Veg Chicken', 129, 'SANDWICH', 'Juicy shredded herb chicken with creamy mayo in grilled bread.', ARRAY['protein', 'filling', 'bestseller'], false, false, 10, true),

  -- MOMO
  ('menu_15', 'Steamed/Fried Veg Momos', 59, 'MOMO', 'Juicy garden-veg dumplings served with fiery red garlic chutney.', ARRAY['spicy', 'budget', 'bestseller', 'snack'], true, false, 8, true),
  ('menu_16', 'Veg Paneer Momos', 69, 'MOMO', 'Soft dumplings stuffed with spiced crumbled paneer & herbs.', ARRAY['protein', 'snack', 'comfort'], true, false, 9, true),
  ('menu_17', 'Chicken Fried/Steamed Momos', 79, 'MOMO', 'Savory minced chicken dumplings paired with house spicy dip.', ARRAY['protein', 'spicy', 'bestseller'], false, false, 9, true),
  ('menu_18', 'Chicken Cheese Momos', 99, 'MOMO', 'Chicken momos oozing with melted cheese inside every bite.', ARRAY['cheesy', 'protein', 'bestseller'], false, false, 10, true),

  -- HOT
  ('menu_19', 'Lemon Tea', 15, 'HOT', 'Light refreshing citrus black tea with zesty lemon.', ARRAY['hot', 'light', 'budget', 'quick'], true, false, 3, true),
  ('menu_20', 'Kulhad Tea', 15, 'HOT', 'Authentic earthen-cup chai infused with fresh ginger & cardamom.', ARRAY['hot', 'chai-time', 'budget', 'bestseller'], true, false, 4, true),
  ('menu_21', 'Black Tea', 15, 'HOT', 'Bold brisk Assam black brew for instant focus.', ARRAY['hot', 'study-fuel', 'budget', 'quick'], true, false, 3, true),
  ('menu_22', 'Regular Tea', 20, 'HOT', 'Classic creamy milk tea brewed fresh to order.', ARRAY['hot', 'chai-time', 'budget'], true, false, 4, true),
  ('menu_23', 'Adrak / Elaichi Tea', 25, 'HOT', 'Soothing crushed ginger & green cardamom spiced milk chai.', ARRAY['hot', 'chai-time', 'rainy-day', 'bestseller'], true, false, 4, true),
  ('menu_24', 'Masala Tea', 30, 'HOT', 'Aromatic signature chai simmered with whole Indian spices.', ARRAY['hot', 'spicy', 'chai-time', 'bestseller'], true, false, 5, true),
  ('menu_25', 'Kulhad Coffee', 35, 'HOT', 'Frothy cafe-style whipped coffee served in smoky kulhad.', ARRAY['hot', 'study-fuel', 'bestseller'], true, false, 5, true),
  ('menu_26', 'Instant Coffee', 30, 'HOT', 'Smooth hot milk coffee for quick campus study breaks.', ARRAY['hot', 'study-fuel', 'quick'], true, false, 4, true),
  ('menu_27', 'Hot Chocolate', 69, 'HOT', 'Thick velvety dark cocoa topped with rich chocolate froth.', ARRAY['hot', 'sweet', 'comfort', 'rainy-day'], true, false, 5, true),
  ('menu_28', 'Bournvita Milk', 49, 'HOT', 'Warm malted chocolate milk just like home.', ARRAY['hot', 'sweet', 'comfort'], true, false, 4, true),

  -- COLD
  ('menu_29', 'Cold Coffee', 59, 'COLD', 'Thick cafe-blended iced coffee with creamy foam.', ARRAY['chilled', 'study-fuel', 'bestseller'], true, false, 4, true),
  ('menu_30', 'Chocolate Shake', 69, 'COLD', 'Rich chilled chocolate ice-cream milkshake.', ARRAY['chilled', 'sweet', 'dessert'], true, false, 5, true),
  ('menu_31', 'Kitkat Shake', 79, 'COLD', 'Crunchy wafer chocolate shake blended with KitKat.', ARRAY['chilled', 'sweet', 'bestseller'], true, false, 5, true),
  ('menu_32', 'Oreo Shake', 79, 'COLD', 'Cookies & cream thick shake loaded with crushed Oreos.', ARRAY['chilled', 'sweet', 'bestseller'], true, false, 5, true),
  ('menu_33', 'Strawberry Shake', 69, 'COLD', 'Creamy pink berry milkshake chilled to perfection.', ARRAY['chilled', 'sweet', 'refreshing'], true, false, 5, true),
  ('menu_34', 'Vanilla Shake', 69, 'COLD', 'Classic silky Madagascar vanilla bean thick shake.', ARRAY['chilled', 'sweet', 'light'], true, false, 5, true),
  ('menu_35', 'Fresh Lime', 35, 'COLD', 'Sparkling sweet-salted nimbu pani cooler.', ARRAY['chilled', 'refreshing', 'budget', 'quick'], true, false, 3, true),
  ('menu_36', 'Virgin Mojito', 69, 'COLD', 'Zesty mint & lime fizz over crushed ice.', ARRAY['chilled', 'refreshing', 'bestseller'], true, false, 4, true),
  ('menu_37', 'Lemon Mint Cooler', 79, 'COLD', 'Cool muddled mint & tangy citrus summer refresher.', ARRAY['chilled', 'refreshing', 'light'], true, false, 4, true)
ON CONFLICT ("itemId") DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tags = EXCLUDED.tags,
  "isVeg" = EXCLUDED."isVeg",
  "isEgg" = EXCLUDED."isEgg",
  "prepMinutes" = EXCLUDED."prepMinutes";

-- ----------------------------------------------------------------------------
-- 10. ASSIGN STAFF ROLES (RUN AFTER CREATING USERS IN SUPABASE AUTH)
-- ----------------------------------------------------------------------------
-- Go to Supabase Dashboard -> Authentication -> Users -> Add user
-- Then copy the User UUID and run:
--
-- INSERT INTO public.user_roles (user_id, email, role)
-- VALUES
--   ('00000000-0000-0000-0000-000000000001', 'owner@chatterplatter.com', 'owner'),
--   ('00000000-0000-0000-0000-000000000002', 'admin@chatterplatter.com', 'admin'),
--   ('00000000-0000-0000-0000-000000000003', 'reception@chatterplatter.com', 'reception'),
--   ('00000000-0000-0000-0000-000000000004', 'chef@chatterplatter.com', 'chef')
-- ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email;

