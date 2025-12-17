import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/lib/db';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const productId = searchParams.get('productId');

        if (!productId) {
            return NextResponse.json({ error: 'Missing productId parameter' }, { status: 400 });
        }

        const product = await db.product.findFirst({
            where: {
                bigcommerceProductId: parseInt(productId),
            },
            select: {
                productName: true,
                supplierName: true,
                articleNo: true,
            },
        });

        console.log('API product-basic-info - productId (BigCommerce):', productId);
        console.log('API product-basic-info - product found:', product);

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const response = {
            productName: product.productName,
            supplierName: product.supplierName,
            searchNumber: product.articleNo,
        };
        console.log('API product-basic-info - returning:', response);

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching product basic info:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
