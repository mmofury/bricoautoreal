# API Routes - Pièces Auto

Documentation des routes API pour interroger la base de données des pièces auto.

## Routes Produits

### Recherche de produits (recherche avancée)
```
GET /api/products/search
```

**Paramètres de requête :**
- `articleNo` (string, optionnel) - Numéro d'article
- `supplierName` (string, optionnel) - Nom du fournisseur
- `productName` (string, optionnel) - Nom du produit
- `manufacturerName` (string, optionnel) - Constructeur
- `modelName` (string, optionnel) - Modèle de véhicule
- `vehicleId` (number, optionnel) - ID du véhicule
- `oemNumber` (string, optionnel) - Numéro OEM
- `limit` (number, optionnel, défaut: 50) - Nombre de résultats
- `offset` (number, optionnel, défaut: 0) - Pagination

**Exemple :**
```
GET /api/products/search?manufacturerName=BMW&modelName=3%20Series&limit=20
```

### Produits par véhicule
```
GET /api/products/by-vehicle/[vehicleId]
```

**Exemple :**
```
GET /api/products/by-vehicle/12345
```

### Produit par numéro d'article
```
GET /api/products/by-article/[articleNo]
```

**Exemple :**
```
GET /api/products/by-article/00-216-1912L
```

### Produits par numéro OEM
```
GET /api/products/by-oem/[oemNumber]
```

**Exemple :**
```
GET /api/products/by-oem/UH7751160
```

### Produits par constructeur/modèle
```
GET /api/products/by-manufacturer?manufacturer=BMW&model=3%20Series
```

**Paramètres :**
- `manufacturer` (requis) - Nom du constructeur
- `model` (optionnel) - Nom du modèle

### Compatibilités d'un produit
```
GET /api/products/[productId]/compatibility
```

**Exemple :**
```
GET /api/products/1234/compatibility
```

## Routes Véhicules

### Liste des constructeurs
```
GET /api/vehicles/manufacturers
```

Retourne tous les constructeurs automobiles disponibles.

### Modèles d'un constructeur
```
GET /api/vehicles/models?manufacturer=BMW
```

**Paramètres :**
- `manufacturer` (requis) - Nom du constructeur

### Véhicules par constructeur
```
GET /api/vehicles/by-manufacturer?manufacturer=BMW
```

**Paramètres :**
- `manufacturer` (requis) - Nom du constructeur

### Véhicules par modèle
```
GET /api/vehicles/by-model?model=3%20Series
```

**Paramètres :**
- `model` (requis) - Nom du modèle

## Format de réponse

Toutes les routes retournent un JSON avec cette structure :

```json
{
  "success": true,
  "data": [...],
  "count": 10
}
```

En cas d'erreur :
```json
{
  "success": false,
  "error": "Message d'erreur"
}
```

## Exemples d'utilisation

### Rechercher des produits compatibles avec un véhicule BMW 3 Series
```bash
curl "http://localhost:3000/api/products/search?manufacturerName=BMW&modelName=3%20Series"
```

### Obtenir tous les constructeurs
```bash
curl "http://localhost:3000/api/vehicles/manufacturers"
```

### Obtenir les modèles BMW
```bash
curl "http://localhost:3000/api/vehicles/models?manufacturer=BMW"
```

### Rechercher un produit par numéro d'article
```bash
curl "http://localhost:3000/api/products/by-article/00-216-1912L"
```


































