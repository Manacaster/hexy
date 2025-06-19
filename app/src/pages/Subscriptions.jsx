// HEXY.PRO App - /app/src/pages/Subscriptions.jsx - Page component that displays subscription tiers and allows users to upgrade their subscription.
 

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import PricingTier from './PricingTier';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Subscriptions.css';

const Subscriptions = () => {
  const [errorMessage, setErrorMessage] = useState(null);
  const [loadingTier, setLoadingTier] = useState(null);
  const [userTier, setUserTier] = useState('Free');
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      fetchUserTier();
    }
  }, [session]);

  const fetchUserTier = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      setUserTier(data.tier || 'Free');
    } catch (error) {
      console.error('Error fetching user tier:', error);
      setErrorMessage('Failed to fetch user subscription tier. Please try again.');
    }
  };

  const tiers = [
    {
      id: 0,
      name: "Free",
      price: 0,
      features: [
        "Tile Creator:",
        "Create tiles with uploaded images",
        "Collection management",
        "3 LODs image compression",
        "Web-ready PNG export",
        "Simple numbers & icons",
        "Limited credits for automated assistance",
        "Manual tile edge color blending",
        "1-KM scale tiles",
        "Map Creator:",
        "Map saving & loading",
        "Maximum map size: 100 tiles",
        "Bulk uploading tiles",
        "Limited credits for procedural generation",
        "Basic fantasy & wargame tilesets"
      ],
      highlighted: false
    },
    {
      id: 1,
      name: "Pro",
      price: 1500,
      features: [
        "All Free tier features, plus:",
        "Tile Creator:",
        "Unlimited credits for automated assistance",
        "Print-ready 300-DPI export",
        "Automated biome detection for edge blending",
        "Multiple tile scaling options",
        "Advanced tile library management",
        "Custom numbers & icons",
        "Animated GIF support",
        "Map Creator:",
        "Maximum map size: 500 tiles",
        "Bulk-generating tiles",
        "Unlimited credits for procedural generation",
        "Full fantasy & wargame tilesets",
        "Animated GIF support in maps",
        "Realtime collaboration"
      ],
      highlighted: true
    },
    {
      id: 3,
      name: "Supporter",
      price: 10000,
      features: [
        "All Pro tier features",
        "Big thanks from the devs"
      ],
      highlighted: false
    }
  ];

  const handleTierClick = async (productId) => {
    setLoadingTier(productId);
    setErrorMessage(null);

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) throw error;
      if (!session) throw new Error('User is not authenticated');

      const token = session.access_token;

      const response = await fetch('http://localhost:5000/api/stripe/create-payment-link', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productId })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment link');
      }

      const data = await response.json();

      if (data.status !== 'ok') {
        throw new Error(data.message || 'Failed to fetch payment link');
      }

      window.open(data.payment_link, '_blank');
    } catch (error) {
      setErrorMessage(error.message);
      console.error('Error fetching payment link:', error);
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="subscriptions-container">
      <div className="subscriptions-header">
        <h2>Choose Your Plan</h2>
        <p>Find the perfect plan for your needs. Whether you&apos;re just starting out or looking for advanced features, we&apos;ve got you covered.</p>
      </div>
      <div className="pricing-tiers">
        {tiers.map((tier) => (
          <PricingTier
            key={tier.id}
            {...tier}
            onButtonClick={() => handleTierClick(tier.id)}
            loading={loadingTier === tier.id}
            userTier={userTier}
          />
        ))}
      </div>
      {errorMessage && <div className="error-message">{errorMessage}</div>}
    </div>
  );
};

export default Subscriptions;