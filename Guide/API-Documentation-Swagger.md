# API Documentation (Swagger)

The backend API is documented with Swagger/OpenAPI. Every endpoint — auth, patients, admissions, vitals, medications, labs, diagnoses, AI, admin, etc. — is listed there with its method, parameters, and expected responses.

## How to open it

1. Start the backend server:
   ```bash
   cd server
   npm run dev
   ```
2. Open this URL in your browser:
   ```
   http://localhost:3000/api-docs
   ```

That's it — no login needed just to browse the docs.

## Trying an endpoint

Authentication uses an HttpOnly cookie set by `POST /auth/login` (not a bearer token). To use "Try it out" on a protected endpoint:

1. Log into the app normally in the same browser (e.g. `http://localhost:5173`).
2. Go back to the `/api-docs` tab and click **Try it out** on any endpoint — your session cookie is sent automatically.
