# Goodness Gardens Food Safety Audit Manager

A comprehensive, production-ready food safety audit and compliance tracking application built with React, Vercel serverless functions, and Turso SQLite database.

## Features

- **User Authentication**: Secure JWT-based authentication with bcryptjs password hashing
- **Pre-Harvest Logging**: Water testing, soil amendments, worker training, and animal intrusion tracking
- **Chemical Management**: Applications and storage inventory with MRL compliance verification
- **Corrective Actions**: Nonconformance tracking and CAPA documentation with verification workflows
- **Audit Checklists**: Structured audit checklist management for compliance verification
- **Dashboard**: Real-time KPIs, charts, and compliance analytics
- **Data Export**: CSV exports for all modules for regulatory documentation and analysis
- **PWA Ready**: Progressive web app manifest for mobile accessibility

## Tech Stack

- **Frontend**: React 18 + Vite + React Router + Zustand
- **Backend**: Vercel Serverless Functions (TypeScript)
- **Database**: Turso (hosted SQLite with @libsql/client)
- **Styling**: Tailwind CSS + Lucide Icons
- **Charts**: Recharts for data visualization
- **Auth**: JWT + bcryptjs

## Project Structure

```
goodness-gardens-fsa/
├── api/                          # Vercel serverless functions
│   ├── _db.ts                   # Database helper with schema initialization
│   ├── _auth.ts                 # JWT authentication helpers
│   ├── auth/                    # Authentication endpoints
│   │   ├── register.ts
│   │   ├── login.ts
│   │   └── me.ts
│   ├── pre-harvest/             # Pre-harvest logging endpoints
│   ├── chemicals/               # Chemical management endpoints
│   │   ├── applications/
│   │   └── storage/
│   ├── corrective-actions/      # Corrective action endpoints
│   │   ├── nonconformances/
│   │   ├── capa/
│   │   └── checklists/
│   └── reports/                 # Reporting endpoints
│       ├── dashboard.ts
│       └── export.ts
├── src/                         # React frontend
│   ├── components/
│   │   ├── Header.tsx
│   │   └── ProtectedRoute.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── PreHarvestPage.tsx
│   │   ├── ChemicalsPage.tsx
│   │   ├── CorrectiveActionsPage.tsx
│   │   └── ReportsPage.tsx
│   ├── App.tsx
│   ├── api.ts                   # API client with axios
│   ├── store.ts                 # Zustand state management
│   ├── main.tsx
│   └── index.css
├── public/
│   └── manifest.json            # PWA manifest
├── vercel.json                  # Vercel deployment config
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── package.json
└── index.html
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Vercel account (for deployment)
- Turso account (for database hosting)

### Local Development

1. **Clone and install dependencies**:
```bash
cd goodness-gardens-fsa
npm install
```

2. **Set up environment variables**:
Create a `.env.local` file:
```
TURSO_DATABASE_URL=file:local.db
JWT_SECRET=your-secret-key-change-in-production
```

3. **Start development server**:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## Deployment to Vercel

1. **Push to GitHub**:
```bash
git add .
git commit -m "Initial commit: Food Safety Audit Manager"
git push origin main
```

2. **Connect to Vercel**:
- Visit [Vercel Dashboard](https://vercel.com/dashboard)
- Click "New Project"
- Import the GitHub repository
- Vercel auto-detects the Vite+Node setup

3. **Set Environment Variables** in Vercel:
- `TURSO_DATABASE_URL`: Your Turso database URL
- `TURSO_AUTH_TOKEN`: Your Turso auth token
- `JWT_SECRET`: A secure random string (change in production)

4. **Deploy**:
Vercel automatically deploys on push to main branch

## Database Schema

The app includes 7 main tables:

- **users**: User accounts with email, password hash, organization
- **pre_harvest_logs**: Water tests, soil amendments, training, intrusions
- **chemical_applications**: Pesticide/fungicide applications with MRL tracking
- **chemical_storage**: Chemical inventory with expiration and safety equipment tracking
- **nonconformances**: Audit findings with severity levels
- **corrective_actions**: CAPA tracking with verification workflows
- **audit_checklists**: Structured audit records with completion status

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - User login, returns JWT
- `GET /api/auth/me` - Get current user (requires auth)

### Pre-Harvest Endpoints

- `GET /api/pre-harvest` - List logs (optional ?log_type filter)
- `POST /api/pre-harvest` - Create new log
- `GET /api/pre-harvest/{id}` - Get single log
- `PUT /api/pre-harvest/{id}` - Update log
- `DELETE /api/pre-harvest/{id}` - Delete log

### Chemical Management Endpoints

- `GET/POST /api/chemicals/applications` - Application CRUD
- `GET/POST /api/chemicals/storage` - Storage CRUD

### Corrective Action Endpoints

- `GET/POST /api/corrective-actions/nonconformances` - Finding CRUD
- `GET/POST /api/corrective-actions/capa` - CAPA CRUD
- `GET/POST /api/corrective-actions/checklists` - Checklist CRUD

### Reports Endpoints

- `GET /api/reports/dashboard` - KPI data and analytics
- `GET /api/reports/export?type=pre-harvest|chemicals|corrective-actions` - CSV export

## Security

- **Password Hashing**: bcryptjs with 10 salt rounds
- **JWT Tokens**: 7-day expiration, secure secret management
- **Database Queries**: Parameterized queries prevent SQL injection
- **Authentication**: Required on all protected endpoints
- **Ownership Verification**: Users can only access their own data

## Features Showcase

### Dashboard
- Real-time KPI cards (water tests, chemical apps, open issues, compliance rate)
- Nonconformance pie charts
- Recent audit history
- One-click CSV exports

### Pre-Harvest Logging
- Water safety testing with pH and contamination results
- Soil amendment tracking with source documentation
- Worker training records with trainer information
- Animal intrusion incident logs with remedial actions

### Chemical Management
- Application tracking with MRL compliance verification
- Pre-harvest interval management
- Storage inventory with expiration monitoring
- Safety equipment checklists

### Corrective Actions
- Nonconformance documentation with severity levels
- CAPA tracking with responsibility and target dates
- Verification workflows with auditor sign-off
- Audit checklist completion tracking

## Troubleshooting

### Database Connection Issues
- Verify `TURSO_DATABASE_URL` environment variable is set
- Check Turso token validity
- Local development uses `file:local.db` - create it automatically

### Authentication Failures
- JWT_SECRET must be consistent across deploys
- Check bearer token format in request headers
- Token expiration is 7 days - refresh required for long sessions

### CSV Export Issues
- Ensure API calls include Authorization header
- Check user has data in selected export type
- Browser must allow file downloads

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open pull request

## License

MIT License - feel free to use this project for food safety compliance applications

## Support

For issues, questions, or suggestions:
- Create an issue on GitHub
- Check existing documentation
- Review API error responses for debugging

---

Built with care for agricultural food safety compliance.
