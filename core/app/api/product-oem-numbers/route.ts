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
            return NextResponse.json({ oemNumbers: [] });
        }

        // Récupérer les numéros OEM
        const oemNumbers = await db.productOemNumber.findMany({
            where: {
                productId: product.id,
            },
            select: {
                oemBrand: true,
                oemDisplayNo: true,
            },
            orderBy: {
                oemBrand: 'asc',
            },
        });

        // Grouper par fabricant
        const grouped = oemNumbers.reduce((acc, item) => {
            if (!acc[item.oemBrand]) {
                acc[item.oemBrand] = [];
            }
            acc[item.oemBrand].push(item.oemDisplayNo);
            return acc;
        }, {} as Record<string, string[]>);

        return NextResponse.json({ oemNumbers: grouped });
    } catch (error) {
        console.error('Error fetching OEM numbers:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
