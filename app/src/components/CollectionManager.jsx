// HEXY.PRO App - /app/src/components/CollectionManager.jsx - Component used to manage collections of tiles.
 

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import PropTypes from 'prop-types';
import '../styles/CollectionManager.css';

const CollectionManager = ({ onSelectTile }) => {
  const { session } = useAuth();
  const [collections, setCollections] = useState([]);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [editingCollection, setEditingCollection] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [isVisible, setIsVisible] = useState(true);
  const [selectedTile, setSelectedTile] = useState(null);

  useEffect(() => {
    const fetchCollections = async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', session.user.id);
  
      if (error) {
        console.error('Error fetching collections:', error);
      } else {
        setCollections(data);
      }
    };
  
    if (session) {
      fetchCollections();
    }
  }, [session]);

  useEffect(() => {
    if (selectedCollection) {
      fetchTiles(selectedCollection);
    }
  }, [selectedCollection]);


  const fetchTiles = async (collectionId) => {
    const { data, error } = await supabase
      .from('tile_metadata')
      .select('*')
      .eq('collection_id', collectionId);

    if (error) {
      console.error('Error fetching tiles:', error);
    } else {
      setTiles(data);
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;

    const { data, error } = await supabase
      .from('collections')
      .insert({ name: newCollectionName, user_id: session.user.id })
      .select();

    if (error) {
      console.error('Error creating collection:', error);
    } else {
      setCollections([...collections, data[0]]);
      setNewCollectionName('');
    }
  };

  const startEditing = (collection) => {
    setEditingCollection({ ...collection, newName: collection.name });
  };

  const saveEdit = async () => {
    const { data, error } = await supabase
      .from('collections')
      .update({ name: editingCollection.newName })
      .eq('id', editingCollection.id)
      .select();

    if (error) {
      console.error('Error updating collection:', error);
    } else {
      setCollections(collections.map(c => c.id === data[0].id ? data[0] : c));
      setEditingCollection(null);
    }
  };

  const deleteCollection = async (id) => {
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting collection:', error);
    } else {
      setCollections(collections.filter(c => c.id !== id));
      if (selectedCollection === id) {
        setSelectedCollection(null);
        setTiles([]);
      }
    }
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const handleSelectCollection = (collectionId) => {
    if (selectedCollection === collectionId) {
      setSelectedCollection(null);
      setTiles([]);
    } else {
      setSelectedCollection(collectionId);
      fetchTiles(collectionId);
    }
  };

  const handleSelectTile = (tile) => {
    setSelectedTile(tile.id);
    if (onSelectTile && typeof onSelectTile === 'function') {
      onSelectTile(tile);
    }
  };

  return (
    <div className={`collection-manager ${isVisible ? '' : 'minimized'}`}>
      <div className="collection-header">
        <h2>Collections</h2>
        <button onClick={toggleVisibility}>
          {isVisible ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>
      {isVisible && (
        <>
          {session ? (
            <>
              <div className="new-collection">
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="New collection name"
                />
                <button onClick={createCollection}><Plus size={20} /></button>
              </div>
              <ul className="collection-list">
                {collections.map(collection => (
                  <li key={collection.id} className={selectedCollection === collection.id ? 'selected' : ''}>
                    <div className="collection-item">
                      {editingCollection && editingCollection.id === collection.id ? (
                        <>
                          <input
                            type="text"
                            value={editingCollection.newName}
                            onChange={(e) => setEditingCollection({ ...editingCollection, newName: e.target.value })}
                          />
                          <button onClick={saveEdit}>Save</button>
                        </>
                      ) : (
                        <>
                          <span onClick={() => handleSelectCollection(collection.id)}>{collection.name}</span>
                          <div className="collection-actions">
                            <button onClick={() => startEditing(collection)}><Edit2 size={16} /></button>
                            <button onClick={() => deleteCollection(collection.id)}><Trash2 size={16} /></button>
                            <button onClick={() => handleSelectCollection(collection.id)}>
                              {selectedCollection === collection.id ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    {selectedCollection === collection.id && (
                      <div className="tile-preview">
                        <div className="tile-grid">
                          {tiles.map(tile => (
                            <img
                              key={tile.id}
                              src={`${supabase.storage.from('tile-images').getPublicUrl(tile.file_path).data.publicUrl}`}
                              alt={`Tile ${tile.id}`}
                              onClick={() => handleSelectTile(tile)}
                              className={`tile-thumbnail ${selectedTile === tile.id ? 'selected' : ''}`}
                              title={tile.name}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <a>Login to see your collections</a>
          )}
        </>
      )}
    </div>
  );
};

CollectionManager.propTypes = {
  onSelectTile: PropTypes.func,
};

export default CollectionManager;