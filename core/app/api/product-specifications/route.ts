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
            return NextResponse.json({ specifications: [] });
        }

        // Récupérer les spécifications
        const specifications = await db.productSpecification.findMany({
            where: {
                productId: product.id,
            },
            select: {
                criteriaName: true,
                criteriaValue: true,
            },
            orderBy: {
                criteriaName: 'asc',
            },
        });

        // Transformer en format attendu
        const formattedSpecs = specifications
            .filter(spec => spec.criteriaValue) // Exclure les valeurs null
            .map(spec => ({
                label: spec.criteriaName,
                value: spec.criteriaValue!,
            }));

        return NextResponse.json({ specifications: formattedSpecs });
    } catch (error) {
        console.error('Error fetching product specifications:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
