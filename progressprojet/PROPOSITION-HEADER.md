# Proposition de Structure du Header

**Date :** 2025-01-08  
**Contexte :** Site e-commerce de pièces auto avec système de compatibilité véhicule

---

## 📋 Structure proposée du Header

### **Zone 1 : Barre supérieure (Top Bar)** - Optionnel
```
┌─────────────────────────────────────────────────────────────────┐
│ [Promo/Info]                    [Langue] [Devise] [Aide]        │
└─────────────────────────────────────────────────────────────────┘
```

**Contenu :**
- **Bandeau promotionnel** (optionnel) : Promotions, livraison gratuite, etc.
- **Sélecteur de langue** : FR / EN / etc.
- **Sélecteur de devise** : EUR / USD / etc.
- **Lien "Aide/Support"** : FAQ, Contact, etc.

---

### **Zone 2 : Barre principale (Main Navigation Bar)**
```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo] [🔍 Recherche globale]      [Compte] [Panier (3)] [☰]   │
└─────────────────────────────────────────────────────────────────┘
```

**Contenu :**
- **Logo** : Logo du site (cliquable → Accueil), à gauche
- **Barre de recherche globale** :
  - Recherche produits, catégories, marques
  - Autocomplétion avec suggestions
  - Recherche par numéro OEM (optionnel)
  - Icône loupe

- **Icônes de navigation** :
  - **Compte utilisateur** : 
    - Si connecté : Menu dropdown (Mon compte, Mes commandes, Déconnexion)
    - Si non connecté : Lien vers /login
  - **Panier** :
    - Badge avec nombre d'articles
    - Lien vers /cart
    - Panier mini (dropdown au survol) : Liste des articles + total

- **Menu mobile** (☰) : Menu hamburger pour mobile

---

### **Zone 3 : Navigation par catégories (Category Navigation)**
```
┌─────────────────────────────────────────────────────────────────┐
│ [🏠 Accueil] [Pièces détachées ▼] [Constructeurs ▼] [Promos]   │
└─────────────────────────────────────────────────────────────────┘
```

**Contenu :**
- **Lien "Accueil"** : Retour à la page d'accueil
- **"Pièces détachées"** (menu déroulant) :
  - Liste des catégories InterCars niveau 1
  - Sous-catégories niveau 2 en dropdown/mega-menu
  - Si véhicule sélectionné : filtre automatique appliqué
  
- **"Constructeurs"** (menu déroulant) :
  - Liste des constructeurs populaires
  - Tous les constructeurs (A-Z)
  - Redirige vers pages de compatibilité par constructeur

- **"Promotions"** : Lien vers les produits en promotion
- **Autres liens** : À définir selon besoins métier

---

### **Zone 4 : Barre de compatibilité véhicule (Vehicle Compatibility Bar)**
```
┌─────────────────────────────────────────────────────────────────┐
│ [🔍 Sélectionner un véhicule]          [🚗 Peugeot 307... ✕]    │
└─────────────────────────────────────────────────────────────────┘
```

**Contenu :**
- **Sélecteur de véhicule** (à gauche) :
  - Composant `VehicleFinder` complet
  - Ou bouton "Trouver mon véhicule" qui ouvre un modal/popup
  - Recherche rapide par plaque d'immatriculation (future feature)

- **Badge véhicule sélectionné** (à droite) :
  - Composant `VehicleBadge`
  - Affiche le véhicule actuel
  - Boutons : Modifier / Retirer

---

## 📐 Layout Responsive

### **Desktop (> 1024px)**
```
┌─────────────────────────────────────────────────────────────────┐
│ [Promo]                           [Langue] [EUR] [Aide]         │
├─────────────────────────────────────────────────────────────────┤
│ [Logo] [🔍 Recherche...        ]    [👤 Compte] [🛒 Panier (3)] │
├─────────────────────────────────────────────────────────────────┤
│ [🏠] [Pièces ▼] [Constructeurs ▼] [Promos] [Autres]            │
├─────────────────────────────────────────────────────────────────┤
│ [🔍 Sélectionner un véhicule...]    [🚗 Peugeot 307...]        │
└─────────────────────────────────────────────────────────────────┘
```

### **Tablet (768px - 1024px)**
```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo]              [Langue] [EUR] [☰ Menu]                    │
├─────────────────────────────────────────────────────────────────┤
│ [🔍 Recherche...]  [👤] [🛒 (3)]                               │
├─────────────────────────────────────────────────────────────────┤
│ [🔍 Sélectionner un véhicule...]    [🚗 Peugeot 307...]        │
└─────────────────────────────────────────────────────────────────┘
```

### **Mobile (< 768px)**
```
┌─────────────────────────────────────────────────────────────────┐
│ [☰] [Logo]                [🛒 (3)]                             │
├─────────────────────────────────────────────────────────────────┤
│ [🔍 Recherche...]                                               │
├─────────────────────────────────────────────────────────────────┤
│ [🔍 Sélectionner un véhicule]                                   │
│ [🚗 Peugeot 307...]                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Composants détaillés

### **1. Recherche globale**

**Fonctionnalités :**
- ✅ Recherche texte dans produits, catégories, marques
- 🔄 Recherche par numéro OEM (future)
- 🔄 Recherche par numéro de référence constructeur (future)
- 🔄 Autocomplétion avec suggestions
- 🔄 Recherche vocale (future)

**Design :**
- Input de recherche large avec placeholder "Rechercher une pièce, une marque..."
- Bouton de recherche à droite
- Popup/modal de résultats de recherche
- Filtres avancés dans les résultats

---

### **2. Navigation par catégories**

**Menu "Pièces détachées" :**
- Dropdown/Mega-menu avec :
  - Liste des catégories InterCars niveau 1
  - Sous-catégories niveau 2-3 en colonnes
  - Si véhicule sélectionné : badge "Filtré pour [véhicule]" sur chaque catégorie
  - Images/icônes pour chaque catégorie principale (optionnel)

**Menu "Constructeurs" :**
- Dropdown avec :
  - Top 10 constructeurs populaires
  - Lien "Voir tous les constructeurs"
  - Recherche dans les constructeurs
  - Logo des constructeurs (optionnel)

---

### **3. Badge véhicule**

**Affichage :**
- Badge compact avec :
  - Icône voiture 🚗
  - Nom du véhicule (truncate si trop long)
  - Bouton modifier (✏️)
  - Bouton retirer (✕)

**Actions :**
- Cliquer sur le badge → Va à la page de compatibilité du véhicule
- Bouton modifier → Ouvre le sélecteur de véhicule
- Bouton retirer → Supprime le filtre véhicule

**Comportement :**
- Badge collant (sticky) qui reste visible au scroll (optionnel)
- Animation lors de l'ajout/suppression
- Tooltip au survol avec détails complets

---

### **4. Panier**

**Compteur :**
- Badge avec nombre d'articles
- Animation lors de l'ajout

**Dropdown panier mini** (au survol/clic) :
- Liste des 3-5 derniers articles ajoutés
- Total du panier
- Bouton "Voir le panier" → /cart
- Bouton "Commander" → /checkout

---

### **5. Compte utilisateur**

**Si non connecté :**
- Icône utilisateur → Lien vers /login
- Tooltip : "Se connecter"

**Si connecté :**
- Avatar ou initiales
- Menu dropdown :
  - Nom + Email
  - Séparateur
  - "Mon compte" → /account
  - "Mes commandes" → /orders
  - "Mes favoris" → /wishlist
  - "Mes adresses" → /addresses
  - Séparateur
  - "Déconnexion"

---

### **6. Sélecteur de langue/devise**

**Langue :**
- Dropdown avec drapeaux
- Options : FR, EN, etc.
- Sauvegarde de la préférence

**Devise :**
- Dropdown avec symboles
- Options : EUR, USD, etc.
- Mise à jour des prix automatique

---

## 🔧 Fonctionnalités avancées (futures)

### **Barre de recherche intelligente**
- Recherche par numéro OEM
- Recherche par numéro constructeur
- Recherche par plaque d'immatriculation (API tierce)
- Historique des recherches
- Suggestions basées sur les produits populaires

### **Notifications**
- Badge de notifications (nouvelles promos, commandes, etc.)
- Dropdown avec liste des notifications

### **Favoris/Wishlist**
- Icône cœur avec compteur
- Accès rapide aux produits favoris

### **Comparateur de produits**
- Icône avec compteur de produits comparés
- Dropdown avec liste des produits à comparer

### **Mode sombre/clair**
- Toggle pour basculer entre thèmes

---

## 📍 Positionnement des éléments

### **Priorité visuelle (de haut en bas, gauche à droite) :**

1. **Logo** : En haut à gauche (toujours visible)
2. **Recherche** : Centré, large (élément principal)
3. **Compte** : En haut à droite
4. **Panier** : En haut à droite (après compte)
5. **Navigation catégories** : Sous la recherche
6. **Badge véhicule** : Barre dédiée en dessous

### **Ordre mobile :**
1. Menu hamburger (gauche)
2. Logo (centre)
3. Panier (droite)
4. Recherche (pleine largeur)
5. Badge véhicule (pleine largeur)

---

## 🎯 Intégrations nécessaires

### **Composants existants à utiliser :**
- ✅ `HeaderSection` (Vibes Soul)
- ✅ `Navigation` (Vibes Soul)
- ✅ `VehicleFinder` (déjà créé)
- ✅ `VehicleBadge` (déjà créé)

### **Composants à créer/modifier :**
- 🔄 Mega-menu pour catégories InterCars
- 🔄 Menu constructeurs avec recherche
- 🔄 Dropdown panier mini
- 🔄 Dropdown compte utilisateur
- 🔄 Barre de recherche améliorée avec autocomplétion
- 🔄 Barre promotionnelle (optionnel)

---

## 📱 Comportements spécifiques

### **Sticky Header**
- Le header reste fixe au scroll (utilise `react-headroom`)
- Le badge véhicule peut être intégré dans le header sticky
- Animation de transition lors du scroll

### **Responsive**
- Menu hamburger sur mobile
- Recherche en plein écran sur mobile
- Navigation simplifiée sur tablette

### **Accessibilité**
- Navigation au clavier
- ARIA labels pour tous les éléments interactifs
- Focus visible
- Screen reader friendly

---

## 🎨 Design et style

### **Couleurs principales :**
- Fond header : Blanc ou couleur de marque
- Bordure : Gris clair
- Texte : Gris foncé / Noir
- Accents : Bleu (liens, boutons actifs)
- Badge véhicule : Bleu clair avec bordure

### **Typographie :**
- Logo : Police de marque (gras)
- Navigation : Police système (moyen)
- Recherche : Police système (normal)

### **Espacement :**
- Padding vertical : 12-16px
- Padding horizontal : 16-24px (desktop), 8-16px (mobile)
- Gap entre éléments : 8-16px

---

## 📊 Structure technique proposée

```
Header
├── TopBar (optionnel)
│   ├── Logo
│   ├── Bandeau promo
│   └── Langue / Devise / Aide
│
├── MainBar
│   ├── Recherche globale
│   ├── Compte utilisateur
│   └── Panier
│
├── CategoryNav
│   ├── Accueil
│   ├── Pièces détachées (dropdown)
│   ├── Constructeurs (dropdown)
│   └── Autres liens
│
└── VehicleBar
    ├── VehicleFinder (ou bouton)
    └── VehicleBadge
```

---

## ✅ Checklist d'implémentation

### **Phase 1 : Structure de base**
- [ ] Reorganiser le layout du header actuel
- [ ] Intégrer VehicleFinder et VehicleBadge dans la bonne zone
- [ ] Créer la zone "VehicleBar" dédiée
- [ ] Adapter le responsive

### **Phase 2 : Navigation**
- [ ] Créer mega-menu pour "Pièces détachées"
- [ ] Créer menu "Constructeurs" avec liste
- [ ] Intégrer les catégories InterCars dans la navigation
- [ ] Ajouter filtrage par véhicule dans les menus

### **Phase 3 : Recherche**
- [ ] Améliorer la barre de recherche actuelle
- [ ] Ajouter autocomplétion
- [ ] Créer popup de résultats de recherche
- [ ] Ajouter recherche par OEM (future)

### **Phase 4 : Compte et Panier**
- [ ] Créer dropdown compte utilisateur
- [ ] Créer dropdown panier mini
- [ ] Améliorer l'affichage du compteur panier

### **Phase 5 : Polish**
- [ ] Animations et transitions
- [ ] Sticky header optimisé
- [ ] Accessibilité complète
- [ ] Tests responsive

---

## 💡 Recommandations

1. **Prioriser la recherche** : C'est l'élément le plus utilisé
2. **Badge véhicule visible** : Toujours accessible, pas caché dans un menu
3. **Navigation simplifiée** : Trop de catégories = confusion
4. **Mobile-first** : Optimiser d'abord pour mobile
5. **Performance** : Lazy load des menus déroulants

---

## 🎯 Ordre de priorité

1. **P0 (Critique)** :
   - Logo
   - Recherche
   - Panier avec compteur
   - Badge véhicule

2. **P1 (Important)** :
   - Navigation catégories
   - Compte utilisateur
   - Menu constructeurs

3. **P2 (Amélioration)** :
   - Bandeau promo
   - Langue/Devise
   - Mega-menus
   - Panier dropdown

4. **P3 (Nice to have)** :
   - Recherche par OEM
   - Notifications
   - Comparateur
   - Mode sombre

---

Cette structure propose un header complet et professionnel pour un site de pièces auto, avec une place centrale pour la compatibilité véhicule.

