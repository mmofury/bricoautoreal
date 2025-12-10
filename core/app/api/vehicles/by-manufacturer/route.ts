import { NextRequest, NextResponse } from 'next/server';
import { getVehiclesByManufacturer } from '~/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const manufacturerName = searchParams.get('manufacturer');

    if (!manufacturerName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Le paramètre "manufacturer" est requis',
        },
        { status: 400 }
      );
    }

    const vehicles = await getVehiclesByManufacturer(manufacturerName);

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

































