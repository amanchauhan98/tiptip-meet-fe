import { useState, useEffect, useRef, useCallback } from 'react';
import { socket, API_URL } from '../services/socket.js';

/**
 * Build avatar initials from a name.
 * "Aman Chauhan" → "AC",  "Aman" → "AM",  "Jo" → "JO"
 */
function getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

/** Request browser notification permission once */
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body,
            icon: '📹',
            tag: 'tiptip-chat', // collapse duplicate notifications
        });
    }
}

export default function ChatPanel({ slug, userName, isOpen, onToggle, onUnreadChange }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const bottomRef = useRef(null);
    const isOpenRef = useRef(isOpen);
    const seenIdsRef = useRef(new Set()); // track message IDs to deduplicate

    // Typing indicator state
    const [typingUsers, setTypingUsers] = useState(new Map()); // socketId → userName
    const throttleRef = useRef(null);   // timestamp of last 'typing' emit
    const debounceRef = useRef(null);   // timer ID for 'stop-typing' debounce
    const THROTTLE_MS = 1000;           // emit 'typing' at most once per second
    const DEBOUNCE_MS = 2000;           // emit 'stop-typing' after 2s of no keystrokes

    useEffect(() => {
        isOpenRef.current = isOpen;
        if (isOpen) {
            setUnreadCount(0);
            if (onUnreadChange) onUnreadChange(0);
        }
    }, [isOpen, onUnreadChange]);

    // Ask for notification permission on mount
    useEffect(() => {
        requestNotificationPermission();
    }, []);

    // Load chat history from REST API when slug is available
    useEffect(() => {
        if (!slug) return;
        const loadHistory = async () => {
            try {
                const res = await fetch(`${API_URL}/rooms/${slug}/messages`);
                if (res.ok) {
                    const history = await res.json();
                    // Mark all history IDs as seen
                    history.forEach((m) => seenIdsRef.current.add(m.id));
                    setMessages(history);
                }
            } catch (err) {
                console.error('Failed to load chat history:', err);
            }
        };
        loadHistory();
    }, [slug]);

    // Listen for incoming real-time messages (deduplicate with history)
    useEffect(() => {
        const handleMessage = (msg) => {
            // Skip if we already have this message (from history)
            if (seenIdsRef.current.has(msg.id)) return;
            seenIdsRef.current.add(msg.id);

            setMessages((prev) => [...prev, msg]);

            if (!isOpenRef.current && msg.senderSocketId !== socket.id) {
                setUnreadCount((c) => {
                    const next = c + 1;
                    if (onUnreadChange) onUnreadChange(next);
                    return next;
                });

                // Browser notification
                showNotification(
                    `${msg.senderName} sent a message`,
                    msg.message
                );
            }
        };

        socket.on('chat-message', handleMessage);
        return () => socket.off('chat-message', handleMessage);
    }, [onUnreadChange]);

    // Auto-scroll to bottom when new message or typing indicator changes
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingUsers]);

    // Listen for typing / stop-typing events
    useEffect(() => {
        const handleTyping = ({ socketId, userName }) => {
            setTypingUsers((prev) => {
                const next = new Map(prev);
                next.set(socketId, userName);
                return next;
            });
        };

        const handleStopTyping = ({ socketId }) => {
            setTypingUsers((prev) => {
                const next = new Map(prev);
                next.delete(socketId);
                return next;
            });
        };

        // Also clear typing when that user sends a message
        const handleMessageClearTyping = (msg) => {
            if (msg.senderSocketId) {
                setTypingUsers((prev) => {
                    if (!prev.has(msg.senderSocketId)) return prev;
                    const next = new Map(prev);
                    next.delete(msg.senderSocketId);
                    return next;
                });
            }
        };

        socket.on('typing', handleTyping);
        socket.on('stop-typing', handleStopTyping);
        socket.on('chat-message', handleMessageClearTyping);

        return () => {
            socket.off('typing', handleTyping);
            socket.off('stop-typing', handleStopTyping);
            socket.off('chat-message', handleMessageClearTyping);
        };
    }, []);

    /** Emit 'typing' (throttled) + schedule 'stop-typing' (debounced) */
    const handleInputChange = useCallback(
        (e) => {
            setInput(e.target.value);

            const now = Date.now();

            // THROTTLE: only emit 'typing' if enough time has passed
            if (!throttleRef.current || now - throttleRef.current >= THROTTLE_MS) {
                socket.emit('typing', { slug });
                throttleRef.current = now;
            }

            // DEBOUNCE: reset the stop-typing timer on every keystroke
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                socket.emit('stop-typing', { slug });
                throttleRef.current = null; // reset throttle so next keystroke fires immediately
            }, DEBOUNCE_MS);
        },
        [slug]
    );

    const handleSend = useCallback(
        (e) => {
            e.preventDefault();
            const text = input.trim();
            if (!text) return;
            socket.emit('chat-message', { slug, message: text });
            setInput('');

            // Immediately stop our typing indicator
            clearTimeout(debounceRef.current);
            socket.emit('stop-typing', { slug });
            throttleRef.current = null;
        },
        [input, slug]
    );

    return (
        <>
            {/* Chat panel */}
            <div className={`chat-panel ${isOpen ? 'open' : ''}`}>
                <div className="chat-header">
                    <h3>💬 In-call messages</h3>
                    <button className="chat-close-btn" onClick={onToggle}>✕</button>
                </div>

                <div className="chat-messages">
                    {messages.length === 0 && (
                        <div className="chat-empty">
                            <p>No messages yet</p>
                            <span>Messages are only visible to people in the call</span>
                        </div>
                    )}

                    {messages.map((msg) => {
                        const isMe = msg.senderSocketId === socket.id;
                        const initials = getInitials(msg.senderName);
                        const time = new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        });

                        return (
                            <div
                                key={msg.id}
                                className={`chat-msg ${isMe ? 'mine' : 'theirs'}`}
                            >
                                {!isMe && (
                                    <div className="chat-avatar" title={msg.senderName}>
                                        {initials}
                                    </div>
                                )}
                                <div className="chat-msg-content">
                                    {!isMe && (
                                        <span className="chat-sender">{msg.senderName}</span>
                                    )}
                                    <div className="chat-bubble">
                                        <p>{msg.message}</p>
                                        <span className="chat-time">{time}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Typing indicator */}
                    {typingUsers.size > 0 && (
                        <div className="typing-indicator">
                            <div className="typing-dots">
                                <span /><span /><span />
                            </div>
                            <span className="typing-text">
                                {[...typingUsers.values()].join(', ')}{' '}
                                {typingUsers.size === 1 ? 'is' : 'are'} typing…
                            </span>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>

                <form className="chat-input-bar" onSubmit={handleSend}>
                    <input
                        className="chat-input"
                        type="text"
                        placeholder="Send a message…"
                        value={input}
                        onChange={handleInputChange}
                        autoComplete="off"
                    />
                    <button
                        className="chat-send-btn"
                        type="submit"
                        disabled={!input.trim()}
                    >
                        ➤
                    </button>
                </form>
            </div>
        </>
    );
}
