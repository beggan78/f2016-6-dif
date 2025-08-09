import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Or your main CSS file
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    // Temporarily disabled React.StrictMode to fix refresh token issues
    // React.StrictMode causes double-mounting which triggers Supabase security detection
    // <React.StrictMode>
        <App />
    // </React.StrictMode>
);