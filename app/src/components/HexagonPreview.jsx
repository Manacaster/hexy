// HEXY.PRO App - /app/src/components/HexagonPreview.jsx - Component used to display a preview of the hexagon image.
 

import { useEffect, forwardRef, useRef } from 'react';
import PropTypes from 'prop-types';
import { drawImageToHexagon, drawHexagonOverlay } from '../utils/canvasUtils';
import { visualizeSamplingPoints } from '../utils/imageProcessing';
import { say } from '../utils/debug';

const HexagonPreview = forwardRef(({ image, selectedColors, showSamplingPoints, samplingConfig }, ref) => {


HexagonPreview.propTypes = {
  image: PropTypes.any,
  selectedColors: PropTypes.array,
  showSamplingPoints: PropTypes.bool,
  samplingConfig: PropTypes.object,
};
  const samplingCanvasRef = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const samplingCanvas = samplingCanvasRef.current;
    if (!canvas || !samplingCanvas) return;

    const ctx = canvas.getContext('2d');
    const samplingCtx = samplingCanvas.getContext('2d');

    const updateCanvas = async () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      samplingCtx.clearRect(0, 0, samplingCanvas.width, samplingCanvas.height);

      if (image) {
        try {
          await drawImageToHexagon(ctx, image, canvas.width, canvas.height);
          drawHexagonOverlay(ctx, canvas.width, canvas.height, selectedColors);
          
          if (showSamplingPoints) {
            visualizeSamplingPoints(samplingCtx, samplingCanvas.width, samplingCanvas.height, samplingConfig.edgeConfigs, samplingConfig.globalParams);
          }
          
          say('Hexagon preview updated', { hasImage: true, colorCount: selectedColors.filter(Boolean).length });
        } catch (error) {
          console.error('Error updating hexagon preview:', error);
          say('Error updating hexagon preview', { error });
        }
      } else {
        drawHexagonOverlay(ctx, canvas.width, canvas.height, selectedColors);
        
        if (showSamplingPoints) {
          visualizeSamplingPoints(samplingCtx, samplingCanvas.width, samplingCanvas.height, samplingConfig.edgeConfigs, samplingConfig.globalParams);
        }
        
        say('Hexagon preview updated', { hasImage: false, colorCount: selectedColors.filter(Boolean).length });
      }
    };

    updateCanvas();
  }, [image, selectedColors, showSamplingPoints, samplingConfig, ref]);

  return (
    <div style={{ position: 'relative', width: '400px', height: '400px' }}>
      <canvas ref={ref} width="400" height="400" tabIndex="0" aria-label="Hexagon preview" style={{backgroundColor: "rgb(10 10 10)", border:"3px #2b2b2b solid", position: 'absolute', top: 0, left: 0}}/>
      <canvas ref={samplingCanvasRef} width="400" height="400" style={{position: 'absolute', top: 0, left: 0, pointerEvents: 'none'}}/>
    </div>
  );
});

HexagonPreview.displayName = 'HexagonPreview';

export default HexagonPreview;