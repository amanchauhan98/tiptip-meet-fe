# WebRTC Video Conference Prototype (Google Meet Clone)

A real-time video conferencing application designed as an MVP for peer-to-peer (P2P) video/audio calls. Does not use third-party video APIs; relies on raw WebRTC mesh architecture.

## Tech Stack
**Frontend:**
- **React.js** (via Vite)
- **WebRTC** (Mesh Architecture)
- **Socket.io Client** (Signaling)

**Backend:**
- **NestJS** (Signaling Server)
- **Prisma** (ORM for Room/Participant management)
- **SQLite** (Database - defined as `dev.db`)
- **Socket.io** (WebSocket Gateway)

## Prerequisites
- Node.js (v18+ recommended)
- npm or pnpm

## Installation & Setup

### 1. Backend Setup
The backend handles signaling (SDP/ICE candidate exchange) and room management.

```bash
cd backend

# Install dependencies
npm install

# Create environment file
# (Create a .env file in the backend directory with the following content)
echo 'DATABASE_URL="file:./dev.db"' > .env

# Run database migrations (creates dev.db and tables)
npx prisma migrate dev --name init

# Start the development server
npm run start:dev
```
The backend will run on `http://localhost:3001`.

### 2. Frontend Setup
The frontend provides the user interface for video calls.

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
The frontend will run on `https://localhost:5173` (configured with `vite-plugin-mkcert` for local HTTPS).

## Project Structure
```
webrtc-project/
├── backend/            # NestJS API & Signaling Server
│   ├── src/
│   │   ├── check/     # Health check
│   │   ├── prisma/    # Database service
│   │   ├── room/      # HTTP endpoints for rooms
│   │   └── signaling/ # WebSocket gateway
│   └── prisma/
│       └── schema.prisma # Database schema
│
├── frontend/           # React Frontend
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── pages/
│   └── vite.config.js  # Vite config (incl. HTTPS)
```

## Features
- **Room Management**: Generate unique meeting links.
- **Real-time Signaling**: Socket.io for WebRTC handshakes.
- **P2P Video/Audio**: Direct browser-to-browser media streaming.
- **HTTPS Local Dev**: Enabled via `vite-plugin-mkcert` for camera/mic access.

## Contributing
1. Fork the repository.
2. Create feature branch (`git checkout -b feature/NewFeature`).
3. Commit changes (`git commit -m 'Add NewFeature'`).
4. Push to branch (`git push origin feature/NewFeature`).
5. Open a Pull Request.
