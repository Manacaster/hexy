// HEXY.PRO App - /app/src/pages/Map.jsx - Page component that displays a hexagon map editor.
 

/* eslint-disable react/prop-types */

import { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, Upload, Download } from 'lucide-react';

const Map = () => {
  const [images, setImages] = useState({});
  const [rotations, setRotations] = useState({});
  const [selectedTile, setSelectedTile] = useState('0,0');
  const [zoom, setZoom] = useState(1);
  const [tileRadius, setTileRadius] = useState(1);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const canvasRef = useRef(null);

  const handleImageUpload = (event, index) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages(prev => ({ ...prev, [index]: e.target.result }));
        setSelectedTile(index);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const rotateImage = (direction) => {
    setRotations(prev => ({
      ...prev,
      [selectedTile]: (prev[selectedTile] || 0) + direction * 10
    }));
  };

  const handleZoom = (direction) => {
    setZoom(prevZoom => {
      const newZoom = prevZoom + direction * 0.1;
      return Math.max(0.25, Math.min(2, newZoom));
    });
  };

  const HexagonMask = ({ children, isSelected }) => (
    <div 
      style={{ 
        width: `${100 * zoom}px`, 
        height: `${115 * zoom}px`, 
        overflow: 'hidden', 
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        border: isSelected ? '1px solid transparent' : 'none',
        transition: 'width 0.3s ease-in-out, height 0.3s ease-in-out',
        position: 'relative'
      }}
    >
      {children}
    </div>
  );
  
  const renderHexagonContent = (index) => (
    <>
      {images[index] ? (
        <div style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        }}>
          <img 
            src={images[index]} 
            alt={`Hexagon ${index}`} 
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `rotate(${rotations[index] || 0}deg)`,
              transition: 'transform 0.3s ease-in-out'
            }}
          />
        </div>
      ) : (
        <div style={{ 
          width: '100%', 
          height: '100%', 
          backgroundColor: '#d1d5db', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <span style={{ color: '#4b5563', fontSize: `${12 * zoom}px` }}>+</span>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleImageUpload(e, index)}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          cursor: 'pointer'
        }}
      />
    </>
  );

  const generateHexPositions = useCallback((radius) => {
    const positions = [];
    const hexWidth = 100;
    const hexHeight = 115;
    const vertOffset = hexHeight * 3/4;
    const horizOffset = hexWidth;

    for (let q = -radius; q <= radius; q++) {
      for (let r = Math.max(-radius, -q-radius); r <= Math.min(radius, -q+radius); r++) {
        const x = horizOffset * (q + r/2);
        const y = vertOffset * r;
        positions.push({ left: x, top: y, q, r, index: `${q},${r}` });
      }
    }

    return positions;
  }, []);

  const hexagonPositions = generateHexPositions(tileRadius);

  // Calculate the bounds of the hexagon grid
  const minLeft = Math.min(...hexagonPositions.map(pos => pos.left));
  const maxLeft = Math.max(...hexagonPositions.map(pos => pos.left));
  const minTop = Math.min(...hexagonPositions.map(pos => pos.top));
  const maxTop = Math.max(...hexagonPositions.map(pos => pos.top));

  // Calculate the size of the grid
  const gridWidth = maxLeft - minLeft + 100; // Add 100 for the width of a single hexagon
  const gridHeight = maxTop - minTop + 115; // Add 115 for the height of a single hexagon

  const renderGridOnCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = gridWidth * zoom;
    canvas.height = gridHeight * zoom;
  
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  
    const drawHexagon = (x, y, size) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const xPoint = x + size * Math.cos(angle);
        const yPoint = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(xPoint, yPoint);
        else ctx.lineTo(xPoint, yPoint);
      }
      ctx.closePath();
    };
  
    const drawImageToHexagon = (img, x, y, size, rotation) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation * Math.PI / 180);
      drawHexagon(0, 0, size);
      ctx.clip();
      ctx.drawImage(img, -size, -size, size * 2, size * 2);
      ctx.restore();
    };
  
    const loadImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };
  
    const drawHexagons = async () => {
      const imagePromises = [];
  
      for (const position of hexagonPositions) {
        const x = (position.left - minLeft + 50) * zoom;
        const y = (position.top - minTop + 57.5) * zoom;
        const size = 50 * zoom;
  
        if (images[position.index]) {
          imagePromises.push(
            loadImage(images[position.index]).then(img => {
              drawImageToHexagon(img, x, y, size, rotations[position.index] || 0);
            }).catch(error => {
              console.error('Error loading image:', error);
              ctx.fillStyle = '#d1d5db';
              drawHexagon(x, y, size);
              ctx.fill();
            })
          );
        } else {
          ctx.fillStyle = '#d1d5db';
          drawHexagon(x, y, size);
          ctx.fill();
          ctx.fillStyle = '#4b5563';
          ctx.font = `${16 * zoom}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('+', x, y);
        }
  
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        drawHexagon(x, y, size);
        ctx.stroke();
      }
  
      await Promise.all(imagePromises);
    };
  
    await drawHexagons();
  }, [hexagonPositions, images, rotations, zoom, gridWidth, gridHeight, minLeft, minTop]);
  
  const exportAsPNG = async () => {
    await renderGridOnCanvas();
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'hexagon_map.png';
    link.href = dataURL;
    link.click();
  };

  useEffect(() => {
    renderGridOnCanvas().catch(console.error);
  }, [renderGridOnCanvas]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#00000000', position: 'relative' }}>
      {backgroundImage && (
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#00000000',
            filter: 'brightness(50%)',
          }}
        />
      )}
      
      {/* Fixed Menu Bar */}
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        backgroundColor: '#2563eb', 
        color: 'white', 
        padding: '1rem', 
        zIndex: 10, 
        textAlign: 'center',
        visibility: 'hidden'
      }}>
        <nav style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <a href="#" style={{ textDecoration: 'underline' }}>Home</a>
          <a href="#" style={{ textDecoration: 'underline' }}>Gallery</a>
          <a href="#" style={{ textDecoration: 'underline' }}>About</a>
          <a href="#" style={{ textDecoration: 'underline' }}>Contact</a>
        </nav>
      </div>

      {/* Controls */}
      <div style={{
        position: 'fixed',
        top: '9rem',
        left: 0,
        right: 0,
        backgroundColor: '#0000004a',
        padding: '1rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '1rem',
        zIndex: 10
      }}>
        <select 
          value={selectedTile}
          onChange={(e) => setSelectedTile(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '0.25rem' }}
        >
          {hexagonPositions.map((pos, index) => (
            <option key={pos.index} value={pos.index}>
              Tile {index + 1} ({pos.q}, {pos.r})
            </option>
          ))}
        </select>
        <button onClick={() => rotateImage(-1)} style={{ padding: '0.5rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '0.25rem' }}>
          <RotateCcw size={20} />
        </button>
        <button onClick={() => rotateImage(1)} style={{ padding: '0.5rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '0.25rem' }}>
          <RotateCw size={20} />
        </button>
        <select
          value={tileRadius}
          onChange={(e) => setTileRadius(Number(e.target.value))}
          style={{ padding: '0.5rem', borderRadius: '0.25rem' }}
        >
          <option value={1}>1 from center (7 tiles)</option>
          <option value={2}>2 from center (19 tiles)</option>
          <option value={3}>3 from center (37 tiles)</option>
          <option value={4}>4 from center (61 tiles)</option>
          <option value={5}>5 from center (91 tiles)</option>
          <option value={6}>6 from center (127 tiles)</option>
          <option value={7}>7 from center (169 tiles)</option>
        </select>
        <label style={{ backgroundColor: '#3b82f6', color: 'white', padding: '0.5rem', borderRadius: '0.25rem', cursor: 'pointer' }}>
          <input
            type="file"
            accept="image/*"
            onChange={handleBackgroundUpload}
            style={{ display: 'none' }}
          />
          <Upload size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
          Upload Background
        </label>
        <button
          onClick={exportAsPNG}
          style={{ padding: '0.5rem', backgroundColor: '#10b981', color: 'white', borderRadius: '0.25rem', display: 'flex', alignItems: 'center' }}
        >
          <Download size={20} style={{ marginRight: '0.5rem' }} />
          Export as PNG
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, overflow: 'hidden', marginTop: '8rem' }}>
        <div style={{ 
          position: 'relative', 
          width: `${gridWidth * zoom}px`, 
          height: `${gridHeight * zoom}px`,
          transition: 'width 0.3s ease-in-out, height 0.3s ease-in-out'
        }}>
          {hexagonPositions.map((position) => (
            <div key={position.index} style={{
              position: 'absolute',
              left: `${(position.left - minLeft) * zoom}px`,
              top: `${(position.top - minTop) * zoom}px`,
              transition: 'left 0.3s ease-in-out, top 0.3s ease-in-out'
            }}>
              <HexagonMask isSelected={selectedTile === position.index}>
                {renderHexagonContent(position.index)}
              </HexagonMask>
            </div>
          ))}
        </div>
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: '8rem',
            left: 0,
            width: `${gridWidth * zoom}px`,
            height: `${gridHeight * zoom}px`,
            zIndex: -1,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Zoom Controls */}
      <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', display: 'flex', gap: '0.5rem', zIndex: 10 }}>
        <button
          onClick={() => handleZoom(1)}
          style={{ padding: '0.5rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '50%', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
        >
          <ZoomIn size={24} />
        </button>
        <button
          onClick={() => handleZoom(-1)}
          style={{ padding: '0.5rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '50%', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
        >
          <ZoomOut size={24} />
        </button>
      </div>
    </div>
  );
};

export default Map;