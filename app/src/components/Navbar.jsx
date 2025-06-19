// HEXY.PRO App - /app/src/components/Navbar.jsx - Component used to display the navigation bar.
 

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabaseClient';
import '../styles/Navbar.css';

const Navbar = () => {
  const { session, signOut } = useAuth();
  const [subscriptionTier, setSubscriptionTier] = useState('Beta');
  const [displayName, setDisplayName] = useState('Guest');
  const [tokens, setTokens] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (session) {
      fetchUserInfo();
    } else {
      setSubscriptionTier('Limited');
      setDisplayName('Guest');
      setTokens(0);
    }
  }, [session]);

  const fetchUserInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('tier, display_name, tokens, email')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;

      setSubscriptionTier(data.tier || 'Free');
      setDisplayName(data.display_name || 'Guest');
      setTokens(data.tokens || 0);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setSubscriptionTier('Free');
      setDisplayName('Guest');
      setTokens(0);
    }
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <nav className={`navbar-vertical ${isVisible ? '' : 'minimized'}`}>
      {isVisible && (
        <>
          <div className="user-profile">
            <div className="profile-picture">
              <User size={48} />
            </div>
            <div className="user-info">
              <p className="username">{session ? displayName : 'Guest'}</p>
              <p className="subscription-type token-label">{tokens} Tokens</p>
              <p className="subscription-type">{subscriptionTier}</p>
            </div>
          </div>
          <div className="nav-links">
          {session && subscriptionTier !== 'Free' && (
              <Link to="/tile-generator" className="nav-link">Tile Generator [AI]</Link>
            )}
            <Link to="/tile" className="nav-link">Tile Creator</Link>
            {/*<Link to="/map" className="nav-link">Map <b style={{fontSize: "8px"}}> - Deprecated</b></Link>*/}
            <Link to="/hexmap" className="nav-link">Map Creator</Link>
            <Link to="/subscriptions" className="nav-link">Subscriptions</Link>
            {session && subscriptionTier !== 'Free' && (
              <Link to="/bulk-upload" className="nav-link">Bulk Upload</Link>
            )}
            {session && subscriptionTier !== 'Free' && (
              <Link to="/teams" className="nav-link">Teams</Link>
            )}
            {session ? (
              <>
                <Link to="/profile/edit" className="nav-link">Edit Profile</Link>
                <button onClick={signOut} className="nav-link logout-btn">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/register" className="nav-link">Register</Link>
              </>
            )}
          </div>
        </>
      )}
      <button className="toggle-btn" onClick={toggleVisibility}>
        {isVisible ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
    </nav>
  );
};

export default Navbar;