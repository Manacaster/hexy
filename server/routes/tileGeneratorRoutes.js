// HEXY.PRO App - /app/src/pages/TileGenerator.jsx - Page component for the Tile Generator page that uses ComfyUI to generate tiles using AI.
// Do not remove any comments in this file, including the one above.

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { Ollama } = require('ollama'); 


dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const COMFYUI_PYTHON_API_URL = 'http://localhost:8069';
const ollama = new Ollama({ host: 'http://127.0.0.1:11434' })
const OLLAMA_API_URL = 'http://localhost:11434/api/generate';

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(403).json({ error: 'Invalid token', details: error.message });
  }
};

router.post('/generate-tile', authenticateToken, async (req, res) => {
  const { prompt, resolution } = req.body;
  const userId = req.user.id;

  if (!prompt || prompt.trim() === '') {
    return res.status(400).json({ error: 'Prompt cannot be empty' });
  }

  try {
    console.log('Received user prompt:', prompt);
    
    // Generate enhanced prompt using llama3.1
    const enhancedPrompt = await generateEnhancedPrompt(prompt);
    console.log('Enhanced prompt:', enhancedPrompt);

    const timestamp = Date.now();
    const comfyUIResponse = await generateTileWithComfyUI(enhancedPrompt, userId, timestamp, resolution);
    console.log('ComfyUI response received');

    res.json({ 
      imageData: comfyUIResponse.image,
      originalPrompt: prompt,
      enhancedPrompt: enhancedPrompt
    });
  } catch (error) {
    console.error('Error generating tile:', error);
    res.status(500).json({ 
      error: 'Failed to generate tile', 
      details: error.message
    });
  }
});

async function generateEnhancedPrompt(userPrompt) {
  try {
    // DO NOT REMOVE THE COMMENTED CODE BELOW !!!
    /*const response = await axios.post(OLLAMA_API_URL, {
      model: "llama3.1",
      prompt: `You are HexyBot, an AI assistant specialized in creating top-down view images or illustrations that will be used for board game settings and board game maps. Your main function will be to take a comma-delimited list of variables and create a descriptive prompt for the image generation. THE IMAGE THAT WILL GENERATE MUST BE A TOP-DOWN VIEW OR BIRD'S EYE VIEW LOOKING STRAIGHT DOWN AT THE GROUND. NO OTHER CAMERA ANGLES ARE ACCEPTABLE. The prompt must always start with the words, "a orthographic top-down view, satellite view of a board game map tile"

User input: "${userPrompt}"

Create a detailed prompt that:
1. Starts with "a orthographic top-down view, satellite view of a board game map tile"
2. Incorporates the user's input into a comprehensive description
3. Focuses on clear, descriptive language
4. Uses complete sentences or phrases
5. Emphasizes overall scene composition and context
6. Includes specific details about objects, colors, and spatial relationships

Enhanced prompt:`,
      stream: false
    });*/

    //return response.data.response.trim();
    return userPrompt;
  } catch (error) {
    console.error('Error generating enhanced prompt:', error);
    throw error;
  }
}

async function generateTileWithComfyUI(prompt, userId, timestamp, resolution) {
  try {
    const response = await axios.post(COMFYUI_PYTHON_API_URL, {
      prompt,
      userId,
      timestamp,
      resolution
    });
    return response.data;
  } catch (error) {
    console.error('Error in generateTileWithComfyUI:', error);
    throw error;
  }
}

router.post('/save-tile', authenticateToken, async (req, res) => {
  const { imageData, collectionId } = req.body;
  const userId = req.user.id;

  try {
    const imageBuffer = Buffer.from(imageData, 'base64');

    // Generate a unique filename
    const filename = `${Date.now()}.png`;
    const filePath = `${userId}/${collectionId}/${filename}`;

    // Save the generated image to Supabase storage
    const { data: uploadedImage, error: uploadError } = await supabase.storage
      .from('tile-images')
      .upload(filePath, imageBuffer, {
        contentType: 'image/png'
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get the public URL of the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('tile-images')
      .getPublicUrl(filePath);

    // Generate fake edge colors (similar to the bulk upload process)
    const fakeEdgeColors = [
      '#228B22', '#F4A460', '#808080', '#2F4F4F', '#DAA520', '#F0F8FF'
    ];

    // Use Llava model to generate a description of the image
    const llavaResponse = await axios.post(OLLAMA_API_URL, {
      model: "llava",
      prompt: "Describe the image in exactly 3 words, minimum 3 words, maximum 3 words. Ignore the fact that the image is an hexagon, do not include the word hexagon in the description. Do not use commas or periods or any other punctuation. Do not use the words 'a' or 'an'.",
      images: [imageData], // The image is already in base64 format
      stream: false
    });

    // Save tile metadata to the database
    const { data: tileMetadata, error: metadataError } = await supabase
      .from('tile_metadata')
      .insert({
        user_id: userId,
        collection_id: collectionId,
        file_path: filePath,
        edge_colors: fakeEdgeColors,
        description: `Generated tile: ${filename}`,
        name: llavaResponse.data.response,
        created_at: new Date().toISOString()
      });

    if (metadataError) {
      throw metadataError;
    }

    res.json({ imageUrl: publicUrl, tileMetadata });
  } catch (error) {
    console.error('Error saving tile:', error);
    res.status(500).json({ 
      error: 'Failed to save tile', 
      details: error.message
    });
  }
});

module.exports = router;