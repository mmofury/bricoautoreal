'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface RelatedProduct {
    id: number;
    bigcommerceProductId: number | null;
    productName: string | null;
    supplierName: string | null;
    articleNo: string;
}

interface Props {
    productId: number;
    categoryName?: string;
}

export function RelatedProductsSection({ productId, categoryName = "Électricité automobile" }: Props) {
    const [products, setProducts] = useState<RelatedProduct[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRelatedProducts = async () => {
            try {
                const res = await fetch(`/api/related-products?productId=${productId}`);
                const data = await res.json();
                setProducts(data.relatedProducts || []);
            } catch (error) {
                console.error('Error fetching related products:', error);
            } finally {
                setLoading(false);
            }
        };

        void fetchRelatedProducts();
    }, [productId]);

    if (loading) {
        return (
            <div className="w-full py-8">
                <p className="text-[#637381] text-sm" style={{ fontFamily: 'Inter' }}>
                    Chargement des produits similaires...
                </p>
            </div>
        );
    }

    if (products.length === 0) return null;

    return (
        <div className="w-full py-8">
            <h2 className="text-[#212B36] text-[24px] font-semibold mb-6 px-4" style={{ fontFamily: 'Inter', lineHeight: '28px' }}>
                {categoryName}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4">
                {products.map((product) => (
                    <a
                        key={product.id}
                        href={`/product/${product.bigcommerceProductId || product.id}`}
                        className="bg-white rounded-[10px] border border-[#E6E9EC] p-[9px] flex gap-2 hover:shadow-md transition-shadow"
                    >
                        {/* Image */}
                        <div className="w-[80px] h-[80px] flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                            <img
                                src="https://placehold.co/80x80"
                                alt={product.productName || 'Product'}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                            {/* Title */}
                            <div className="flex items-center min-h-[42px]">
                                <h3
                                    className="text-[#212B36] text-[14px] font-medium leading-[21px] line-clamp-2"
                                    style={{ fontFamily: 'Inter' }}
                                >
                                    {product.productName || 'Produit sans nom'}
                                </h3>
                            </div>

                            {/* Price and Tax Info */}
                            <div className="flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-2">
                                    <span className="text-[#212B36] text-[16px] font-medium" style={{ fontFamily: 'Inter', lineHeight: '20px' }}>
                                        Prix sur demande
                                    </span>
                                </div>

                                <div className="flex items-center gap-3 text-[#637381] text-[13px] font-medium" style={{ fontFamily: 'Inter', lineHeight: '20px' }}>
                                    <span className="pr-3 border-r border-[#C4CDD5]">TVA incluse 20%</span>
                                    <span>hors frais de port</span>
                                </div>
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
}
