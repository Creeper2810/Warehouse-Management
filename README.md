Overview
Backend: wms-backend-node - Node.js + Express API.
Frontend: wms-frontend - Vue 3 + Vite + Quasar app.

Prerequisites (Windows / PowerShell)
Install Node.js 22.22.0 or newer and MySQL.
If you use Laragon, place the project in the www directory.

Backend - install and run
Go to the backend directory:
cd wms-backend-node

Copy the environment file if needed and update DB_* values in .env.

Install dependencies:
npm install

Create or update database tables:
npm run migrate

Seed local users:
npm run seed

Start the API server:
npm run dev

The backend listens on http://127.0.0.1:8000 by default.
Check the API at http://127.0.0.1:8000/api/v1/...

Frontend - install and run
Go to the frontend directory:
cd ..\wms-frontend
npm install
npm run dev

Vite starts the dev server and prints the local URL in the terminal, for example http://localhost:5173.

Run tests or checks
Backend:
cd wms-backend-node
npm test

Frontend:
cd wms-frontend
npm run build

Configuration notes
Important files: .env files for backend and frontend environment settings.
The frontend development server proxies API requests to the backend.
