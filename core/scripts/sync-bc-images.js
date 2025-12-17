
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BIGCOMMERCE_STORE_HASH = process.env.BIGCOMMERCE_STORE_HASH;
const BIGCOMMERCE_ACCESS_TOKEN = process.env.BIGCOMMERCE_ACCESS_TOKEN;

if (!BIGCOMMERCE_STORE_HASH || !BIGCOMMERCE_ACCESS_TOKEN) {
    console.error('❌ Missing BigCommerce credentials in .env');
    process.exit(1);
}

async function fetchBigCommerceProducts(page = 1, limit = 250) {
    // Dynamic import for fetch if needed in older node environments, 
    // but Node 18+ has global fetch.
    // Assuming modern Node env based on project.
    const url = `https://api.bigcommerce.com/stores/${BIGCOMMERCE_STORE_HASH}/v3/catalog/products?page=${page}&limit=${limit}&include=images`;
    const res = await fetch(url, {
        headers: {
            'X-Auth-Token': BIGCOMMERCE_ACCESS_TOKEN,
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch products: ${res.statusText}`);
    }

    return res.json();
}

async function syncImages() {
    console.log('🚀 Starting sync of BigCommerce images...');

    let page = 1;
    let totalUpdated = 0;

    while (true) {
        console.log(`📥 Fetching page ${page}...`);
        const data = await fetchBigCommerceProducts(page);
        const products = data.data;

        if (!products || products.length === 0) {
            break;
        }

        // Process batch
        for (const bcProduct of products) {
            if (!bcProduct.images || bcProduct.images.length === 0) continue;

            try {
                // 1. Find local product
                const localProduct = await prisma.product.findFirst({
                    where: {
                        OR: [
                            { bigcommerceProductId: bcProduct.id },
                            { articleNo: bcProduct.sku }
                        ]
                    },
                    select: { id: true }
                });

                if (!localProduct) continue;

                // UPDATE: Ensure bigcommerceProductId is set
                await prisma.product.update({
                    where: { id: localProduct.id },
                    data: { bigcommerceProductId: bcProduct.id }
                });

                let imagesAdded = 0;

                // 2. Iterate over BC images
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
                                imageFilename: `bc_import_${img.id}` // Tagging source
                            }
                        });
                        imagesAdded++;
                    }
                }

                if (imagesAdded > 0) {
                    console.log(`✅ Updated product ${bcProduct.name} (SKU: ${bcProduct.sku}): +${imagesAdded} images`);
                    totalUpdated += imagesAdded;
                }
            } catch (err) {
                console.error(`⚠️ Error updating product ${bcProduct.id}:`, err);
            }
        }

        // Checking pagination
        if (page >= data.meta.pagination.total_pages) {
            break;
        }

        page++;
        // Simple rate limit avoidance
        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`🎉 Sync complete! Total images added: ${totalUpdated}`);
    await prisma.$disconnect();
}

syncImages().catch(e => {
    console.error(e);
    process.exit(1);
});
