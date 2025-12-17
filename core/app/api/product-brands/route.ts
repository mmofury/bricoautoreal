import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/lib/db';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const bigcommerceProductId = searchParams.get('productId');

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
            },
        });

        if (!product) {
            return NextResponse.json({ brands: [] });
        }

        // Récupérer les marques compatibles via les relations
        const manufacturers = await db.manufacturer.findMany({
            where: {
                vehicleModels: {
                    some: {
                        vehicles: {
                            some: {
                                compatibilities: {
                                    some: {
                                        productId: product.id,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            select: {
                name: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        const brands = manufacturers.map((m) => m.name);

        return NextResponse.json({ brands });
    } catch (error) {
        console.error('Error fetching compatible brands:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
