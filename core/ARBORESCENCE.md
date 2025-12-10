# Arborescence Site E-commerce Pièces Auto

Structure proposée pour un site type Autodoc, combinant BigCommerce (e-commerce) et notre base de données (compatibilités véhicule).

## 🏠 Navigation Principale

```
/
├── / (accueil)
│   └── Sélecteur de véhicule en page d'accueil
│
├── /vehicule (navigation par véhicule)
│   ├── /vehicule/[manufacturer] (ex: /vehicule/BMW)
│   │   └── Liste des modèles BMW
│   │
│   ├── /vehicule/[manufacturer]/[model] (ex: /vehicule/BMW/3-Series)
│   │   └── Liste des versions/années
│   │
│   └── /vehicule/[manufacturer]/[model]/[vehicleId] (ex: /vehicule/BMW/3-Series/12345)
│       └── Liste des produits compatibles avec ce véhicule
│
├── /categories (navigation par catégories - BigCommerce)
│   ├── /categories/freins
│   ├── /categories/moteur
│   ├── /categories/eclairage
│   └── ... (catégories BigCommerce)
│   │
│   └── Avec filtres véhicule sur chaque catégorie
│
├── /produit/[slug] (pages produits BigCommerce)
│   └── Affichage des compatibilités véhicule depuis notre BDD
│
├── /recherche
│   └── Recherche avec filtres véhicule
│
└── /compatibilite
    └── Vérificateur de compatibilité
```

## 📁 Structure de Fichiers Proposée

```
core/app/[locale]/(default)/
├── vehicule/
│   ├── [manufacturer]/
│   │   ├── page.tsx (liste des modèles)
│   │   └── [model]/
│   │       ├── page.tsx (liste des versions/années)
│   │       └── [vehicleId]/
│   │           └── page.tsx (produits compatibles)
│   │
│   └── selector/
│       └── page.tsx (sélecteur de véhicule standalone)
│
├── compatibilite/
│   ├── page.tsx (vérificateur de compatibilité)
│   └── [productId]/
│       └── page.tsx (compatibilités d'un produit)
│
├── product/
│   └── [slug]/
│       └── page.tsx (modifié pour afficher compatibilités)
│
└── category/
    └── [slug]/
        └── page.tsx (modifié pour ajouter filtre véhicule)
```

## 🎯 Fonctionnalités par Page

### 1. Page d'Accueil (`/`)
- **Sélecteur de véhicule** (constructeur → modèle → année)
- **Catégories populaires** (BigCommerce)
- **Produits en vedette** (BigCommerce)
- **Recherche rapide** avec suggestion véhicule

### 2. Navigation par Véhicule

#### `/vehicule/[manufacturer]` (ex: `/vehicule/BMW`)
- **En-tête** : Logo et nom du constructeur
- **Sélecteur de véhicule** : 3 étapes (Modèle → Type → Moteur)
- **Modèles populaires** : Grille d'images des modèles les plus populaires avec liens
- **Catégories de pièces** : Icônes des catégories principales (Moteur, Freins, Filtres, etc.)
- **Produits recommandés** : Carrousel de produits populaires pour ce constructeur
- **Navigation** : Liens vers les pages modèles

#### `/vehicule/[manufacturer]/[model]` (ex: `/vehicule/BMW/3-Series`)
- **En-tête** : Constructeur > Modèle (breadcrumb)
- **Sélecteur de véhicule** : Type → Moteur (modèle déjà sélectionné)
- **Liste des versions** : Tableau avec :
  - Type de moteur
  - Période de construction (année début - année fin)
  - Nombre de produits compatibles
  - Lien vers la page véhicule
- **Filtres** : Par type de moteur, période, etc.
- **Produits recommandés** : Carrousel pour ce modèle

#### `/vehicule/[manufacturer]/[model]/[vehicleId]` (ex: `/vehicule/BMW/3-Series/12345`)
- **En-tête** : Constructeur > Modèle > Version (breadcrumb)
- **Informations véhicule** : Type de moteur, période de construction
- **Liste des produits compatibles** : 
  - Grille de produits avec images
  - Filtres par catégorie (BigCommerce)
  - Tri par prix, popularité, etc.
  - Badge "Compatible" sur chaque produit
  - Lien vers les pages produits BigCommerce
- **Catégories rapides** : Liens vers les catégories principales filtrées par ce véhicule

### 3. Pages Catégories (BigCommerce + Filtre Véhicule)

#### `/category/[slug]` (ex: `/category/freins`)
- **Filtre véhicule** en plus des filtres BigCommerce
- Si véhicule sélectionné → affiche uniquement les produits compatibles
- Sinon → affiche tous les produits de la catégorie
- Badge "Compatible avec votre véhicule" sur les produits

### 4. Pages Produits (BigCommerce + Compatibilités)

#### `/product/[slug]`
- Informations produit BigCommerce (prix, stock, etc.)
- **Section "Compatibilité Véhicule"** :
  - Liste des véhicules compatibles
  - Sélecteur pour vérifier la compatibilité
  - Badge "Compatible" si véhicule sélectionné
- Spécifications techniques (notre BDD)
- Numéros OEM (notre BDD)
- Images produits

### 5. Recherche

#### `/search`
- Barre de recherche classique
- **Filtre véhicule** dans les résultats
- Recherche par :
  - Nom de produit
  - Numéro d'article
  - Numéro OEM
  - Constructeur/Modèle

### 6. Vérificateur de Compatibilité

#### `/compatibilite`
- Outil standalone pour vérifier la compatibilité
- Entrée : numéro d'article ou produit
- Sortie : liste des véhicules compatibles

## 🔄 Flux Utilisateur Type

### Scénario 1 : Navigation par Véhicule
```
1. Accueil → Sélectionne "BMW" → "3 Series" → "2020"
2. Redirige vers /vehicule/BMW/3-Series/12345
3. Affiche tous les produits compatibles
4. Filtre par catégorie (freins, moteur, etc.)
5. Clique sur un produit → Page produit avec badge "Compatible"
```

### Scénario 2 : Navigation par Catégorie
```
1. Accueil → Clique sur "Freins"
2. Page /category/freins (tous les freins)
3. Sélectionne un véhicule dans le filtre
4. Page se met à jour → Affiche uniquement les freins compatibles
5. Clique sur un produit → Page produit
```

### Scénario 3 : Recherche
```
1. Recherche "plaquette frein"
2. Résultats avec filtre véhicule
3. Sélectionne véhicule → Filtre les résultats
4. Clique sur produit compatible
```

## 🛠️ Composants à Créer

### 1. VehicleSelector
- Sélecteur en 3 étapes : Constructeur → Modèle → Version
- Utilise `/api/vehicles/manufacturers`, `/api/vehicles/models`, etc.
- Stocke la sélection dans les cookies/localStorage

### 2. CompatibilityBadge
- Badge "Compatible" sur les produits
- Affiche si le produit est compatible avec le véhicule sélectionné

### 3. VehicleFilter
- Filtre véhicule pour les pages catégories/recherche
- Intégré dans les filtres existants

### 4. CompatibilityList
- Liste des véhicules compatibles sur la page produit
- Recherche/filtre dans la liste

### 5. ProductCompatibilitySection
- Section complète sur la page produit
- Avec sélecteur de véhicule intégré

## 📊 Intégration BigCommerce ↔ Base de Données

### Lien entre les deux
- **Champ `bigcommerce_product_id`** dans notre table `products`
- Lors de l'import BigCommerce → mettre à jour ce champ
- Sur les pages produits BigCommerce → récupérer les compatibilités via `bigcommerce_product_id`

### Workflow
1. Produit créé dans BigCommerce → récupère l'ID
2. Trouve le produit dans notre BDD par `article_no` ou `ean_number`
3. Met à jour `bigcommerce_product_id`
4. Les deux systèmes sont liés !

## 🎨 Exemple de Structure de Routes

```
/fr/
├── / (accueil avec sélecteur)
├── /vehicule
│   ├── /BMW
│   │   ├── /3-Series
│   │   │   └── /12345 (produits compatibles)
│   │   └── /5-Series
│   └── /VW
├── /category/freins?vehicule=12345
├── /product/plaquette-frein-avant?vehicule=12345
└── /search?q=frein&vehicule=12345
```

## 🚀 Priorités de Développement

### Phase 1 : Fondations
1. ✅ Base de données créée et importée
2. ✅ API routes créées
3. ⏳ Sélecteur de véhicule
4. ⏳ Page produits avec compatibilités

### Phase 2 : Navigation
5. ⏳ Routes `/vehicule/[manufacturer]/[model]/[vehicleId]`
6. ⏳ Filtre véhicule sur catégories
7. ⏳ Filtre véhicule sur recherche

### Phase 3 : Optimisation
8. ⏳ Synchronisation BigCommerce ↔ BDD
9. ⏳ Cache des requêtes
10. ⏳ SEO et métadonnées

