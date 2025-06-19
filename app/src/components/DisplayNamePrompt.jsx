// HEXY.PRO App - /app/src/components/DisplayNamePrompt.jsx - Component used to prompt users to set a display name.
 

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const DisplayNamePrompt = () => {
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const { updateProfile, userProfile, session } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name cannot be empty');
      return;
    }
    
    const result = await updateProfile({ display_name: displayName, updated_at: new Date().toISOString() });
    if (result.error) {
      setError('Failed to update display name. Please try again.');
    }
  };

  // Only show the prompt if the user is logged in and hasn't set a display name
  if (!session || !userProfile || userProfile.display_name) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        backgroundColor: '#1a1a1a',
        padding: '2rem',
        borderRadius: '8px',
        maxWidth: '400px',
        width: '100%',
      }}>
        <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Choose a Display Name</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your display name"
            style={{
              width: '100%',
              padding: '0.5rem',
              marginBottom: '1rem',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
            }}
          />
          {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Set Display Name
          </button>
        </form>
      </div>
    </div>
  );
};

export default DisplayNamePrompt;