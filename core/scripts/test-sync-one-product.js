const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BIGCOMMERCE_STORE_HASH = process.env.BIGCOMMERCE_STORE_HASH;
const BIGCOMMERCE_ACCESS_TOKEN = process.env.BIGCOMMERCE_MANAGEMENT_TOKEN || process.env.BIGCOMMERCE_ACCESS_TOKEN;

if (!BIGCOMMERCE_STORE_HASH || !BIGCOMMERCE_ACCESS_TOKEN) {
    console.error('❌ Missing BigCommerce credentials in .env');
    console.error('   Need: BIGCOMMERCE_STORE_HASH and BIGCOMMERCE_MANAGEMENT_TOKEN');
    process.exit(1);
}

async function testSyncOneProduct() {
    console.log('🧪 Testing sync for ONE product...\n');

    try {
        // 1. Fetch first product from BigCommerce
        const url = `https://api.bigcommerce.com/stores/${BIGCOMMERCE_STORE_HASH}/v3/catalog/products?page=1&limit=1&include=images`;
        const res = await fetch(url, {
            headers: {
                'X-Auth-Token': BIGCOMMERCE_ACCESS_TOKEN,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch products: ${res.statusText}`);
        }

        const data = await res.json();
        const bcProduct = data.data[0];

        if (!bcProduct) {
            console.log('❌ No products found in BigCommerce');
            return;
        }

        console.log('📦 BigCommerce Product:');
        console.log('  - ID:', bcProduct.id);
        console.log('  - SKU:', bcProduct.sku);
        console.log('  - Name:', bcProduct.name);
        console.log('  - Images:', bcProduct.images?.length || 0);
        console.log('');

        // 2. Find corresponding product in Prisma by productId (SKU)
        const localProduct = await prisma.product.findFirst({
            where: { productId: bcProduct.sku },
            select: {
                id: true,
                productId: true,
                articleNo: true,
                productName: true,
                bigcommerceProductId: true
            }
        });

        if (!localProduct) {
            console.log('❌ Product not found in Prisma with productId:', bcProduct.sku);
            console.log('');
            console.log('💡 Trying to find by articleNo instead...');

            const localProductByArticle = await prisma.product.findFirst({
                where: { articleNo: bcProduct.sku },
                select: {
                    id: true,
                    productId: true,
                    articleNo: true,
                    productName: true,
                    bigcommerceProductId: true
                }
            });

            if (localProductByArticle) {
                console.log('✅ Found by articleNo!');
                console.log('  - Prisma ID:', localProductByArticle.id);
                console.log('  - productId:', localProductByArticle.productId);
                console.log('  - articleNo:', localProductByArticle.articleNo);
                console.log('  - Name:', localProductByArticle.productName);
                console.log('  - Current bigcommerceProductId:', localProductByArticle.bigcommerceProductId);
            } else {
                console.log('❌ Product not found by articleNo either');
            }
            return;
        }

        console.log('✅ Prisma Product:');
        console.log('  - Prisma ID:', localProduct.id);
        console.log('  - productId:', localProduct.productId);
        console.log('  - articleNo:', localProduct.articleNo);
        console.log('  - Name:', localProduct.productName);
        console.log('  - Current bigcommerceProductId:', localProduct.bigcommerceProductId);
        console.log('');

        // 3. Update bigcommerceProductId
        console.log('🔄 Updating bigcommerceProductId...');
        await prisma.product.update({
            where: { id: localProduct.id },
            data: { bigcommerceProductId: bcProduct.id }
        });

        console.log('✅ Updated! New bigcommerceProductId:', bcProduct.id);
        console.log('');

        // 4. Sync images
        if (bcProduct.images && bcProduct.images.length > 0) {
            console.log('🖼️  Syncing', bcProduct.images.length, 'images...');

            for (const img of bcProduct.images) {
                const imageUrl = img.url_standard;

                const existing = await prisma.productImage.findFirst({
                    where: {
                        productId: localProduct.id,
                        imageUrl: imageUrl
                    }
                });

                if (!existing) {
                    await prisma.productImage.create({
                        data: {
                            productId: localProduct.id,
                            imageUrl: imageUrl,
                            imageFilename: `bc_import_${img.id}`
                        }
                    });
                    console.log('  ✅ Added image:', imageUrl.substring(0, 60) + '...');
                } else {
                    console.log('  ⏭️  Image already exists');
                }
            }
        }

        console.log('');
        console.log('🎉 Test complete!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testSyncOneProduct();
