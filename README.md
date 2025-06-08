# SaaS Starter 1.0: Next.js + Supabase

A minimal yet functional starter template for building SaaS applications using Next.js (App Router) and Supabase.

This template provides a clean foundation with essential features already implemented, allowing you to focus on your core application logic.

## Features

- **Authentication:**
  - Email/Password Sign up & Sign in
  - Google OAuth Sign in (Optional)
  - Email Confirmation (Optional)
  - Password Reset via Email
  - Logout
- **Account Management:**
  - Edit Profile (First Name, Last Name)
  - Change Email (with verification)
  - Change Password (with current password verification)
- **Billing (Voucher-Based Credits):**
  - Displays remaining "Project Credits".
  - Voucher code redemption to add credits (via API route using Supabase Service Role Key).
- **Items CRUD Example:**
  - List, Create, Delete "Items" (generic resource example).
  - Item creation limited by available credits.
  - Search functionality on the items list page.
  - Basic item detail page (shows title, allows deletion).
- **Core Structure:**
  - Next.js App Router structure.
  - Supabase client integration (`/lib/supabase.js`).
  - Responsive Dashboard Layout with mobile support (`/app/components/DashboardLayout.js`).
  - Automatic Profile Creation/Population (`/app/components/ProfileVerification.js`).
  - Progress Bar component (`/app/components/ProgressBar.js`).
  - Basic CSS styling (`/app/globals.css`, `dashboard.css`, etc.).

## Tech Stack

- **Framework:** Next.js (v15.2.2)
- **Backend/DB:** Supabase
- **Styling:** Standard CSS Modules / Global CSS
- **UI/Animation:** `framer-motion` (v12.6.3)
- **Markdown:** `react-markdown` (v10.1.0)
- **Icons:** Custom SVG components (`/lib/icons.js`)
- **TypeScript:** Supported with TypeScript configuration

## Setup Instructions

Follow these steps to get the starter project running locally.

**Prerequisites:**

- Node.js (LTS version recommended)
- npm (or yarn/pnpm)
- Supabase Account ([supabase.com](https://supabase.com/))

**1. Clone Repository:**

```bash
git clone <your-repo-url> saas-starter-app
cd saas-starter-app
```

**2. Install Dependencies:**

```bash
npm install
# or
# yarn install
# or
# pnpm install
```

**3. Supabase Setup:**

- **Create Supabase Project:** Go to your Supabase dashboard and create a new project. Note your project's region and choose a strong database password.
- **Get API Keys:**
  - Navigate to Project Settings > API.
  - Find your **Project URL** (e.g., `https://<your-project-ref>.supabase.co`).
  - Find your **anon (public) API Key**.
  - Find your **service_role (secret) Key**. **IMPORTANT:** Keep this key secure and **never** expose it in client-side code. It's needed for the voucher API.
- **Run SQL Setup Script:**

  - Navigate to the SQL Editor in your Supabase project dashboard.
  - Click "+ New query".
  - Copy the entire SQL script below and paste it into the editor.
  - Click "Run". This will create the necessary tables, policies, and functions.

  ```sql
  -- 1. PROFILES TABLE
  -- Stores public user data and project credits. Links to auth.users.
  create table profiles (
    id uuid references auth.users on delete cascade primary key,
    first_name text,
    last_name text,
    credits integer not null default 0, -- Note: Use 'credits' column name in your code
    updated_at timestamp with time zone
  );
  -- Secure profiles table. Users can view/edit only their own profile.
  alter table profiles enable row level security;
  create policy "Users can view and edit their own profile"
    on profiles for all
    using (auth.uid() = id);

  -- 2. ITEMS TABLE
  -- Example table for a core resource in your SaaS.
  create table items (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    "userId" uuid references auth.users not null, -- Note: Use camelCase in your code
    "createdAt" timestamp with time zone default now(), -- Note: Use camelCase in your code
    "updatedAt" timestamp with time zone default now() -- Note: Use camelCase in your code
    -- Add other item-specific columns here as needed
  );
  -- Secure items table. Users can CRUD only their own items.
  alter table items enable row level security;
  create policy "Users can view and manage their own items"
    on items for all
    using (auth.uid() = "userId"); -- Note: Use quoted camelCase column name

  -- 3. VOUCHER CODES TABLE
  -- Stores available voucher codes and their credit value.
  create table voucher_codes (
    code text primary key,
    project_tier integer not null default 1, -- Credits awarded by this voucher
    is_active boolean default true,
    created_at timestamp with time zone default now()
  );
  -- Note: RLS is typically NOT enabled on voucher_codes as it's managed by admins/service_role.
  -- If needed, add policies allowing only service_role access.

  -- 4. USED VOUCHER CODES TABLE
  -- Tracks which user has claimed which voucher to prevent reuse.
  create table used_voucher_codes (
    code text primary key references voucher_codes(code),
    user_id uuid references auth.users(id) not null,
    claimed_at timestamp with time zone default now()
  );
  -- Secure used_voucher_codes table. Users cannot see others' claims. Admins/service_role can manage.
  alter table used_voucher_codes enable row level security;
  create policy "Allow service_role full access"
    on used_voucher_codes for all
    using (true); -- Simplistic policy; refine if needed for specific admin roles

  -- 5. AUTO-CREATE PROFILE TRIGGER
  -- Creates a profile entry when a new user signs up in auth.users.
  create or replace function public.handle_new_user()
  returns trigger as $$
  begin
    insert into public.profiles (id, credits) -- Initialize credits
    values (new.id, 0); -- Start new users with 0 credits
    return new;
  end;
  $$ language plpgsql security definer;
  -- Trigger the function after user creation
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

  -- 6. (Optional but Recommended) FUNCTION TO DECREMENT CREDITS
  -- Safely decrement credits, preventing negative values.
  -- Call this from your application logic BEFORE creating an item.
  create or replace function public.decrement_user_credits(user_id_input uuid, amount integer)
  returns integer
  language plpgsql
  security definer -- Important for updating potentially restricted rows
  as $$
  declare
    current_credits integer;
    new_credits integer;
  begin
    -- Select current credits FOR UPDATE to lock the row
    select credits into current_credits
    from public.profiles
    where id = user_id_input
    for update;

    if current_credits is null then
      raise exception 'Profile not found for user %', user_id_input;
    end if;

    if current_credits < amount then
      raise exception 'Insufficient credits. Required: %, Available: %', amount, current_credits;
    end if;

    new_credits := current_credits - amount;

    update public.profiles
    set credits = new_credits
    where id = user_id_input;

    return new_credits; -- Return the new credit count
  end;
  $$;
  -- Grant execute permission to the authenticated role
  grant execute on function public.decrement_user_credits(uuid, integer) to authenticated;

  ```

- **Configure Authentication Providers:**
  - Go to Authentication > Providers in your Supabase dashboard.
  - **Email:** Enable this provider. Optionally enable "Confirm email".
  - **Google (Optional):** Enable this provider. Follow the Supabase guide to create OAuth credentials in Google Cloud Console and add the **Redirect URI** provided by Supabase (e.g., `https://<your-project-ref>.supabase.co/auth/v1/callback`) to your Google Cloud credentials.

**4. Environment Variables:**

- Create a new file named `.env.local` in the root of the project.
- Copy the content from `.example.env.local` into `.env.local`.
- Fill in the values:
  - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon (public) key.
  - `NEXT_PUBLIC_SITE_URL`: Your site URL (use `http://localhost:3000` for development, change to your domain in production).
  - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service_role (secret) key. **Remember to keep this secure!**

**5. Voucher Management:**

- To use the voucher system, you need to manually add codes to the `voucher_codes` table via the Supabase dashboard (Database > Tables > `voucher_codes` > Insert row).
- Set the `code` (e.g., `WELCOME10`), `project_tier` (credits to add, e.g., `10`), and ensure `is_active` is `true`.

**6. Run the Application:**

```bash
npm run dev
# or
# yarn dev
# or
# pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

- **`profiles`**: Stores user profile information and `credits`. Linked to `auth.users`.
- **`items`**: Example resource table linked to users via `userId` column.
- **`voucher_codes`**: Stores available voucher codes and their credit value.
- **`used_voucher_codes`**: Tracks claimed vouchers to prevent reuse.

## Key Components

- **`DashboardLayout.js`**: Provides the main authenticated layout with responsive sidebar, mobile menu, and top bar.
- **`ProfileVerification.js`**: Attempts to auto-populate user's first/last name on first load after signup.
- **`BillingCard.js`**: Displays project credits and handles voucher code claims.
- **`ProgressBar.js`**: Reusable progress bar component with CSS styling.

## Project Structure

```
src/
├── app/
│   ├── account/           # Account management pages
│   │   ├── components/    # Account-specific components
│   │   │   └── BillingCard.js
│   │   ├── page.css
│   │   └── page.js
│   ├── api/              # API routes
│   │   └── vouchers/
│   │       └── claim/
│   │           └── route.js
│   ├── auth/             # Authentication pages
│   │   └── page.js
│   ├── components/       # Shared components
│   │   ├── DashboardLayout.js
│   │   ├── ProfileVerification.js
│   │   ├── ProgressBar.js
│   │   └── ProgressBar.css
│   ├── dashboard/        # Dashboard pages
│   │   └── page.js
│   ├── items/           # Items CRUD pages
│   │   ├── [id]/        # Dynamic item detail pages
│   │   │   ├── item.css
│   │   │   └── page.js
│   │   ├── items.css
│   │   └── page.js
│   ├── reset-password/   # Password reset functionality
│   │   └── page.js
│   ├── globals.css       # Global styles
│   ├── dashboard.css     # Dashboard-specific styles
│   ├── auth.css         # Authentication styles
│   └── layout.js        # Root layout
└── lib/
    ├── icons.js         # Custom SVG icon components
    └── supabase.js      # Supabase client configuration
```
