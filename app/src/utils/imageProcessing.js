// HEXY.PRO App - /app/src/utils/imageProcessing.js - Utility functions for analyzing colors in images.
 

/* eslint-disable no-unused-vars */

import { getAverageColor, rgbToHex, rgbToHsl, hslToRgb } from './colorUtils';
import { say } from './debug';

export async function analyzeImageColors(imageData, edgeConfigs = [], globalParams = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const centerX = img.width / 2;
        const centerY = img.height / 2;
        const radius = Math.min(img.width, img.height) * 0.45;

        const edgeColors = [];
        for (let i = 0; i < 6; i++) {
          const config = edgeConfigs[i] && edgeConfigs[i].override ? { ...globalParams, ...edgeConfigs[i] } : globalParams;
          const startAngle = (Math.PI / 3) * i - Math.PI / 6 + (globalParams.rotation * Math.PI / 180);
          const endAngle = (Math.PI / 3) * (i + 1) - Math.PI / 6 + (globalParams.rotation * Math.PI / 180);
          
          const edgeColor = sampleEdgeColor(
            ctx, 
            centerX, 
            centerY, 
            radius, 
            startAngle, 
            endAngle, 
            config
          );
          edgeColors.push(edgeColor);
        }

        say('Analyzed image colors', edgeColors);
        resolve(edgeColors);

        // Clean up
        canvas.width = 1;
        canvas.height = 1;
        canvas = null;
        ctx = null;

        resolve(edgeColors);
      } catch (error) {
        console.error('Error analyzing image:', error);
        reject(error);
      }
    };
    img.onerror = (error) => {
      console.error('Error loading image for analysis:', error);
      reject(error);
    };
    img.src = imageData;
  });
}

function sampleEdgeColor(ctx, centerX, centerY, radius, startAngle, endAngle, config) {
  const { 
    type, 
    pointCount = 5, 
    offsetStart = 0.14, 
    offsetEnd = 0.06, 
    thickness = 0.12,
    saturationBoost = 1.6,
    lightnessAdjust = 0.2,
    customShapePoints
  } = config;

  let samplePoints;

  switch (type) {
    case 'line':
      samplePoints = generateLineSamplePoints(centerX, centerY, radius, startAngle, endAngle, pointCount, offsetStart, offsetEnd);
      break;
    case 'arc':
      samplePoints = generateArcSamplePoints(centerX, centerY, radius, startAngle, endAngle, pointCount, offsetStart, offsetEnd);
      break;
    case 'custom':
      samplePoints = generateCustomShapeSamplePoints(centerX, centerY, radius, customShapePoints, pointCount);
      break;
    default:
      samplePoints = generateLineSamplePoints(centerX, centerY, radius, startAngle, endAngle, pointCount, offsetStart, offsetEnd);
  }

  let totalR = 0, totalG = 0, totalB = 0;
  let samplesTaken = 0;

  samplePoints.forEach(point => {
    for (let t = 0; t < thickness * radius; t++) {
      const x = Math.round(point.x - t * Math.cos(point.angle));
      const y = Math.round(point.y - t * Math.sin(point.angle));

      if (x >= 0 && x < ctx.canvas.width && y >= 0 && y < ctx.canvas.height) {
        const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
        totalR += r;
        totalG += g;
        totalB += b;
        samplesTaken++;
      }
    }
  });

  if (samplesTaken === 0) return '#000000';

  const avgR = totalR / samplesTaken;
  const avgG = totalG / samplesTaken;
  const avgB = totalB / samplesTaken;

  // Adjust color
  let [h, s, l] = rgbToHsl(avgR, avgG, avgB);
  s = Math.min(s * saturationBoost, 1);
  l = Math.max(0, Math.min(1, l + lightnessAdjust));
  const [r, g, b] = hslToRgb(h, s, l);

  return rgbToHex(Math.round(r), Math.round(g), Math.round(b));
}
export function visualizeSamplingPoints(ctx, width, height, edgeConfigs, globalParams) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.45;

  for (let i = 0; i < 6; i++) {
    const config = edgeConfigs[i] && edgeConfigs[i].override ? { ...globalParams, ...edgeConfigs[i] } : globalParams;
    const startAngle = (Math.PI / 3) * i - Math.PI / 6 + (globalParams.rotation * Math.PI / 180);
    const endAngle = (Math.PI / 3) * (i + 1) - Math.PI / 6 + (globalParams.rotation * Math.PI / 180);

    let samplePoints;
    if (config.type === 'line') {
      samplePoints = generateLineSamplePoints(centerX, centerY, radius, startAngle, endAngle, config.pointCount, config.offsetStart, config.offsetEnd);
    } else if (config.type === 'arc') {
      samplePoints = generateArcSamplePoints(centerX, centerY, radius, startAngle, endAngle, config.pointCount, config.offsetStart, config.offsetEnd);
    } else if (config.type === 'custom') {
      samplePoints = generateCustomShapeSamplePoints(centerX, centerY, radius, globalParams.customShapePoints, config.pointCount);
    } else {
      samplePoints = generateLineSamplePoints(centerX, centerY, radius, startAngle, endAngle, config.pointCount, config.offsetStart, config.offsetEnd);
    }

    samplePoints.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.fill();
    });
  }}
function generateLineSamplePoints(centerX, centerY, radius, startAngle, endAngle, pointCount, offsetStart, offsetEnd) {
  const points = [];
  for (let i = 0; i <= pointCount; i++) {
    const t = i / pointCount;
    const angle = startAngle + (endAngle - startAngle) * t;
    const offsetRadius = radius * (1 - offsetStart - (offsetEnd - offsetStart) * t);
    const x = centerX + offsetRadius * Math.cos(angle);
    const y = centerY + offsetRadius * Math.sin(angle);
    points.push({ x, y, angle });
  }
  return points;
}

function generateArcSamplePoints(centerX, centerY, radius, startAngle, endAngle, pointCount, offsetStart, offsetEnd) {
  const points = [];
  const arcRadius = radius * (1 - (offsetStart + offsetEnd) / 2);
  for (let i = 0; i <= pointCount; i++) {
    const t = i / pointCount;
    const angle = startAngle + (endAngle - startAngle) * t;
    const x = centerX + arcRadius * Math.cos(angle);
    const y = centerY + arcRadius * Math.sin(angle);
    points.push({ x, y, angle });
  }
  return points;
}

function generateCustomShapeSamplePoints(centerX, centerY, radius, customPoints, pointCount) {
  if (!customPoints || customPoints.length !== 6) {
    return generateLineSamplePoints(centerX, centerY, radius, 0, 2 * Math.PI, pointCount, 0, 0);
  }

  const scaledPoints = customPoints.map(point => ({
    x: centerX + (point.x - 50) * radius / 50,
    y: centerY + (point.y - 50) * radius / 50
  }));

  const totalLength = scaledPoints.reduce((acc, point, index, array) => {
    const nextPoint = array[(index + 1) % array.length];
    return acc + Math.sqrt(Math.pow(nextPoint.x - point.x, 2) + Math.pow(nextPoint.y - point.y, 2));
  }, 0);

  const pointsPerSegment = new Array(6).fill(Math.floor(pointCount / 6));
  for (let i = 0; i < pointCount % 6; i++) {
    pointsPerSegment[i]++;
  }

  const samplePoints = [];
  for (let i = 0; i < 6; i++) {
    const start = scaledPoints[i];
    const end = scaledPoints[(i + 1) % 6];
    for (let j = 0; j < pointsPerSegment[i]; j++) {
      const t = j / pointsPerSegment[i];
      const x = start.x + (end.x - start.x) * t;
      const y = start.y + (end.y - start.y) * t;
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      samplePoints.push({ x, y, angle });
    }
  }

  return samplePoints;
}

