# Solution pour la Navigation TecDoc - Gestion des Langues

## Problème identifié

Dans la structure JSON, il y a une incohérence :
- Les **clés de l'objet** `arborescence` sont en **français** ✅
- Le champ `categoryName` peut être en **anglais** ❌

### Exemple

```json
{
  "arborescence": {
    "Dispositif de freinage": {                    // ← Clé en FRANÇAIS ✅
      "categoryName": "Dispositif de freinage",     // ← FRANÇAIS ✅
      "children": {
        "Accumulateur de pression / pressostat": {  // ← Clé en FRANÇAIS ✅
          "categoryName": "Accumulateur de pression / pressostat", // ← FRANÇAIS ✅
          "children": {
            "Accumulateur de pression, freinage": { // ← Clé en FRANÇAIS ✅
              "categoryName": "Pressure Accumulator/Switch", // ← ANGLAIS ❌
              "categoryId": 100382
            }
          }
        }
      }
    }
  }
}
```

## Solution : Utiliser les clés de l'objet

**Règle** : Pour la navigation, utiliser **TOUJOURS les clés de l'objet** (qui sont en français), jamais le `categoryName`.

### Structure de navigation

```
/categorie/dispositif-de-freinage
  → Clé: "Dispositif de freinage" ✅

/categorie/dispositif-de-freinage/accumulateur-de-pression-pressostat
  → Clé: "Accumulateur de pression / pressostat" ✅

/categorie/dispositif-de-freinage/accumulateur-de-pression-pressostat/accumulateur-de-pression-freinage
  → Clé: "Accumulateur de pression, freinage" ✅
  → IGNORE le categoryName "Pressure Accumulator/Switch"
```

### Algorithme de parsing

```typescript
function parseArborescence(arbo: Record<string, any>, path: string[] = []): CategoryNode[] {
  const nodes: CategoryNode[] = [];
  
  for (const [key, value] of Object.entries(arbo)) {
    // key = nom en français (ex: "Dispositif de freinage")
    // value.categoryName = peut être en anglais, on l'ignore pour la navigation
    
    const node: CategoryNode = {
      name: key,                    // ← Utiliser la clé (français)
      slug: slugify(key),           // ← Slug basé sur la clé
      categoryId: value.categoryId,  // ← ID TecDoc (pour requêtes)
      level: value.level,
      path: [...path, slugify(key)],
      children: []
    };
    
    if (value.children && Object.keys(value.children).length > 0) {
      node.children = parseArborescence(value.children, node.path);
    }
    
    nodes.push(node);
  }
  
  return nodes;
}
```

### Structure de données dans la base

```sql
CREATE TABLE tecdoc_categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,              -- Nom français (clé de l'objet)
  slug TEXT NOT NULL UNIQUE,       -- Slug basé sur le nom français
  tecdoc_category_id INTEGER,      -- ID TecDoc (peut être null)
  level INTEGER NOT NULL,
  parent_id INTEGER,
  path TEXT NOT NULL,              -- Chemin complet en slugs
  FOREIGN KEY (parent_id) REFERENCES tecdoc_categories(id)
);
```

### Exemple de données

| id | name | slug | tecdoc_category_id | level | path |
|----|------|------|-------------------|-------|------|
| 1 | Dispositif de freinage | dispositif-de-freinage | 100006 | 1 | dispositif-de-freinage |
| 2 | Accumulateur de pression / pressostat | accumulateur-de-pression-pressostat | null | 2 | dispositif-de-freinage/accumulateur-de-pression-pressostat |
| 3 | Accumulateur de pression, freinage | accumulateur-de-pression-freinage | 100382 | 3 | dispositif-de-freinage/accumulateur-de-pression-pressostat/accumulateur-de-pression-freinage |

### Avantages

1. ✅ **Navigation toujours en français** : Les URLs utilisent les noms français
2. ✅ **Cohérence** : Tous les slugs basés sur les clés (français)
3. ✅ **Pas de traduction nécessaire** : On ignore le categoryName anglais
4. ✅ **Mapping simple** : Un productName français → une catégorie française

### Mapping produit → catégorie

Pour un produit avec `productName = "Accumulateur de pression, freinage"` :

```sql
SELECT p.* 
FROM products p
WHERE p.product_name = 'Accumulateur de pression, freinage'
```

Puis trouver la catégorie :
```sql
SELECT tc.*
FROM tecdoc_categories tc
WHERE tc.slug = 'accumulateur-de-pression-freinage'
  AND tc.path LIKE '%accumulateur-de-pression-freinage'
```

## Conclusion

**Utiliser les clés de l'objet JSON (français) pour la navigation, ignorer le categoryName qui peut être en anglais.**































