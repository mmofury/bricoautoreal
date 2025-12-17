import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/lib/db';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const bigcommerceProductId = searchParams.get('productId');

        console.log('[API] product-compatibility called with productId:', bigcommerceProductId);

        if (!bigcommerceProductId) {
            return NextResponse.json({ error: 'Missing productId parameter' }, { status: 400 });
        }

        // Récupérer le produit
        const product = await db.product.findFirst({
            where: {
                bigcommerceProductId: parseInt(bigcommerceProductId),
            },
            select: {
                id: true,
                articleNo: true,
                productName: true,
            },
        });

        console.log('[API] Found product:', product ? `${product.articleNo} - ${product.productName}` : 'NOT FOUND');

        if (!product) {
            console.log('[API] No product found in Prisma DB for BigCommerce ID:', bigcommerceProductId);
            return NextResponse.json({ vehicles: [], debug: { productFound: false, bigcommerceProductId } });
        }

        // Récupérer les compatibilités séparément (plus performant)
        const compatibilities = await db.productVehicleCompatibility.findMany({
            where: {
                productId: product.id,
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

        console.log('[API] Compatibilities loaded:', compatibilities.length);

        // Transformer les données
        const vehicles = compatibilities.map((compat) => ({
            vehicleId: compat.vehicle.vehicleId,
            manufacturer: compat.vehicle.model.manufacturer.name,
            model: compat.vehicle.model.modelName,
            typeEngineName: compat.vehicle.typeEngineName,
            constructionIntervalStart: compat.vehicle.constructionIntervalStart,
            constructionIntervalEnd: compat.vehicle.constructionIntervalEnd,
        }));

        console.log('[API] Returning vehicles:', vehicles.length);

        return NextResponse.json({ vehicles, debug: { productFound: true, compatCount: vehicles.length } });
    } catch (error) {
        console.error('Error fetching product compatibility:', error);
        return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
    }
}
