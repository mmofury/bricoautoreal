import { NextRequest, NextResponse } from 'next/server';
import { getProductsByManufacturerAndModel } from '~/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const manufacturerName = searchParams.get('manufacturer');
    const modelName = searchParams.get('model') || undefined;

    if (!manufacturerName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Le paramètre "manufacturer" est requis',
        },
        { status: 400 }
      );
    }

    const products = await getProductsByManufacturerAndModel(manufacturerName, modelName);

    return NextResponse.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    console.error('Erreur récupération produits par constructeur:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des produits',
      },
      { status: 500 }
    );
  }
}


































