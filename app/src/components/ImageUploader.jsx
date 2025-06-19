// HEXY.PRO App - /app/src/components/ImageUploader.jsx - Component used to upload images.
 

import PropTypes from 'prop-types';
import { say } from '../utils/debug';

const ImageUploader = ({ onImageUpload }) => {
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5000000) { // 5MB limit
        alert('File is too large. Please choose a file under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        onImageUpload(e.target.result);
        say('Image file read', file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="image-uploader" >
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleFileChange} 
        aria-label="Upload an image"
        style={{backgroundColor: "#111111", border:"2px #2b2b2b solid"}} />
    </div>
  );
};

ImageUploader.propTypes = {
  onImageUpload: PropTypes.func.isRequired,
};

export default ImageUploader;
