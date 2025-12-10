-- ============================================
-- SCHÉMA BASE DE DONNÉES POUR PIÈCES AUTO
-- Compatible avec PostgreSQL, MySQL, SQLite
-- ============================================

-- Table: manufacturers (Constructeurs)
CREATE TABLE IF NOT EXISTS manufacturers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_manufacturers_name ON manufacturers(name);

-- Table: vehicle_models (Modèles de véhicules)
CREATE TABLE IF NOT EXISTS vehicle_models (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL UNIQUE,
    model_name VARCHAR(255) NOT NULL,
    manufacturer_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vehicle_models_model_id ON vehicle_models(model_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_models_manufacturer_id ON vehicle_models(manufacturer_id);

-- Table: vehicles (Véhicules spécifiques)
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL UNIQUE,
    model_id INTEGER NOT NULL,
    type_engine_name VARCHAR(255),
    construction_interval_start DATE,
    construction_interval_end DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES vehicle_models(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_id ON vehicles(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_model_id ON vehicles(model_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_construction_interval ON vehicles(construction_interval_start, construction_interval_end);

-- Table: products (Produits)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    article_no VARCHAR(100) NOT NULL UNIQUE,
    csv_id VARCHAR(50),
    supplier_name VARCHAR(255),
    product_name VARCHAR(500),
    ean_number VARCHAR(50),
    description TEXT,
    package_weight DECIMAL(10, 2),
    package_height DECIMAL(10, 2),
    package_width DECIMAL(10, 2),
    package_length DECIMAL(10, 2),
    bigcommerce_product_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_article_no ON products(article_no);
CREATE INDEX IF NOT EXISTS idx_products_bigcommerce_id ON products(bigcommerce_product_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_name ON products(supplier_name);
CREATE INDEX IF NOT EXISTS idx_products_ean_number ON products(ean_number);

-- Table: product_specifications (Spécifications produits)
CREATE TABLE IF NOT EXISTS product_specifications (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    criteria_name VARCHAR(255) NOT NULL,
    criteria_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_specifications_product_id ON product_specifications(product_id);
CREATE INDEX IF NOT EXISTS idx_product_specifications_criteria_name ON product_specifications(criteria_name);

-- Table: product_oem_numbers (Numéros OEM)
CREATE TABLE IF NOT EXISTS product_oem_numbers (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    oem_brand VARCHAR(100) NOT NULL,
    oem_display_no VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_oem_numbers_product_id ON product_oem_numbers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_oem_numbers_oem_brand ON product_oem_numbers(oem_brand);
CREATE INDEX IF NOT EXISTS idx_product_oem_numbers_oem_display_no ON product_oem_numbers(oem_display_no);

-- Table: product_vehicle_compatibility (Compatibilité produit-véhicule)
CREATE TABLE IF NOT EXISTS product_vehicle_compatibility (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    vehicle_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    UNIQUE(product_id, vehicle_id)
);

CREATE INDEX IF NOT EXISTS idx_product_vehicle_compatibility_product_id ON product_vehicle_compatibility(product_id);
CREATE INDEX IF NOT EXISTS idx_product_vehicle_compatibility_vehicle_id ON product_vehicle_compatibility(vehicle_id);

-- Table: product_images (Images produits)
CREATE TABLE IF NOT EXISTS product_images (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    image_url TEXT,
    image_filename VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- ============================================
-- VUES UTILES
-- ============================================

-- Vue: produits avec compatibilités
CREATE OR REPLACE VIEW v_products_with_compatibility AS
SELECT 
    p.id,
    p.article_no,
    p.product_name,
    p.supplier_name,
    COUNT(pvc.vehicle_id) as compatibility_count
FROM products p
LEFT JOIN product_vehicle_compatibility pvc ON p.id = pvc.product_id
GROUP BY p.id, p.article_no, p.product_name, p.supplier_name;

-- Vue: recherche de compatibilité par constructeur/modèle
CREATE OR REPLACE VIEW v_product_vehicle_search AS
SELECT 
    p.id as product_id,
    p.article_no,
    p.product_name,
    m.name as manufacturer_name,
    vm.model_name,
    v.type_engine_name,
    v.construction_interval_start,
    v.construction_interval_end
FROM products p
JOIN product_vehicle_compatibility pvc ON p.id = pvc.product_id
JOIN vehicles v ON pvc.vehicle_id = v.id
JOIN vehicle_models vm ON v.model_id = vm.id
JOIN manufacturers m ON vm.manufacturer_id = m.id;

































