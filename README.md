# SalonDEES — Salon Booking & Management System

<p align="center">
  <img src="frontend/public/logo.png" alt="SalonDEES logo" width="140" />
</p>

<p align="center">
  A full-stack web platform for running modern salon operations—from online appointment booking to staff rosters, customer communication, reviews, and business analytics.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=white" alt="Node.js and Express" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white" alt="MongoDB and Mongoose" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License" />
</p>

## Overview

SalonDEES brings customers, salon staff, and administrators into one responsive application. Customers can discover services, choose an available stylist and time slot, manage appointments, and leave reviews. Staff receive a focused workspace for daily bookings, schedules, leave, earnings, and profile management. Administrators control the complete salon operation through dashboards, service and staff management, review moderation, gallery content, settings, and analytics.

The application uses a React/Vite frontend and a REST API built with Node.js, Express, MongoDB, and Mongoose. JWT-based authentication and role-based authorization protect customer, staff, and admin workflows.

## Key Features

### Customer experience

- Account registration, login, Google sign-in, onboarding, and password recovery
- Browse salon services, staff members, gallery images, and approved reviews
- Book one or more services with live staff and time-slot availability
- View active appointments and booking history
- Hide or cancel eligible appointments and report arrival delays
- Submit star ratings and feedback after completed appointments
- Manage personal details, mobile number, preferred stylist, and profile photo
- Receive in-app notifications and use the public AI salon assistant

### Staff workspace

- Role-specific dashboard and appointment schedule
- Update appointment progress and customer status
- View roster shifts and operational metrics
- Apply for leave and track leave requests
- Review earnings summaries
- Maintain a staff profile, specialty, biography, experience, and image

### Admin control center

- Dashboard summaries, weekly trends, appointment status charts, and top-service analytics
- Manage appointments and shift upcoming bookings when schedules change
- Create, edit, and remove services, pricing, durations, and images
- Add staff accounts and manage staff profiles and performance
- Approve or reject leave requests with appointment-conflict visibility
- Moderate customer reviews and manage public gallery content
- Read and manage contact messages
- Configure salon details, working hours, homepage content, and images
- Manage holidays and custom closures, including public-holiday synchronization

### Platform capabilities

- JWT authentication with customer, staff, and admin authorization
- Responsive interface with dark/light theme support
- Cloudinary-backed media uploads
- SMTP email support for password-reset messages
- Google Calendar holiday data integration
- Rate limiting for authentication, contact, and chatbot endpoints
- Lazy-loaded frontend routes and a centralized API configuration

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite 8, React Router, Tailwind CSS, Framer Motion |
| UI & data visualization | Lucide React, React Icons, Swiper, Recharts, React Toastify |
| Backend | Node.js, Express 5, REST API |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcryptjs, Google OAuth |
| Media | Cloudinary, Multer |
| Integrations | Groq AI, Google Calendar API, SMTP/Nodemailer |

## Architecture

```text
React + Vite client
        │
        │  REST / JSON + JWT
        ▼
Node.js + Express API
        │
        ├── MongoDB / Mongoose
        ├── Cloudinary media storage
        ├── SMTP email service
        ├── Google Calendar holiday sync
        └── Groq-powered chatbot
```

The backend follows an MVC-style organization with route, controller, model, middleware, service, and utility layers. The frontend is organized around pages, reusable components, route guards, hooks, and React context.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer
- npm
- A MongoDB database (local MongoDB or MongoDB Atlas)
- Cloudinary credentials for image uploads
- Optional integration credentials for Google OAuth, Google Calendar, Groq, and SMTP email

### 1. Clone the repository

```bash
git clone https://github.com/SajanaKavishan/Salon-Booking-System.git
cd Salon-Booking-System
```

### 2. Install dependencies

The frontend and backend maintain separate dependency sets.

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 3. Configure environment variables

Copy the example files before starting the application:

```bash
# From the repository root
cp .env.example .env
cp frontend/.env.example frontend/.env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
Copy-Item frontend/.env.example frontend/.env
```

Update the values for your local environment. Never commit real secrets.

#### Backend (`.env` in the repository root)

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | Yes | Runtime mode, such as `development` or `production` |
| `PORT` | No | API port; defaults to `5000` |
| `CLIENT_URL` | Yes in production | Allowed frontend origin; comma-separated origins are supported |
| `FRONTEND_URL` | Recommended | Frontend URL used in password-reset links |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign and verify access tokens |
| `CLOUDINARY_CLOUD_NAME` | For uploads | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | For uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | For uploads | Cloudinary API secret |
| `GOOGLE_CALENDAR_API_KEY` | Optional | Public-holiday synchronization |
| `GROQ_API_KEY` | Optional | AI chatbot responses |
| `EMAIL_HOST` | For email | SMTP server hostname |
| `EMAIL_PORT` | For email | SMTP server port |
| `EMAIL_SECURE` | For email | Use a secure SMTP connection (`true`/`false`) |
| `EMAIL_USER` | For email | SMTP username |
| `EMAIL_PASS` | For email | SMTP password or app password |

#### Frontend (`frontend/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Production only | Deployed API base URL; local development uses Vite's `/api` proxy |
| `VITE_GOOGLE_CLIENT_ID` | For Google sign-in | Google OAuth web client ID |

### 4. Run the application

Open two terminals.

```bash
# Terminal 1 — API
cd backend
npm start
```

```bash
# Terminal 2 — web client
cd frontend
npm run dev
```

Then visit `http://localhost:5173`. The API runs at `http://localhost:5000` by default, and Vite proxies local `/api` requests to it.

## Available Scripts

### Backend

| Command | Description |
| --- | --- |
| `npm start` | Start the Express API |

### Frontend

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the frontend |

## API Overview

All API routes use the `/api` prefix. Protected endpoints expect a JWT in the `Authorization: Bearer <token>` header.

| Base route | Responsibility |
| --- | --- |
| `/api/users` | Authentication, Google login, profiles, onboarding, and user management |
| `/api/appointments` | Booking, availability, appointment status, earnings, and reviews |
| `/api/services` | Public service catalog and admin service management |
| `/api/staff` | Public staff directory, staff profiles, and performance |
| `/api/roster` | Staff shifts, metrics, and leave applications |
| `/api/leaves` | Leave-request review and conflict checks |
| `/api/dashboard` | Admin summaries and analytics |
| `/api/settings` | Salon settings and homepage content |
| `/api/gallery` | Public gallery and admin image management |
| `/api/holidays` | Holidays, closures, and calendar synchronization |
| `/api/messages` | Public contact form and admin inbox |
| `/api/notifications` | User notifications and read status |
| `/api/chatbot` | Rate-limited public AI assistant |

## Project Structure

```text
Salon-Booking-System/
├── backend/
│   ├── config/          # External service configuration
│   ├── controllers/     # Request and business logic
│   ├── middleware/      # Authentication, validation, and uploads
│   ├── models/          # Mongoose schemas
│   ├── routes/          # REST API routes
│   ├── services/        # Background and integration services
│   ├── utils/           # Scheduling, email, and media helpers
│   └── server.js        # Express application entry point
├── frontend/
│   ├── public/          # Static images and icons
│   └── src/
│       ├── components/  # Shared and role-specific UI components
│       ├── context/     # Appointment state management
│       ├── hooks/       # Reusable React hooks
│       ├── pages/       # Customer, staff, admin, and auth pages
│       ├── routes/      # Protected route guards
│       └── utils/       # Authentication and API helpers
├── postman/             # Postman workspace configuration
├── .env.example         # Backend environment template
└── README.md
```

## Security Notes

- Passwords are hashed with bcrypt before storage.
- Protected routes validate JWTs and enforce role permissions on the server.
- Login and registration endpoints are rate limited.
- MongoDB object IDs are validated on parameterized routes.
- Upload middleware restricts image handling and stores media through Cloudinary.
- Production CORS requires an explicit `CLIENT_URL`.
- Secrets belong only in local/deployment environment variables—not in source control.

For a public deployment, use HTTPS, a strong unique `JWT_SECRET`, restricted Cloudinary credentials, a production MongoDB user with least-privilege access, and provider-specific secret management.

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a branch: `git checkout -b feature/your-feature`.
3. Make and verify your changes.
4. Commit with a clear message.
5. Push the branch and open a pull request.

For bugs or feature ideas, open a [GitHub issue](https://github.com/SajanaKavishan/Salon-Booking-System/issues) with reproduction steps or a clear proposal.

## License

This project is available under the [MIT License](LICENSE).

## Author

Developed and maintained by [Sajana Kavishan](https://github.com/SajanaKavishan).

---

If this project helps you, consider giving the repository a star.
