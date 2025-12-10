# Script Playwright pour visiter les catégories TecDoc

## Installation

```bash
# Installer Playwright
pnpm add -D playwright

# Installer les navigateurs Playwright
pnpm exec playwright install chromium
```

## Utilisation

```bash
# Lancer le script
pnpm tecdoc:visit-categories
```

## Ce que fait le script

1. ✅ Ouvre le navigateur Chromium
2. ✅ Navigue vers la page TecDoc avec tous les nœuds ouverts
3. ✅ Ouvre automatiquement tous les nœuds de l'arborescence
4. ✅ Extrait toutes les catégories de niveau 3, 4 et 5
5. ✅ Visite chaque catégorie (navigation directe)
6. ✅ Reviens automatiquement en arrière après chaque visite
7. ✅ Détecte et évite les pages "catalog-not-found"
8. ✅ Affiche un résumé à la fin

## Avantages par rapport au script console

- ✅ Plus fiable : Playwright gère mieux les interactions avec le navigateur
- ✅ Meilleure détection : Peut détecter si la navigation a fonctionné
- ✅ Gestion d'erreurs : Meilleure gestion des erreurs et des timeouts
- ✅ Visible : Vous pouvez voir ce qui se passe dans le navigateur
- ✅ Contrôlable : Vous pouvez arrêter avec Ctrl+C

## Paramètres ajustables

Dans le fichier `visit-categories-playwright.ts`, vous pouvez modifier :

- `headless: false` → `true` pour cacher le navigateur
- `slowMo: 100` → Délai entre les actions (en ms)
- `pageLoadDelay = 3000` → Temps d'attente sur chaque page (en ms)
- `returnDelay = 1000` → Temps d'attente après le retour (en ms)

