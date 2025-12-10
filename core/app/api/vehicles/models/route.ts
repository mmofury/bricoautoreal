import { NextRequest, NextResponse } from 'next/server';
import { getModelsByManufacturer } from '~/lib/db/queries';

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

    const models = await getModelsByManufacturer(manufacturerName);

    return NextResponse.json({
      success: true,
      data: models,
      count: models.length,
    });
  } catch (error) {
    console.error('Erreur récupération modèles:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des modèles',
      },
      { status: 500 }
    );
  }
}

































