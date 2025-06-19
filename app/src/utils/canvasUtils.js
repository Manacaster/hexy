// HEXY.PRO App - /app/src/utils/canvasUtils.js - Utility functions for drawing on the canvas.
 

/* eslint-disable no-unused-vars */

export function drawImageToHexagon(ctx, imageSource, width, height) {
  return new Promise((resolve, reject) => {
    if (!imageSource) {
      reject(new Error('No image source provided'));
      return;
    }

    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      drawHexagonPath(ctx, width, height);
      ctx.clip();
      ctx.drawImage(img, 0, 0, width, height);
      ctx.restore();
      resolve();
    };
    img.onerror = (error) => {
      console.error('Error loading image:', error);
      reject(error);
    };
    img.src = imageSource;
  });
}


function drawColoredEdgeWithoutGap(ctx, start, end, color, centerX, centerY) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx);
  
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}
export function drawHexagonOverlayWithoutOutline(ctx, width, height, colors) {
  const hexagonPoints = calculateHexagonPoints(width, height);
  const centerX = width / 2;
  const centerY = height / 2;

  colors.forEach((color, index) => {
    if (color) {
      const startPoint = hexagonPoints[index];
      const endPoint = hexagonPoints[(index + 1) % 6];
      drawColoredEdgeWithoutOutline(ctx, startPoint, endPoint, color.hex, centerX, centerY);
    }
  });
}

function drawColoredEdgeWithoutOutline(ctx, start, end, color, centerX, centerY) {
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawHexagonOverlay(ctx, width, height, colors, drawOutline = true) {
  const hexagonPoints = calculateHexagonPoints(width, height);
  const centerX = width / 2;
  const centerY = height / 2;

  ctx.beginPath();
  drawHexagonPath(ctx, width, height);
  
  if (drawOutline) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  colors.forEach((color, index) => {
    if (color) {
      const startPoint = hexagonPoints[index];
      const endPoint = hexagonPoints[(index + 1) % 6];
      drawColoredEdge(ctx, startPoint, endPoint, color.hex, centerX, centerY);
    }
  });
}

export function drawHexagonPath(ctx, width, height) {
  const points = calculateHexagonPoints(width, height);
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < 6; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
}

export function calculateHexagonPoints(width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 10;

  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  });
}

function drawColoredEdge(ctx, start, end, color, centerX, centerY) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const unitDx = dx / length;
  const unitDy = dy / length;

  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const centerDx = centerX - midX;
  const centerDy = centerY - midY;
  const centerLength = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
  const unitCenterDx = centerDx / centerLength;
  const unitCenterDy = centerDy / centerLength;

  const gradientWidth = 60;
  const offset = 10;

  const gradient = ctx.createLinearGradient(
    midX - unitCenterDx * gradientWidth,
    midY - unitCenterDy * gradientWidth,
    midX + unitCenterDx * gradientWidth,
    midY + unitCenterDy * gradientWidth
  );

  gradient.addColorStop(0.49, 'transparent');
  gradient.addColorStop(0.499, 'transparent');
  gradient.addColorStop(0.5, color);
  gradient.addColorStop(0.98, 'transparent');

  ctx.save();
  ctx.globalCompositeOperation = 'color';
  // list of operation
  // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
  // lighten
  // overlay
  // screen
  // source-over
  // source-in
  // source-out
  // source-atop
  // destination-over
  // destination-in
  // destination-out
  // destination-atop
  // xor
  // copy
  // difference
  // multiply
  // hard-light
  // soft-light
  // hue
  // saturation
  // color
  // luminosity

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.strokeStyle = gradient;
  
  ctx.lineWidth = gradientWidth * 3;
  ctx.stroke();
  ctx.restore();
}