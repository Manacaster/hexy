// HEXY.PRO App - /app/src/pages/ProfileEdit.jsx - Page component that allows users to edit their profile.
 

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import '../styles/ProfileEdit.css';

const ProfileEdit = () => {
  const { session } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  async function fetchProfile() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setDisplayName(data.display_name || '');
      }
    } catch (error) {
      setMessage('Error fetching profile!');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: session.user.id, display_name: displayName });

      if (error) {
        throw error;
      }

      setMessage('Profile updated successfully!');
      setMessageType('success');
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error updating profile!');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  if (!session) {
    return <div className="profile-edit-container">Please log in to edit your profile.</div>;
  }

  return (
    <div className="profile-edit-container">
      <div className="profile-edit-header">
        <h1>Edit Profile</h1>
      </div>
      {message && (
        <div className={`message ${messageType === 'success' ? 'success-message' : 'error-message'}`}>
          {message}
        </div>
      )}
      <form onSubmit={updateProfile} className="profile-edit-form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={session.user.email}
            disabled
          />
        </div>
        <div className="form-group">
          <label htmlFor="displayName">Display Name</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};

export default ProfileEdit;