# Arborescence avec URLs Propres - Implémentation

## Concept

### URLs Produits (propres avec ID)
```
/categorie/accoudoir-001
/categorie/accumulateur-de-pression-freinage-018
/categorie/adaptateur-sonde-lambda-1391
```

### Navigation Hiérarchique (multi-niveaux)
Le même produit peut être accessible depuis plusieurs chemins de catégories :

```
Pieces auto → Moteur → Épuration des gaz d'échappement → Adaptateur, sonde lambda
  ↓
/categorie/adaptateur-sonde-lambda-1391

Pieces auto → Échappement → Capteur lambda → Adaptateur, sonde lambda
  ↓
/categorie/adaptateur-sonde-lambda-1391
```

### Pages Catégories (même format que produits)
```
/categorie/moteur-100002
  → Liste des sous-catégories
  → Liste des produits directs
  → Navigation vers sous-catégories et produits

/categorie/epuration-des-gaz-d-echappement-123
  → Liste des produits de cette catégorie
  → Lien vers /categorie/adaptateur-sonde-lambda-1391
```

## Structure de Routes Next.js

### 1. `/categorie/[slug]` - Route dynamique
```typescript
// Format unique : slug-id (pour catégories ET produits)
// - Catégorie : /categorie/moteur-100002
// - Produit : /categorie/adaptateur-sonde-lambda-1391

export default async function CategoryOrProductPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  
  // Format : slug-id
  const match = slug.match(/^(.+)-(\d+)$/);
  
  if (!match) {
    return notFound();
  }
  
  const itemSlug = match[1];
  const displayId = match[2];
  
  // Vérifier si c'est un produit ou une catégorie
  const productGroup = await db.productGroup.findFirst({
    where: { slug: itemSlug, displayId }
  });
  
  if (productGroup) {
    return <ProductGroupPage productGroup={productGroup} />;
  }
  
  const category = await db.tecdocCategory.findFirst({
    where: { slug: itemSlug, displayId }
  });
  
  if (category) {
    return <CategoryPage category={category} />;
  }
  
  return notFound();
}
```

### 2. Navigation hiérarchique (affichage uniquement)
Les catégories sont accessibles via leurs URLs propres, mais on peut afficher la hiérarchie dans le breadcrumb :

```
Accueil > Moteur > Épuration des gaz d'échappement
  ↓
/categorie/epuration-des-gaz-d-echappement-123
```

Le breadcrumb montre la hiérarchie, mais l'URL reste simple avec ID.

## Structure de Base de Données

### Tables créées

1. **`product_groups`** : Groupes de produits avec URLs propres
2. **`tecdoc_categories`** : Arborescence des catégories TecDoc
3. **`product_group_categories`** : Relation many-to-many

### Mapping avec `products`

- Ajout de `product_group_id` dans la table `products`
- Un produit peut être lié à un groupe de produits

## Import des données

Le fichier `product-groups.json` contient déjà :
- `productName` : Nom du produit
- `slug` : Slug pour l'URL
- `displayId` : ID pour l'URL (ex: "001", "018")
- `tecdocProductId` : ID TecDoc
- `categories` : Array avec tous les chemins de catégories
- `url` : URL générée (ex: "/produit/accoudoir-001")

## Prochaines étapes

1. ✅ Schéma Prisma créé
2. ⏳ Script d'import de `product-groups.json`
3. ⏳ Routes Next.js
4. ⏳ Pages de catégories
5. ⏳ Pages de groupes de produits
