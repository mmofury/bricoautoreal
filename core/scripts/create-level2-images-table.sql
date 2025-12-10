-- Créer la table pour stocker les images des catégories level 2
CREATE TABLE IF NOT EXISTS intercars_level2_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level2_id TEXT NOT NULL UNIQUE,
  image_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Créer un index sur level2_id pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_intercars_level2_images_level2_id ON intercars_level2_images(level2_id);



