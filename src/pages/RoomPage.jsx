import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useMediaStream from '../hooks/useMediaStream.js';
import useWebRTC from '../hooks/useWebRTC.js';
import VideoTile from '../components/VideoTile.jsx';
import Controls from '../components/Controls.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import { API_URL, socket } from '../services/socket.js';

export default function RoomPage() {
    const { slug } = useParams();
    const navigate = useNavigate();

    const [userName, setUserName] = useState('');
    const [nameSubmitted, setNameSubmitted] = useState(false);
    const [roomValid, setRoomValid] = useState(null); // null=loading, true, false
    const [nameInput, setNameInput] = useState('');
    const [pinnedId, setPinnedId] = useState(null);   // socketId or 'local'
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatUnread, setChatUnread] = useState(0);

    const {
        stream: localStream,
        isAudioEnabled,
        isVideoEnabled,
        isScreenSharing,
        startMedia,
        toggleAudio,
        toggleVideo,
        startScreenShare,
        stopScreenShare,
        stopMedia,
    } = useMediaStream();

    const { remoteStreams, peerNames, screenSharer, replaceVideoTrack } = useWebRTC(
        nameSubmitted ? localStream : null,
        nameSubmitted ? slug : null,
        userName
    );

    // Validate room exists
    useEffect(() => {
        const validateRoom = async () => {
            try {
                const res = await fetch(`${API_URL}/rooms/${slug}`);
                setRoomValid(res.ok);
            } catch {
                setRoomValid(false);
            }
        };
        validateRoom();
    }, [slug]);

    // Start media after name submission
    useEffect(() => {
        if (nameSubmitted) {
            startMedia().catch(() => {
                console.error('Could not access media devices');
            });
        }
    }, [nameSubmitted, startMedia]);

    const handleNameSubmit = (e) => {
        e.preventDefault();
        if (!nameInput.trim()) return;
        setUserName(nameInput.trim());
        setNameSubmitted(true);
    };

    const handleLeave = () => {
        stopMedia();
        socket.disconnect();
        navigate('/');
    };

    // Screen share toggle
    const handleToggleScreenShare = useCallback(async () => {
        if (isScreenSharing) {
            const cameraTrack = stopScreenShare();
            if (cameraTrack) {
                replaceVideoTrack(cameraTrack);
            }
            socket.emit('screen-share-stopped', { slug });
            setPinnedId(null);
        } else {
            const screenTrack = await startScreenShare();
            if (screenTrack) {
                replaceVideoTrack(screenTrack);
                socket.emit('screen-share-started', { slug });
                setPinnedId('local'); // Auto-pin own screen when presenting
            }
        }
    }, [isScreenSharing, startScreenShare, stopScreenShare, replaceVideoTrack, slug]);

    // Auto-pin when a remote user starts screen sharing
    useEffect(() => {
        if (screenSharer) {
            setPinnedId(screenSharer);
        }
    }, [screenSharer]);

    const handleTileClick = (id) => {
        setPinnedId((prev) => (prev === id ? null : id));
    };

    // Loading state
    if (roomValid === null) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
                <p className="loading-text">Connecting to meeting...</p>
            </div>
        );
    }

    // Room not found
    if (roomValid === false) {
        return (
            <div className="error-screen">
                <div className="error-icon">😕</div>
                <h2>Meeting not found</h2>
                <p>This meeting link may have expired or doesn't exist.</p>
                <button className="btn btn-primary" style={{ maxWidth: '200px' }} onClick={() => navigate('/')}>
                    Go Home
                </button>
            </div>
        );
    }

    // Name prompt
    if (!nameSubmitted) {
        return (
            <div className="name-overlay">
                <div className="name-dialog">
                    <h3>What's your name?</h3>
                    <p>Enter your name to join the meeting</p>
                    <form onSubmit={handleNameSubmit}>
                        <input
                            id="name-input"
                            className="input"
                            type="text"
                            placeholder="Your name"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            autoFocus
                        />
                        <button
                            id="join-room-btn"
                            className="btn btn-primary"
                            type="submit"
                            disabled={!nameInput.trim()}
                        >
                            Join Meeting
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Build all video streams
    const remoteEntries = Object.entries(remoteStreams);
    const totalCount = 1 + remoteEntries.length;

    // If a tile is pinned, show it large + others in sidebar
    const hasPinned = pinnedId !== null;

    // Build tile list for pinned vs unpinned
    const allTiles = [
        { id: 'local', stream: localStream, name: userName, isLocal: true, isMuted: !isAudioEnabled, isVideoOff: !isVideoEnabled, isScreenShare: isScreenSharing },
        ...remoteEntries.map(([socketId, stream]) => ({
            id: socketId,
            stream,
            name: peerNames[socketId] || 'Anonymous',
            isLocal: false,
            isMuted: false,
            isVideoOff: false,
            isScreenShare: screenSharer === socketId,
        })),
    ];

    const pinnedTile = hasPinned ? allTiles.find((t) => t.id === pinnedId) : null;
    const unpinnedTiles = hasPinned ? allTiles.filter((t) => t.id !== pinnedId) : allTiles;

    return (
        <div className="room-container">
            {/* Header */}
            <header className="room-header">
                <div className="room-header-left">
                    <div className="room-header-logo">📹</div>
                    <h1>TipTipMeet</h1>
                </div>
                <div className="room-header-right">
                    <div className="room-info">
                        <span className="room-info-dot" />
                        <span>{slug}</span>
                    </div>
                    <span className="participant-count">
                        👥 {totalCount} participant{totalCount !== 1 ? 's' : ''}
                    </span>
                </div>
            </header>

            {/* Video Area */}
            {hasPinned && pinnedTile ? (
                <div className="pinned-layout">
                    {/* Main pinned video */}
                    <div className="pinned-main">
                        <VideoTile
                            stream={pinnedTile.stream}
                            name={pinnedTile.name}
                            isLocal={pinnedTile.isLocal}
                            isMuted={pinnedTile.isMuted}
                            isVideoOff={pinnedTile.isVideoOff}
                            isPinned={true}
                            isScreenShare={pinnedTile.isScreenShare}
                            onClick={() => handleTileClick(pinnedTile.id)}
                        />
                    </div>

                    {/* Sidebar thumbnails */}
                    {unpinnedTiles.length > 0 && (
                        <div className="pinned-sidebar">
                            {unpinnedTiles.map((tile) => (
                                <VideoTile
                                    key={tile.id}
                                    stream={tile.stream}
                                    name={tile.name}
                                    isLocal={tile.isLocal}
                                    isMuted={tile.isMuted}
                                    isVideoOff={tile.isVideoOff}
                                    isPinned={false}
                                    isScreenShare={tile.isScreenShare}
                                    onClick={() => handleTileClick(tile.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="video-grid" data-count={Math.min(totalCount, 6)}>
                    {allTiles.map((tile) => (
                        <VideoTile
                            key={tile.id}
                            stream={tile.stream}
                            name={tile.name}
                            isLocal={tile.isLocal}
                            isMuted={tile.isMuted}
                            isVideoOff={tile.isVideoOff}
                            isPinned={false}
                            isScreenShare={tile.isScreenShare}
                            onClick={() => handleTileClick(tile.id)}
                        />
                    ))}
                </div>
            )}

            {/* Chat Panel */}
            <ChatPanel
                slug={slug}
                userName={userName}
                isOpen={isChatOpen}
                onToggle={() => setIsChatOpen((o) => !o)}
                onUnreadChange={setChatUnread}
            />

            {/* Controls */}
            <Controls
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
                isScreenSharing={isScreenSharing}
                onToggleAudio={toggleAudio}
                onToggleVideo={toggleVideo}
                onToggleScreenShare={handleToggleScreenShare}
                onToggleChat={() => setIsChatOpen((o) => !o)}
                isChatOpen={isChatOpen}
                chatUnread={chatUnread}
                onLeave={handleLeave}
            />
        </div>
    );
}
