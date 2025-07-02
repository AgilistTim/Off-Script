# Off-Script

A React application for discovering alternative UK career pathways without university debt.

## Project Overview

Off-Script helps UK job seekers find alternative career pathways that don't require expensive university education. The application provides information on high-growth sectors, salary data, and practical guidance for entering various industries without accumulating significant student debt.

## Features

- **Career Sector Exploration**: Information on Technology & AI, Green Energy & Sustainability, Healthcare & Life Sciences, FinTech, Skilled Trades, and Creative & Digital Media
- **Detailed Sector Information**: Average salaries, time to entry, growth rates, and in-demand roles
- **AI Career Advisor**: Interactive chat interface for personalized career guidance
- **Video Content**: Testimonials from professionals who entered fields through alternative pathways
- **Course Recommendations**: Relevant training programs for different career paths
- **Alternative Pathways**: Information on non-university routes to career success
- **User Authentication**: Sign up and login with email or Google account
- **User Profiles**: Personalized profiles with career interests and preferences

## Technology Stack

- React
- TypeScript
- Tailwind CSS
- Firebase (Authentication, Firestore, Storage)
- Vite

## Getting Started

1. Clone the repository
   ```
   git clone https://github.com/yourusername/off-script.git
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   ```
   # Create a .env file in the root directory with the following variables:
   VITE_FIREBASE_API_KEY="your-api-key"
   VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="your-project-id"
   VITE_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
   VITE_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
   VITE_FIREBASE_APP_ID="your-app-id"
   VITE_FIREBASE_MEASUREMENT_ID="your-measurement-id"
   ```

4. Start the development server
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Firebase Setup

This project uses Firebase for authentication and data storage. To set up Firebase for your own instance:

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)

2. Enable the following Firebase services:
   - Authentication (Email/Password and Google Sign-In)
   - Firestore Database
   - Storage (for images and videos)

3. Get your Firebase configuration from the Firebase console:
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Copy the configuration values (apiKey, authDomain, etc.)
   - Add these values to your `.env` file as described in the "Getting Started" section

4. Deploy Firestore security rules:
   ```
   firebase deploy --only firestore:rules
   ```

5. Populate initial data (optional):
   ```
   node scripts/populateFirestore.js
   ```

## Database Structure

The Firestore database has the following collections:

- **users**: User profiles and preferences
  - Fields: uid, email, displayName, photoURL, createdAt, lastLogin, role, preferences, profile

- **sectors**: Career sectors information
  - Fields: id, name, description, iconUrl, imageUrl, careers, createdAt, updatedAt

- **careers**: Career details
  - Fields: id, title, description, salaryRange, educationRequirements, skills, dayInLife, growthPotential, sectorId, videoUrls, createdAt, updatedAt

## Authentication

The application supports the following authentication methods:

- Email/Password: Traditional signup and login
- Google Sign-In: One-click authentication with Google account

User profiles are automatically created in Firestore when a user signs up or logs in for the first time.

## License

MIT 