// HEXY.PRO App - /app/src/components/ColorPalette.jsx - Component used to manage color palettes.
 

import PropTypes from 'prop-types'; // Add this line
import { getClosestPredefinedColor } from '../utils/colorUtils';
import { say } from '../utils/debug';

const ColorPalette = ({ onColorSelect, analyzedColors, selectedColors, predefinedColors }) => {
  // Add prop validation
  ColorPalette.propTypes = {
    onColorSelect: PropTypes.func.isRequired,
    analyzedColors: PropTypes.array.isRequired,
    selectedColors: PropTypes.array.isRequired,
    predefinedColors: PropTypes.array.isRequired,
  };
  const handleColorSelect = (color, edgeIndex) => {
    onColorSelect(color, edgeIndex);
    say('Color selected', { color, edgeIndex });
  };

  return (
    <div className="color-palette">
      {[0, 1, 2, 3, 4, 5].map((edgeIndex) => {
        const closestColor = analyzedColors[edgeIndex] 
          ? getClosestPredefinedColor(analyzedColors[edgeIndex], predefinedColors) 
          : null;
        
        return (
          <div key={edgeIndex} className="edge-color-selector">
            <h4>Edge {edgeIndex + 1}</h4>
            <div className="color-options">
              {closestColor && (
                <button
                  className={`color-button ${selectedColors[edgeIndex]?.name === closestColor.name ? 'selected' : ''}`}
                  style={{ backgroundColor: closestColor.hex }}
                  onClick={() => handleColorSelect(closestColor, edgeIndex)}
                  aria-label={`Select analyzed color (${closestColor.name}) for edge ${edgeIndex + 1}`}
                  title={`Analyzed (${closestColor.name})`}
                >
                </button>
              )}
              {predefinedColors.map((color) => (
                <button
                  key={color.name}
                  className={`color-button ${selectedColors[edgeIndex]?.name === color.name ? 'selected' : ''}`}
                  style={{ backgroundColor: color.hex }}
                  onClick={() => handleColorSelect(color, edgeIndex)}
                  aria-label={`Select ${color.name} color for edge ${edgeIndex + 1}`}
                  title={color.name}
                >
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ColorPalette;