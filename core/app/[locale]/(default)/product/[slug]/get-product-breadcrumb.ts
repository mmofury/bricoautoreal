import { cache } from 'react';
import { db } from '~/lib/db';

interface BreadcrumbItem {
    label: string;
    href: string;
}

export interface ProductBreadcrumbData {
    breadcrumbs: BreadcrumbItem[];
    productName?: string;
}

export const getProductBreadcrumb = cache(async (entityId: number, locale: string): Promise<ProductBreadcrumbData> => {
    // Default breadcrumb (fallback)
    const defaultBreadcrumb: BreadcrumbItem[] = [
        { label: 'Accueil', href: `/${locale}` },
    ];

    try {
        // 1. Find product in Prisma by bigcommerceProductId - OPTIMIZED QUERY
        const product = await db.product.findFirst({
            where: { bigcommerceProductId: entityId },
            select: {
                id: true,
                productName: true,
                interCarsCategories: {
                    take: 1, // Get the first (primary) category
                    select: {
                        interCarsCategory: {
                            select: {
                                hierarchy: {
                                    select: {
                                        level1Label: true,
                                        level1LabelFr: true,
                                        level1Url: true,
                                        level2Label: true,
                                        level2LabelFr: true,
                                        level2Url: true,
                                        level3Label: true,
                                        level3LabelFr: true,
                                        level3Url: true,
                                        level4Id: true,
                                        level4Label: true,
                                        level4LabelFr: true,
                                        level4Url: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        console.log('[BREADCRUMB] entityId:', entityId, 'product:', !!product, 'categories:', product?.interCarsCategories?.length || 0);

        if (!product || !product.interCarsCategories.length) {
            console.log('[BREADCRUMB] No product or no categories - returning default');
            return { breadcrumbs: defaultBreadcrumb, productName: product ? product.productName ?? undefined : undefined };
        }

        const hierarchy = product.interCarsCategories[0]?.interCarsCategory.hierarchy;
        console.log('[BREADCRUMB] hierarchy found:', !!hierarchy);
        if (!hierarchy) {
            return { breadcrumbs: defaultBreadcrumb, productName: product.productName ?? undefined };
        }

        // 2. Build breadcrumb from hierarchy
        const breadcrumbs: BreadcrumbItem[] = [
            { label: 'Accueil', href: `/${locale}` },
        ];

        // Add level 1 (always present)
        if (hierarchy.level1Url) {
            breadcrumbs.push({
                label: hierarchy.level1LabelFr || hierarchy.level1Label,
                href: `/${locale}${hierarchy.level1Url}`,
            });
        }

        // Add level 2 (always present in valid hierarchy)
        if (hierarchy.level2Url) {
            breadcrumbs.push({
                label: hierarchy.level2LabelFr || hierarchy.level2Label,
                href: `/${locale}${hierarchy.level2Url}`,
            });
        }

        // Add level 3 (if exists)
        if (hierarchy.level3Url) {
            breadcrumbs.push({
                label: hierarchy.level3LabelFr || hierarchy.level3Label,
                href: `/${locale}${hierarchy.level3Url}`,
            });
        }

        // Add level 4 (if exists)
        if (hierarchy.level4Id && hierarchy.level4Url) {
            breadcrumbs.push({
                label: hierarchy.level4LabelFr || hierarchy.level4Label || '',
                href: `/${locale}${hierarchy.level4Url}`,
            });
        }

        return { breadcrumbs, productName: product.productName || undefined };
    } catch (error) {
        console.error('Error fetching product breadcrumb:', error);
        return { breadcrumbs: defaultBreadcrumb };
    }
});
