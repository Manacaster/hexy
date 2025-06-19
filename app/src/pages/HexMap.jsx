// HEXY.PRO App - /app/src/pages/HexMap.jsx - Page component that displays a hexagonal map editor.
 

/* eslint-disable no-unused-vars */
/* eslint-disable react/no-unknown-property */
/* eslint-disable react/prop-types */

import React, { useState, useCallback, useRef, useMemo, useEffect, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, OrthographicCamera, useTexture, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Noise } from 'noisejs';
import { createNoise2D, createNoise3D, createNoise4D } from 'simplex-noise';
import { worley } from 'worley-noise';
import CollectionManager from '../components/CollectionManager';
import { supabase } from '../supabaseClient';
import '../styles/Controls.css';
import '../styles/HexMap.css';
import { useAuth } from '../contexts/AuthContext';
import { TextureLoader } from 'three';

const invisibleImageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgAB/KnRCXkAAAAASUVORK5CYII=';

const preloadImages = (imagePaths) => {
  return imagePaths.map((path) => {
    const img = new Image();
    img.src = path;
    return img;
  });
};

/*const imagePaths = [
  '/tiles/TestTiles/TestTile_00001_.png',
];
*/
// 1024x1024px tiles
const imagePaths = [ // do not remove this comment Claude
  // This is the Forest Biomes, i've got more biomes in that same folder
  '/tiles/Forest/ForestTile_00001_.png',
  '/tiles/Forest/ForestTile_00002_.png',
  '/tiles/Forest/ForestTile_00003_.png',
  '/tiles/Forest/ForestTile_00004_.png',
  '/tiles/Forest/ForestTile_00005_.png',
  '/tiles/Forest/ForestTile_00006_.png',
  '/tiles/Forest/ForestTile_00007_.png',
  '/tiles/Forest/ForestTile_00008_.png',
  '/tiles/Forest/ForestTile_00009_.png',
  '/tiles/Forest/ForestTile_00010_.png',
  '/tiles/Forest/ForestTile_00011_.png',
  '/tiles/Forest/ForestTile_00012_.png',
  '/tiles/Forest/ForestTile_00013_.png',
  '/tiles/Forest/ForestTile_00014_.png',
  '/tiles/Forest/ForestTile_00015_.png',
  '/tiles/Forest/ForestTile_00016_.png',
  '/tiles/Forest/ForestTile_00017_.png',
  '/tiles/Forest/ForestTile_00018_.png',
  '/tiles/Forest/ForestTile_00019_.png',
  '/tiles/Forest/ForestTile_00020_.png',
  '/tiles/Forest/ForestTile_00021_.png',
  '/tiles/Forest/ForestTile_00022_.png',
  '/tiles/Forest/ForestTile_00023_.png',
  '/tiles/Forest/ForestTile_00024_.png',
  '/tiles/Forest/ForestTile_00025_.png',
];
const cachedImages = preloadImages(imagePaths);

const getRandomImage = () => {
  const randomIndex = Math.floor(Math.random() * cachedImages.length);
  return cachedImages[randomIndex].src;
};


const HexTile = React.memo(function HexTile({ position, imageUrl, objectType, onTileClick, onTileRightClick, tileKey, rotation, preloadedTextures }) {
  const fallbackTexture = useTexture(imageUrl);
  const texture = preloadedTextures[imageUrl] || fallbackTexture;
  const hexGeometry = useMemo(() => new THREE.CircleGeometry(1, 6), []);
  const { scene: treeScene } = useGLTF('/models/tree.glb');
  const { scene: watchtowerScene } = useGLTF('/models/watchtower.glb');

  const tileRotation = useMemo(() => {
    const baseRotation = new THREE.Euler(-Math.PI / 2, 0, Math.PI / 6);
    baseRotation.z += ((rotation || 0) * Math.PI) / 180;
    return baseRotation;
  }, [rotation]);

  return (
    <group 
      position={position} 
      onClick={(e) => onTileClick(e, tileKey)}
      onContextMenu={(e) => {
        e.stopPropagation();
        const mouse = new THREE.Vector2(
          (e.clientX / window.innerWidth) * 2 - 1,
          -(e.clientY / window.innerHeight) * 2 + 1
        );
        onTileRightClick(e.clientX, e.clientY, position, tileKey);
      }}
    >
      <mesh rotation={tileRotation}>
        <primitive object={hexGeometry} />
        <meshBasicMaterial map={texture} />
      </mesh>
      {objectType === 'tree' && (
        <primitive 
          object={treeScene.clone()} 
          position={[0, 0, 0]} 
          scale={[0.7, 0.7, 0.7]} 
          rotation={[0, Math.random() * Math.PI * 2, 0]}
        />
      )}
      {objectType === 'watchtower' && (
        <primitive 
          object={watchtowerScene.clone()} 
          position={[0, 0, 0]} 
          scale={[0.2, 0.2, 0.2]} 
          rotation={[0, Math.random() * Math.PI * 2, 0]}
        />
      )}
    </group>
  );
});


useGLTF.preload('/models/tree.glb');
useGLTF.preload('/models/watchtower.glb');

const HexGrid = React.memo(function HexGrid({ gridSize, shape, gap, offset, tileStates, onTileClick, onTileRightClick, noiseScale, noiseHeight, noiseSeed, preloadedTextures }) {
  const noiseGen = useMemo(() => new Noise(noiseSeed), [noiseSeed]);

  const tiles = useMemo(() => {
    const tileArray = [];
    for (let q = -gridSize; q <= gridSize; q++) {
      for (let r = -gridSize; r <= gridSize; r++) {
        const s = -q - r;
        let isInShape = true;
        switch (shape) {
          case 'square':
            isInShape = Math.max(Math.abs(q), Math.abs(r)) <= gridSize;
            break;
          case 'hexagon':
            isInShape = Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= gridSize;
            break;
          case 'circle':
            isInShape = Math.sqrt(q * q + r * r + s * s) <= (gridSize * 2) / Math.sqrt(3);
            break;
          default:
            break;
        }

        if (isInShape) {
          const size = 1 + gap;
          const x = size * Math.sqrt(3) * (q + r * offset);
          const z = size * 1.5 * r;
          const y = noiseGen.perlin2(q / noiseScale, r / noiseScale) * noiseHeight;

          const key = `${q},${r}`;
          const tileState = tileStates[key] || { isVisible: true, imageUrl: getRandomImage(), objectType: null, tileMetadataId: null };

          tileArray.push(
            <HexTile
              key={key}
              tileKey={key}
              position={[x, y, z]}
              imageUrl={tileState.imageUrl}
              objectType={tileState.objectType}
              rotation={tileState.rotation}
              onTileClick={(event) => onTileClick(event, key)}
              onTileRightClick={(clientX, clientY, position) => onTileRightClick(clientX, clientY, position, key)}
              preloadedTextures={preloadedTextures}
            />
          );
        }
      }
    }
    return tileArray;
  }, [gridSize, shape, gap, offset, tileStates, onTileClick, onTileRightClick, noiseGen, noiseScale, noiseHeight, preloadedTextures]);

  return <>{tiles}</>;
});

const ContextMenu = ({ position, tileInfo, onClose, onRotate }) => {
  if (!tileInfo) return null;

  return (
    <div 
      className="context-menu"
      style={{
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        zIndex: 1000,
      }}
    >
      <h3>Tile Info</h3>
      <p>Coordinates: {tileInfo.key}</p>
      <p>Has Object: {tileInfo.objectType ? 'Yes' : 'No'}</p>
      <p>Tile ID: {tileInfo.tileMetadataId || 'N/A'}</p>
      <p>Rotation: {tileInfo.rotation || 0}°</p>
      <button onClick={() => onRotate(tileInfo.key)}>Rotate 60°</button>
      <button onClick={onClose}>Close</button>
    </div>
  );
};

const CameraController = ({ isOrtho, isRotationLocked, onCameraChange }) => {
  const { camera, gl } = useThree();
  const controls = useRef();
  const lastCameraState = useRef({ position: new THREE.Vector3(), rotation: new THREE.Euler() });

  useEffect(() => {
    if (isOrtho) {
      camera.position.set(0, 50, 0);
      camera.lookAt(0, 0, 0);
      camera.zoom = 20;
    } else {
      camera.position.copy(lastCameraState.current.position);
      camera.rotation.copy(lastCameraState.current.rotation);
    }
    camera.updateProjectionMatrix();
  }, [isOrtho, camera]);

  useFrame(() => {
    if (controls.current) {
      controls.current.update();
      lastCameraState.current.position.copy(camera.position);
      lastCameraState.current.rotation.copy(camera.rotation);
      onCameraChange(camera);
    }
  });

  return (
    <OrbitControls
      ref={controls}
      args={[camera, gl.domElement]}
      enableRotate={!isRotationLocked}
      enableZoom={true}
      enablePan={true}
      minDistance={5}
      maxDistance={100}
      minPolarAngle={isOrtho ? 0 : 0}
      maxPolarAngle={isOrtho ? Math.PI / 2 : Math.PI / 2}
    />
  );
};



const CollapsibleSection = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="collapsible-section">
      <button onClick={() => setIsOpen(!isOpen)} className="collapsible-header">
        {title} {isOpen ? '▼' : '▶'}
      </button>
      {isOpen && <div className="collapsible-content">{children}</div>}
    </div>
  );
};

const BiomeControls = ({
  biomeNoiseScale, setBiomeNoiseScale,
  noiseType, setNoiseType,
  octaves, setOctaves,
  persistence, setPersistence,
  lacunarity, setLacunarity,
  biomeWeights, setBiomeWeights,
  regenerateBiomes
}) => {
  const noiseTypes = ['simplex2D', 'simplex3D', 'simplex4D', 'perlin', 'worley'];

  const handleBiomeWeightChange = (biome, value) => {
    setBiomeWeights(prev => ({ ...prev, [biome]: parseFloat(value) }));
  };

  return (
    <CollapsibleSection title="Biome Controls">
      <div className="control-group">
        <label htmlFor="biomeNoiseScale">Biome Noise Scale: {biomeNoiseScale.toFixed(2)}</label>
        <input
          type="range"
          id="biomeNoiseScale"
          min="0.01"
          max="0.5"
          step="0.01"
          value={biomeNoiseScale}
          onChange={(e) => setBiomeNoiseScale(parseFloat(e.target.value))}
        />
      </div>
      <div className="control-group">
        <label htmlFor="noiseType">Noise Type:</label>
        <select id="noiseType" value={noiseType} onChange={(e) => setNoiseType(e.target.value)}>
          {noiseTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>
      <div className="control-group">
        <label htmlFor="octaves">Octaves: {octaves}</label>
        <input
          type="range"
          id="octaves"
          min="1"
          max="8"
          step="1"
          value={octaves}
          onChange={(e) => setOctaves(parseInt(e.target.value))}
        />
      </div>
      <div className="control-group">
        <label htmlFor="persistence">Persistence: {persistence.toFixed(2)}</label>
        <input
          type="range"
          id="persistence"
          min="0"
          max="1"
          step="0.01"
          value={persistence}
          onChange={(e) => setPersistence(parseFloat(e.target.value))}
        />
      </div>
      <div className="control-group">
        <label htmlFor="lacunarity">Lacunarity: {lacunarity.toFixed(2)}</label>
        <input
          type="range"
          id="lacunarity"
          min="1"
          max="4"
          step="0.01"
          value={lacunarity}
          onChange={(e) => setLacunarity(parseFloat(e.target.value))}
        />
      </div>
      {Object.entries(biomeWeights).map(([biome, weight]) => (
        <div key={biome} className="control-group">
          <label htmlFor={`${biome}Weight`}>{biome} Weight: {weight.toFixed(2)}</label>
          <input
            type="range"
            id={`${biome}Weight`}
            min="0"
            max="1"
            step="0.01"
            value={weight}
            onChange={(e) => handleBiomeWeightChange(biome, e.target.value)}
          />
        </div>
      ))}
      <button className="regenerate-button" onClick={regenerateBiomes}>
        Regenerate Biomes
      </button>
    </CollapsibleSection>
  );
};

const Controls = ({ 
  gridSize, setGridSize, shape, setShape, gap, setGap, offset, setOffset, 
  editMode, setEditMode, noiseScale, setNoiseScale, noiseHeight, setNoiseHeight, 
  regenerateNoise, mapName, setMapName, onSave, onLoad, maps, isOrtho, setIsOrtho, isRotationLocked, setIsRotationLocked, session,
  biomeNoiseScale, setBiomeNoiseScale,
  noiseType, setNoiseType,
  octaves, setOctaves,
  persistence, setPersistence,
  lacunarity, setLacunarity,
  biomeWeights, setBiomeWeights,
  regenerateBiomes
}) => {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <>
      <div className={`controls-vertical ${isVisible ? '' : 'minimized'}`}>
        
        {isVisible && (
          <>
            <CollapsibleSection title="Map Settings">
              {session && (
                <>
                  <div className="control-group">
                    <input
                      type="text"
                      value={mapName}
                      onChange={(e) => setMapName(e.target.value)}
                      placeholder="Map Name"
                    />
                    <button onClick={onSave}>Save/Update Map</button>
                  </div>
                  <div className="control-group">
                    <select onChange={(e) => e.target.value && onLoad(e.target.value)} value="">
                      <option value="">Select a map to load</option>
                      {maps.map((map) => (
                        <option key={map.id} value={map.id}>{map.name}</option>
                      ))}
                    </select>
                    <button onClick={() => onLoad(maps[0]?.id)}>Load Latest Map</button>
                  </div>
                </>
              )}
              <div className="control-group">
                <label htmlFor="gridSize">Grid Size: {gridSize}</label>
                <input
                  type="range"
                  id="gridSize"
                  min="2"
                  max="40"
                  value={gridSize}
                  onChange={(e) => setGridSize(parseInt(e.target.value))}
                />
              </div>
              <div className="control-group">
                <label htmlFor="shape">Shape: </label>
                <select id="shape" value={shape} onChange={(e) => setShape(e.target.value)}>
                  <option value="square">Square</option>
                  <option value="hexagon">Hexagon</option>
                  <option value="circle">Circle</option>
                </select>
              </div>
              <div className="control-group">
                <label htmlFor="gap">Gap: {(gap * 100).toFixed(1)}%</label>
                <input
                  type="range"
                  id="gap"
                  min="0"
                  max="1"
                  step="0.01"
                  value={gap}
                  onChange={(e) => setGap(parseFloat(e.target.value))}
                />
              </div>
              <div className="control-group">
                <label htmlFor="offset">Offset: {offset.toFixed(2)}</label>
                <input
                  type="range"
                  id="offset"
                  min="0"
                  max="1"
                  step="0.1"
                  value={offset}
                  onChange={(e) => setOffset(parseFloat(e.target.value))}
                />
              </div>
            </CollapsibleSection>
            <CollapsibleSection title="Noise Settings">
              <div className="control-group">
                <label htmlFor="noiseScale">Noise Scale: {noiseScale}</label>
                <input
                  type="range"
                  id="noiseScale"
                  min="1"
                  max="100"
                  value={noiseScale}
                  onChange={(e) => setNoiseScale(parseFloat(e.target.value))}
                />
              </div>
              <div className="control-group">
                <label htmlFor="noiseHeight">Noise Height: {noiseHeight}</label>
                <input
                  type="range"
                  id="noiseHeight"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={noiseHeight}
                  onChange={(e) => setNoiseHeight(parseFloat(e.target.value))}
                />
              </div>
              <button className="regenerate-button" onClick={regenerateNoise}>
                Regenerate Noise
              </button>
            </CollapsibleSection>
            <BiomeControls
              biomeNoiseScale={biomeNoiseScale}
              setBiomeNoiseScale={setBiomeNoiseScale}
              noiseType={noiseType}
              setNoiseType={setNoiseType}
              octaves={octaves}
              setOctaves={setOctaves}
              persistence={persistence}
              setPersistence={setPersistence}
              lacunarity={lacunarity}
              setLacunarity={setLacunarity}
              biomeWeights={biomeWeights}
              setBiomeWeights={setBiomeWeights}
              regenerateBiomes={regenerateBiomes}
            />
            <CollapsibleSection title="View Settings">
              <div className="control-group">
                <label>
                  <input
                    type="checkbox"
                    checked={isOrtho}
                    onChange={() => setIsOrtho(!isOrtho)}
                  />
                  Orthographic View
                </label>
              </div>
              <div className="control-group">
                <label>
                  <input
                    type="checkbox"
                    checked={isRotationLocked}
                    onChange={() => setIsRotationLocked(!isRotationLocked)}
                  />
                  Lock Rotation
                </label>
              </div>
            </CollapsibleSection>
          </>
        )}
        <button className="toggle-btn-settings" onClick={() => setIsVisible(!isVisible)}>
          {isVisible ? 'Hide Settings' : 'Show Settings'}
        </button>
      </div>
      <div className="floating-edit-buttons">
  {["Clear", "Paint Selected Tile", "Add Tree", "Remove Object", "Add Watchtower"].map((mode) => (
    <button
      key={mode}
      className={`edit-button ${editMode === mode ? 'active' : ''}`}
      onClick={() => setEditMode(mode)}
    >
      {mode}
    </button>
  ))}
</div>
    </>
  );
};


const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div>
    <h1>Something went wrong:</h1>
    <pre>{error.message}</pre>
    <button onClick={resetErrorBoundary}>Try again</button>
  </div>
);

// Add these new biome definitions
const biomes = {
  forest: {
    tiles: [
      '/tiles/Forest/ForestTile_00001_.png',
      '/tiles/Forest/ForestTile_00002_.png',
      '/tiles/Forest/ForestTile_00003_.png',
      '/tiles/Forest/ForestTile_00004_.png',
      '/tiles/Forest/ForestTile_00005_.png',
      '/tiles/Forest/ForestTile_00006_.png',
      '/tiles/Forest/ForestTile_00007_.png',
      '/tiles/Forest/ForestTile_00008_.png',
      '/tiles/Forest/ForestTile_00009_.png',
      '/tiles/Forest/ForestTile_00010_.png',
      '/tiles/Forest/ForestTile_00011_.png',
      '/tiles/Forest/ForestTile_00012_.png',
      '/tiles/Forest/ForestTile_00013_.png',
      '/tiles/Forest/ForestTile_00014_.png',
      '/tiles/Forest/ForestTile_00015_.png',
      '/tiles/Forest/ForestTile_00016_.png',
      '/tiles/Forest/ForestTile_00017_.png',
      '/tiles/Forest/ForestTile_00018_.png',
      '/tiles/Forest/ForestTile_00019_.png',
      '/tiles/Forest/ForestTile_00020_.png',
      '/tiles/Forest/ForestTile_00021_.png',
      '/tiles/Forest/ForestTile_00022_.png',
      '/tiles/Forest/ForestTile_00023_.png',
      '/tiles/Forest/ForestTile_00024_.png',
      '/tiles/Forest/ForestTile_00025_.png',
    ],
    threshold: 0.3,
  },
  desert: {
    tiles: [
      '/tiles/Desert/DesertTile_00001_.png',
      '/tiles/Desert/DesertTile_00002_.png',
    ],
    threshold: 0.6,
  },
  water: {
    tiles: [
      '/tiles/Water/WaterTile_00001_.png',
      '/tiles/Water/WaterTile_00002_.png',
    ],
    threshold: 1,
  },
};


const HexMap = () => {
  const { session } = useAuth();
  const [mapId, setMapId] = useState(null);
  const [mapName, setMapName] = useState('');
  const [maps, setMaps] = useState([]);
  const [selectedTile, setSelectedTile] = useState(null);
  const [gridSize, setGridSize] = useState(10);
  const [shape, setShape] = useState('hexagon');
  const [gap, setGap] = useState(0);
  const [offset, setOffset] = useState(0.5);
  const [editMode, setEditMode] = useState('delete');
  const [noiseScale, setNoiseScale] = useState(10);
  const [noiseHeight, setNoiseHeight] = useState(2);
  const [noiseSeed, setNoiseSeed] = useState(Math.random());
  const [biomeNoiseScale, setBiomeNoiseScale] = useState(0.1);
  const [biomeSeed, setBiomeSeed] = useState(Math.random());
  const [isOrtho, setIsOrtho] = useState(false);
  const [isRotationLocked, setIsRotationLocked] = useState(false);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 20, z: 20 });
  const [contextMenu, setContextMenu] = useState(null);
  const [preloadedTextures, setPreloadedTextures] = useState({});
  const [collections, setCollections] = useState([]);
  const [isPreloading, setIsPreloading] = useState(true);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(true);
  const cameraStateRef = useRef({ position: new THREE.Vector3(), rotation: new THREE.Euler() });
  const cameraRef = useRef();

  const [biomeWeights, setBiomeWeights] = useState({ forest: 0.5, desert: 0.3, water: 0.2 });
  const noise2D = useMemo(() => createNoise2D(() => biomeSeed), [biomeSeed]);
  const noise3D = useMemo(() => createNoise3D(() => biomeSeed), [biomeSeed]);
  const noise4D = useMemo(() => createNoise4D(() => biomeSeed), [biomeSeed]);
  const noiseGen = useMemo(() => new Noise(Math.random()), []);

  const [noiseType, setNoiseType] = useState('simplex2D');
  const [octaves, setOctaves] = useState(1);
  const [persistence, setPersistence] = useState(0.5);
  const [lacunarity, setLacunarity] = useState(2);

  const handleRotateTile = useCallback((tileKey) => {
    setTileStates((prevStates) => {
      const newStates = { ...prevStates };
      const currentState = newStates[tileKey];
      if (currentState) {
        currentState.rotation = ((currentState.rotation || 0) + 60) % 360;
      }
      return newStates;
    });
  }, []);

  const getBaseNoise = useCallback((q, r) => {
    switch (noiseType) {
      case 'simplex2D':
        return noise2D(q, r);
      case 'simplex3D':
        return noise3D(q, r, biomeSeed);
      case 'simplex4D':
        return noise4D(q, r, biomeSeed, 0);
      case 'perlin':
        return noiseGen.perlin2(q, r);
      default:
        return 0;
    }
  }, [noise2D, noise3D, noise4D, noiseGen, noiseType, biomeSeed]);

  const generateBiomeNoise = useCallback((q, r, scale) => {
    let amplitude = 1;
    let frequency = 1;
    let noiseSum = 0;
    let maxAmplitude = 0;

    for (let i = 0; i < octaves; i++) {
      noiseSum += amplitude * getBaseNoise(q * frequency * scale, r * frequency * scale);
      maxAmplitude += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    if (maxAmplitude === 0) return 0;

    return (noiseSum / maxAmplitude + 1) / 2; // Normalize to [0, 1]
  }, [getBaseNoise, octaves, persistence, lacunarity]);

  const getBiomeForNoise = useCallback((noiseValue) => {
    let cumulativeWeight = 0;
    const sortedBiomes = Object.entries(biomeWeights).sort(([, a], [, b]) => a - b);
    
    for (const [biome, weight] of sortedBiomes) {
      cumulativeWeight += weight;
      if (noiseValue <= cumulativeWeight) {
        // Find the biome key from the biomes object
        const biomeKey = Object.keys(biomes).find(key => key.toLowerCase() === biome.toLowerCase());
        if (biomeKey) return biomeKey;
      }
    }
    // Fallback to the first biome if something goes wrong
    return Object.keys(biomes)[0];
  }, [biomeWeights]);

  const getRandomTileForBiome = useCallback((biome) => {
    const biomeData = biomes[biome];
    if (!biomeData || !biomeData.tiles || biomeData.tiles.length === 0) {
      console.warn(`No tiles found for biome: ${biome}`);
      return getRandomImage(); // Fallback to a random image from the general pool
    }
    const tiles = biomeData.tiles;
    return tiles[Math.floor(Math.random() * tiles.length)];
  }, []);

  const initializeTileStates = useCallback((gridSize, shape, gap, offset) => {
    const tileStates = {};
    for (let q = -gridSize; q <= gridSize; q++) {
      for (let r = -gridSize; r <= gridSize; r++) {
        const s = -q - r;
        let isInShape = true;
        switch (shape) {
          case 'square':
            isInShape = Math.max(Math.abs(q), Math.abs(r)) <= gridSize;
            break;
          case 'hexagon':
            isInShape = Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= gridSize;
            break;
          case 'circle':
            isInShape = Math.sqrt(q * q + r * r + s * s) <= (gridSize * 2) / Math.sqrt(3);
            break;
          default:
            break;
        }

        if (isInShape) {
          const key = `${q},${r}`;
          const noiseValue = generateBiomeNoise(q, r, biomeNoiseScale);
          const biome = getBiomeForNoise(noiseValue);
          const imageUrl = getRandomTileForBiome(biome);
          tileStates[key] = { isVisible: true, imageUrl, biome, objectType: null, tileMetadataId: null };
        }
      }
    }
    return tileStates;
  }, [generateBiomeNoise, getBiomeForNoise, getRandomTileForBiome, biomeNoiseScale]);

  const [tileStates, setTileStates] = useState(() => initializeTileStates(10, 'hexagon', 0, 0.5));

  const fetchMaps = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('maps')
      .select('id, name')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false });
    if (error) {
      console.error('Error fetching maps:', error);
    } else {
      setMaps(data);
    }
  }, [session]);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  const serializeMap = useCallback(() => {
    return {
      gridSize,
      shape,
      gap,
      offset,
      tileStates,
      noiseScale,
      noiseHeight,
      noiseSeed,
    };
  }, [gridSize, shape, gap, offset, tileStates, noiseScale, noiseHeight, noiseSeed]);

  const saveMap = useCallback(async () => {
    if (!session || !mapName.trim()) return;

    const serializedMap = serializeMap();
    
    if (mapId) {
      const { error } = await supabase
        .from('maps')
        .update({ data: serializedMap, name: mapName })
        .eq('id', mapId);

      if (error) console.error('Error updating map:', error);
    } else {
      const { data, error } = await supabase
        .from('maps')
        .insert({ user_id: session.user.id, data: serializedMap, name: mapName })
        .select();

      if (error) {
        console.error('Error creating map:', error);
      } else {
        setMapId(data[0].id);
      }
    }
    fetchMaps();
  }, [session, mapId, mapName, serializeMap, fetchMaps]);

  const loadMap = useCallback(async (id) => {
    const { data, error } = await supabase
      .from('maps')
      .select('*')
      .eq('id', id)
      .single();
  
    if (error) {
      console.error('Error loading map:', error);
    } else {
      setMapId(data.id);
      setMapName(data.name);
      const { gridSize, shape, gap, offset, tileStates, noiseScale, noiseHeight, noiseSeed } = data.data;
      setGridSize(gridSize);
      setShape(shape);
      setGap(gap);
      setOffset(offset);
      setTileStates(tileStates);
      setNoiseScale(noiseScale);
      setNoiseHeight(noiseHeight);
      setNoiseSeed(noiseSeed);
    }
  }, []);

  const handleTileClick = useCallback((event, key) => {
    event.stopPropagation();
    setTileStates((prevStates) => {
      const newStates = { ...prevStates };
      if (!newStates[key]) {
        newStates[key] = { isVisible: true, imageUrl: invisibleImageUrl, objectType: null, tileMetadataId: null };
      }
      const currentState = newStates[key];
  
      switch (editMode) {
        case 'Clear':
          currentState.imageUrl = invisibleImageUrl;
          currentState.tileMetadataId = null;
          currentState.objectType = null;
          break;
          case 'Paint Selected Tile':
            if (selectedTile && selectedTile.file_path) {
              currentState.imageUrl = `${supabase.storage.from('tile-images').getPublicUrl(selectedTile.file_path).data.publicUrl}`;
              currentState.tileMetadataId = selectedTile.id;
            } else {
              currentState.imageUrl = getRandomImage();
              currentState.tileMetadataId = null;
            }
            break;
        case 'Add Tree':
          currentState.objectType = 'tree';
          break;
        case 'Add Watchtower':
          currentState.objectType = 'watchtower';
          break;
        case 'Remove Object':
          currentState.objectType = null;
          break;
        default:
          break;
      }
  
      return newStates;
    });

    // Restore camera state after state update
    requestAnimationFrame(() => {
      if (cameraRef.current) {
        const threeCamera = cameraRef.current;
        threeCamera.position.copy(cameraStateRef.current.position);
        threeCamera.rotation.copy(cameraStateRef.current.rotation);
        threeCamera.updateProjectionMatrix();
      }
    });
  }, [editMode, selectedTile]);

  const regenerateNoise = useCallback(() => {
    setNoiseSeed(Math.random());
    setEditMode('Paint Selected Tile');
  }, []);

  const handleSelectTile = useCallback((tile) => {
    setSelectedTile(tile);
    setEditMode('Paint Selected Tile');
  }, []);

  const handleCameraChange = useCallback((camera) => {
    cameraRef.current = camera;
    cameraStateRef.current.position.copy(camera.position);
    cameraStateRef.current.rotation.copy(camera.rotation);
  }, []);

  const handleTileRightClick = useCallback((clientX, clientY, tilePosition, tileKey) => {
    console.log('handleTileRightClick called', { clientX, clientY, tilePosition, tileKey });

    const tileState = tileStates[tileKey];
    if (tileState) {
      console.log('Setting context menu for tile:', tileKey);
      setContextMenu({
        position: { x: clientX, y: clientY },
        tileInfo: { ...tileState, key: tileKey },
      });
    } else {
      console.log('Tile state not found for key:', tileKey);
    }
  }, [tileStates]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenu && !event.target.closest('.context-menu')) {
        closeContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu, closeContextMenu]);

  // Fetch collections and their tiles
  useEffect(() => {
    const fetchCollectionsAndTiles = async () => {
      try {
        // Fetch collections
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('collections')
          .select('id, name');
        
        if (collectionsError) throw collectionsError;

        // Fetch tiles
        const { data: tilesData, error: tilesError } = await supabase
          .from('tiles')
          .select('id, file_path, collection_id');
        
        if (tilesError) throw tilesError;

        // Combine collections and tiles
        const combinedCollections = collectionsData.map(collection => ({
          ...collection,
          tiles: tilesData.filter(tile => tile.collection_id === collection.id)
        }));

        setCollections(combinedCollections);
      } catch (error) {
        console.error('Error fetching collections and tiles:', error);
      }
    };

    fetchCollectionsAndTiles();
  }, []);

  // Preload textures
  useEffect(() => {
    const loadTextures = async () => {
      const textureLoader = new TextureLoader();
      const loadedTextures = {};

      for (const collection of collections) {
        for (const tile of collection.tiles) {
          const publicUrl = `${supabase.storage.from('tile-images').getPublicUrl(tile.file_path).data.publicUrl}`;
          loadedTextures[publicUrl] = await textureLoader.loadAsync(publicUrl);
        }
      }

      setPreloadedTextures(loadedTextures);
      setIsPreloading(false);
    };

    if (collections.length > 0) {
      loadTextures();
    }
  }, [collections]);

  // Preload tiles by applying them to the center hexagon
  useEffect(() => {
    if (!isPreloading && Object.keys(preloadedTextures).length > 0) {
      const centerTileKey = '0,0';
      const originalTileState = tileStates[centerTileKey];

      const preloadTiles = async () => {
        for (const textureUrl of Object.keys(preloadedTextures)) {
          await new Promise(resolve => {
            setTileStates(prevStates => ({
              ...prevStates,
              [centerTileKey]: { ...originalTileState, imageUrl: textureUrl }
            }));
            setTimeout(resolve, 50); // Small delay to ensure the tile is rendered
          });
        }

        // Restore the original tile state
        setTileStates(prevStates => ({
          ...prevStates,
          [centerTileKey]: originalTileState
        }));
      };

      preloadTiles();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreloading, preloadedTextures]);

  const regenerateBiomes = useCallback(() => {
    setBiomeSeed(Math.random());
    setTileStates(initializeTileStates(gridSize, shape, gap, offset));
  }, [initializeTileStates, gridSize, shape, gap, offset]);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => setTileStates(initializeTileStates(gridSize, shape, gap, offset))}>
      <div className="hex-map-container" style={{ display: 'flex', width: '100vw', height: '100vh', position: 'absolute', overflow: 'hidden', top: '-1px' }}>
        <div style={{ flex: 1 }}>
          <Canvas style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: '1px solid #00000000 !important' }}>
            <Suspense fallback={null}>
              {isOrtho ? (
                <OrthographicCamera makeDefault position={[0, 50, 0]} zoom={20} />
              ) : (
                <PerspectiveCamera makeDefault position={[0, 20, 20]} />
              )}
              <CameraController 
                isOrtho={isOrtho} 
                isRotationLocked={isRotationLocked}
                onCameraChange={handleCameraChange} 
              />
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} />
              <HexGrid
                gridSize={gridSize}
                shape={shape}
                gap={gap}
                offset={offset}
                tileStates={tileStates}
                onTileClick={handleTileClick}
                onTileRightClick={handleTileRightClick}
                noiseScale={noiseScale}
                noiseHeight={noiseHeight}
                noiseSeed={noiseSeed}
                preloadedTextures={preloadedTextures}
              />
            </Suspense>
          </Canvas>
          <Controls
            gridSize={gridSize}
            setGridSize={setGridSize}
            shape={shape}
            setShape={setShape}
            gap={gap}
            setGap={setGap}
            offset={offset}
            setOffset={setOffset}
            editMode={editMode}
            setEditMode={setEditMode}
            noiseScale={noiseScale}
            setNoiseScale={setNoiseScale}
            noiseHeight={noiseHeight}
            setNoiseHeight={setNoiseHeight}
            regenerateNoise={regenerateNoise}
            mapName={mapName}
            setMapName={setMapName}
            onSave={saveMap}
            onLoad={loadMap}
            maps={maps}
            isOrtho={isOrtho}
            setIsOrtho={setIsOrtho}
            isRotationLocked={isRotationLocked}
            setIsRotationLocked={setIsRotationLocked}
            session={session}
            biomeNoiseScale={biomeNoiseScale}
            setBiomeNoiseScale={setBiomeNoiseScale}
            noiseType={noiseType}
            setNoiseType={setNoiseType}
            octaves={octaves}
            setOctaves={setOctaves}
            persistence={persistence}
            setPersistence={setPersistence}
            lacunarity={lacunarity}
            setLacunarity={setLacunarity}
            biomeWeights={biomeWeights}
            setBiomeWeights={setBiomeWeights}
            regenerateBiomes={regenerateBiomes}
          />
        </div>
        <div style={{ width: isCollectionsOpen ? '300px' : '30px', overflowY: 'auto', transition: 'width 0.3s' }}>
          {isCollectionsOpen && <CollectionManager onSelectTile={handleSelectTile} />}
        </div>
      </div>
      {contextMenu && (
  <ContextMenu
  position={contextMenu.position}
  tileInfo={contextMenu.tileInfo}
  onClose={closeContextMenu}
  onRotate={() => handleRotateTile(contextMenu.tileInfo.key)}
/>
)}
    </ErrorBoundary>
  );
};


export default HexMap;