import { useEffect, useRef } from 'react';

export default function VideoTile({
    stream,
    name,
    isLocal,
    isMuted,
    isVideoOff,
    isPinned,
    isScreenShare,
    onClick,
}) {
    const videoRef = useRef(null);

    // Re-assign srcObject whenever the stream changes OR when the video
    // element remounts (e.g. after toggling camera back on).
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, isVideoOff]);

    const initial = name ? name.charAt(0).toUpperCase() : '?';

    return (
        <div
            className={`video-tile ${isLocal ? 'local mirror' : ''} ${isPinned ? 'pinned' : ''} ${isScreenShare ? 'screen-share' : ''}`}
            onClick={onClick}
            title={onClick ? 'Click to pin/unpin' : undefined}
        >
            {/* Always keep video in DOM so srcObject persists; hide visually when off */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                style={{ display: isVideoOff ? 'none' : 'block' }}
            />

            {isVideoOff && (
                <div className="video-tile-avatar">
                    <div className="avatar-circle">{initial}</div>
                </div>
            )}

            <div className="video-tile-label">
                <span>
                    {isScreenShare && '🖥️ '}
                    {isLocal ? `${name} (You)` : name}
                    {isScreenShare && ' — Presenting'}
                </span>
            </div>

            {isMuted && (
                <div className="video-tile-muted" title="Muted">🔇</div>
            )}

            {isPinned && (
                <div className="video-tile-pin" title="Pinned">📌</div>
            )}
        </div>
    );
}
