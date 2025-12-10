# Arborescence de Navigation TecDoc

## Exemple : "Accumulateur de pression, freinage"

### Structure hiérarchique

```
Niveau 1: Dispositif de freinage [ID: 100006]
  └── Niveau 2: Accumulateur de pression / pressostat [ID: null]
      └── Niveau 3: Accumulateur de pression, freinage [ID: 100382]
          └── ProductId TecDoc: 1064
```

### Navigation proposée

#### Option A : Navigation par slugs (noms)

```
/categorie/dispositif-de-freinage
  → Affiche toutes les sous-catégories du niveau 1
  → Exemples : "Accumulateur de pression / pressostat", "Étrier de frein", etc.

/categorie/dispositif-de-freinage/accumulateur-de-pression-pressostat
  → Affiche tous les produits de cette sous-catégorie
  → Exemples : "Accumulateur de pression, freinage", "Accumulateur de pression, embrayage", etc.

/categorie/dispositif-de-freinage/accumulateur-de-pression-pressostat/accumulateur-de-pression-freinage
  → Affiche tous les produits avec ce productName
  → Tous vos produits qui ont "Accumulateur de pression, freinage" comme productName
```

#### Option B : Navigation par IDs TecDoc

```
/categorie/100006
  → Dispositif de freinage (niveau 1)

/categorie/100006/100382
  → Pressure Accumulator/Switch (niveau 3)
  → Affiche tous les produits avec productName = "Accumulateur de pression, freinage"
```

#### Option C : Navigation hybride (recommandée)

```
/categorie/dispositif-de-freinage
  → Niveau 1 : Liste des catégories principales

/categorie/dispositif-de-freinage/accumulateur-de-pression-pressostat
  → Niveau 2 : Sous-catégories et produits

/categorie/dispositif-de-freinage/accumulateur-de-pression-pressostat/100382
  → Niveau 3 : Produits de cette catégorie finale
  → Affiche tous les produits avec productName = "Accumulateur de pression, freinage"
```

### Mapping avec vos produits

Pour chaque produit dans votre base de données :
- `productName` = "Accumulateur de pression, freinage"
- Ces produits apparaîtront dans la page :
  `/categorie/dispositif-de-freinage/accumulateur-de-pression-pressostat/100382`

### Structure de données nécessaire

1. **Table `tecdoc_categories`** :
   - `id` (auto)
   - `tecdoc_category_id` (100006, 100382, etc. ou null)
   - `name` ("Dispositif de freinage")
   - `slug` ("dispositif-de-freinage")
   - `level` (1, 2, 3...)
   - `parent_id` (référence vers catégorie parente)
   - `path` ("dispositif-de-freinage/accumulateur-de-pression-pressostat")

2. **Table `product_tecdoc_category`** (many-to-many) :
   - `product_id` → vos produits (via articleNo)
   - `tecdoc_category_id` → catégorie finale (100382)
   - `product_name` → "Accumulateur de pression, freinage"

### Exemple de requête

Pour afficher tous les produits "Accumulateur de pression, freinage" :

```sql
SELECT p.* 
FROM products p
JOIN product_tecdoc_category ptc ON p.id = ptc.product_id
JOIN tecdoc_categories tc ON ptc.tecdoc_category_id = tc.id
WHERE tc.tecdoc_category_id = 100382
  OR p.product_name = 'Accumulateur de pression, freinage'
```






























