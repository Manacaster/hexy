import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import '../styles/TileGenerator.css';

const TileGenerator = () => {
  const { session } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [useDropdowns, setUseDropdowns] = useState(false);
  const [style, setStyle] = useState('Default');
  const [perspective, setPerspective] = useState('Top-Down');
  const [type, setType] = useState('Land');
  const [subtype, setSubtype] = useState('Plains');
  const [biome, setBiome] = useState('Temperate');
  const [resolution, setResolution] = useState("512");
  const canvasRef = useRef(null);

  const apiUrl = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    fetchCollections();
  }, [session]);

  const fetchCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('id, name')
        .eq('user_id', session.user.id);

      if (error) throw error;
      setCollections(data);
    } catch (error) {
      console.error('Error fetching collections:', error);
      setError('Failed to fetch collections. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resolution) {
      setError('Please select a resolution');
      return;
    }
    setIsLoading(true);
    setError(null);
  
    let fullPrompt = prompt;
    if (useDropdowns) {
      fullPrompt = `biome: ${biome}, style: ${style}, type: ${type}, subtype: ${subtype}, ${prompt}`.trim();
    }
  
    try {
      const response = await fetch(`${apiUrl}/generate-tile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ prompt: fullPrompt, resolution })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate tile');
      }

      const data = await response.json();
      setGeneratedImage(`data:image/png;base64,${data.imageData}`);
    } catch (error) {
      console.error('Error generating tile:', error);
      setError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToCollection = async () => {
    if (!selectedCollection) {
      setError('Please select a collection');
      return;
    }

    try {
      const response = await fetch('/api/save-tile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          imageData: generatedImage.split(',')[1],
          collectionId: selectedCollection
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save tile');
      }

      const data = await response.json();
      console.log('Tile saved:', data.imageUrl);
      setSaveMessage('Tile saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving tile:', error);
      setError(error.message || 'Failed to save tile. Please try again.');
    }
  };

  const handleDiscard = () => {
    setGeneratedImage(null);
    setSelectedCollection('');
  };

  return (
    <div className="tile-generator-container">
      <h2 style={{marginTop: '-18px'}}>HEXY.PRO - Tile Generator</h2>
      <p style={{fontSize: '13px', color: '#a0caf7', marginTop: '-11px', paddingBottom: '7px'}} >Please make sure you created a tile Collection in the Map Creator if you wish to save your generated tiles to your collection.</p>
      
      <div className="dropdown-toggle">
        <label>
          <input
            type="checkbox"
            checked={useDropdowns}
            onChange={(e) => setUseDropdowns(e.target.checked)}
          />
          Use Preset Options
        </label>
      </div>

      {useDropdowns && (
        <div className="dropdown-container">
          <select value={style} onChange={(e) => setStyle(e.target.value)}>
            <option value="Default">Default</option>
            <option value="Stylized">Stylized</option>
            <option value="Realistic">Realistic</option>
            <option value="Drawing">Drawing</option>
          </select>

          <select value={perspective} onChange={(e) => setPerspective(e.target.value)} disabled>
            <option value="Top-Down">Top-Down</option>
          </select>

          <select value={type} onChange={(e) => {
            setType(e.target.value);
            setSubtype(e.target.value === 'Land' ? 'Plains' : 'Cliff');
          }}>
            <option value="Land">Land</option>
            <option value="Water">Water</option>
          </select>

          <select value={subtype} onChange={(e) => setSubtype(e.target.value)}>
            {type === 'Land' ? (
              <>
                <option value="Plains">Plains</option>
                <option value="Forest">Forest</option>
                <option value="Mountain">Mountain</option>
                <option value="Hill">Hill</option>
                <option value="Road">Road</option>
                <option value="House">House</option>
                <option value="Watch tower">Watch tower</option>
              </>
            ) : (
              <>
                <option value="Cliff">Cliff</option>
                <option value="Water fall">Water fall</option>
                <option value="Calm water">Calm water</option>
                <option value="Ocean water">Ocean water</option>
                <option value="Boat">Boat</option>
                <option value="Small island">Small island</option>
                <option value="Sea monster">Sea monster</option>
                <option value="Pirate ship">Pirate ship</option>
                <option value="Shipwreck">Shipwreck</option>
              </>
            )}
          </select>

          <select value={biome} onChange={(e) => setBiome(e.target.value)}>
            <option value="Temperate">Temperate</option>
            <option value="Tropical">Tropical</option>
            <option value="Desert">Desert</option>
            <option value="Tundra">Tundra</option>
            <option value="Savanna">Savanna</option>
            <option value="Taiga">Taiga</option>
          </select>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your tile description..."
          rows="4"
        />
        <div className="resolution-selector">
          <input
            type="radio"
            id="512px"
            value="512"
            checked={resolution === "512"}
            onChange={(e) => setResolution(e.target.value)}
          />
          <label htmlFor="512px">512px</label>
          
          <input
            type="radio"
            id="1024px"
            value="1024"
            checked={resolution === "1024"}
            onChange={(e) => setResolution(e.target.value)}
          />
          <label htmlFor="1024px">1024px</label>
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Tile'}
        </button>
      </form>

      {error && <p className="error-message">{error}</p>}
      {saveMessage && <p className="success-message">{saveMessage}</p>}
      {generatedImage && (
        <div className="generated-image-container">
          <img src={generatedImage} alt="Generated Tile" />
          <div className="image-actions">
            <select 
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
            >
              <option value="">Select a collection</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
            <button onClick={handleSaveToCollection} disabled={!selectedCollection}>
              Save to Collection
            </button>
            <button onClick={handleDiscard}>Discard</button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default TileGenerator;