// HEXY.PRO App - /app/src/components/CustomShapeEditor.jsx - Component used to edit custom shapes.
 

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
const CustomShapeEditor = ({ points, onChange }) => {
CustomShapeEditor.propTypes = {
  points: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
};
  const [localPoints, setLocalPoints] = useState(points);

  useEffect(() => {
    if (points.length === 0) {
      // Initialize with default hexagon points
      const defaultPoints = [
        { x: 50, y: 0 },
        { x: 100, y: 25 },
        { x: 100, y: 75 },
        { x: 50, y: 100 },
        { x: 0, y: 75 },
        { x: 0, y: 25 },
      ];
      setLocalPoints(defaultPoints);
      onChange(defaultPoints);
    }
  }, [points.length, onChange]);

  const handlePointChange = (index, axis, value) => {
    const newPoints = [...localPoints];
    newPoints[index][axis] = parseInt(value);
    setLocalPoints(newPoints);
    onChange(newPoints);
  };

  return (
    <div className="custom-shape-editor">
      {localPoints.map((point, index) => (
        <div key={index} className="point-controls">
          <label>
            Point {index + 1} X:
            <input
              type="number"
              value={point.x}
              onChange={(e) => handlePointChange(index, 'x', e.target.value)}
              min="0"
              max="100"
            />
          </label>
          <label>
            Point {index + 1} Y:
            <input
              type="number"
              value={point.y}
              onChange={(e) => handlePointChange(index, 'y', e.target.value)}
              min="0"
              max="100"
            />
          </label>
        </div>
      ))}
    </div>
  );
};

export default CustomShapeEditor;