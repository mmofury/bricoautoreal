import { db } from './lib/db';

async function checkRelatedProducts() {
    // Trouver le produit avec bigcommerceProductId 27443 (l'exemple qu'on utilise)
    const product = await db.product.findFirst({
        where: { bigcommerceProductId: 27443 },
        select: { id: true, productName: true }
    });

    if (!product) {
        console.log('Produit 27443 non trouvé');
        return;
    }

    console.log('Produit trouvé:', product);

    // Trouver ses OEM
    const oems = await db.productOemNumber.findMany({
        where: { productId: product.id },
        select: { oemBrand: true, oemDisplayNo: true }
    });

    console.log('\nNuméros OEM du produit:', oems);

    if (oems.length === 0) {
        console.log('Aucun OEM trouvé');
        return;
    }

    // Chercher le OEM 4806.29 spécifiquement
    const targetOem = oems.find(o => o.oemDisplayNo === '4806.29');
    console.log('\nOEM 4806.29 trouvé?', targetOem);

    // Trouver tous les produits avec ce même OEM
    const relatedOems = await db.productOemNumber.findMany({
        where: {
            oemDisplayNo: '4806.29',
            productId: { not: product.id }
        },
        include: {
            product: {
                select: {
                    id: true,
                    bigcommerceProductId: true,
                    productName: true,
                    articleNo: true
                }
            }
        }
    });

    console.log(`\nProduits partageant l'OEM 4806.29: ${relatedOems.length}`);
    relatedOems.forEach(r => {
        console.log(`- ${r.product.productName} (BC ID: ${r.product.bigcommerceProductId}, Article: ${r.product.articleNo})`);
    });
}

checkRelatedProducts()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
