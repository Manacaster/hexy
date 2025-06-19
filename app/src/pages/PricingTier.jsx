// HEXY.PRO App - /app/src/pages/PricingTier.jsx - Component used to display a pricing tier with features and a button to subscribe.
 

/* eslint-disable react/prop-types */

import '../styles/Subscriptions.css';

const PricingTier = ({ name, price, features, highlighted, onButtonClick, loading, userTier }) => {
  const getButtonText = () => {
    if (name === userTier) return 'Current';
    if (name === 'Free') {
      return userTier === 'Pro' || userTier === 'Supporter' ? 'Downgrade' : 'Current';
    }
    if (name === 'Pro') {
      if (userTier === 'Free') return 'Subscribe';
      if (userTier === 'Supporter') return 'Downgrade';
    }
    if (name === 'Supporter') {
      if (userTier === 'Free' || userTier === 'Pro') return 'Upgrade';
    }
    return 'Subscribe';
  };

  const isButtonDisabled = () => {
    return name === userTier || loading || (name === 'Free' && userTier !== 'Pro' && userTier !== 'Supporter');
  };

  const buttonText = getButtonText();

  return (
    <div className={`pricing-tier ${highlighted ? 'highlighted' : ''}`}>
      <h3>{name}</h3>
      <p>Best option for {name.toLowerCase()} use</p>
      <div className="price">${(price / 100).toFixed(2)}<span>/month</span></div>
      <div className="feature-list">
        {features.map((feature, index) => (
          feature.startsWith("Tile Creator:") || feature.startsWith("Map Creator:") ? (
            <h4 key={index} className="feature-divider">{feature}</h4>
          ) : (
            <li key={index}>{feature}</li>
          )
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", height: "100%", paddingTop: '40px' }}>
        <button 
          onClick={isButtonDisabled() ? null : onButtonClick} 
          disabled={isButtonDisabled()}
          className={isButtonDisabled() ? 'disabled' : ''}
        >
          {loading ? 'Loading...' : buttonText}
        </button>
      </div>
    </div>
  );
};

export default PricingTier;