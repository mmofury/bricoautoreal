import { NextRequest, NextResponse } from 'next/server';
import { getVehicleCompatibilityForProduct } from '~/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const productIdNum = parseInt(productId);

    if (isNaN(productIdNum)) {
      return NextResponse.json(
        {
          success: false,
          error: 'productId doit être un nombre',
        },
        { status: 400 }
      );
    }

    const compatibilities = await getVehicleCompatibilityForProduct(productIdNum);

    return NextResponse.json({
      success: true,
      data: compatibilities,
      count: compatibilities.length,
    });
  } catch (error) {
    console.error('Erreur récupération compatibilités:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des compatibilités',
      },
      { status: 500 }
    );
  }
}

































