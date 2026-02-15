import { useState, useRef, useCallback, useEffect } from 'react';

export default function useMediaStream() {
    const [stream, setStream] = useState(null);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const streamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const originalVideoTrackRef = useRef(null);

    const startMedia = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user',
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });
            streamRef.current = mediaStream;
            setStream(mediaStream);
            return mediaStream;
        } catch (err) {
            console.error('Failed to get media devices:', err);
            throw err;
        }
    }, []);

    const toggleAudio = useCallback(() => {
        if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);
            }
        }
    }, []);

    const toggleVideo = useCallback(() => {
        if (streamRef.current) {
            const videoTrack = streamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
            }
        }
    }, []);

    // Start screen sharing — returns the screen track so caller can replace in peer connections
    const startScreenShare = useCallback(async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' },
                audio: false,
            });

            const screenTrack = screenStream.getVideoTracks()[0];
            screenStreamRef.current = screenStream;

            // Save original camera track
            if (streamRef.current) {
                originalVideoTrackRef.current = streamRef.current.getVideoTracks()[0];

                // Replace video track in local stream so local preview shows screen
                streamRef.current.removeTrack(originalVideoTrackRef.current);
                streamRef.current.addTrack(screenTrack);
            }

            setIsScreenSharing(true);
            setStream(streamRef.current); // trigger re-render

            // When user stops sharing via the browser's built-in "Stop sharing" button
            screenTrack.onended = () => {
                stopScreenShare();
            };

            return screenTrack;
        } catch (err) {
            console.error('Failed to start screen sharing:', err);
            return null;
        }
    }, []);

    // Stop screen sharing — returns the original camera track
    const stopScreenShare = useCallback(() => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;
        }

        // Restore original camera track in local stream
        if (streamRef.current && originalVideoTrackRef.current) {
            const currentScreen = streamRef.current.getVideoTracks()[0];
            if (currentScreen) {
                streamRef.current.removeTrack(currentScreen);
            }
            streamRef.current.addTrack(originalVideoTrackRef.current);
        }

        setIsScreenSharing(false);
        setStream(streamRef.current);

        return originalVideoTrackRef.current;
    }, []);

    const stopMedia = useCallback(() => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => track.stop());
            screenStreamRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            setStream(null);
        }
    }, []);

    useEffect(() => {
        return () => {
            stopMedia();
        };
    }, [stopMedia]);

    return {
        stream,
        isAudioEnabled,
        isVideoEnabled,
        isScreenSharing,
        startMedia,
        toggleAudio,
        toggleVideo,
        startScreenShare,
        stopScreenShare,
        stopMedia,
    };
}
