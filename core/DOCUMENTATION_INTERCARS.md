# Documentation des Tables InterCars

## Vue d'ensemble

Le système InterCars permet de catégoriser les produits selon une hiérarchie à 4 niveaux basée sur l'API InterCars. Cette documentation décrit en détail les 3 tables principales créées pour gérer cette catégorisation.

---

## 📊 Table 1: `InterCarsCategory`

### Description
Cette table stocke les correspondances directes entre les `productName` (noms de produits) et les catégories InterCars obtenues via l'API. Elle enregistre chaque appel API effectué pour un `csvId` donné, même si plusieurs `csvId` du même `productName` retournent des catégories différentes.

### Colonnes

| Colonne | Type | Nullable | Description |
|---------|------|----------|-------------|
| `id` | `Int` | ❌ | Clé primaire auto-incrémentée |
| `productName` | `String` | ❌ | Nom du produit (ex: "Disque de frein", "Capot-moteur"). Correspond au champ `productName` de la table `Product` |
| `csvId` | `String` | ❌ | Identifiant CSV utilisé pour l'appel API InterCars (ex: "F6E7D3", "B468ED"). C'est le SKU utilisé dans la requête API |
| `genericArticleId` | `String` | ❌ | Identifiant de l'article générique InterCars (ex: "GenericArticle_82", "GenericArticle_3897"). C'est l'ID de catégorie retourné par l'API |
| `categoryName` | `String` | ✅ | Nom de la catégorie en anglais retourné par l'API (ex: "Brake disc", "Pressure accumulator"). Peut être null si non fourni |
| `isPrimary` | `Boolean` | ❌ | Indique si cette catégorie est la catégorie principale (`primary: true` dans la réponse API). Par défaut: `false` |
| `apiResponse` | `String` | ✅ | JSON complet de la réponse API InterCars pour cet appel. Stocké en texte pour référence future et debugging |
| `hierarchyId` | `Int` | ✅ | Clé étrangère vers `InterCarsHierarchy.id`. Lie cette catégorie à sa hiérarchie complète (niveaux 1-4). Null si la hiérarchie n'existe pas encore |
| `createdAt` | `DateTime` | ❌ | Date de création de l'enregistrement |
| `updatedAt` | `DateTime` | ❌ | Date de dernière mise à jour (auto-mise à jour) |

### Index
- `productName` : Recherche rapide par nom de produit
- `csvId` : Recherche rapide par identifiant CSV
- `genericArticleId` : Recherche rapide par ID d'article générique
- `(productName, genericArticleId)` : Index composite pour éviter les doublons
- `hierarchyId` : Recherche rapide de la hiérarchie associée

### Relations
- **Vers `InterCarsHierarchy`** : Relation optionnelle (via `hierarchyId`) vers la hiérarchie complète
- **Vers `ProductInterCarsCategory`** : Relation one-to-many vers les produits liés

### Exemple d'utilisation
```typescript
// Enregistrer une correspondance après un appel API
await prisma.interCarsCategory.create({
  data: {
    productName: "Disque de frein",
    csvId: "F6E7D3",
    genericArticleId: "GenericArticle_82",
    categoryName: "Brake disc",
    isPrimary: true,
    apiResponse: JSON.stringify(apiResponse),
  },
});
```

### Notes importantes
- **Multiplicité** : Un même `productName` peut avoir plusieurs entrées si différents `csvId` retournent des catégories différentes
- **Source de données** : Remplie par le script `build-arborescence-from-intercars-api.ts` lors des appels API
- **Lien hiérarchie** : Le champ `hierarchyId` est rempli par le script `populate-intercars-hierarchy.ts` après création de la hiérarchie

---

## 🌳 Table 2: `InterCarsHierarchy`

### Description
Cette table stocke la hiérarchie complète à 4 niveaux pour chaque `genericArticleId` InterCars. Elle est construite à partir des fichiers JSON (`level1.json`, `level2.json`, `level3.json`, `level4.json`) et contient les labels en anglais et leurs traductions françaises.

### Colonnes

| Colonne | Type | Nullable | Description |
|---------|------|----------|-------------|
| `id` | `Int` | ❌ | Clé primaire auto-incrémentée |
| `genericArticleId` | `String` | ❌ | Identifiant unique de l'article générique InterCars (ex: "GenericArticle_82", "GenericArticle_3897"). **UNIQUE** - une seule hiérarchie par `genericArticleId` |
| `level1Id` | `String` | ❌ | ID du niveau 1 (ex: "SalesClassificationNode_6800000") |
| `level1Label` | `String` | ❌ | Label anglais du niveau 1 (ex: "Electric/wiring system") |
| `level1LabelFr` | `String` | ✅ | Traduction française du niveau 1 (ex: "Système électrique/câblage") |
| `level2Id` | `String` | ❌ | ID du niveau 2 (ex: "SalesClassificationNode_6811000") |
| `level2Label` | `String` | ❌ | Label anglais du niveau 2 (ex: "Electric engine system") |
| `level2LabelFr` | `String` | ✅ | Traduction française du niveau 2 (ex: "Système de moteur électrique") |
| `level3Id` | `String` | ❌ | ID du niveau 3 (peut être un `GenericArticle_` ou un `SalesClassificationNode_`) |
| `level3Label` | `String` | ❌ | Label anglais du niveau 3 (ex: "Battery") |
| `level3LabelFr` | `String` | ✅ | Traduction française du niveau 3 (ex: "Batterie") |
| `level4Id` | `String` | ✅ | ID du niveau 4 (ex: "GenericArticle_1"). **NULL** si la catégorie s'arrête au niveau 3 |
| `level4Label` | `String` | ✅ | Label anglais du niveau 4 (ex: "Starting battery"). **NULL** si pas de niveau 4 |
| `level4LabelFr` | `String` | ✅ | Traduction française du niveau 4 (ex: "Batterie de démarrage"). **NULL** si pas de niveau 4 |
| `url` | `String` | ✅ | URL hiérarchique générée automatiquement (ex: "/fuel-feed-system/pressure-accumulator-hoses/pressure-accumulator"). Générée à partir des slugs des niveaux |
| `createdAt` | `DateTime` | ❌ | Date de création de l'enregistrement |
| `updatedAt` | `DateTime` | ❌ | Date de dernière mise à jour (auto-mise à jour) |

### Index
- `genericArticleId` : Index unique (clé primaire logique)
- `level1Id` : Recherche rapide par niveau 1
- `level2Id` : Recherche rapide par niveau 2
- `level3Id` : Recherche rapide par niveau 3
- `level4Id` : Recherche rapide par niveau 4
- `url` : Recherche rapide par URL

### Relations
- **Vers `InterCarsCategory`** : Relation one-to-many (via `InterCarsCategory.hierarchyId`)

### Structure hiérarchique
```
Level 1 (Ex: "Electric/wiring system")
  └─ Level 2 (Ex: "Electric engine system")
      └─ Level 3 (Ex: "Battery")
          └─ Level 4 (Ex: "Starting battery") [optionnel]
```

### Exemple d'utilisation
```typescript
// Récupérer la hiérarchie complète pour un genericArticleId
const hierarchy = await prisma.interCarsHierarchy.findUnique({
  where: { genericArticleId: "GenericArticle_82" },
});

// Résultat:
// {
//   level1Label: "Brake system",
//   level1LabelFr: "Système de freinage",
//   level2Label: "Brake disc",
//   level2LabelFr: "Disque de frein",
//   level3Label: "Brake disc",
//   level3LabelFr: "Disque de frein",
//   level4Label: "Brake disc",
//   level4LabelFr: "Disque de frein",
//   url: "/brake-system/brake-disc/brake-disc"
// }
```

### Notes importantes
- **Source de données** : Remplie depuis les fichiers JSON (`level3.json` et `level4.json`) par le script `populate-intercars-hierarchy.ts`
- **Traductions** : Les traductions françaises sont ajoutées par le script `translate-intercars-to-french.ts`
- **URLs** : Générées automatiquement par le script `generate-intercars-urls.ts` à partir des slugs des labels
- **Niveau 4 optionnel** : Certaines catégories s'arrêtent au niveau 3, donc `level4Id` et `level4Label` peuvent être null

---

## 🔗 Table 3: `ProductInterCarsCategory`

### Description
Table de liaison many-to-many entre `Product` et `InterCarsCategory`. Elle permet de lier chaque produit à une ou plusieurs catégories InterCars, permettant ainsi de naviguer dans la hiérarchie InterCars depuis n'importe quel produit.

### Colonnes

| Colonne | Type | Nullable | Description |
|---------|------|----------|-------------|
| `id` | `Int` | ❌ | Clé primaire auto-incrémentée |
| `productId` | `Int` | ❌ | Clé étrangère vers `Product.id` |
| `interCarsCategoryId` | `Int` | ❌ | Clé étrangère vers `InterCarsCategory.id` |
| `createdAt` | `DateTime` | ❌ | Date de création de la relation |

### Contraintes
- **UNIQUE** `(productId, interCarsCategoryId)` : Un produit ne peut pas être lié deux fois à la même catégorie

### Index
- `productId` : Recherche rapide de toutes les catégories d'un produit
- `interCarsCategoryId` : Recherche rapide de tous les produits d'une catégorie

### Relations
- **Vers `Product`** : Relation many-to-one (CASCADE DELETE - si un produit est supprimé, ses relations sont supprimées)
- **Vers `InterCarsCategory`** : Relation many-to-one (CASCADE DELETE - si une catégorie est supprimée, ses relations sont supprimées)

### Exemple d'utilisation
```typescript
// Lier un produit à une catégorie InterCars
await prisma.productInterCarsCategory.create({
  data: {
    productId: 12345,
    interCarsCategoryId: 678,
  },
});

// Récupérer toutes les catégories InterCars d'un produit avec leur hiérarchie
const product = await prisma.product.findUnique({
  where: { id: 12345 },
  include: {
    interCarsCategories: {
      include: {
        interCarsCategory: {
          include: {
            hierarchy: true, // Inclure la hiérarchie complète
          },
        },
      },
    },
  },
});
```

### Notes importantes
- **Généralisation** : Remplie par le script `apply-intercars-categories.ts` qui généralise les catégories de `InterCarsCategory` à tous les produits ayant le même `productName`
- **Multiplicité** : Un produit peut être lié à plusieurs catégories si son `productName` a plusieurs correspondances dans `InterCarsCategory`
- **Navigation** : Via cette table, on peut remonter jusqu'à `InterCarsHierarchy` pour obtenir la hiérarchie complète à 4 niveaux

---

## 🔄 Flux de données

### 1. Appel API InterCars
```
Script: build-arborescence-from-intercars-api.ts
Input: ProductSample (csvId + productName)
Action: Appel API InterCars avec csvId
Output: InterCarsCategory (productName → genericArticleId)
```

### 2. Construction de la hiérarchie
```
Script: populate-intercars-hierarchy.ts
Input: Fichiers JSON (level3.json, level4.json) + InterCarsCategory
Action: Création de InterCarsHierarchy pour chaque genericArticleId
Output: InterCarsHierarchy (hiérarchie complète 4 niveaux)
```

### 3. Génération des URLs
```
Script: generate-intercars-urls.ts
Input: InterCarsHierarchy (sans URLs)
Action: Génération des URLs hiérarchiques à partir des slugs
Output: InterCarsHierarchy (avec URLs)
```

### 4. Traduction en français
```
Script: translate-intercars-to-french.ts
Input: InterCarsHierarchy (labels anglais uniquement)
Action: Traduction via OpenAI API
Output: InterCarsHierarchy (avec levelXLabelFr)
```

### 5. Généralisation aux produits
```
Script: apply-intercars-categories.ts
Input: InterCarsCategory + Product (par productName)
Action: Création de ProductInterCarsCategory
Output: Tous les produits liés à leurs catégories InterCars
```

---

## 📈 Statistiques actuelles

D'après les dernières exécutions :

- **InterCarsCategory** : ~7,862 correspondances (productName → genericArticleId)
- **InterCarsHierarchy** : 5,750 hiérarchies complètes
  - Avec niveau 4 : 3,757
  - Sans niveau 4 (niveau 3 uniquement) : 1,993
- **ProductInterCarsCategory** : ~1,808,208 relations (tous les produits liés)
- **Traductions** : 100% des hiérarchies traduites en français (5,750/5,750)

---

## 🎯 Cas d'usage

### Cas 1: Trouver la catégorie d'un produit
```typescript
const product = await prisma.product.findUnique({
  where: { id: 12345 },
  include: {
    interCarsCategories: {
      include: {
        interCarsCategory: {
          include: {
            hierarchy: true,
          },
        },
      },
    },
  },
});

// Accéder à la hiérarchie complète
const hierarchy = product.interCarsCategories[0]?.interCarsCategory?.hierarchy;
console.log(hierarchy.level1LabelFr); // "Système de freinage"
console.log(hierarchy.level2LabelFr); // "Disque de frein"
console.log(hierarchy.url); // "/brake-system/brake-disc/..."
```

### Cas 2: Trouver tous les produits d'une catégorie
```typescript
const hierarchy = await prisma.interCarsHierarchy.findUnique({
  where: { genericArticleId: "GenericArticle_82" },
  include: {
    categories: {
      include: {
        products: {
          include: {
            product: true,
          },
        },
      },
    },
  },
});

// Tous les produits de cette catégorie
const products = hierarchy.categories.flatMap(cat => 
  cat.products.map(p => p.product)
);
```

### Cas 3: Navigation hiérarchique
```typescript
// Trouver toutes les catégories de niveau 2 sous un niveau 1
const level2Categories = await prisma.interCarsHierarchy.findMany({
  where: {
    level1Id: "SalesClassificationNode_6800000",
  },
  select: {
    level2Id: true,
    level2Label: true,
    level2LabelFr: true,
  },
  distinct: ['level2Id'],
});
```

---

## 🔧 Scripts disponibles

| Script | Commande | Description |
|--------|----------|-------------|
| `build-arborescence-from-intercars-api.ts` | `pnpm intercars:build-arborescence` | Appelle l'API InterCars et remplit `InterCarsCategory` |
| `populate-intercars-hierarchy.ts` | `pnpm db:populate-hierarchy` | Remplit `InterCarsHierarchy` depuis les JSON |
| `generate-intercars-urls.ts` | `pnpm db:generate-intercars-urls` | Génère les URLs hiérarchiques |
| `translate-intercars-to-french.ts` | `pnpm db:translate-intercars` | Traduit tous les labels en français |
| `apply-intercars-categories.ts` | `pnpm db:apply-intercars` | Généralise les catégories à tous les produits |
| `analyze-intercars-hierarchy.ts` | `pnpm db:analyze-intercars-hierarchy` | Analyse la structure de la hiérarchie |
| `show-intercars-categories.ts` | `pnpm db:show-intercars-categories` | Affiche les correspondances InterCars |

---

## ⚠️ Notes importantes

1. **Multiplicité des catégories** : Un même `productName` peut avoir plusieurs catégories InterCars si différents `csvId` retournent des résultats différents. C'est normal et souhaité.

2. **Hiérarchie unique** : Chaque `genericArticleId` a une seule hiérarchie dans `InterCarsHierarchy`, mais peut être référencé par plusieurs `InterCarsCategory`.

3. **Niveau 4 optionnel** : Certaines catégories s'arrêtent au niveau 3. Dans ce cas, `level4Id` et `level4Label` sont null.

4. **Traductions** : Toutes les traductions françaises sont stockées dans `InterCarsHierarchy`, pas dans `InterCarsCategory`.

5. **Performance** : Les index sont optimisés pour les requêtes les plus courantes (recherche par `productName`, `genericArticleId`, navigation hiérarchique).

---

## 📝 Schéma relationnel simplifié

```
Product
  └─ ProductInterCarsCategory (many-to-many)
      └─ InterCarsCategory
          ├─ productName → Product.productName
          ├─ genericArticleId → InterCarsHierarchy.genericArticleId
          └─ hierarchyId → InterCarsHierarchy.id
              └─ InterCarsHierarchy (hiérarchie complète 4 niveaux)
                  ├─ level1Label / level1LabelFr
                  ├─ level2Label / level2LabelFr
                  ├─ level3Label / level3LabelFr
                  └─ level4Label / level4LabelFr (optionnel)
```

---

*Documentation générée le 2025-01-07*























