// HEXY.PRO App - /app/src/pages/Home.jsx - Home page component.
 

/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */

import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Hexagon, Upload, Crown } from 'lucide-react';
import '../styles/Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Welcome to HexyPro</h1>
        <p>Create, Customize, and Conquer with Hexagonal Maps</p>
      </header>

      <main className="home-main">
        <section className="feature-grid">
          <FeatureCard 
            icon={<Hexagon size={48} />}
            title="Tile Creator"
            description="Design custom hexagonal tiles with our intuitive editor."
            link="/tile"
          />
          <FeatureCard 
            icon={<MapPin size={48} />}
            title="Map Creator"
            description="Build expansive hexagonal maps for your games or projects."
            link="/hexmap"
          />
          <FeatureCard 
            icon={<Upload size={48} />}
            title="Bulk Upload"
            description="Efficiently upload and process multiple tiles at once."
            link="/bulk-upload"
          />
          <FeatureCard 
            icon={<Crown size={48} />}
            title="Subscriptions"
            description="Unlock advanced features with our subscription plans."
            link="/subscriptions"
          />
        </section>

        <section className="cta-section">
          <h2>Start Creating Today</h2>
          <p>Join HexyPro and bring your hexagonal world to life!</p>
          <Link to="/register" className="cta-button">Sign Up Now</Link>
        </section>
      </main>

      <footer className="home-footer">
        <p>&copy; 2024 HexyPro. All rights reserved.</p>
        <nav>
          <Link to="/faq">FAQ</Link>
          <Link to="/profile/edit">Profile</Link>
        </nav>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description, link }) => (
  <div className="feature-card">
    <div className="feature-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{description}</p>
    <Link to={link} className="feature-link">Learn More</Link>
  </div>
);

export default Home;