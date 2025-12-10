# Arborescence des Routes - Système de Compatibilité Véhicule

Ce document répertorie toutes les routes créées pour le système de compatibilité véhicule et de navigation des pièces détachées.

## 📋 Table des matières

1. [Routes principales](#routes-principales)
2. [Routes API](#routes-api)
3. [Structure des URLs](#structure-des-urls)
4. [Exemples d'URLs](#exemples-durls)
5. [Fonctions utilitaires](#fonctions-utilitaires)

---

## Routes principales

### 1. Page de compatibilité véhicule

**Route :** `/[locale]/pieces-auto/[brand]/[group]/[model]/[vehicle]`

**Fichier :** `core/app/[locale]/(default)/pieces-auto/[brand]/[group]/[model]/[vehicle]/page.tsx`

**Description :** Page dédiée à un véhicule spécifique, affichant les catégories InterCars avec des produits compatibles.

**Paramètres :**
- `locale` : Locale (ex: `fr`, `en`)
- `brand` : Slug du constructeur (ex: `peugeot`, `bmw`)
- `group` : Slug du groupe de modèles (ex: `307`, `serie-1`)
- `model` : Slug du modèle spécifique (ex: `307-3-5-portes`, `116i`)
- `vehicle` : ID du véhicule TecDoc + slug moteur optionnel (ex: `30846-1-6-16v`, `30846`)

**Structure de l'URL complète :**
```
/fr/pieces-auto/peugeot/307/307-3-5-portes/30846-1-6-16v
```

**Fonctionnalités :**
- Affiche les informations du véhicule (moteur, intervalle de construction, carburant, carrosserie, codes moteur)
- Liste toutes les catégories InterCars niveau 1 qui contiennent des produits compatibles
- Chaque catégorie est cliquable et redirige vers la page de catégorie filtrée par véhicule

---

### 2. Page d'accueil des pièces détachées

**Route :** `/[locale]/pieces-detachees`

**Fichier :** `core/app/[locale]/(default)/(faceted)/pieces-detachees/page.tsx`

**Description :** Page d'accueil listant toutes les catégories InterCars niveau 1.

**Paramètres :**
- `locale` : Locale (ex: `fr`, `en`)

**Fonctionnalités :**
- Affiche toutes les catégories InterCars de niveau 1
- Support optionnel du contexte véhicule dans l'URL (voir section [Structure des URLs](#structure-des-urls))

---

### 3. Pages de catégories InterCars (avec support véhicule)

**Route :** `/[locale]/pieces-detachees/[...slug]`

**Fichier :** `core/app/[locale]/(default)/(faceted)/pieces-detachees/[...slug]/page.tsx`

**Description :** Pages dynamiques pour les catégories InterCars de tous les niveaux (1 à 4), avec support du filtrage par véhicule.

**Paramètres :**
- `locale` : Locale (ex: `fr`, `en`)
- `slug` : Tableau de segments d'URL contenant :
  - Les segments de catégorie (ex: `moteur-1`, `culasse-2`, `joint-culasse-3`)
  - Optionnellement : le contexte véhicule (4 segments : `brand/group/model/vehicleId-engineSlug`)

**Structure de l'URL complète :**

**Sans filtre véhicule :**
```
/fr/pieces-detachees/moteur-1
/fr/pieces-detachees/culasse-2
/fr/pieces-detachees/joint-culasse-3
```

**Avec filtre véhicule :**
```
/fr/pieces-detachees/moteur-1/peugeot/307/307-3-5-portes/30846-1-6-16v
/fr/pieces-detachees/culasse-2/peugeot/307/307-3-5-portes/30846-1-6-16v
```

**Fonctionnalités :**
- Affiche les produits de la catégorie InterCars
- Filtre les produits par compatibilité véhicule si un contexte est présent dans l'URL
- Affiche la navigation hiérarchique (catégories enfants)
- Affiche un sélecteur de véhicule si un filtre est actif
- Gère la pagination des produits
- Affiche un message spécifique si aucun produit compatible n'est trouvé (avec option pour retirer le filtre)

**Format du slug de catégorie :**
- Niveau 1 : `[nom-categorie]-1` (ex: `moteur-1`)
- Niveau 2 : `[nom-categorie]-2` (ex: `culasse-2`)
- Niveau 3 : `[nom-categorie]-3` (ex: `joint-culasse-3`)
- Niveau 4 : `[nom-categorie]-4` (ex: `joint-culasse-type-a-4`)

---

## Routes API

### 1. Liste des constructeurs

**Route :** `/api/compat/manufacturers`

**Fichier :** `core/app/api/compat/manufacturers/route.ts`

**Méthode :** `GET`

**Description :** Retourne la liste de tous les constructeurs disponibles.

**Réponse :**
```json
{
  "manufacturers": [
    {
      "id": 88,
      "name": "PEUGEOT"
    },
    {
      "id": 16,
      "name": "BMW"
    }
  ]
}
```

**Utilisation :** Utilisé par le composant `VehicleFinder` pour la première étape de sélection.

---

### 2. Modèles par constructeur (groupés)

**Route :** `/api/compat/models`

**Fichier :** `core/app/api/compat/models/route.ts`

**Méthode :** `GET`

**Paramètres de requête :**
- `manufacturerId` (requis) : ID du constructeur

**Description :** Retourne les modèles d'un constructeur, groupés par `ModelGroup`.

**Exemple de requête :**
```
GET /api/compat/models?manufacturerId=88
```

**Réponse :**
```json
{
  "groups": [
    {
      "id": 1,
      "groupKey": "307",
      "displayName": "307",
      "models": [
        {
          "id": 123,
          "modelId": 456,
          "modelName": "307 3/5 portes",
          "slug": "307-3-5-portes"
        },
        {
          "id": 124,
          "modelId": 457,
          "modelName": "307 Break",
          "slug": "307-break"
        }
      ]
    }
  ],
  "ungrouped": [
    {
      "id": 125,
      "modelId": 458,
      "modelName": "PARTNER ORIGIN",
      "slug": "partner-origin"
    }
  ]
}
```

**Utilisation :** Utilisé par le composant `VehicleFinder` pour la deuxième étape de sélection (affichage groupé avec `<optgroup>`).

---

### 3. Véhicules par modèle

**Route :** `/api/compat/vehicles`

**Fichier :** `core/app/api/compat/vehicles/route.ts`

**Méthode :** `GET`

**Paramètres de requête :**
- `modelId` (requis) : ID TecDoc du modèle

**Description :** Retourne tous les véhicules (versions) disponibles pour un modèle donné.

**Exemple de requête :**
```
GET /api/compat/vehicles?modelId=456
```

**Réponse :**
```json
{
  "manufacturer": {
    "id": 88,
    "name": "PEUGEOT",
    "slug": "peugeot"
  },
  "model": {
    "id": 123,
    "modelId": 456,
    "name": "307 3/5 portes",
    "slug": "307-3-5-portes"
  },
  "groupSlug": "307",
  "vehicles": [
    {
      "vehicleId": 30846,
      "typeEngineName": "1.6 16V",
      "constructionIntervalStart": "2000-01-01",
      "constructionIntervalEnd": "2005-12-31",
      "engineSlug": "1-6-16v",
      "url": "/pieces-auto/peugeot/307/307-3-5-portes/30846-1-6-16v"
    }
  ]
}
```

**Utilisation :** Utilisé par le composant `VehicleFinder` pour la troisième étape de sélection, puis redirection vers la page de compatibilité.

---

## Structure des URLs

### Format général

Toutes les URLs incluent le préfixe de locale (`/fr`, `/en`, etc.) grâce à la configuration `localePrefix: 'always'` dans `core/i18n/routing.ts`.

### URLs de catégorie sans filtre véhicule

```
/[locale]/pieces-detachees/[categorie-slug]-[niveau]
```

**Exemples :**
```
/fr/pieces-detachees/moteur-1
/fr/pieces-detachees/culasse-2
/fr/pieces-detachees/joint-culasse-3
```

### URLs de catégorie avec filtre véhicule

```
/[locale]/pieces-detachees/[categorie-slug]-[niveau]/[brand]/[group]/[model]/[vehicleId][-engineSlug]
```

**Exemples :**
```
/fr/pieces-detachees/moteur-1/peugeot/307/307-3-5-portes/30846-1-6-16v
/fr/pieces-detachees/culasse-2/bmw/serie-3/320i/12345
```

### URL de compatibilité véhicule

```
/[locale]/pieces-auto/[brand]/[group]/[model]/[vehicleId][-engineSlug]
```

**Exemples :**
```
/fr/pieces-auto/peugeot/307/307-3-5-portes/30846-1-6-16v
/fr/pieces-auto/bmw/serie-3/320i/12345
```

### Règles de slugification

- **Constructeurs** : Normalisation NFD, suppression des accents, conversion en minuscules, remplacement des espaces par des tirets
  - Ex: `PEUGEOT` → `peugeot`
  - Ex: `MERCEDES-BENZ` → `mercedes-benz`

- **Groupes de modèles** : Même règles
  - Ex: `307` → `307`
  - Ex: `Série 1` → `serie-1`

- **Modèles** : Même règles
  - Ex: `307 3/5 portes` → `307-3-5-portes`
  - Ex: `CLASSE S (W223)` → `classe-s-w223`

- **Moteurs** : Même règles + remplacement des caractères spéciaux
  - Ex: `1.6 16V` → `1-6-16v`
  - Ex: `2.0 HDi` → `2-0-hdi`

- **Catégories InterCars** : Format `[nom-categorie]-[niveau]`
  - Le niveau (1, 2, 3, 4) est suffixé avec un tiret et le numéro
  - Ex: `Moteur` (niveau 1) → `moteur-1`
  - Ex: `Culasse` (niveau 2) → `culasse-2`

---

## Exemples d'URLs

### Navigation complète (sans filtre)

```
/fr/pieces-detachees
  → Liste toutes les catégories niveau 1

/fr/pieces-detachees/moteur-1
  → Produits de la catégorie "Moteur" (niveau 1)
  → Navigation vers catégories enfants : Culasse, Joint, etc.

/fr/pieces-detachees/culasse-2
  → Produits de la catégorie "Culasse" (niveau 2)

/fr/pieces-detachees/joint-culasse-3
  → Produits de la catégorie "Joint culasse" (niveau 3)
```

### Navigation avec filtre véhicule

```
/fr/pieces-auto/peugeot/307/307-3-5-portes/30846-1-6-16v
  → Page de compatibilité du véhicule
  → Liste des catégories avec produits compatibles

/fr/pieces-detachees/moteur-1/peugeot/307/307-3-5-portes/30846-1-6-16v
  → Catégorie "Moteur" filtrée pour ce véhicule
  → Affiche uniquement les produits compatibles
  → Affiche le sélecteur de véhicule avec option de retrait

/fr/pieces-detachees/culasse-2/peugeot/307/307-3-5-portes/30846-1-6-16v
  → Catégorie "Culasse" filtrée pour ce véhicule
```

### Redirections et préservation du contexte

- Le contexte véhicule est **préservé automatiquement** lors de la navigation entre catégories
- Les liens des catégories enfants incluent le contexte véhicule si actif
- Le breadcrumb préserve également le contexte véhicule

---

## Fonctions utilitaires

### `core/lib/utils/vehicle-context.ts`

Ce fichier contient toutes les fonctions utilitaires pour gérer le contexte véhicule dans les URLs.

#### `parseVehicleContextFromUrl(segments: string[]): VehicleContext | null`

Parse les segments d'URL pour extraire le contexte véhicule.

**Exemple :**
```typescript
parseVehicleContextFromUrl(['pieces-detachees', 'moteur-1', 'peugeot', '307', '307-3-5-portes', '30846-1-6-16v'])
// Retourne: { brandSlug: 'peugeot', groupSlug: '307', modelSlug: '307-3-5-portes', vehicleId: 30846, engineSlug: '1-6-16v' }
```

#### `buildVehicleUrlSuffix(context: VehicleContext): string`

Construit le suffixe URL pour un contexte véhicule.

**Exemple :**
```typescript
buildVehicleUrlSuffix({ brandSlug: 'peugeot', groupSlug: '307', modelSlug: '307-3-5-portes', vehicleId: 30846, engineSlug: '1-6-16v' })
// Retourne: 'peugeot/307/307-3-5-portes/30846-1-6-16v'
```

#### `preserveVehicleContextInCategoryUrl(categoryUrl: string, vehicleContext: VehicleContext | null): string`

Préserve ou ajoute le contexte véhicule à une URL de catégorie.

**Exemple :**
```typescript
preserveVehicleContextInCategoryUrl('/fr/pieces-detachees/moteur-1', vehicleContext)
// Retourne: '/fr/pieces-detachees/moteur-1/peugeot/307/307-3-5-portes/30846-1-6-16v'
```

#### `removeVehicleContextFromUrl(url: string): string`

Retire le contexte véhicule d'une URL si présent.

**Exemple :**
```typescript
removeVehicleContextFromUrl('/fr/pieces-detachees/moteur-1/peugeot/307/307-3-5-portes/30846-1-6-16v')
// Retourne: '/fr/pieces-detachees/moteur-1'
```

---

## Composants liés

### `VehicleFinder`

**Fichier :** `core/components/vehicle-finder/index.tsx`

**Description :** Composant client pour la sélection étape par étape d'un véhicule (constructeur → modèle → véhicule).

**Utilisation :** Intégré dans le header via `VehicleFinderClientWrapper`.

**Flux :**
1. Sélection du constructeur (appel à `/api/compat/manufacturers`)
2. Sélection du modèle (appel à `/api/compat/models?manufacturerId=...`)
3. Sélection du véhicule (appel à `/api/compat/vehicles?modelId=...`)
4. Redirection vers `/pieces-auto/[brand]/[group]/[model]/[vehicle]`

### `VehicleSelector`

**Fichier :** `core/components/vehicle-selector/index.tsx`

**Description :** Composant client affichant le véhicule sélectionné avec option de retrait du filtre.

**Utilisation :** Affiché automatiquement sur les pages de catégorie lorsqu'un filtre véhicule est actif.

---

## Middleware et configuration

### Middleware

**Fichier :** `core/middleware.ts`

**Configuration :**
- Les routes `/pieces-auto` et `/pieces-detachees` sont explicitement bypassées du middleware BigCommerce (`withRoutes`)
- Le middleware `withIntl` (gestion des locales) reste actif pour ces routes
- Les URLs sans locale sont réécrites avec le locale par défaut

### Configuration i18n

**Fichier :** `core/i18n/routing.ts`

**Configuration :**
- `localePrefix: 'always'` : Force le préfixe de locale sur toutes les routes

---

## Base de données

### Tables principales utilisées

- `Manufacturer` : Constructeurs
- `VehicleModel` : Modèles de véhicules
- `ModelGroup` : Groupes de modèles (ex: "307", "Série 3")
- `ModelGroupModel` : Relation entre groupes et modèles
- `Vehicle` : Versions de véhicules (avec moteur, dates, etc.)
- `InterCarsHierarchy` : Hiérarchie des catégories InterCars
- `InterCarsCategory` : Catégories InterCars
- `Product` : Produits
- `ProductInterCarsCategory` : Relation produit ↔ catégorie InterCars
- `ProductVehicleCompatibility` : Relation produit ↔ véhicule (compatibilité)

---

## Notes importantes

1. **ID TecDoc comme clé primaire** : Le `vehicleId` dans l'URL correspond à l'ID TecDoc, qui est la source de vérité pour la compatibilité.

2. **Slug moteur optionnel** : Le slug du moteur est ajouté pour la lisibilité mais n'est pas utilisé pour la résolution (seul le `vehicleId` compte).

3. **Groupes de modèles** : Les modèles sont groupés (ex: tous les "307" ensemble) pour améliorer l'UX dans le sélecteur.

4. **Filtrage automatique** : Lorsqu'un contexte véhicule est présent, tous les produits sont automatiquement filtrés via `ProductVehicleCompatibility`.

5. **Préservation du contexte** : Le contexte véhicule est préservé automatiquement lors de la navigation entre catégories et dans les breadcrumbs.

---

## Prochaines étapes possibles

- [ ] Badge dans le header pour afficher le véhicule sélectionné
- [ ] Page dédiée `/pieces-auto/recherche` avec recherche texte/filtres
- [ ] Badge "Compatible avec votre véhicule" sur les pages produits
- [ ] Historique des véhicules sélectionnés (localStorage)
- [ ] Partage de lien de compatibilité véhicule

