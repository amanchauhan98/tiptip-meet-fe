import { useRef, useCallback, useEffect, useState } from 'react';
import { socket } from '../services/socket.js';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export default function useWebRTC(localStream, slug, userName) {
    const peersRef = useRef({});            // socketId -> RTCPeerConnection
    const iceCandidateQueue = useRef({});    // socketId -> RTCIceCandidate[]
    const [remoteStreams, setRemoteStreams] = useState({}); // socketId -> MediaStream
    const [peerNames, setPeerNames] = useState({});        // socketId -> userName
    const [screenSharer, setScreenSharer] = useState(null); // socketId of who is sharing

    const createPeerConnection = useCallback(
        (remoteSocketId) => {
            if (peersRef.current[remoteSocketId]) {
                return peersRef.current[remoteSocketId];
            }

            const pc = new RTCPeerConnection(ICE_SERVERS);

            // Add local tracks
            if (localStream) {
                localStream.getTracks().forEach((track) => {
                    pc.addTrack(track, localStream);
                });
            }

            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice-candidate', {
                        target: remoteSocketId,
                        candidate: event.candidate.toJSON(),
                    });
                }
            };

            // Handle remote stream
            pc.ontrack = (event) => {
                const [remoteStream] = event.streams;
                setRemoteStreams((prev) => ({
                    ...prev,
                    [remoteSocketId]: remoteStream,
                }));
            };

            pc.oniceconnectionstatechange = () => {
                if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                    removePeer(remoteSocketId);
                }
            };

            peersRef.current[remoteSocketId] = pc;
            iceCandidateQueue.current[remoteSocketId] = [];

            return pc;
        },
        [localStream]
    );

    const removePeer = useCallback((socketId) => {
        if (peersRef.current[socketId]) {
            peersRef.current[socketId].close();
            delete peersRef.current[socketId];
        }
        delete iceCandidateQueue.current[socketId];
        setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[socketId];
            return next;
        });
        setPeerNames((prev) => {
            const next = { ...prev };
            delete next[socketId];
            return next;
        });
        setScreenSharer((prev) => (prev === socketId ? null : prev));
    }, []);

    const flushIceCandidates = useCallback(async (socketId) => {
        const pc = peersRef.current[socketId];
        const queue = iceCandidateQueue.current[socketId] || [];
        for (const candidate of queue) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error('Error adding queued ICE candidate:', err);
            }
        }
        iceCandidateQueue.current[socketId] = [];
    }, []);

    // Replace video track in all peer connections (used for screen sharing)
    const replaceVideoTrack = useCallback((newTrack) => {
        Object.values(peersRef.current).forEach((pc) => {
            const senders = pc.getSenders();
            const videoSender = senders.find((s) => s.track?.kind === 'video');
            if (videoSender) {
                videoSender.replaceTrack(newTrack);
            }
        });
    }, []);

    useEffect(() => {
        if (!localStream || !slug) return;

        // Connect socket if not connected
        if (!socket.connected) {
            socket.connect();
        }

        // When we receive the list of existing users (now with names), create offers
        const handleAllUsers = async (users) => {
            for (const user of users) {
                const remoteId = user.socketId;
                const remoteName = user.userName;

                // Store the peer's name
                setPeerNames((prev) => ({ ...prev, [remoteId]: remoteName }));

                const pc = createPeerConnection(remoteId);
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket.emit('offer', {
                        target: remoteId,
                        sdp: pc.localDescription,
                    });
                } catch (err) {
                    console.error('Error creating offer:', err);
                }
            }
        };

        // Handle incoming offer (now includes callerName)
        const handleOffer = async ({ sdp, caller, callerName }) => {
            if (callerName) {
                setPeerNames((prev) => ({ ...prev, [caller]: callerName }));
            }

            const pc = createPeerConnection(caller);
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                await flushIceCandidates(caller);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('answer', {
                    target: caller,
                    sdp: pc.localDescription,
                });
            } catch (err) {
                console.error('Error handling offer:', err);
            }
        };

        // Handle incoming answer (now includes answererName)
        const handleAnswer = async ({ sdp, answerer, answererName }) => {
            if (answererName) {
                setPeerNames((prev) => ({ ...prev, [answerer]: answererName }));
            }

            const pc = peersRef.current[answerer];
            if (pc) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                    await flushIceCandidates(answerer);
                } catch (err) {
                    console.error('Error handling answer:', err);
                }
            }
        };

        // Handle incoming ICE candidate (queue if remote description not set)
        const handleIceCandidate = ({ candidate, from }) => {
            const pc = peersRef.current[from];
            if (pc && pc.remoteDescription) {
                pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) =>
                    console.error('Error adding ICE candidate:', err)
                );
            } else {
                if (!iceCandidateQueue.current[from]) {
                    iceCandidateQueue.current[from] = [];
                }
                iceCandidateQueue.current[from].push(candidate);
            }
        };

        // Handle user joined notification (with name)
        const handleUserJoined = ({ socketId: remoteId, userName: remoteName }) => {
            console.log('User joined:', remoteId, remoteName);
            setPeerNames((prev) => ({ ...prev, [remoteId]: remoteName }));
        };

        // Handle user left
        const handleUserLeft = ({ socketId }) => {
            removePeer(socketId);
        };

        // Handle screen share events from remote peers
        const handleScreenShareStarted = ({ socketId }) => {
            setScreenSharer(socketId);
        };
        const handleScreenShareStopped = ({ socketId }) => {
            setScreenSharer((prev) => (prev === socketId ? null : prev));
        };

        socket.on('all-users', handleAllUsers);
        socket.on('offer', handleOffer);
        socket.on('answer', handleAnswer);
        socket.on('ice-candidate', handleIceCandidate);
        socket.on('user-joined', handleUserJoined);
        socket.on('user-left', handleUserLeft);
        socket.on('screen-share-started', handleScreenShareStarted);
        socket.on('screen-share-stopped', handleScreenShareStopped);

        // Join the room
        socket.emit('join-room', { slug, userName });

        return () => {
            socket.off('all-users', handleAllUsers);
            socket.off('offer', handleOffer);
            socket.off('answer', handleAnswer);
            socket.off('ice-candidate', handleIceCandidate);
            socket.off('user-joined', handleUserJoined);
            socket.off('user-left', handleUserLeft);
            socket.off('screen-share-started', handleScreenShareStarted);
            socket.off('screen-share-stopped', handleScreenShareStopped);

            // Close all peer connections
            Object.keys(peersRef.current).forEach(removePeer);

            // NOTE: Do NOT call socket.disconnect() here — the socket is shared
            // with ChatPanel and other components. Disconnecting it here would
            // destroy chat listeners and clear chat history on re-renders.
        };
    }, [localStream, slug, userName, createPeerConnection, flushIceCandidates, removePeer]);

    return { remoteStreams, peerNames, screenSharer, replaceVideoTrack };
}
