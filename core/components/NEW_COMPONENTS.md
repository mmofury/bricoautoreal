# Nouveaux Composants de la Page d'Accueil

Ce document décrit les nouveaux composants créés pour la page d'accueil avec le design inspiré du HTML fourni.

## Composants créés

### 1. HeroBannerPromo
**Emplacement:** `~/components/hero-banner-promo/index.tsx`

Bannière hero avec image, titre, sous-titre, CTA et 3 cartes promotionnelles en dessous.

**Props:**
```typescript
interface HeroBannerPromoProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  imageUrl: string;
  promoCards: PromoCard[];
}
```

**Style:** Fond noir (#1E1E1E), bouton jaune (#FFCC00), coins arrondis.

---

### 2. VehicleSearchBar
**Emplacement:** `~/components/vehicle-search-bar/index.tsx`

Barre de recherche jaune avec icône de voiture et 3 options de recherche (Year/Make/Model, License Plate, VIN).

**Props:** Aucune (composant statique pour l'instant)

**Style:** Fond jaune (#FFCC00), icône dans cercle noir, boutons blancs avec bordure noire.

---

### 3. TopCategories
**Emplacement:** `~/components/top-categories/index.tsx`

Carrousel horizontal de catégories avec titre stylisé et ligne de séparation.

**Props:**
```typescript
interface TopCategoriesProps {
  categories: Category[];
}
```

**Fonctionnalités:**
- Défilement horizontal avec boutons gauche/droite
- Cartes de catégories avec image et nom
- Effet hover avec changement de couleur

**Style:** Cartes blanches 220x220px, titre gras/fin, ligne jaune (#FFDC4D).

---

### 4. ProductCarouselHorizontal
**Emplacement:** `~/components/product-carousel-horizontal/index.tsx`

Carrousel horizontal de produits avec image, prix, notation et bouton d'ajout au panier.

**Props:**
```typescript
interface ProductCarouselHorizontalProps {
  title: string;
  products: Product[];
}
```

**Fonctionnalités:**
- Défilement horizontal avec boutons
- Affichage du prix en rouge (#CC0033)
- Étoiles de notation avec remplissage partiel
- Bouton "Ajouter au panier" jaune

**Style:** Cartes horizontales 320x124px, fond blanc, texte gris (#666666).

---

### 5. PromotionalCards
**Emplacement:** `~/components/promotional-cards/index.tsx`

Grille de cartes promotionnelles avec image et description.

**Props:**
```typescript
interface PromotionalCardsProps {
  title: string;
  cards: PromotionalCard[];
}
```

**Fonctionnalités:**
- Grille responsive (1-4 colonnes)
- Image en haut, texte en bas
- Effet hover avec zoom sur l'image

**Style:** Cartes avec image 250px de hauteur, ombre portée, coins arrondis.

---

### 6. ServicesSection
**Emplacement:** `~/components/services-section/index.tsx`

Grille de 6 cartes de services avec icône, titre et description.

**Props:**
```typescript
interface ServicesSectionProps {
  services: Service[];
}
```

**Style:** Fond noir (#1E1E1E), bordure jaune en bas, icône dans cercle avec bordure jaune, texte blanc.

---

### 7. RecyclingBanner
**Emplacement:** `~/components/recycling-banner/index.tsx`

Bannière de recyclage avec logo, texte et bouton CTA.

**Props:** Aucune (composant statique)

**Style:** Fond noir, logo et texte jaune, bouton jaune.

---

## Utilisation dans page.tsx

Tous les composants sont intégrés dans `app/[locale]/(default)/page.tsx` avec des données d'exemple.

### Structure de la page:
1. Hero Banner avec promotions
2. Barre de recherche de véhicule (positionnée avec -mt-14 pour chevaucher le hero)
3. Top Categories (fond #FBFBFB)
4. Recently Viewed & More (fond #F2F2F2)
5. Under The Hood Savings (fond #FBFBFB)
6. Top Sellers (fond #F2F2F2)
7. May We Suggest (fond #FBFBFB)
8. Services Section (fond #F2F2F2)
9. Recycling Banner
10. Disclaimer
11. Featured Products (existant)
12. Newest Products (existant)
13. Subscribe (existant)

### Couleurs principales:
- Noir: #1E1E1E
- Jaune: #FFCC00 / #FFDC4D
- Rouge: #CC0033
- Gris: #373737, #666666, #DADADA
- Fond clair: #F2F2F2, #FBFBFB

### Polices:
- Titres: Roboto (font-extrabold / font-thin)
- Texte: Open Sans

## CSS personnalisé

La classe `.scrollbar-hide` a été ajoutée à `globals.css` pour masquer les barres de défilement dans les carrousels.

## Prochaines étapes

Pour rendre ces composants fonctionnels, vous devrez:

1. Remplacer les URLs d'images placeholder par de vraies images
2. Connecter les boutons de recherche de véhicule à la vraie fonctionnalité
3. Récupérer les vraies données de produits depuis l'API BigCommerce
4. Ajouter les vraies catégories depuis la base de données
5. Implémenter les fonctionnalités d'ajout au panier
6. Ajouter les liens de navigation corrects

## Notes

- Tous les composants sont responsive
- Les composants avec défilement horizontal utilisent `'use client'`
- Les autres composants sont des Server Components
- Le design respecte fidèlement le HTML fourni

