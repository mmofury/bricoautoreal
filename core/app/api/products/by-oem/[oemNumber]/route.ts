import { NextRequest, NextResponse } from 'next/server';
import { getProductsByOemNumber } from '~/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ oemNumber: string }> }
) {
  try {
    const { oemNumber } = await params;
    const decodedOemNumber = decodeURIComponent(oemNumber);

    const products = await getProductsByOemNumber(decodedOemNumber);

    return NextResponse.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    console.error('Erreur récupération produits par OEM:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des produits',
      },
      { status: 500 }
    );
  }
}


































