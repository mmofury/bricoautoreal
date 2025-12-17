# URLs de Test pour les API Routes

Base URL: `http://localhost:3000`

## 🚗 Routes Véhicules

### 1. Liste de tous les constructeurs
```
GET http://localhost:3000/api/vehicles/manufacturers
```

### 2. Modèles d'un constructeur (ex: BMW)
```
GET http://localhost:3000/api/vehicles/models?manufacturer=BMW
```

### 3. Véhicules par constructeur (ex: BMW)
```
GET http://localhost:3000/api/vehicles/by-manufacturer?manufacturer=BMW
```

### 4. Véhicules par modèle (ex: 3 Series)
```
GET http://localhost:3000/api/vehicles/by-model?model=3%20Series
```

## 🔧 Routes Produits

### 5. Recherche avancée - Par constructeur et modèle
```
GET http://localhost:3000/api/products/search?manufacturerName=BMW&modelName=3%20Series&limit=10
```

### 6. Recherche avancée - Par numéro d'article
```
GET http://localhost:3000/api/products/search?articleNo=00-216-1912L
```

### 7. Recherche avancée - Par fournisseur
```
GET http://localhost:3000/api/products/search?supplierName=ABAKUS&limit=20
```

### 8. Produits par véhicule (remplacez 12345 par un vehicleId réel)
```
GET http://localhost:3000/api/products/by-vehicle/12345
```

**Pour trouver un vehicleId réel, utilisez d'abord :**
```
GET http://localhost:3000/api/vehicles/by-manufacturer?manufacturer=BMW
```
Puis utilisez un `vehicleId` de la réponse.

### 9. Produit par numéro d'article
```
GET http://localhost:3000/api/products/by-article/00-216-1912L
```

### 10. Produits par numéro OEM
```
GET http://localhost:3000/api/products/by-oem/UH7751160
```

### 11. Produits par constructeur/modèle
```
GET http://localhost:3000/api/products/by-manufacturer?manufacturer=BMW&model=3%20Series
```

### 12. Compatibilités d'un produit (remplacez 1234 par un productId réel)
```
GET http://localhost:3000/api/products/1234/compatibility
```

**Pour trouver un productId réel, utilisez d'abord :**
```
GET http://localhost:3000/api/products/by-article/00-216-1912L
```
Puis utilisez l'`id` de la réponse.

## 📝 Exemples avec cURL (PowerShell)

### Liste des constructeurs
```powershell
curl http://localhost:3000/api/vehicles/manufacturers
```

### Modèles BMW
```powershell
curl "http://localhost:3000/api/vehicles/models?manufacturer=BMW"
```

### Recherche produits BMW 3 Series
```powershell
curl "http://localhost:3000/api/products/search?manufacturerName=BMW&modelName=3%20Series&limit=5"
```

### Produit par numéro d'article
```powershell
curl "http://localhost:3000/api/products/by-article/00-216-1912L"
```

## 🌐 Test dans le navigateur

Copiez-collez ces URLs directement dans votre navigateur :

1. **Constructeurs :**
   ```
   http://localhost:3000/api/vehicles/manufacturers
   ```

2. **Modèles BMW :**
   ```
   http://localhost:3000/api/vehicles/models?manufacturer=BMW
   ```

3. **Produits BMW :**
   ```
   http://localhost:3000/api/products/search?manufacturerName=BMW&limit=10
   ```

4. **Produit spécifique :**
   ```
   http://localhost:3000/api/products/by-article/00-216-1912L
   ```

## 🔍 Workflow de test recommandé

1. **Commencer par les constructeurs :**
   ```
   GET /api/vehicles/manufacturers
   ```
   → Notez quelques noms de constructeurs (ex: BMW, VW, MAZDA)

2. **Récupérer les modèles d'un constructeur :**
   ```
   GET /api/vehicles/models?manufacturer=BMW
   ```
   → Notez quelques noms de modèles

3. **Récupérer les véhicules :**
   ```
   GET /api/vehicles/by-manufacturer?manufacturer=BMW
   ```
   → Notez un `vehicleId`

4. **Tester la recherche de produits :**
   ```
   GET /api/products/search?manufacturerName=BMW&modelName=3%20Series&limit=10
   ```

5. **Récupérer un produit spécifique :**
   ```
   GET /api/products/by-article/00-216-1912L
   ```
   → Notez l'`id` du produit

6. **Voir les compatibilités du produit :**
   ```
   GET /api/products/[productId]/compatibility
   ```

## ⚠️ Notes importantes

- Remplacez les valeurs d'exemple (`12345`, `1234`) par des IDs réels de votre base de données
- Les espaces dans les URLs doivent être encodés en `%20`
- Le paramètre `limit` permet de limiter le nombre de résultats (défaut: 50)
- Utilisez `offset` pour la pagination

































