# Running the Backend in Docker

The backend server can now run inside a container instead of directly on your machine. The frontend and database are **not** containerized — see "Why only the backend" below for why.

## How to run it

1. Make sure `server/.env` exists and is filled in (same file you already use for `npm run dev`). Docker Compose reads it directly.
2. From the project root:
   ```bash
   docker compose up --build
   ```
3. The API is now available at `http://localhost:3000`, exactly like running `npm run dev` in `server/`. Point your frontend (`client/.env`'s `VITE_API_URL`, or its default) at that same URL — nothing changes there.
4. To stop it:
   ```bash
   docker compose down
   ```
5. To rebuild after changing `package.json` or the `Dockerfile` (not needed for ordinary source-code edits, since those are copied in fresh on every `up --build`):
   ```bash
   docker compose up --build
   ```

Uploaded files (e.g. knowledge-base documents) are kept in a named Docker volume (`backend_uploads`) mounted at `/app/uploads` inside the container, so they survive `docker compose down` and container recreation — they're only lost if you explicitly run `docker compose down -v`.

## What's in this setup

- **`server/Dockerfile`** — builds a Node 24 image, installs dependencies, runs `prisma generate` (the Prisma client has to be generated against the schema before the app can start), then copies in the source and runs `node index.js`.
- **`docker-compose.yml`** (repo root) — builds that image, maps container port 3000 to your machine's port 3000, and loads `server/.env` into the container's environment.

## Why only the backend

- **The frontend doesn't need a container.** `npm run build` in `client/` produces plain static HTML/CSS/JS with no runtime or server-side logic — there's nothing environment-specific to isolate. It's simpler and cheaper to deploy those static files directly (Vercel, Netlify, or any static host) than to run them inside a container. For local development, `npm run dev` (Vite) already works identically on any machine — no native dependencies, no version-drift risk.
- **The database is Neon** (a hosted Postgres, per `DATABASE_URL` in `.env`), not a local database — so there's no local Postgres container to manage either. The backend container just connects out to Neon over the network like it always did.
- **The backend is where containerization actually pays off**, because it has real environment-specific risk that a container removes:
  - **Native dependencies** — `bcrypt` compiles native bindings at install time. Building it inside the container guarantees it's compiled for the container's own OS/architecture, so it can't fail on someone else's machine with a different setup.
  - **A pinned Node version** — the image uses Node 24 explicitly. Nobody deploying this needs to have the right Node version installed locally, or accidentally run it on the wrong one.
  - **The generated Prisma client** — `prisma generate` produces code tied to the exact schema and platform it was generated on; baking that into the image means it's never stale or missing.
  - **Portability** — the same image that runs on your machine runs identically on a teammate's machine, a grading machine, or a cloud host (Render, Railway, Fly.io, AWS, etc.) without anyone reinstalling Node or fighting environment differences. That's the whole point of a container: it packages the *environment*, not just the code.
