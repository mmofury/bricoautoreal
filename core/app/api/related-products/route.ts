import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/lib/db';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const bigcommerceProductId = searchParams.get('productId');

        if (!bigcommerceProductId) {
            return NextResponse.json({ error: 'Missing productId parameter' }, { status: 400 });
        }

        // Récupérer le produit actuel
        const currentProduct = await db.product.findFirst({
            where: {
                bigcommerceProductId: parseInt(bigcommerceProductId),
            },
            select: {
                id: true,
            },
        });

        if (!currentProduct) {
            return NextResponse.json({ relatedProducts: [] });
        }

        // Récupérer les numéros OEM du produit actuel
        const currentOemNumbers = await db.productOemNumber.findMany({
            where: {
                productId: currentProduct.id,
            },
            select: {
                oemDisplayNo: true,
            },
        });

        if (currentOemNumbers.length === 0) {
            return NextResponse.json({ relatedProducts: [] });
        }

        const oemNumbers = currentOemNumbers.map(oem => oem.oemDisplayNo);

        // Trouver les produits qui partagent au moins un numéro OEM
        const relatedProductIds = await db.productOemNumber.findMany({
            where: {
                oemDisplayNo: {
                    in: oemNumbers,
                },
                productId: {
                    not: currentProduct.id, // Exclure le produit actuel
                },
            },
            select: {
                productId: true,
            },
            distinct: ['productId'],
            take: 6, // Limiter à 6 produits
        });

        if (relatedProductIds.length === 0) {
            return NextResponse.json({ relatedProducts: [] });
        }

        // Récupérer les détails des produits
        const relatedProducts = await db.product.findMany({
            where: {
                id: {
                    in: relatedProductIds.map(p => p.productId),
                },
            },
            select: {
                id: true,
                bigcommerceProductId: true,
                productName: true,
                supplierName: true,
                articleNo: true,
            },
            take: 6,
        });

        return NextResponse.json({ relatedProducts });
    } catch (error) {
        console.error('Error fetching related products:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
