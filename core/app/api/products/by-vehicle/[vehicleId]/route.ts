import { NextRequest, NextResponse } from 'next/server';
import { getProductsByVehicle } from '~/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    const { vehicleId } = await params;
    const vehicleIdNum = parseInt(vehicleId);

    if (isNaN(vehicleIdNum)) {
      return NextResponse.json(
        {
          success: false,
          error: 'vehicleId doit être un nombre',
        },
        { status: 400 }
      );
    }

    const products = await getProductsByVehicle(vehicleIdNum);

    return NextResponse.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    console.error('Erreur récupération produits par véhicule:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des produits',
      },
      { status: 500 }
    );
  }
}


































