import { useState } from 'react';
import VirtualBackgroundSelector from './VirtualBackgroundSelector.jsx';

export default function Controls({
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isChatOpen,
    chatUnread,
    bgConfig,
    setBgConfig,
    onToggleAudio,
    onToggleVideo,
    onToggleScreenShare,
    onToggleChat,
    onLeave,
}) {
    const [isBgOpen, setIsBgOpen] = useState(false);

    return (
        <div className="controls-container">
            {isBgOpen && (
                <div className="floating-panel" style={{ bottom: '80px', left: '50%', transform: 'translateX(-50%)' }}>
                    <VirtualBackgroundSelector
                        bgConfig={bgConfig}
                        setBgConfig={setBgConfig}
                        onClose={() => setIsBgOpen(false)}
                    />
                </div>
            )}
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
                    id="toggle-bg"
                    className={`control-btn ${bgConfig?.type !== 'none' ? 'active' : 'on'}`}
                    onClick={() => setIsBgOpen(!isBgOpen)}
                >
                    ✨
                    <span className="tooltip">Virtual Background</span>
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
        </div>
    );
}
