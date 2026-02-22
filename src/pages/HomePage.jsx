import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../services/socket.js';

export default function HomePage() {
    const navigate = useNavigate();
    const [joinCode, setJoinCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleNewMeeting = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/rooms`, { method: 'POST' });
            const data = await res.json();
            navigate(`/room/${data.slug}`);
        } catch (err) {
            setError('Failed to create meeting. Is the server running?');
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        if (!joinCode.trim()) return;
        setLoading(true);
        setError('');

        // Extract slug from full URL or use raw code
        let slug = joinCode.trim();
        const urlMatch = slug.match(/\/room\/(.+)$/);
        if (urlMatch) slug = urlMatch[1];

        try {
            const res = await fetch(`${API_URL}/rooms/${slug}`);
            if (!res.ok) {
                setError('Meeting not found. Check the code and try again.');
                return;
            }
            navigate(`/room/${slug}`);
        } catch (err) {
            setError('Failed to join meeting. Is the server running?');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="home-container">
            <div className="home-logo">
                <div className="home-logo-icon">📹</div>
                <span className="home-logo-text">TipTipMeet</span>
            </div>
            <p className="home-subtitle">
                Premium video meetings. Free for everyone.
            </p>

            <div className="home-card">
                <h2>Start or join a meeting</h2>

                <button
                    id="new-meeting-btn"
                    className="btn btn-primary"
                    onClick={handleNewMeeting}
                    disabled={loading}
                >
                    {loading ? '⏳' : '➕'} New Meeting
                </button>

                <div className="divider">or join with a code</div>

                <form className="join-form" onSubmit={handleJoin}>
                    <input
                        id="join-code-input"
                        className="input"
                        type="text"
                        placeholder="Enter meeting code"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                    />
                    <button
                        id="join-btn"
                        className="btn btn-secondary"
                        type="submit"
                        disabled={loading || !joinCode.trim()}
                    >
                        Join
                    </button>
                </form>

                {error && (
                    <p style={{ color: 'var(--danger)', marginTop: '1rem', fontSize: '0.85rem', textAlign: 'center' }}>
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
}
