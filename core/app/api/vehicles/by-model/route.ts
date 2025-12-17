import { NextRequest, NextResponse } from 'next/server';
import { getVehiclesByModel } from '~/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const modelName = searchParams.get('model');

    if (!modelName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Le paramètre "model" est requis',
        },
        { status: 400 }
      );
    }

    const vehicles = await getVehiclesByModel(modelName);

    return NextResponse.json({
      success: true,
      data: vehicles,
      count: vehicles.length,
    });
  } catch (error) {
    console.error('Erreur récupération véhicules:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des véhicules',
      },
      { status: 500 }
    );
  }
}


































