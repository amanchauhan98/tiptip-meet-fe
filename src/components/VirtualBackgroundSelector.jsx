// src/components/VirtualBackgroundSelector.jsx
import { useState } from 'react';

const BGS = [
    { type: 'none', label: '🚫 None' },
    { type: 'blur', value: 'light', label: '💧 Light Blur' },
    { type: 'blur', value: 'heavy', label: '💦 Heavy Blur' },
    { type: 'color', value: '#1f2937', label: '⬛ Dark Gray' },
    { type: 'color', value: '#3b82f6', label: '🟦 Professional Blue' },
    { type: 'color', value: '#10b981', label: '🟩 Green Screen' },
];

export default function VirtualBackgroundSelector({ bgConfig, setBgConfig, onClose }) {
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            setBgConfig({ type: 'image', value: event.target.result });
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="bg-selector-panel">
            <div className="bg-header">
                <h3>Virtual Background</h3>
                <button className="close-btn" onClick={onClose}>✖</button>
            </div>

            <div className="bg-grid">
                {BGS.map((bg, idx) => {
                    const isActive = bgConfig.type === bg.type && bgConfig.value === bg.value;
                    return (
                        <button
                            key={idx}
                            className={`bg-option ${isActive ? 'active' : ''}`}
                            onClick={() => setBgConfig({ type: bg.type, value: bg.value })}
                        >
                            {bg.label}
                        </button>
                    )
                })}
            </div>

            <div className="bg-upload">
                <label className="btn btn-secondary" style={{ width: '100%', textAlign: 'center', cursor: 'pointer' }}>
                    🖼️ Upload Custom Image
                    <input type="file" accept="image/png, image/jpeg" style={{ display: 'none' }} onChange={handleImageUpload} />
                </label>
            </div>
        </div>
    );
}
