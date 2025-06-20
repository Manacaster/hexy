// HEXY.PRO App - /app/src/pages/Tile.jsx - Page component for the Tile Editor.
 

/* eslint-disable no-unused-vars */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import ImageUploader from '../components/ImageUploader';
import ColorPalette from '../components/ColorPalette';
import HexagonPreview from '../components/HexagonPreview';
import ErrorFallback from '../components/ErrorFallback';
import CustomShapeEditor from '../components/CustomShapeEditor';
import { Upload, Save } from 'lucide-react';
import { say } from '../utils/debug';
import { analyzeImageColors, visualizeSamplingPoints } from '../utils/imageProcessing';
import { drawImageToHexagon, drawHexagonOverlay, drawHexagonOverlayWithoutOutline  } from '../utils/canvasUtils';
import CollectionManager from '../components/CollectionManager';
import { predefinedColors } from '../utils/colors';
import { getClosestPredefinedColor } from '../utils/colorUtils';
import { registerServiceWorker } from '../utils/serviceWorker';
import debounce from 'lodash/debounce';
import '../styles/Tile.css';

function Tile() {
  const [image, setImage] = useState(null);
  const [selectedColors, setSelectedColors] = useState(Array(6).fill(null));
  const [analyzedColors, setAnalyzedColors] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [imageDescription, setImageDescription] = useState('');
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const { session } = useAuth();
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [customShapePoints, setCustomShapePoints] = useState([]);
  const [transitionCanvas, setTransitionCanvas] = useState(null);

  const [globalParams, setGlobalParams] = useState({
    type: 'arc',
    rotation: '300',
    pointCount: 5,
    offsetStart: 0.14,
    offsetEnd: 0.06,
    thickness: 0.12,
    saturationBoost: 1.6,
    lightnessAdjust: 0.2
  });
  const [edgeConfigs, setEdgeConfigs] = useState(Array(6).fill({}));
  const [showSamplingPoints, setShowSamplingPoints] = useState(false);

  useEffect(() => {
    // registerServiceWorker();
    if (session) {
      fetchCollections();
    }
  }, [session]);

  const fetchCollections = async () => {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error fetching collections:', error);
      setError('Failed to fetch collections. Please try again.');
    } else {
      setCollections(data);
    }
  };

  const handleRotationChange = (newRotation) => {
    setRotation(newRotation);
    debouncedAnalyzeImage(image);
  };

  const analyzeImage = useCallback(async (imageData) => {
    if (!imageData) return;

    try {
      const colors = await analyzeImageColors(imageData, edgeConfigs, { ...globalParams, rotation, customShapePoints });
      setAnalyzedColors(colors);
      const closestColors = colors.map(color => getClosestPredefinedColor(color, predefinedColors));
      setSelectedColors(closestColors);
      setError(null);
      say('Image analyzed', { analyzedColors: colors, closestColors });

      if (showSamplingPoints && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        const { width, height } = canvasRef.current;
        visualizeSamplingPoints(ctx, width, height, edgeConfigs, { ...globalParams, rotation, customShapePoints });
      }
    } catch (err) {
      console.error('Error processing image:', err);
      setError('Error processing image. Please try again.');
      setAnalyzedColors([]);
      setSelectedColors(Array(6).fill(null));
      say('Error processing image', err);
    }
  }, [edgeConfigs, globalParams, showSamplingPoints, canvasRef, predefinedColors, rotation, customShapePoints]);

  const debouncedAnalyzeImage = useCallback(
    debounce((imageData) => {
      analyzeImage(imageData);
    }, 300),
    [analyzeImage]
  );

  useEffect(() => {
    if (image) {
      debouncedAnalyzeImage(image);
    }
  }, [image, debouncedAnalyzeImage, globalParams, edgeConfigs, rotation, customShapePoints]);

  const handleImageUpload = useCallback(async (uploadedImage) => {
    setImage(uploadedImage);
    await analyzeImage(uploadedImage);
    
    setImageDescription('This is a placeholder for the image description. In the future, this will be generated by an LLM API based on the uploaded image.');
  }, [analyzeImage]);

  const handleGlobalParamChange = (param, value) => {
    setGlobalParams(prev => ({ ...prev, [param]: value }));
  };

  const handleEdgeConfigChange = (index, param, value) => {
    setEdgeConfigs(prev => {
      const newConfigs = [...prev];
      newConfigs[index] = { ...newConfigs[index], [param]: value };
      return newConfigs;
    });
  };

  const handleColorSelect = useCallback((color, index) => {
    setSelectedColors(prev => {
      const newColors = [...prev];
      newColors[index] = color;
      return newColors;
    });
    say('Color selected', { color, index });
  }, []);

  const handleCustomShapeChange = (points) => {
    setCustomShapePoints(points);
    setGlobalParams(prev => ({ ...prev, type: 'custom' }));
    debouncedAnalyzeImage(image);
  };

  const createTransitionCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvasRef.current ? canvasRef.current.width : 400;
    canvas.height = canvasRef.current ? canvasRef.current.height : 400;
    return canvas;
  };

  useEffect(() => {
    setTransitionCanvas(createTransitionCanvas());
  }, []);

  useEffect(() => {
    if (image && transitionCanvas) {
      const transitionCtx = transitionCanvas.getContext('2d');
      const mainCtx = canvasRef.current.getContext('2d');
  
      const drawImage = async () => {
        try {
          await drawImageToHexagon(transitionCtx, image, transitionCanvas.width, transitionCanvas.height);
          drawHexagonOverlay(transitionCtx, transitionCanvas.width, transitionCanvas.height, selectedColors);
  
          let opacity = 0;
          const fadeIn = () => {
            opacity += 0.1;
            mainCtx.globalAlpha = opacity;
            mainCtx.drawImage(transitionCanvas, 0, 0);
            if (opacity < 1) {
              requestAnimationFrame(fadeIn);
            } else {
              mainCtx.globalAlpha = 1;
            }
          };
          fadeIn();
        } catch (error) {
          console.error('Error drawing image:', error);
          setError('Error drawing image. Please try again with a different image.');
        }
      };
  
      drawImage();
    }
  }, [image, selectedColors, transitionCanvas]);

  const getModifiedImageBlob = (rotate = false) => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      if (canvas) {
        if (rotate) {
          const rotatedCanvas = rotateCanvas(canvas, 90);
          rotatedCanvas.toBlob(resolve, 'image/png');
        } else {
          canvas.toBlob(resolve, 'image/png');
        }
      } else {
        reject(new Error('Canvas not found'));
      }
    });
  };
  const rotateCanvas = (canvas, degrees) => {
    const rotatedCanvas = document.createElement('canvas');
    const ctx = rotatedCanvas.getContext('2d');
    
    if (degrees === 90 || degrees === -90) {
      rotatedCanvas.width = canvas.height;
      rotatedCanvas.height = canvas.width;
    } else {
      rotatedCanvas.width = canvas.width;
      rotatedCanvas.height = canvas.height;
    }
  
    ctx.save();
    ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    ctx.restore();
  
    return rotatedCanvas;
  };
  const exportAsPNG = async () => {
    try {
      const blob = await getModifiedImageBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'hexagon_tile.png';
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Error exporting image. Please try again.');
      say('Error exporting image', err);
    }
  };

  
  const saveToCollection = async () => {
    if (!selectedCollection || !image) {
      setError('Please select a collection and upload an image first.');
      return;
    }

    try {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      const originalCanvas = canvasRef.current;
      
      // Keep the canvas size the same as the original
      tempCanvas.width = originalCanvas.height; // Swap width and height for rotation
      tempCanvas.height = originalCanvas.width;
      
      // Set up the context for drawing
      tempCtx.save();
      tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
      tempCtx.rotate(Math.PI / 2); // Rotate 90 degrees
      tempCtx.translate(-originalCanvas.width / 2, -originalCanvas.height / 2);
      
      // Draw the image
      await drawImageToHexagon(tempCtx, image, originalCanvas.width, originalCanvas.height);
      
      // Draw the hexagon overlay
      drawHexagonOverlay(tempCtx, originalCanvas.width, originalCanvas.height, selectedColors);
      
      tempCtx.restore();

      // Crop the image
      const cropAmount = 13;
      const croppedCanvas = document.createElement('canvas');
      const croppedCtx = croppedCanvas.getContext('2d');
      croppedCanvas.width = tempCanvas.width - 2 * cropAmount;
      croppedCanvas.height = tempCanvas.height - 2 * cropAmount;
      
      croppedCtx.drawImage(
        tempCanvas,
        cropAmount, cropAmount, croppedCanvas.width, croppedCanvas.height,
        0, 0, croppedCanvas.width, croppedCanvas.height
      );

      // Convert the cropped canvas to a blob
      const blob = await new Promise(resolve => croppedCanvas.toBlob(resolve, 'image/png'));

      const filePath = `${session.user.id}/${selectedCollection}/${new Date().getTime()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('tile-images')
        .upload(filePath, blob);

      if (uploadError) {
        throw uploadError;
      }

      const { error: metadataError } = await supabase
        .from('tile_metadata')
        .insert({
          user_id: session.user.id,
          collection_id: selectedCollection,
          file_path: filePath,
          edge_colors: selectedColors.map(color => color.hex),
          description: imageDescription
        });

      if (metadataError) {
        throw metadataError;
      }

      setSuccess('Image saved to collection successfully');
      setError(null);
      say('Image saved to collection successfully');
    } catch (err) {
      setError('Error saving image to collection. Please try again.');
      say('Error saving image to collection', err);
    }
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => setError(null)}>
      <div className="hexagon-tile-editor">
        <div className="editor-section">
          <h2>Tile Editor</h2>
          <ImageUploader onImageUpload={handleImageUpload} />
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
        </div>

        <div className="editor-section">
          <h2>Color Analysis Settings</h2>
          <div className="color-analysis-controls">
            <div className="global-params">
              <div className="param-group">
                <label>
                  Sampling Type:
                  <select 
                    value={globalParams.type} 
                    onChange={(e) => handleGlobalParamChange('type', e.target.value)}
                  >
                    <option value="arc">Arc</option>
                    <option value="line">Line</option>
                    <option value="custom">Custom Hexagon</option>
                  </select>
                </label>
                <label>
                  Rotation:
                  <select 
                    value={globalParams.rotation}
                    onChange={(e) => handleRotationChange(parseInt(e.target.value))}
                  >
                    {[300, 240, 180, 120, 60,0].map(deg => (
                      <option key={deg} value={deg}>{deg}°</option>
                    ))}
                  </select>
                </label>
                <label>
                  Point Count:
                  <input 
                    type="number" 
                    value={globalParams.pointCount}
                    onChange={(e) => handleGlobalParamChange('pointCount', parseInt(e.target.value))}
                    min="5"
                    max="100"
                  />
                </label>
                <label>
                  Start Offset:
                  <input 
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    value={globalParams.offsetStart}
                    onChange={(e) => handleGlobalParamChange('offsetStart', parseFloat(e.target.value))}
                  />
                </label>
                <label>
                  End Offset:
                  <input 
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    value={globalParams.offsetEnd}
                    onChange={(e) => handleGlobalParamChange('offsetEnd', parseFloat(e.target.value))}
                  />
                </label>
                <label>
                  Thickness:
                  <input 
                    type="range"
                    min="0.01"
                    max="0.2"
                    step="0.01"
                    value={globalParams.thickness}
                    onChange={(e) => handleGlobalParamChange('thickness', parseFloat(e.target.value))}
                  />
                </label>
                <label>
                  Saturation Boost:
                  <input 
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={globalParams.saturationBoost}
                    onChange={(e) => handleGlobalParamChange('saturationBoost', parseFloat(e.target.value))}
                  />
                </label>
                <label>
                  Lightness Adjust:
                  <input 
                    type="range"
                    min="-0.5"
                    max="0.5"
                    step="0.05"
                    value={globalParams.lightnessAdjust}
                    onChange={(e) => handleGlobalParamChange('lightnessAdjust', parseFloat(e.target.value))}
                  />
                </label>
              </div>
              {globalParams.type === 'custom' && (
                <div className="param-group">
                  <label>Custom Hexagon Shape:</label>
                  <CustomShapeEditor 
                    points={customShapePoints} 
                    onChange={handleCustomShapeChange} 
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="editor-section">
          <h2>Edge Configurations</h2>
          <div className="edge-configs">
            {edgeConfigs.map((config, index) => (
              <div key={index} className="edge-config">
                <h4>Edge {index + 1}</h4>
                <label>
                  <input 
                    type="checkbox"
                    checked={!!config.override}
                    onChange={(e) => handleEdgeConfigChange(index, 'override', e.target.checked)}
                  />
                  Override Global
                </label>
                {config.override && (
                  <>
                    <label>
                      Sampling Type:
                      <select 
                        value={config.type || globalParams.type} 
                        onChange={(e) => handleEdgeConfigChange(index, 'type', e.target.value)}
                      >
                        <option value="line">Line</option>
                        <option value="arc">Arc</option>
                        <option value="custom">Custom</option>
                      </select>
                    </label>
                    <label>
                      Point Count:
                      <input 
                        type="number" 
                        value={config.pointCount || globalParams.pointCount}
                        onChange={(e) => handleEdgeConfigChange(index, 'pointCount', parseInt(e.target.value))}
                        min="5"
                        max="100"
                      />
                    </label>
                    <label>
                      Start Offset:
                      <input 
                        type="range"
                        min="0"
                        max="0.5"
                        step="0.01"
                        value={config.offsetStart || globalParams.offsetStart}
                        onChange={(e) => handleEdgeConfigChange(index, 'offsetStart', parseFloat(e.target.value))}
                      />
                    </label>
                    <label>
                      End Offset:
                      <input 
                        type="range"
                        min="0"
                        max="0.5"
                        step="0.01"
                        value={config.offsetEnd || globalParams.offsetEnd}
                        onChange={(e) => handleEdgeConfigChange(index, 'offsetEnd', parseFloat(e.target.value))}
                      />
                    </label>
                    <label>
                      Thickness:
                      <input 
                        type="range"
                        min="0.01"
                        max="0.2"
                        step="0.01"
                        value={config.thickness || globalParams.thickness}
                        onChange={(e) => handleEdgeConfigChange(index, 'thickness', parseFloat(e.target.value))}
                      />
                    </label>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="editor-section">
          <h2>Color Palette</h2>
          <ColorPalette 
            onColorSelect={handleColorSelect} 
            analyzedColors={analyzedColors} 
            selectedColors={selectedColors}
            predefinedColors={predefinedColors}
          />
        </div>

        <div className="editor-section">
          <h2>Hexagon Preview<b style={{fontSize: "12px"}}> - Pending fixes</b></h2>
          
          <div className="hexagon-preview">
            <HexagonPreview 
              ref={canvasRef} 
              image={image} 
              selectedColors={selectedColors}
              showSamplingPoints={showSamplingPoints}
              samplingConfig={{ globalParams, edgeConfigs, rotation, customShapePoints }}
            />
          </div>
          <label>
            <input 
              type="checkbox" 
              checked={showSamplingPoints} 
              onChange={(e) => setShowSamplingPoints(e.target.checked)}
            />
            Show Sampling Points
          </label>
        </div>

        <div className="editor-section">
          <h2>Actions</h2>
          {session && (
            <div className="collection-actions">
              <select 
                value={selectedCollection} 
                onChange={(e) => setSelectedCollection(e.target.value)}
              >
                <option value="">Select a collection</option>
                {collections.map(collection => (
                  <option key={collection.id} value={collection.id}>{collection.name}</option>
                ))}
              </select>
              <button 
                onClick={saveToCollection} 
                disabled={!selectedCollection || !image}
                className="save-button"
              >
                <Save size={20} /> Save to Collection
              </button>
            </div>
          )}
          <button onClick={exportAsPNG} className="export-button">
            <Upload size={20} /> Export as PNG
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default Tile;