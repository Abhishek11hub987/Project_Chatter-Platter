# Chatter & Platter Cafe PWA

A complete QR-based digital ordering PWA for Chatter & Platter Cafe.

## Tech Stack
- React 18
- Vite
- Tailwind CSS
- Framer Motion
- Zustand
- Firebase (Firestore)

## Setup Instructions

1. **Firebase Setup**:
   - Create a Firebase project at console.firebase.google.com
   - Enable Firestore Database (start in test mode)
   - Go to Project Settings > General > Web App
   - Copy the configuration keys

2. **Environment Variables**:
   Create a `.env` file in the root directory and add your Firebase keys:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

5. **Seed Menu Data**:
   - Open the app in Customer mode `http://localhost:5173/?table=1`
   - Go to the Menu screen
   - Since the menu is empty initially, a "Seed Demo Data" button will appear.
   - Click it once to populate your Firestore `menu` collection.

## Routes & Roles
- **Customer**: `/?table=X` (e.g. `/?table=5`)
- **Reception**: `/?role=reception` (PIN: 1234)
- **Chef**: `/?role=chef` (PIN: 5678)

## Deployment (Vercel)
1. Push this repository to GitHub
2. Import project in Vercel
3. Add the `.env` variables in Vercel settings
4. Deploy!
