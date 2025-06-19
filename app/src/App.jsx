// HEXY.PRO App - /app/src/App.jsx - Main application component for the app.
 

//import CollectionManager from './components/CollectionManager';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import FAQ from './pages/FAQ';
import Auth from './components/Auth';
import ProfileEdit from './pages/ProfileEdit';
import HexMap from './pages/HexMap';
import Tile from './pages/Tile';
import Map from './pages/Map';
import Subscriptions from './pages/Subscriptions';
import BulkUpload from './pages/BulkUpload';
import ExampleShop from './pages/ExampleShop';
import Teams from './pages/Teams';
import TileGenerator from './pages/TileGenerator'; // Add this import

import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-primary">
          <Navbar />
          <div className="site-container">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/register" element={<Auth />} />
              <Route path="/profile/edit" element={<ProfileEdit />} />
              <Route path="/hexmap" element={<HexMap />} />
              <Route path="/tile" element={<Tile />} />
              <Route path="/map" element={<Map />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/exampleShop" element={<ExampleShop />} />
              <Route path="/bulk-upload" element={<BulkUpload />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/tile-generator" element={<TileGenerator />} /> {/* Add this line */}
            </Routes>
          </div>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;