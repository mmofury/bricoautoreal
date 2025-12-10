# Configuration Prisma pour Pièces Auto

## Installation

1. Installer les dépendances :
```bash
npm install
```

2. Configurer la base de données dans `.env.local` :
```env
DATABASE_URL="postgresql://user:password@localhost:5432/bricoauto?schema=public"
```

Pour PostgreSQL, MySQL ou SQLite, changez le provider dans `schema.prisma` :
- PostgreSQL : `provider = "postgresql"`
- MySQL : `provider = "mysql"`
- SQLite : `provider = "sqlite"` (pour le développement)

## Commandes Prisma

### Générer le client Prisma
```bash
npm run db:generate
```

### Créer la base de données et appliquer le schéma
```bash
npm run db:push
```

### Créer une migration
```bash
npm run db:migrate
```

### Ouvrir Prisma Studio (interface graphique)
```bash
npm run db:studio
```

### Importer les données depuis JSONL
```bash
npm run db:import "C:\Users\yohan\bricoauto\merged_products.jsonl" 100
```

Le dernier paramètre (100) est la taille du batch pour l'importation.

## Structure de la base de données

- **manufacturers** : Constructeurs automobiles (BMW, VW, etc.)
- **vehicle_models** : Modèles de véhicules (Golf, 3 Series, etc.)
- **vehicles** : Véhicules spécifiques avec moteur et dates
- **products** : Produits pièces auto
- **product_specifications** : Spécifications techniques
- **product_oem_numbers** : Numéros OEM (références constructeur)
- **product_vehicle_compatibility** : Table de liaison produit-véhicule
- **product_images** : Images des produits

## Utilisation dans le code

```typescript
import { db } from '~/lib/db';

// Rechercher des produits compatibles avec un véhicule
const products = await db.product.findMany({
  where: {
    compatibilities: {
      some: {
        vehicle: {
          vehicleId: 12345
        }
      }
    }
  },
  include: {
    specifications: true,
    oemNumbers: true,
    images: true
  }
});

// Rechercher par constructeur/modèle
const compatibleProducts = await db.product.findMany({
  where: {
    compatibilities: {
      some: {
        vehicle: {
          model: {
            manufacturer: {
              name: 'BMW'
            },
            modelName: {
              contains: '3 Series'
            }
          }
        }
      }
    }
  }
});
```

































