import { useState, useEffect, useRef } from 'react';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

export default function useVirtualBackground(sourceStream, isVideoEnabled) {
    const [processedStream, setProcessedStream] = useState(null);
    const [bgConfig, setBgConfig] = useState(() => {
        const saved = localStorage.getItem('virtualBgConfig');
        return saved ? JSON.parse(saved) : { type: 'none', value: null };
    });

    const bgConfigRef = useRef(bgConfig);
    const canvasRef = useRef(null);
    const videoRef = useRef(null);
    const segmentationRef = useRef(null);
    const animationRef = useRef(null);
    const activeRef = useRef(false);

    let cachedImage = useRef(null);
    let cachedImageValue = useRef(null);

    // Save bgConfig and keep ref updated for the onResults closure
    useEffect(() => {
        localStorage.setItem('virtualBgConfig', JSON.stringify(bgConfig));
        bgConfigRef.current = bgConfig;
    }, [bgConfig]);

    // Setup mediapipe and canvas exactly once
    useEffect(() => {
        canvasRef.current = document.createElement('canvas');
        canvasRef.current.width = 640;
        canvasRef.current.height = 480;

        videoRef.current = document.createElement('video');
        videoRef.current.width = 640;
        videoRef.current.height = 480;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;

        segmentationRef.current = new SelfieSegmentation({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
            }
        });

        segmentationRef.current.setOptions({
            modelSelection: 1, // 1 is landscape (faster)
            selfieMode: false,
        });

        const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });

        segmentationRef.current.onResults((results) => {
            if (!canvasRef.current || !ctx) return;
            const width = canvasRef.current.width;
            const height = canvasRef.current.height;
            const currentConfig = bgConfigRef.current;

            ctx.save();
            ctx.clearRect(0, 0, width, height);

            if (currentConfig.type === 'none') {
                ctx.drawImage(results.image, 0, 0, width, height);
                ctx.restore();
                return;
            }

            // 1. Draw the user mask image
            ctx.drawImage(results.segmentationMask, 0, 0, width, height);

            // 2. Draw original user over the white mask part
            ctx.globalCompositeOperation = 'source-in';
            ctx.drawImage(results.image, 0, 0, width, height);

            // 3. Draw background behind the user
            ctx.globalCompositeOperation = 'destination-over';

            if (currentConfig.type === 'blur') {
                ctx.filter = currentConfig.value === 'heavy' ? 'blur(20px)' : 'blur(10px)';
                ctx.drawImage(results.image, 0, 0, width, height);
                ctx.filter = 'none';
            } else if (currentConfig.type === 'color') {
                ctx.fillStyle = currentConfig.value || '#3b82f6';
                ctx.fillRect(0, 0, width, height);
            } else if (currentConfig.type === 'image' && currentConfig.value) {
                if (cachedImageValue.current !== currentConfig.value) {
                    cachedImage.current = new Image();
                    cachedImage.current.src = currentConfig.value;
                    cachedImageValue.current = currentConfig.value;
                }

                if (cachedImage.current && cachedImage.current.complete) {
                    ctx.drawImage(cachedImage.current, 0, 0, width, height);
                } else {
                    ctx.fillStyle = '#111827'; // Dark fallback
                    ctx.fillRect(0, 0, width, height);
                }
            }

            ctx.restore();
        });

        return () => {
            segmentationRef.current?.close();
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    const processVideo = async () => {
        if (!activeRef.current || !videoRef.current || !segmentationRef.current) return;

        if (videoRef.current.readyState >= 2) {
            try {
                await segmentationRef.current.send({ image: videoRef.current });
            } catch (e) {
                console.error('MediaPipe error:', e);
            }
        }
        animationRef.current = requestAnimationFrame(processVideo);
    };

    // Update processing loop when source stream or bgConfig changes
    useEffect(() => {
        if (!sourceStream || !isVideoEnabled) {
            activeRef.current = false;
            setProcessedStream(null);
            return;
        }

        // Performance optimization: if 'none', bypass ML entirely
        if (bgConfigRef.current.type === 'none') {
            activeRef.current = false;
            setProcessedStream(sourceStream);
            return;
        }

        // Check if stream already hooked up to videoRef
        if (videoRef.current.srcObject !== sourceStream) {
            videoRef.current.srcObject = sourceStream;
            videoRef.current.play().catch(console.error);
        }

        if (!activeRef.current) {
            activeRef.current = true;
            processVideo();

            // Build the new MediaStream
            const canvasTrack = canvasRef.current.captureStream(30).getVideoTracks()[0];
            const newStream = new MediaStream([canvasTrack]);
            const audioTrack = sourceStream.getAudioTracks()[0];
            if (audioTrack) {
                newStream.addTrack(audioTrack);
            }
            setProcessedStream(newStream);
        }

        return () => {
            // we do not stop processing immediately because changes between blur/color
            // will just update the ref, and we want to keep processing.
            // Only stop if stream goes null or background is set to 'none' in effect dependencies (which occurs above).
        };
        // We only trigger when sourceStream or isVideoEnabled changes. 
        // We DON'T trigger on bgConfig.type changes if it's already running to avoid destroying/recreating canvas streams unless switching to 'none'.
    }, [sourceStream, isVideoEnabled]);

    // Additional effect to handle when bgConfig switches from processing back to 'none' and vice-versa
    useEffect(() => {
        if (bgConfig.type === 'none' && activeRef.current) {
            activeRef.current = false;
            setProcessedStream(sourceStream);
        } else if (bgConfig.type !== 'none' && !activeRef.current && sourceStream && isVideoEnabled) {
            videoRef.current.srcObject = sourceStream;
            videoRef.current.play().catch(console.error);
            activeRef.current = true;
            processVideo();

            const canvasTrack = canvasRef.current.captureStream(30).getVideoTracks()[0];
            const newStream = new MediaStream([canvasTrack]);
            const audioTrack = sourceStream.getAudioTracks()[0];
            if (audioTrack) {
                newStream.addTrack(audioTrack);
            }
            setProcessedStream(newStream);
        }
    }, [bgConfig.type, sourceStream, isVideoEnabled]);

    return {
        processedStream: processedStream || sourceStream,
        bgConfig,
        setBgConfig
    };
}
