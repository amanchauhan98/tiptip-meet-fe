import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:3001';

export const socket = io(BACKEND_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
});

export const API_URL = BACKEND_URL;
