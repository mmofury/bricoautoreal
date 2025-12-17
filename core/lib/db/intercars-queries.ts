import { db } from './index';
import type { Prisma } from '@prisma/client';

interface NavigationChild {
  id: string;
  label: string;
  labelFr: string | null;
  url: string | null;
  imageUrl?: string | null;
  children?: NavigationChild[];
}

/**
 * Déduplique les enfants par ID ET par URL
 * Prend le premier enfant trouvé pour chaque ID ou URL unique
 */
function deduplicateChildren(children: NavigationChild[]): NavigationChild[] {
  const seen = new Set<string>();
  const result: NavigationChild[] = [];

  for (const child of children) {
    // Créer des clés pour l'ID et l'URL
    const idKey = `id:${child.id}`;
    const urlKey = child.url ? `url:${child.url}` : null;

    // Si on a déjà vu cet ID OU cette URL, on skip
    if (seen.has(idKey) || (urlKey && seen.has(urlKey))) {
      continue;
    }

    // Ajouter cet enfant unique
    seen.add(idKey);
    if (urlKey) {
      seen.add(urlKey);
    }
    result.push(child);
  }

  return result;
}

function normalizeChildLabel(child: NavigationChild): NavigationChild {
  const raw = (child.labelFr || child.label || '').trim();
  const current = raw.toUpperCase();

  let normalized: NavigationChild = { ...child };

  if (current === 'BAS') {
    normalized = {
      ...normalized,
      label: 'Aide au freinage',
      labelFr: 'Aide au freinage',
    };
  } else if (current === 'ASR') {
    normalized = {
      ...normalized,
      label: 'Antipatinage (ASR)',
      labelFr: 'Antipatinage (ASR)',
    };
  } else if (current === 'OFFRE NON ATTRIBUÉE' || current === 'OFFRE NON ATTRIBUEE') {
    normalized = {
      ...normalized,
      label: 'Autres pièces',
      labelFr: 'Autres pièces',
    };
  }

  const capitalizeSegments = (value?: string | null) => {
    if (!value) return value ?? null;
    return value
      .split('/')
      .map((segment) => {
        const trimmed = segment.trim();
        if (!trimmed) return trimmed;
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      })
      .join(' / ');
  };

  return {
    ...normalized,
    label: capitalizeSegments(normalized.label) ?? normalized.label,
    labelFr: capitalizeSegments(normalized.labelFr) ?? normalized.labelFr,
  };
}

/**
 * Filtre les catégories enfants pour ne garder que celles qui ont des produits
 * Optionnellement filtre par compatibilité véhicule
 */
async function filterChildrenWithProducts(
  children: NavigationChild[],
  parentLevel: number,
  parentCategoryId: string,
  vehicleId?: number
): Promise<NavigationChild[]> {
  if (children.length === 0) {
    return [];
  }

  // Construire la condition pour trouver les hiérarchies qui correspondent aux enfants
  // et qui ont des produits
  const childIds = children.map((c) => c.id);

  const childLevel = parentLevel + 1;
  const whereClause: Prisma.InterCarsHierarchyWhereInput = {
    categories: {
      some: {
        products: {
          some: vehicleId
            ? {
              product: {
                compatibilities: {
                  some: {
                    vehicle: {
                      vehicleId,
                    },
                  },
                },
              },
            }
            : {}, // Au moins un produit associé
        },
      },
    },
  };

  // Ajouter la condition sur le niveau parent et l'ID enfant
  switch (parentLevel) {
    case 1:
      whereClause.level1Id = parentCategoryId;
      whereClause.level2Id = { in: childIds };
      break;
    case 2:
      whereClause.level2Id = parentCategoryId;
      whereClause.level3Id = { in: childIds };
      break;
    case 3:
      whereClause.level3Id = parentCategoryId;
      whereClause.level4Id = { in: childIds };
      break;
    default:
      return [];
  }

  // Récupérer les hiérarchies qui ont des produits pour ces enfants
  const hierarchiesWithProducts = await db.interCarsHierarchy.findMany({
    where: whereClause,
    select: {
      level1Id: true,
      level2Id: true,
      level3Id: true,
      level4Id: true,
    },
    distinct: [
      childLevel === 2 ? 'level2Id' : childLevel === 3 ? 'level3Id' : 'level4Id',
    ],
  });

  // Extraire les IDs des enfants qui ont des produits
  const childIdsWithProducts = new Set<string>();
  for (const h of hierarchiesWithProducts) {
    if (childLevel === 2 && h.level2Id) {
      childIdsWithProducts.add(h.level2Id);
    } else if (childLevel === 3 && h.level3Id) {
      childIdsWithProducts.add(h.level3Id);
    } else if (childLevel === 4 && h.level4Id) {
      childIdsWithProducts.add(h.level4Id);
    }
  }

  // Filtrer les enfants pour ne garder que ceux qui ont des produits
  return children.filter((child) => childIdsWithProducts.has(child.id));
}

/**
 * Trouve une catégorie InterCars par son URL (slug et level)
 * Optionnellement filtre les catégories enfants par compatibilité véhicule
 */
export async function getInterCarsCategoryByUrl(slug: string, level: number, vehicleId?: number) {
  // Construire l'URL attendue
  const expectedUrl = `/pieces-detachees/${slug}-${level}`;

  // Rechercher selon le niveau
  const whereClause: Prisma.InterCarsHierarchyWhereInput = {};

  switch (level) {
    case 1:
      whereClause.level1Url = expectedUrl;
      break;
    case 2:
      whereClause.level2Url = expectedUrl;
      break;
    case 3:
      whereClause.level3Url = expectedUrl;
      break;
    case 4:
      whereClause.level4Url = expectedUrl;
      break;
    default:
      return null;
  }

  // Récupérer la première hiérarchie correspondante
  // Note: Plusieurs hiérarchies peuvent partager la même URL de niveau,
  // mais elles auront toutes les mêmes informations pour ce niveau
  const hierarchy = await db.interCarsHierarchy.findFirst({
    where: whereClause,
    orderBy: {
      genericArticleId: 'asc',
    },
  });

  if (!hierarchy) {
    return null;
  }

  // Extraire les informations de la catégorie selon le niveau
  let categoryInfo: {
    id: string;
    label: string;
    labelFr: string | null;
    url: string | null;
    parent: {
      id: string;
      label: string;
      labelFr: string | null;
      url: string | null;
    } | null;
    children: NavigationChild[];
  } | null = null;

  switch (level) {
    case 1: {
      const allChildren = hierarchy.childrenLevel2
        ? (JSON.parse(hierarchy.childrenLevel2) as NavigationChild[])
        : [];

      // Dédupliquer les enfants par ID et URL
      const uniqueChildren = deduplicateChildren(allChildren);

      const childrenWithProducts = await filterChildrenWithProducts(
        uniqueChildren,
        1,
        hierarchy.level1Id,
        vehicleId
      );

      // Pour chaque enfant de niveau 2, récupérer ses enfants de niveau 3
      const childrenWithLevel3 = await Promise.all(
        childrenWithProducts.map(async (level2Child) => {
          // Extraire le slug du niveau 2 depuis son URL
          const level2Slug = level2Child.url?.replace('/pieces-detachees/', '').replace(/-2$/, '');
          if (!level2Slug) return level2Child;

          // Récupérer la hiérarchie pour ce niveau 2
          const level2Hierarchy = await db.interCarsHierarchy.findFirst({
            where: { level2Url: `/pieces-detachees/${level2Slug}-2` },
          });

          if (!level2Hierarchy || !level2Hierarchy.childrenLevel3) {
            return level2Child;
          }

          // Parser et dédupliquer les enfants de niveau 3
          const level3Children = JSON.parse(level2Hierarchy.childrenLevel3) as NavigationChild[];
          const uniqueLevel3 = deduplicateChildren(level3Children);

          // Filtrer ceux qui ont des produits
          const level3WithProducts = await filterChildrenWithProducts(
            uniqueLevel3,
            2,
            level2Hierarchy.level2Id,
            vehicleId
          );

          return {
            ...level2Child,
            children: level3WithProducts,
          };
        })
      );

      categoryInfo = {
        id: hierarchy.level1Id,
        label: hierarchy.level1Label,
        labelFr: hierarchy.level1LabelFr,
        url: hierarchy.level1Url,
        parent: null,
        children: childrenWithLevel3,
      };
      break;
    }
    case 2: {
      const allChildren = hierarchy.childrenLevel3
        ? (JSON.parse(hierarchy.childrenLevel3) as NavigationChild[])
        : [];

      // Dédupliquer les enfants par ID et URL
      const uniqueChildren = deduplicateChildren(allChildren);

      const childrenWithProducts = await filterChildrenWithProducts(
        uniqueChildren,
        2,
        hierarchy.level2Id,
        vehicleId
      );

      categoryInfo = {
        id: hierarchy.level2Id,
        label: hierarchy.level2Label,
        labelFr: hierarchy.level2LabelFr,
        url: hierarchy.level2Url,
        parent: {
          id: hierarchy.level1Id,
          label: hierarchy.level1Label,
          labelFr: hierarchy.level1LabelFr,
          url: hierarchy.level1Url,
        },
        children: childrenWithProducts,
      };
      break;
    }
    case 3: {
      const allChildren = hierarchy.childrenLevel4
        ? (JSON.parse(hierarchy.childrenLevel4) as NavigationChild[])
        : [];

      // Dédupliquer les enfants par ID et URL
      const uniqueChildren = deduplicateChildren(allChildren);

      const childrenWithProducts = await filterChildrenWithProducts(
        uniqueChildren,
        3,
        hierarchy.level3Id,
        vehicleId
      );

      categoryInfo = {
        id: hierarchy.level3Id,
        label: hierarchy.level3Label,
        labelFr: hierarchy.level3LabelFr,
        url: hierarchy.level3Url,
        parent: {
          id: hierarchy.level2Id,
          label: hierarchy.level2Label,
          labelFr: hierarchy.level2LabelFr,
          url: hierarchy.level2Url,
        },
        children: childrenWithProducts,
      };
      break;
    }
    case 4:
      categoryInfo = {
        id: hierarchy.level4Id!,
        label: hierarchy.level4Label!,
        labelFr: hierarchy.level4LabelFr,
        url: hierarchy.level4Url,
        parent: {
          id: hierarchy.level3Id,
          label: hierarchy.level3Label,
          labelFr: hierarchy.level3LabelFr,
          url: hierarchy.level3Url,
        },
        children: [], // Level 4 n'a pas d'enfants
      };
      break;
  }

  return {
    hierarchy,
    categoryInfo,
  };
}

/**
 * Récupère tous les produits d'une catégorie InterCars par niveau
 */
export async function getProductsByInterCarsCategory(
  slug: string,
  level: number,
  options?: { limit?: number; offset?: number; vehicleId?: number; supplierName?: string }
) {
  const expectedUrl = `/pieces-detachees/${slug}-${level}`;

  // D'abord, trouver la catégorie pour obtenir l'ID du niveau
  const categoryData = await getInterCarsCategoryByUrl(slug, level);

  if (!categoryData || !categoryData.categoryInfo) {
    return {
      products: [],
      totalCount: 0,
    };
  }

  const categoryId = categoryData.categoryInfo.id;

  // Construire la condition WHERE selon le niveau en utilisant les IDs
  const whereClause: Prisma.ProductWhereInput = {
    interCarsCategories: {
      some: {
        interCarsCategory: {
          hierarchy: {
            ...(level === 1 && { level1Id: categoryId }),
            ...(level === 2 && { level2Id: categoryId }),
            ...(level === 3 && { level3Id: categoryId }),
            ...(level === 4 && { level4Id: categoryId }),
          },
        },
      },
    },
    ...(options?.supplierName && {
      supplierName: options.supplierName,
    }),
    ...(options?.vehicleId && {
      compatibilities: {
        some: {
          vehicle: {
            vehicleId: options.vehicleId,
          },
        },
      },
    }),
  };

  const [products, totalCount] = await Promise.all([
    db.product.findMany({
      where: whereClause,
      include: {
        specifications: true,
        oemNumbers: true,
        images: {
          take: 1, // Prendre seulement la première image
        },
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
      take: options?.limit || 50,
      skip: options?.offset || 0,
      orderBy: {
        productName: 'asc',
      },
    }),
    db.product.count({
      where: whereClause,
    }),
  ]);

  return {
    products,
    totalCount,
  };
}

/**
 * Récupère toutes les catégories uniques d'un niveau donné qui ont au moins un produit
 * Utile pour afficher la liste complète des catégories de niveau 1
 * OPTIMISÉ: Utilise le cache Next.js et limite les résultats
 */
export async function getAllInterCarsCategoriesByLevel(level: number, limit?: number) {
  const distinctField =
    level === 1
      ? 'level1Id'
      : level === 2
        ? 'level2Id'
        : level === 3
          ? 'level3Id'
          : 'level4Id';

  // Joindre avec InterCarsCategory et ProductInterCarsCategory pour vérifier qu'il y a des produits
  const whereClause: Prisma.InterCarsHierarchyWhereInput = {
    categories: {
      some: {
        products: {
          some: {}, // Au moins un produit associé
        },
      },
    },
  };

  // Récupérer toutes les hiérarchies distinctes qui ont des produits
  // OPTIMISATION: Limiter les résultats pour éviter de charger toute la table
  const hierarchies = await db.interCarsHierarchy.findMany({
    where: whereClause,
    select: {
      level1Id: true,
      level1Label: true,
      level1LabelFr: true,
      level1Url: true,
      level2Id: true,
      level2Label: true,
      level2LabelFr: true,
      level2Url: true,
      level3Id: true,
      level3Label: true,
      level3LabelFr: true,
      level3Url: true,
      level4Id: true,
      level4Label: true,
      level4LabelFr: true,
      level4Url: true,
    },
    distinct: [distinctField],
    // OPTIMISATION: Limiter le nombre de résultats
    take: limit || 100,
  });

  // Extraire les catégories selon le niveau et éliminer les doublons
  const categoryMap = new Map<string, {
    id: string;
    label: string;
    labelFr: string | null;
    url: string | null;
  }>();

  for (const h of hierarchies) {
    let category: {
      id: string;
      label: string;
      labelFr: string | null;
      url: string | null;
    } | null = null;

    switch (level) {
      case 1:
        if (h.level1Id && !categoryMap.has(h.level1Id)) {
          category = {
            id: h.level1Id,
            label: h.level1Label,
            labelFr: h.level1LabelFr,
            url: h.level1Url,
          };
        }
        break;
      case 2:
        if (h.level2Id && !categoryMap.has(h.level2Id)) {
          category = {
            id: h.level2Id,
            label: h.level2Label,
            labelFr: h.level2LabelFr,
            url: h.level2Url,
          };
        }
        break;
      case 3:
        if (h.level3Id && !categoryMap.has(h.level3Id)) {
          category = {
            id: h.level3Id,
            label: h.level3Label,
            labelFr: h.level3LabelFr,
            url: h.level3Url,
          };
        }
        break;
      case 4:
        if (h.level4Id && !categoryMap.has(h.level4Id)) {
          category = {
            id: h.level4Id,
            label: h.level4Label!,
            labelFr: h.level4LabelFr,
            url: h.level4Url,
          };
        }
        break;
    }

    if (category) {
      categoryMap.set(category.id, category);
    }
  }

  return Array.from(categoryMap.values());
}

/**
 * Récupère les images de produits pour plusieurs catégories level 2 depuis la base de données
 * Retourne un Map<level2Id, imageUrl>
 */
async function getProductImagesForLevel2Categories(level2Ids: string[]): Promise<Map<string, string | null>> {
  const imageMap = new Map<string, string | null>();

  if (level2Ids.length === 0) {
    return imageMap;
  }

  try {
    // Récupérer les images depuis la table InterCarsLevel2Image
    const images = await db.interCarsLevel2Image.findMany({
      where: {
        level2Id: {
          in: level2Ids,
        },
      },
      select: {
        level2Id: true,
        imageUrl: true,
      },
    });

    // Initialiser toutes les catégories avec null
    level2Ids.forEach(id => imageMap.set(id, null));

    // Remplir le map avec les images trouvées
    images.forEach(img => {
      imageMap.set(img.level2Id, img.imageUrl);
    });
  } catch (error) {
    console.error(`Error fetching images for level2 categories:`, error);
    // En cas d'erreur, initialiser toutes les catégories avec null
    level2Ids.forEach(id => imageMap.set(id, null));
  }

  return imageMap;
}

/**
 * Récupère des catégories niveau 1 avec leurs enfants niveau 2 ayant des produits
 * Triées par nombre total de produits (tous niveaux confondus)
 */
export async function getInterCarsLevel1WithChildren(options?: { limitLevel1?: number; limitLevel2?: number }) {
  const limitLevel1 = options?.limitLevel1 ?? 8;
  const limitLevel2 = options?.limitLevel2 ?? 12;

  // Récupérer toutes les catégories niveau 1 (elles ont toutes au moins un produit)
  const level1Categories = await getAllInterCarsCategoriesByLevel(1);

  const result: Array<{
    id: string;
    label: string;
    labelFr: string | null;
    url: string | null;
    children: NavigationChild[];
    productCount: number;
  }> = [];

  for (const cat of level1Categories) {
    // Compter le nombre total de produits pour cette catégorie niveau 1
    // (tous les produits dans toutes les sous-catégories niveau 2, 3, 4)
    const productCount = await db.productInterCarsCategory.count({
      where: {
        interCarsCategory: {
          hierarchy: {
            level1Id: cat.id,
          },
        },
      },
    });

    // Si aucun produit, on skip
    if (productCount === 0) {
      continue;
    }

    const hierarchy = await db.interCarsHierarchy.findFirst({
      where: { level1Id: cat.id },
      select: {
        level1Id: true,
        level1Label: true,
        level1LabelFr: true,
        level1Url: true,
        childrenLevel2: true,
      },
      orderBy: { genericArticleId: 'asc' },
    });

    if (!hierarchy) continue;

    const rawChildren: NavigationChild[] = hierarchy.childrenLevel2
      ? (JSON.parse(hierarchy.childrenLevel2) as NavigationChild[])
      : [];

    const uniqueChildren = deduplicateChildren(rawChildren);
    const childrenWithProducts = await filterChildrenWithProducts(uniqueChildren, 1, cat.id);

    if (childrenWithProducts.length === 0) {
      continue;
    }

    const normalizedChildren = childrenWithProducts.map(normalizeChildLabel);

    // Trier les enfants niveau 2 par nombre total de produits (tous niveaux descendants)
    const childrenWithCounts = await Promise.all(
      normalizedChildren.map(async (child) => {
        const count = await db.productInterCarsCategory.count({
          where: {
            interCarsCategory: {
              hierarchy: {
                level2Id: child.id,
              },
            },
          },
        });
        return { ...child, productCount: count };
      })
    );

    const sortedChildren = childrenWithCounts
      .sort((a, b) => {
        if (b.productCount !== a.productCount) {
          return b.productCount - a.productCount;
        }
        const labelA = a.labelFr || a.label;
        const labelB = b.labelFr || b.label;
        return labelA.localeCompare(labelB, 'fr');
      })
      .slice(0, limitLevel2);

    // Récupérer les images pour toutes les catégories level 2 en une seule requête
    const level2Ids = sortedChildren.map(c => c.id);
    const imageMap = await getProductImagesForLevel2Categories(level2Ids);

    const childrenWithImages = sortedChildren.map(({ productCount, ...child }) => ({
      ...child,
      imageUrl: imageMap.get(child.id) || null,
    }));

    result.push({
      id: cat.id,
      label: cat.label,
      labelFr: cat.labelFr,
      url: cat.url,
      children: childrenWithImages,
      productCount,
    });
  }

  // Trier par nombre total de produits (décroissant) puis libellé
  const sorted = result.sort((a, b) => {
    if (b.productCount !== a.productCount) {
      return b.productCount - a.productCount;
    }
    const labelA = a.labelFr || a.label;
    const labelB = b.labelFr || b.label;
    return labelA.localeCompare(labelB, 'fr');
  });

  // Retirer productCount du résultat final
  return sorted.slice(0, limitLevel1).map(({ productCount, ...rest }) => rest);
}

/**
 * Récupère les catégories InterCars niveau 1 qui ont des produits compatibles avec un véhicule
 */
export async function getInterCarsCategoriesForVehicle(vehicleId: number) {
  // Trouver toutes les hiérarchies qui ont des produits compatibles avec ce véhicule
  const hierarchies = await db.interCarsHierarchy.findMany({
    where: {
      categories: {
        some: {
          products: {
            some: {
              product: {
                compatibilities: {
                  some: {
                    vehicle: {
                      vehicleId,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    select: {
      level1Id: true,
      level1Label: true,
      level1LabelFr: true,
      level1Url: true,
    },
    distinct: ['level1Id'],
  });

  // Dédupliquer et formater
  const categoryMap = new Map<string, { id: string; label: string; labelFr: string | null; url: string | null }>();

  for (const h of hierarchies) {
    if (h.level1Id && !categoryMap.has(h.level1Id)) {
      categoryMap.set(h.level1Id, {
        id: h.level1Id,
        label: h.level1Label,
        labelFr: h.level1LabelFr,
        url: h.level1Url,
      });
    }
  }

  return Array.from(categoryMap.values()).sort((a, b) => {
    const labelA = a.labelFr || a.label;
    const labelB = b.labelFr || b.label;
    return labelA.localeCompare(labelB, 'fr');
  });
}

