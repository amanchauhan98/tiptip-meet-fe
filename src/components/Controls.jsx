export default function Controls({
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isChatOpen,
    chatUnread,
    onToggleAudio,
    onToggleVideo,
    onToggleScreenShare,
    onToggleChat,
    onLeave,
}) {
    return (
        <div className="controls-bar">
            <button
                id="toggle-mic"
                className={`control-btn ${isAudioEnabled ? 'on' : 'off'}`}
                onClick={onToggleAudio}
            >
                {isAudioEnabled ? '🎤' : '🔇'}
                <span className="tooltip">
                    {isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                </span>
            </button>

            <button
                id="toggle-camera"
                className={`control-btn ${isVideoEnabled ? 'on' : 'off'}`}
                onClick={onToggleVideo}
            >
                {isVideoEnabled ? '📹' : '📷'}
                <span className="tooltip">
                    {isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                </span>
            </button>

            <button
                id="toggle-screen"
                className={`control-btn ${isScreenSharing ? 'active' : 'on'}`}
                onClick={onToggleScreenShare}
            >
                {isScreenSharing ? '🟢' : '🖥️'}
                <span className="tooltip">
                    {isScreenSharing ? 'Stop presenting' : 'Present your screen'}
                </span>
            </button>

            <button
                id="toggle-chat"
                className={`control-btn ${isChatOpen ? 'active' : 'on'}`}
                onClick={onToggleChat}
                style={{ position: 'relative' }}
            >
                💬
                {!isChatOpen && chatUnread > 0 && (
                    <span className="chat-unread-badge">{chatUnread}</span>
                )}
                <span className="tooltip">
                    {isChatOpen ? 'Close chat' : 'Open chat'}
                </span>
            </button>

            <button
                id="leave-call"
                className="control-btn leave"
                onClick={onLeave}
            >
                📞
                <span className="tooltip">Leave meeting</span>
            </button>
        </div>
    );
}
