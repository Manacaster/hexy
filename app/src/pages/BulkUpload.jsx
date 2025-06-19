// HEXY.PRO App - /app/src/pages/BulkUpload.jsx - Component used to upload and process multiple images.
 

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { Upload } from 'lucide-react';
import '../styles/BulkUpload.css';
import { analyzeImageColors } from '../utils/imageProcessing';
import { getClosestPredefinedColor } from '../utils/colorUtils';
import { predefinedColors } from '../utils/colors';
import { drawImageToHexagon, drawHexagonOverlay } from '../utils/canvasUtils';

const BulkUpload = () => {
  const { session } = useAuth();
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    if (session) {
      fetchCollections();
    }
  }, [session]);

  const fetchCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) throw error;
      setCollections(data);
    } catch (error) {
      console.error('Error fetching collections:', error);
      setMessage('Error fetching collections. Please try again.');
      setMessageType('error');
    }
  };

  const handleFileChange = (event) => {
    setSelectedFiles(Array.from(event.target.files));
  };

  const processImage = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imageData = e.target.result;
          const colors = await analyzeImageColors(imageData, [], {
            type: 'arc',
            rotation: 300,
            pointCount: 5,
            offsetStart: 0.14,
            offsetEnd: 0.06,
            thickness: 0.12,
            saturationBoost: 1.6,
            lightnessAdjust: 0.2
          });
          
          const selectedColors = colors.map(color => getClosestPredefinedColor(color, predefinedColors));
          
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          const originalCanvas = document.createElement('canvas');
          const originalCtx = originalCanvas.getContext('2d');
          
          const img = new Image();
          img.onload = async () => {
            originalCanvas.width = img.width;
            originalCanvas.height = img.height;
            originalCtx.drawImage(img, 0, 0);
            
            // Keep the canvas size the same as the original
            tempCanvas.width = originalCanvas.height; // Swap width and height for rotation
            tempCanvas.height = originalCanvas.width;
            
            // Set up the context for drawing
            tempCtx.save();
            tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
            tempCtx.rotate(Math.PI / 2); // Rotate 90 degrees
            tempCtx.translate(-originalCanvas.width / 2, -originalCanvas.height / 2);
            
            // Draw the image
            await drawImageToHexagon(tempCtx, imageData, originalCanvas.width, originalCanvas.height);
            
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
            croppedCanvas.toBlob(blob => {
              resolve({
                processedImage: blob,
                edgeColors: selectedColors.map(color => color.hex)
              });
            }, 'image/png');
          };
          img.onerror = reject;
          img.src = imageData;
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (!selectedCollection || selectedFiles.length === 0) {
      setMessage('Please select a collection and at least one file.');
      setMessageType('error');
      return;
    }

    setMessage('');
    setUploadProgress(0);

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const filePath = `${session.user.id}/${selectedCollection}/${new Date().getTime()}_${file.name}`;

      try {
        const { processedImage, edgeColors } = await processImage(file);

        const { error: uploadError } = await supabase.storage
          .from('tile-images')
          .upload(filePath, processedImage);

        if (uploadError) throw uploadError;

        const { error: metadataError } = await supabase
          .from('tile_metadata')
          .insert({
            user_id: session.user.id,
            collection_id: selectedCollection,
            file_path: filePath,
            edge_colors: edgeColors,
            description: `Processed image: ${file.name}`
          });

        if (metadataError) throw metadataError;

        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      } catch (error) {
        console.error('Error uploading file:', error);
        setMessage(`Error uploading ${file.name}. Please try again.`);
        setMessageType('error');
        return;
      }
    }

    setMessage('All files uploaded and processed successfully!');
    setMessageType('success');
    setSelectedFiles([]);
  };

  return (
    <div className="bulk-upload-container">
      <div className="bulk-upload-header">
        <h1>Bulk Image Upload</h1>
        <p>Upload and process multiple images to your collection</p>
      </div>

      <div className="upload-section">
        <h2>Select Collection</h2>
        <select 
          className="collection-select"
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
      </div>

      <div className="upload-section">
        <h2>Choose Files</h2>
        <div className="file-input-wrapper">
          <input
            type="file"
            id="file-input"
            className="file-input"
            multiple
            onChange={handleFileChange}
            accept="image/*"
          />
          <label htmlFor="file-input" className="file-input-label">
            Select Images
          </label>
          {selectedFiles.length > 0 && (
            <div className="selected-files">
              <ul>
                {selectedFiles.map((file, index) => (
                  <li key={index}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <button 
        className="upload-button"
        onClick={handleUpload}
        disabled={!selectedCollection || selectedFiles.length === 0}
      >
        <Upload size={20} />
        Upload and Process Files
      </button>

      {uploadProgress > 0 && (
        <div className="progress-bar">
          <div 
            className="progress-bar-fill"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}

      {message && (
        <div className={`message ${messageType === 'success' ? 'success-message' : 'error-message'}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default BulkUpload;