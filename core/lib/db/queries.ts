import { db } from './index';
import type { Prisma } from '@prisma/client';

/**
 * Recherche de produits compatibles avec un véhicule
 */
export async function getProductsByVehicle(vehicleId: number) {
  return db.product.findMany({
    where: {
      compatibilities: {
        some: {
          vehicle: {
            vehicleId: vehicleId,
          },
        },
      },
    },
    include: {
      specifications: true,
      oemNumbers: true,
      images: true,
      compatibilities: {
        include: {
          vehicle: {
            include: {
              model: {
                include: {
                  manufacturer: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

/**
 * Recherche de produits par constructeur et modèle
 */
export async function getProductsByManufacturerAndModel(
  manufacturerName: string,
  modelName?: string
) {
  return db.product.findMany({
    where: {
      compatibilities: {
        some: {
          vehicle: {
            model: {
              manufacturer: {
                name: {
                  contains: manufacturerName,
                },
              },
              ...(modelName && {
                modelName: {
                  contains: modelName,
                },
              }),
            },
          },
        },
      },
    },
    include: {
      specifications: true,
      oemNumbers: true,
      images: true,
    },
  });
}

/**
 * Recherche de produits par numéro OEM
 */
export async function getProductsByOemNumber(oemNumber: string) {
  return db.product.findMany({
    where: {
      oemNumbers: {
        some: {
          oemDisplayNo: {
            contains: oemNumber,
          },
        },
      },
    },
    include: {
      specifications: true,
      oemNumbers: true,
      images: true,
      compatibilities: {
        include: {
          vehicle: {
            include: {
              model: {
                include: {
                  manufacturer: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

/**
 * Recherche de produits par numéro d'article
 */
export async function getProductByArticleNo(articleNo: string) {
  return db.product.findUnique({
    where: {
      articleNo: articleNo,
    },
    include: {
      specifications: true,
      oemNumbers: true,
      images: true,
      compatibilities: {
        include: {
          vehicle: {
            include: {
              model: {
                include: {
                  manufacturer: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

/**
 * Recherche de produits par BigCommerce ID
 */
export async function getProductByBigCommerceId(bigcommerceProductId: number) {
  return db.product.findFirst({
    where: {
      bigcommerceProductId: bigcommerceProductId,
    },
    include: {
      specifications: true,
      oemNumbers: true,
      images: true,
      compatibilities: {
        include: {
          vehicle: {
            include: {
              model: {
                include: {
                  manufacturer: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

/**
 * Recherche de véhicules par constructeur
 */
export async function getVehiclesByManufacturer(manufacturerName: string) {
  return db.vehicle.findMany({
    where: {
      model: {
        manufacturer: {
          name: {
            contains: manufacturerName,
          },
        },
      },
    },
    include: {
      model: {
        include: {
          manufacturer: true,
        },
      },
    },
    take: 100, // Limiter pour éviter trop de résultats
  });
}

/**
 * Recherche de véhicules par modèle
 */
export async function getVehiclesByModel(modelName: string) {
  return db.vehicle.findMany({
    where: {
      model: {
        modelName: {
          contains: modelName,
        },
      },
    },
    include: {
      model: {
        include: {
          manufacturer: true,
        },
      },
    },
  });
}

/**
 * Obtenir tous les constructeurs
 */
export async function getAllManufacturers() {
  return db.manufacturer.findMany({
    orderBy: {
      name: 'asc',
    },
  });
}

/**
 * Obtenir tous les modèles d'un constructeur
 */
export async function getModelsByManufacturer(manufacturerName: string) {
  return db.vehicleModel.findMany({
    where: {
      manufacturer: {
        name: {
          contains: manufacturerName,
        },
      },
    },
    include: {
      manufacturer: true,
    },
    orderBy: {
      modelName: 'asc',
    },
  });
}

/**
 * Recherche de compatibilité véhicule pour un produit
 */
export async function getVehicleCompatibilityForProduct(productId: number) {
  return db.productVehicleCompatibility.findMany({
    where: {
      productId: productId,
    },
    include: {
      vehicle: {
        include: {
          model: {
            include: {
              manufacturer: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Recherche avancée de produits avec filtres
 */
export async function searchProducts(filters: {
  articleNo?: string;
  supplierName?: string;
  productName?: string;
  manufacturerName?: string;
  modelName?: string;
  vehicleId?: number;
  oemNumber?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Prisma.ProductWhereInput = {};

  if (filters.articleNo) {
    where.articleNo = {
      contains: filters.articleNo,
    };
  }

  if (filters.supplierName) {
    where.supplierName = {
      contains: filters.supplierName,
    };
  }

  if (filters.productName) {
    where.productName = {
      contains: filters.productName,
    };
  }

  if (filters.manufacturerName || filters.modelName || filters.vehicleId) {
    where.compatibilities = {
      some: {
        vehicle: {
          ...(filters.vehicleId && {
            vehicleId: filters.vehicleId,
          }),
          ...(filters.manufacturerName || filters.modelName
            ? {
                model: {
                  ...(filters.manufacturerName && {
                    manufacturer: {
                      name: {
                        contains: filters.manufacturerName,
                      },
                    },
                  }),
                  ...(filters.modelName && {
                    modelName: {
                      contains: filters.modelName,
                    },
                  }),
                },
              }
            : {}),
        },
      },
    };
  }

  if (filters.oemNumber) {
    where.oemNumbers = {
      some: {
        oemDisplayNo: {
          contains: filters.oemNumber,
        },
      },
    };
  }

  return db.product.findMany({
    where,
    include: {
      specifications: true,
      oemNumbers: true,
      images: true,
    },
    take: filters.limit || 50,
    skip: filters.offset || 0,
  });
}


