# Documentation du Schéma Prisma - Tables et Relations

Ce document décrit toutes les tables de la base de données Prisma, leur utilité, leurs champs et leurs relations.

**Fichier du schéma :** `core/prisma/schema.prisma`

---

## 📋 Table des matières

1. [Tables de compatibilité véhicule](#tables-de-compatibilité-véhicule)
2. [Tables de produits](#tables-de-produits)
3. [Tables de catégories](#tables-de-catégories)
4. [Tables de relations](#tables-de-relations)
5. [Table de stockage temporaire](#table-de-stockage-temporaire)
6. [Schéma de relations complet](#schéma-de-relations-complet)

---

## Tables de compatibilité véhicule

### 1. `Manufacturer` (Constructeurs)

**Table SQL :** `manufacturers`

**Utilité :** Stocke tous les constructeurs automobiles (ex: PEUGEOT, BMW, MERCEDES-BENZ).

**Champs :**

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| `id` | `Int` | ID primaire auto-incrémenté | PK |
| `name` | `String` | Nom du constructeur (ex: "PEUGEOT") | Unique, Indexé |
| `createdAt` | `DateTime` | Date de création | Auto |
| `updatedAt` | `DateTime` | Date de mise à jour | Auto |

**Relations :**
- `vehicleModels` → `VehicleModel[]` : Tous les modèles de ce constructeur
- `modelGroups` → `ModelGroup[]` : Tous les groupes de modèles de ce constructeur

**Exemple de données :**
```json
{
  "id": 88,
  "name": "PEUGEOT",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

### 2. `VehicleModel` (Modèles de véhicules)

**Table SQL :** `vehicle_models`

**Utilité :** Stocke les modèles de véhicules TecDoc (ex: "307 3/5 portes", "Série 3 (G20)"). Un modèle appartient à un constructeur et peut avoir plusieurs versions (vehicles).

**Champs :**

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| `id` | `Int` | ID primaire auto-incrémenté | PK |
| `modelId` | `Int` | ID TecDoc du modèle | Unique, Indexé |
| `modelName` | `String` | Nom du modèle (ex: "307 3/5 portes") | |
| `manufacturerId` | `Int` | ID du constructeur | FK → Manufacturer.id |
| `createdAt` | `DateTime` | Date de création | Auto |
| `updatedAt` | `DateTime` | Date de mise à jour | Auto |

**Relations :**
- `manufacturer` → `Manufacturer` : Le constructeur de ce modèle
- `vehicles` → `Vehicle[]` : Toutes les versions de ce modèle
- `modelGroups` → `ModelGroupModel[]` : Les groupes auxquels ce modèle appartient

**Exemple de données :**
```json
{
  "id": 123,
  "modelId": 456,
  "modelName": "307 3/5 portes",
  "manufacturerId": 88,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

### 3. `ModelGroup` (Groupes de modèles)

**Table SQL :** `model_groups`

**Utilité :** Regroupe les modèles similaires d'un constructeur (ex: "307" regroupe "307 3/5 portes", "307 Break", "307 SW"). Permet une meilleure UX dans le sélecteur de véhicule.

**Champs :**

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| `id` | `Int` | ID primaire auto-incrémenté | PK |
| `manufacturerId` | `Int` | ID du constructeur | FK → Manufacturer.id |
| `groupKey` | `String` | Clé normalisée du groupe (ex: "307") | Unique avec manufacturerId, Indexé |
| `displayName` | `String` | Nom d'affichage (ex: "307") | |
| `confidence` | `String` | Méthode de groupement : "rule" ou "ai" | Défaut: "rule" |
| `createdAt` | `DateTime` | Date de création | Auto |
| `updatedAt` | `DateTime` | Date de mise à jour | Auto |

**Relations :**
- `manufacturer` → `Manufacturer` : Le constructeur de ce groupe
- `models` → `ModelGroupModel[]` : Les modèles appartenant à ce groupe

**Contrainte unique :** `(manufacturerId, groupKey)` : Un constructeur ne peut avoir qu'un seul groupe avec la même clé.

**Exemple de données :**
```json
{
  "id": 1,
  "manufacturerId": 88,
  "groupKey": "307",
  "displayName": "307",
  "confidence": "rule",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

### 4. `ModelGroupModel` (Relation Groupes ↔ Modèles)

**Table SQL :** `model_group_models`

**Utilité :** Table de liaison many-to-many entre `ModelGroup` et `VehicleModel`. Un groupe peut contenir plusieurs modèles, et un modèle peut appartenir à plusieurs groupes (rare).

**Champs :**

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| `id` | `Int` | ID primaire auto-incrémenté | PK |
| `modelGroupId` | `Int` | ID du groupe de modèles | FK → ModelGroup.id, Indexé |
| `vehicleModelId` | `Int` | ID du modèle de véhicule | FK → VehicleModel.id, Indexé |
| `createdAt` | `DateTime` | Date de création | Auto |

**Relations :**
- `modelGroup` → `ModelGroup` : Le groupe
- `vehicleModel` → `VehicleModel` : Le modèle

**Contrainte unique :** `(modelGroupId, vehicleModelId)` : Un modèle ne peut être associé qu'une fois à un groupe.

**Exemple de données :**
```json
{
  "id": 1,
  "modelGroupId": 1,
  "vehicleModelId": 123,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### 5. `Vehicle` (Versions de véhicules)

**Table SQL :** `vehicles`

**Utilité :** Stocke les versions spécifiques d'un modèle (avec moteur, dates de construction, etc.). C'est l'entité de base pour la compatibilité produit-véhicule.

**Champs :**

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| `id` | `Int` | ID primaire auto-incrémenté | PK |
| `vehicleId` | `Int` | ID TecDoc du véhicule (clé principale) | Unique, Indexé |
| `modelId` | `Int` | ID du modèle | FK → VehicleModel.id, Indexé |
| `typeEngineName` | `String?` | Nom du moteur (ex: "1.6 16V") | Nullable |
| `constructionIntervalStart` | `String?` | Date de début de construction (ex: "2000-01-01") | Nullable, Indexé |
| `constructionIntervalEnd` | `String?` | Date de fin de construction (ex: "2005-12-31") | Nullable, Indexé |
| `createdAt` | `DateTime` | Date de création | Auto |
| `updatedAt` | `DateTime` | Date de mise à jour | Auto |

**Relations :**
- `model` → `VehicleModel` : Le modèle de ce véhicule
- `compatibilities` → `ProductVehicleCompatibility[]` : Les produits compatibles avec ce véhicule

**Index composé :** `(constructionIntervalStart, constructionIntervalEnd)` pour les requêtes de recherche par période.

**Exemple de données :**
```json
{
  "id": 1,
  "vehicleId": 30846,
  "modelId": 123,
  "typeEngineName": "1.6 16V",
  "constructionIntervalStart": "2000-01-01",
  "constructionIntervalEnd": "2005-12-31",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Note :** Le `vehicleId` est l'ID TecDoc, qui est la source de vérité pour la compatibilité. C'est ce champ qui est utilisé dans les URLs et pour filtrer les produits.

---

## Tables de produits

### 6. `Product` (Produits)

**Table SQL :** `products`

**Utilité :** Table principale des produits. Stocke toutes les informations d'un produit (nom, fournisseur, EAN, dimensions, etc.).

**Champs :**

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| `id` | `Int` | ID primaire auto-incrémenté | PK |
| `articleNo` | `String` | Numéro d'article (clé unique) | Unique, Indexé |
| `csvId` | `String?` | ID depuis le CSV d'import | Nullable |
| `supplierName` | `String?` | Nom du fournisseur | Nullable, Indexé |
| `productName` | `String?` | Nom du produit | Nullable |
| `eanNumber` | `String?` | Code EAN | Nullable, Indexé |
| `description` | `String?` | Description du produit | Nullable |
| `packageWeight` | `Float?` | Poids de l'emballage (kg) | Nullable |
| `packageHeight` | `Float?` | Hauteur de l'emballage (cm) | Nullable |
| `packageWidth` | `Float?` | Largeur de l'emballage (cm) | Nullable |
| `packageLength` | `Float?` | Longueur de l'emballage (cm) | Nullable |
| `bigcommerceProductId` | `Int?` | ID du produit dans BigCommerce | Nullable, Indexé |
| `productGroupId` | `Int?` | ID du groupe de produits | FK → ProductGroup.id |
| `createdAt` | `DateTime` | Date de création | Auto |
| `updatedAt` | `DateTime` | Date de mise à jour | Auto |

**Relations :**
- `specifications` → `ProductSpecification[]` : Les spécifications techniques
- `oemNumbers` → `ProductOemNumber[]` : Les numéros OEM (constructeurs)
- `compatibilities` → `ProductVehicleCompatibility[]` : Les compatibilités véhicules
- `images` → `ProductImage[]` : Les images du produit
- `productGroup` → `ProductGroup?` : Le groupe de produits (optionnel)
- `interCarsCategories` → `ProductInterCarsCategory[]` : Les catégories InterCars
- `tecDocCategories` → `ProductTecDocCategory[]` : Les catégories TecDoc

**Exemple de données :**
```json
{
  "id": 1,
  "articleNo": "ART-12345",
  "csvId": "CSV-001",
  "supplierName": "Bosch",
  "productName": "Filtre à huile",
  "eanNumber": "1234567890123",
  "description": "Filtre à huile haute qualité",
  "packageWeight": 0.5,
  "packageHeight": 10.0,
  "packageWidth": 10.0,
  "packageLength": 15.0,
  "bigcommerceProductId": 1001,
  "productGroupId": null,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

### 7. `ProductSpecification` (Spécifications produits)

**Table SQL :** `product_specifications`

**Utilité :** Stocke les spécifications techniques d'un produit (paire clé-valeur, ex: "Pression max": "5 bar").

**Champs :**

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| `id` | `Int` | ID primaire auto-incrémenté | PK |
| `productId` | `Int` | ID du produit | FK → Product.id, Indexé |
| `criteriaName` | `String` | Nom du critère (ex: "Pression max") | Indexé |
| `criteriaValue` | `String?` | Valeur du critère (ex: "5 bar") | Nullable |
| `createdAt` | `DateTime` | Date de création | Auto |

**Relations :**
- `product` → `Product` : Le produit

**Exemple de données :**
```json
{
  "id": 1,
  "productId": 1,
  "criteriaName": "Pression max",
  "criteriaValue": "5 bar",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### 8. `ProductOemNumber` (Numéros OEM)

**Table SQL :** `product_oem_numbers`

**Utilité :** Stocke les numéros de référence constructeur (OEM) d'un produit. Un produit peut avoir plusieurs numéros OEM (un par constructeur).

**Champs :**

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| `id` | `Int` | ID primaire auto-incrémenté | PK |
| `productId` | `Int` | ID du produit | FK → Product.id, Indexé |
| `oemBrand` | `String` | Marque constructeur (ex: "PEUGEOT") | Indexé |
| `oemDisplayNo` | `String` | Numéro de référence (ex: "123456") | Indexé |
| `createdAt` | `DateTime` | Date de création | Auto |

**Relations :**
- `product` → `Product` : Le produit

**Exemple de données :**
```json
{
  "id": 1,
  "productId": 1,
  "oemBrand": "PEUGEOT",
  "oemDisplayNo": "123456",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### 9. `ProductImage` (Images produits)

**Table SQL :** `product_images`

**Utilité :** Stocke les images associées à un produit (URL et nom de fichier).

**Champs :**

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| `id` | `Int` | ID primaire auto-incrémenté | PK |
| `productId` | `Int` | ID du produit | FK → Product.id, Indexé |
| `imageUrl` | `String?` | URL de l'image | Nullable |
| `imageFilename` | `String?` | Nom du fichier image | Nullable |
| `createdAt` | `DateTime` | Date de création | Auto |

**Relations :**
- `product` → `Product` : Le produit

**Exemple de données :**
```json
{
  "id": 1,
  "productId": 1,
  "imageUrl": "https://example.com/images/filter.jpg",
  "imageFilename": "filter.jpg",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### 10. `ProductGroup` (Groupes de produits)

**Table SQL :** `product_groups`

**Utilité :** Regroupe les produits ayant le même `productName` et génère des URLs propres. Permet de créer des pages dédiées pour un type de produit (ex: tous les "Filtre à huile").

**Champs :**

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| `id` | `Int` | ID primaire auto-incrémenté | PK |
| `productName` | `String` | Nom du produit (clé unique) | Unique, Indexé |
| `slug` | `String` | Slug pour l'URL (ex: "filtre-a-huile") | Unique, Indexé |
| `displayId` | `String` | ID d'affichage pour l'URL (ex: "123") | Unique, Indexé |
| `tecdocProductId` | `Int?` | ID TecDoc du produit | Nullable, Indexé |
| `url` | `String` | URL complète (ex: "/categorie/filtre-a-huile-123") | Unique |
| `createdAt` | `DateTime` | Date de création | Auto |
| `updatedAt` | `DateTime` | Date de mise à jour | Auto |

**Relations :**
- `categories` → `ProductGroupCategory[]` : Les catégories associées
- `products` → `Product[]` : Les produits de ce groupe

**Exemple de données :**
```json
{
  "id": 1,
  "productName": "Filtre à huile",
  "slug": "filtre-a-huile",
  "displayId": "123",
  "tecdocProductId": 456,
  "url": "/categorie/filtre-a-huile-123",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

## Tables de catégories

### 11. `TecDocCategory` (Catégories TecDoc)

**Table SQL :** `tecdoc_categories`

**Utilité :** Stocke l'arborescence des catégories TecDoc (hiérarchie parent-enfant). Utilisée pour la navigation et le classement des produits.

**Champs :**

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| `id` | `Int` | ID primaire auto-incrémenté | PK |
| `name` | `String` | Nom de la catégorie | |
| `slug` | `String` | Slug pour l'URL | Unique, Indexé |
| `displayId` | `String` | ID d'affichage pour l'URL (ex: "123") | Unique, Indexé |
| `tecdocCategoryId` | `Int?` | ID TecDoc de la catégorie | Nullable, Unique, Indexé |
| `level` | `Int` | Niveau dans la hiérarchie (1, 2, 3, ...) | |
| `parentId` | `Int?` | ID de la catégorie parente | FK → TecDocCategory.id, Indexé |
| `url` | `String` | URL complète (ex: "/categorie/epuration-des-gaz-d-echappement-123") | Unique |
| `createdAt` | `DateTime` | Date de création | Auto |
| `updatedAt` | `DateTime` | Date de mise à jour | Auto |

**Relations :**
- `parent` → `TecDocCategory?` : La catégorie parente (auto-référence)
- `children` → `TecDocCategory[]` : Les catégories enfants
- `productGroups` → `ProductGroupCategory[]` : Les groupes de produits associés
- `productTecDocCategories` → `ProductTecDocCategory[]` : Les produits associés

**Exemple de données :**
```json
{
  "id": 1,
  "name": "Épuration des gaz d'échappement",
  "slug": "epuration-des-gaz-d-echappement",
  "displayId": "123",
  "tecdocCategoryId": 456,
  "level": 1,
  "parentId": null,
  "url": "/categorie/epuration-des-gaz-d-echappement-123",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

### 12. `InterCarsHierarchy` (Hiérarchie InterCars)

**Table SQL :** `intercars_hierarchy`

**Utilité :** Stocke la hiérarchie InterCars à 4 niveaux (Level 1, 2, 3, 4). Chaque ligne représente un chemin complet dans l'arborescence (ex: Moteur → Culasse → Joint culasse → Joint culasse type A).

**Champs :**

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| `id` | `Int` | ID primaire auto-incrémenté | PK |
| `genericArticleId` | `String` | ID générique InterCars (ex: "GenericArticle_3897") | Unique, Indexé |
| `level1Id` | `String` | ID du niveau 1 | Indexé |
| `level1Label` | `String` | Label du niveau 1 (ex: "Engine") | |
| `level1LabelFr` | `String?` | Label français du niveau 1 | Nullable |
| `level2Id` | `String` | ID du niveau 2 | Indexé |
| `level2Label` | `String` | Label du niveau 2 (ex: "Cylinder head") | |
| `level2LabelFr` | `String?` | Label français du niveau 2 | Nullable |
| `level3Id` | `String` | ID du niveau 3 | Indexé |
| `level3Label` | `String` | Label du niveau 3 (ex: "Cylinder head gasket") | |
| `level3LabelFr` | `String?` | Label français du niveau 3 | Nullable |
| `level4Id` | `String?` | ID du niveau 4 (optionnel) | Nullable, Indexé |
| `level4Label` | `String?` | Label du niveau 4 | Nullable |
| `level4LabelFr` | `String?` | Label français du niveau 4 | Nullable |
| `url` | `String?` | URL hiérarchique InterCars | Nullable, Indexé |
| `level1Url` | `String?` | URL du niveau 1 (ex: "/pieces-detachees/filtres-1") | Nullable |
| `level2Url` | `String?` | URL du niveau 2 (ex: "/pieces-detachees/filtre-a-huile-2") | Nullable |
| `level3Url` | `String?` | URL du niveau 3 (ex: "/pieces-detachees/filtre-a-huile-3") | Nullable |
| `level4Url` | `String?` | URL du niveau 4 (ex: "/pieces-detachees/filtre-a-huile-4") | Nullable |
| `childrenLevel2` | `String?` | Navigation: enfants niveau 2 depuis niveau 1 (JSON) | Nullable |
| `childrenLevel3` | `String?` | Navigation: enfants niveau 3 depuis niveau 2 (JSON) | Nullable |
| `childrenLevel4` | `String?` | Navigation: enfants niveau 4 depuis niveau 3 (JSON) | Nullable |
| `createdAt` | `DateTime` | Date de création | Auto |
| `updatedAt` | `DateTime` | Date de mise à jour | Auto |

**Relations :**
- `categories` → `InterCarsCategory[]` : Les catégories InterCars liées

**Exemple de données :**
```json
{
  "id": 1,
  "genericArticleId": "GenericArticle_3897",
  "level1Id": "L1_001",
  "level1Label": "Engine",
  "level1LabelFr": "Moteur",
  "level2Id": "L2_001",
  "level2Label": "Cylinder head",
  "level2LabelFr": "Culasse",
  "level3Id": "L3_001",
  "level3Label": "Cylinder head gasket",
  "level3LabelFr": "Joint culasse",
  "level4Id": null,
  "level4Label": null,
  "level4LabelFr": null,
  "url": "/fuel-feed-system/pressure-accumulator-hoses/pressure-accumulator",
  "level1Url": "/pieces-detachees/moteur-1",
  "level2Url": "/pieces-detachees/culasse-2",
  "level3Url": "/pieces-detachees/joint-culasse-3",
  "level4Url": null,
  "childrenLevel2": "[{\"id\":\"L2_001\",\"label\":\"Cylinder head\",\"url\":\"/pieces-detachees/culasse-2\"}]",
  "childrenLevel3": null,
  "childrenLevel4": null,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Notes :**
- Les champs `childrenLevel2`, `childrenLevel3`, `childrenLevel4` contiennent du JSON stringifié pour stocker la navigation hiérarchique.
- Le niveau 4 est optionnel : certaines catégories s'arrêtent au niveau 3.

---

### 13. `InterCarsCategory` (Catégories InterCars)

**Table SQL :** `intercars_categories`

**Utilité :** Stocke les correspondances entre `productName` et les catégories InterCars. Une catégorie peut être liée à la hiérarchie InterCars via `hierarchyId`.

**Champs :**

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| `id` | `Int` | ID primaire auto-incrémenté | PK |
| `productName` | `String` | Nom du produit | Indexé |
| `csvId` | `String` | ID CSV utilisé pour l'appel API | Indexé |
| `genericArticleId` | `String` | ID générique InterCars (ex: "GenericArticle_82") | Indexé |
| `categoryName` | `String?` | Nom de la catégorie (ex: "Brake disc") | Nullable |
| `isPrimary` | `Boolean` | Si `primary: true` dans la réponse API | Défaut: false |
| `apiResponse` | `String?` | JSON de la réponse API complète | Nullable |
| `hierarchyId` | `Int?` | ID de la hiérarchie InterCars | FK → InterCarsHierarchy.id, Indexé |
| `createdAt` | `DateTime` | Date de création | Auto |
| `updatedAt` | `DateTime` | Date de mise à jour | Auto |

**Relations :**
- `hierarchy` → `InterCarsHierarchy?` : La hiérarchie associée (optionnel)
- `products` → `ProductInterCarsCategory[]` : Les produits associés

**Index composé :** `(productName, genericArticleId)` pour les recherches combinées.

**Exemple de données :**
```json
{
  "id": 1,
  "productName": "Filtre à huile",
  "csvId": "CSV-001",
  "genericArticleId": "GenericArticle_82",
  "categoryName": "Oil filter",
  "isPrimary": true,
  "apiResponse": "{\"categories\": [...]}",
  "hierarchyId": 1,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

## Tables de relations

### 14. `ProductVehicleCompatibility` (Compatibilité Produit ↔ Véhicule)

**Table SQL :** `product_vehicle_compatibility`

**Utilité :** Table de liaison many-to-many entre `Product` et `Vehicle`. Définit quels produits sont compatibles avec quels véhicules. C'est la table centrale du système de compatibilité.

**Champs :**

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| `id` | `Int` | ID primaire auto-incrémenté | PK |
| `productId` | `Int` | ID du produit | FK → Product.id, Indexé |
| `vehicleId` | `Int` | ID du véhicule (référence à Vehicle.vehicleId) | FK → Vehicle.id, Indexé |
| `createdAt` | `DateTime` | Date de création | Auto |

**Relations :**
- `product` → `Product` : Le produit
- `vehicle` → `Vehicle` : Le véhicule

**Contrainte unique :** `(productId, vehicleId)` : Un produit ne peut être compatible qu'une fois avec un véhicule.

**Exemple de données :**
```json
{
  "id": 1,
  "productId": 1,
  "vehicleId": 1,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Note :** Le `vehicleId` dans cette table fait référence à `Vehicle.id` (pas `Vehicle.vehicleId` directement, mais via la relation Prisma).

---

### 15. `ProductGroupCategory` (Relation Groupes de produits ↔ Catégories TecDoc)

**Table SQL :** `product_group_categories`

**Utilité :** Table de liaison many-to-many entre `ProductGroup` et `TecDocCategory`. Définit quelles catégories TecDoc sont associées à quels groupes de produits.

**Champs :**

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| `id` | `Int` | ID primaire auto-incrémenté | PK |
| `productGroupId` | `Int` | ID du groupe de produits | FK → ProductGroup.id, Indexé |
| `tecdocCategoryId` | `Int` | ID de la catégorie TecDoc | FK → TecDocCategory.id, Indexé |
| `createdAt` | `DateTime` | Date de création | Auto |

**Relations :**
- `productGroup` → `ProductGroup` : Le groupe de produits
- `category` → `TecDocCategory` : La catégorie TecDoc

**Contrainte unique :** `(productGroupId, tecdocCategoryId)` : Un groupe ne peut être associé qu'une fois à une catégorie.

**Exemple de données :**
```json
{
  "id": 1,
  "productGroupId": 1,
  "tecdocCategoryId": 1,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### 16. `ProductTecDocCategory` (Relation Produit ↔ Catégorie TecDoc)

**Table SQL :** `product_tecdoc_categories`

**Utilité :** Table de liaison many-to-many entre `Product` et `TecDocCategory`. Définit quelles catégories TecDoc sont associées à quels produits.

**Champs :**

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| `id` | `Int` | ID primaire auto-incrémenté | PK |
| `productId` | `Int` | ID du produit | FK → Product.id, Indexé |
| `tecdocCategoryId` | `Int` | ID de la catégorie TecDoc | FK → TecDocCategory.id, Indexé |
| `createdAt` | `DateTime` | Date de création | Auto |

**Relations :**
- `product` → `Product` : Le produit
- `tecDocCategory` → `TecDocCategory` : La catégorie TecDoc

**Contrainte unique :** `(productId, tecdocCategoryId)` : Un produit ne peut être associé qu'une fois à une catégorie.

**Exemple de données :**
```json
{
  "id": 1,
  "productId": 1,
  "tecdocCategoryId": 1,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### 17. `ProductInterCarsCategory` (Relation Produit ↔ Catégorie InterCars)

**Table SQL :** `product_intercars_categories`

**Utilité :** Table de liaison many-to-many entre `Product` et `InterCarsCategory`. Définit quelles catégories InterCars sont associées à quels produits.

**Champs :**

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| `id` | `Int` | ID primaire auto-incrémenté | PK |
| `productId` | `Int` | ID du produit | FK → Product.id, Indexé |
| `interCarsCategoryId` | `Int` | ID de la catégorie InterCars | FK → InterCarsCategory.id, Indexé |
| `createdAt` | `DateTime` | Date de création | Auto |

**Relations :**
- `product` → `Product` : Le produit
- `interCarsCategory` → `InterCarsCategory` : La catégorie InterCars

**Contrainte unique :** `(productId, interCarsCategoryId)` : Un produit ne peut être associé qu'une fois à une catégorie.

**Exemple de données :**
```json
{
  "id": 1,
  "productId": 1,
  "interCarsCategoryId": 1,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

## Table de stockage temporaire

### 18. `ProductSample` (Échantillons de produits)

**Table SQL :** `product_samples`

**Utilité :** Table temporaire utilisée pour isoler 2 produits par `productName` (probablement pour l'analyse ou le traitement par lots).

**Champs :**

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| `id` | `Int` | ID primaire auto-incrémenté | PK |
| `csvId` | `String?` | ID CSV | Nullable, Indexé |
| `productName` | `String?` | Nom du produit | Nullable, Indexé |
| `createdAt` | `DateTime` | Date de création | Auto |
| `updatedAt` | `DateTime` | Date de mise à jour | Auto |

**Relations :** Aucune

**Exemple de données :**
```json
{
  "id": 1,
  "csvId": "CSV-001",
  "productName": "Filtre à huile",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

## Schéma de relations complet

### Vue d'ensemble des relations

```
Manufacturer (1) ──┐
                   ├─→ (N) VehicleModel (1) ──→ (N) Vehicle (1) ──→ (N) ProductVehicleCompatibility (N) ──→ (1) Product
                   │
                   └─→ (N) ModelGroup (1) ──→ (N) ModelGroupModel (N) ──→ (1) VehicleModel
                                                                                       │
                                                                                       └─→ (N) Vehicle

Product (1) ──→ (N) ProductSpecification
         │
         ├─→ (N) ProductOemNumber
         │
         ├─→ (N) ProductImage
         │
         ├─→ (N) ProductVehicleCompatibility
         │
         ├─→ (N) ProductInterCarsCategory (N) ──→ (1) InterCarsCategory (N) ──→ (1) InterCarsHierarchy
         │
         ├─→ (N) ProductTecDocCategory (N) ──→ (1) TecDocCategory (1) ──→ (N) TecDocCategory (parent/children)
         │
         └─→ (1) ProductGroup (N) ──→ (N) ProductGroupCategory (N) ──→ (1) TecDocCategory
```

### Relations importantes

1. **Compatibilité produit-véhicule** : `Product` ↔ `ProductVehicleCompatibility` ↔ `Vehicle`
   - Permet de filtrer les produits par véhicule
   - Utilisé pour les pages `/pieces-detachees/[categorie]/[brand]/[group]/[model]/[vehicle]`

2. **Hiérarchie véhicules** : `Manufacturer` → `VehicleModel` → `Vehicle`
   - Structure complète des véhicules
   - `ModelGroup` regroupe les modèles similaires pour l'UX

3. **Catégorisation produits** :
   - **InterCars** : `Product` ↔ `ProductInterCarsCategory` ↔ `InterCarsCategory` ↔ `InterCarsHierarchy`
   - **TecDoc** : `Product` ↔ `ProductTecDocCategory` ↔ `TecDocCategory`

4. **Groupes de produits** : `Product` → `ProductGroup` ↔ `ProductGroupCategory` ↔ `TecDocCategory`
   - Regroupe les produits par `productName`
   - Génère des URLs propres

---

## Notes importantes

1. **IDs TecDoc** : Les champs `vehicleId`, `modelId`, `tecdocCategoryId` contiennent les IDs originaux de TecDoc, qui sont la source de vérité pour la compatibilité.

2. **Cascade de suppression** : La plupart des relations utilisent `onDelete: Cascade`, ce qui signifie que la suppression d'un parent supprime automatiquement tous les enfants.

3. **Indexation** : Les champs fréquemment utilisés dans les requêtes sont indexés pour améliorer les performances.

4. **JSON dans les champs texte** : `InterCarsHierarchy.childrenLevel2/3/4` et `InterCarsCategory.apiResponse` contiennent du JSON stringifié.

5. **Nullable vs Not Null** : Les champs optionnels sont marqués `String?` (nullable) pour permettre des valeurs `NULL` en base de données.

---

## Statistiques actuelles (approximatives)

D'après les imports réalisés :

- **Manufacturers** : ~698 constructeurs
- **VehicleModels** : ~24 000 modèles
- **ModelGroups** : ~6 334 groupes
- **Vehicles** : ~200 000+ véhicules
- **Products** : Variable (selon l'import)
- **InterCarsCategories** : Variable (selon l'import InterCars)
- **ProductVehicleCompatibility** : Variable (selon la compatibilité)

---

## Utilisation dans le code

### Fichiers principaux

- **Queries** : `core/lib/db/intercars-queries.ts` - Requêtes pour InterCars
- **Queries** : `core/lib/db/queries.ts` - Requêtes générales
- **Schema** : `core/prisma/schema.prisma` - Schéma Prisma
- **Client** : `core/lib/db/index.ts` - Client Prisma

### Exemples de requêtes

```typescript
// Récupérer un véhicule par ID TecDoc
const vehicle = await db.vehicle.findUnique({
  where: { vehicleId: 30846 },
  include: { model: { include: { manufacturer: true } } }
});

// Récupérer les produits compatibles avec un véhicule
const products = await db.product.findMany({
  where: {
    compatibilities: {
      some: { vehicle: { vehicleId: 30846 } }
    }
  }
});

// Récupérer les catégories InterCars avec produits compatibles
const categories = await db.interCarsHierarchy.findMany({
  where: {
    categories: {
      some: {
        products: {
          some: {
            product: {
              compatibilities: {
                some: { vehicle: { vehicleId: 30846 } }
              }
            }
          }
        }
      }
    }
  }
});
```







