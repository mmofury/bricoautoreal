import { NextRequest, NextResponse } from 'next/server';
import { searchProducts } from '~/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters = {
      articleNo: searchParams.get('articleNo') || undefined,
      supplierName: searchParams.get('supplierName') || undefined,
      productName: searchParams.get('productName') || undefined,
      manufacturerName: searchParams.get('manufacturerName') || undefined,
      modelName: searchParams.get('modelName') || undefined,
      vehicleId: searchParams.get('vehicleId')
        ? parseInt(searchParams.get('vehicleId')!)
        : undefined,
      oemNumber: searchParams.get('oemNumber') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    const products = await searchProducts(filters);

    return NextResponse.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    console.error('Erreur recherche produits:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la recherche de produits',
      },
      { status: 500 }
    );
  }
}

































