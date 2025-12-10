import { NextRequest, NextResponse } from 'next/server';
import { getProductByArticleNo } from '~/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ articleNo: string }> }
) {
  try {
    const { articleNo } = await params;
    const decodedArticleNo = decodeURIComponent(articleNo);

    const product = await getProductByArticleNo(decodedArticleNo);

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Produit non trouvé',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Erreur récupération produit:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération du produit',
      },
      { status: 500 }
    );
  }
}

































