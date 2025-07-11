# Off-Script

A React application for discovering alternative UK career pathways without university debt.

## Project Overview

Off-Script helps UK job seekers find alternative career pathways that don't require expensive university education. The application provides information on high-growth sectors, salary data, and practical guidance for entering various industries.

## Features

- **Career Sector Exploration**: Technology & AI, Green Energy, Healthcare, FinTech, Skilled Trades, and Creative Industries
- **AI Career Advisor**: Interactive chat interface for personalized career guidance
- **Video Content**: Professional testimonials and career insights
- **Course Recommendations**: Relevant training programs for different career paths
- **User Authentication**: Email/password and Google Sign-In
- **Admin Panel**: Content management and analytics

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Firebase (Authentication, Firestore, Cloud Functions)
- **Deployment**: Docker, Render
- **APIs**: OpenAI, YouTube, Custom video analysis

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Firebase account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/off-script.git
   cd off-script
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

3. **Environment Setup**
   
   Copy the example environment file:
   ```bash
   cp env.example .env.local
   ```
   
   Configure your `.env.local` with the following variables:
   ```bash
   # Firebase Configuration (Required)
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   
   # Admin Account (Required for scripts)
   ADMIN_EMAIL=admin@yourcompany.com
   ADMIN_PASSWORD=your_secure_password
   
   # API Keys (Optional - for enhanced features)
   VITE_YOUTUBE_API_KEY=your_youtube_api_key
   VITE_BUMPUPS_API_KEY=your_bumpups_api_key
   ```

4. **Firebase Setup**
   
   Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   
   Enable these services:
   - Authentication (Email/Password and Google Sign-In)
   - Firestore Database
   - Cloud Functions
   - Storage

5. **Start Development**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:5173`

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests
- `npm run lint` - Run ESLint

### Firebase Functions

Deploy functions:
```bash
cd functions
npm run deploy
```

### Database Setup

Populate initial data:
```bash
node scripts/populateFirestore.js
```

Create admin user:
```bash
node scripts/ensureAdminUser.js
```

## Production Deployment

### Docker Deployment

1. **Build and run locally:**
   ```bash
   docker-compose up --build
   ```

2. **Deploy to Render:**
   - Connect your GitHub repository
   - Set environment variables in Render dashboard
   - Deploy automatically on git push

### Environment Variables for Production

Set these in your deployment platform:
- All `VITE_FIREBASE_*` variables
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`
- Optional API keys for enhanced features

## Project Structure

```
off-script/
├── src/
│   ├── components/        # React components
│   ├── pages/            # Page components
│   ├── services/         # API services
│   ├── config/           # Configuration
│   └── utils/            # Utilities
├── functions/            # Firebase Cloud Functions
├── scripts/              # Database and admin scripts
├── public/               # Static assets
└── docker/               # Docker configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Security Best Practices

- Never commit `.env` or `.env.local` files
- Use environment variables for all sensitive data
- Rotate API keys regularly
- Use strong passwords for admin accounts
- Review Firebase security rules regularly

## License

MIT License - see LICENSE file for details 