'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from '~/components/link';

interface Category {
    id: string;
    label: string;
    labelFr?: string | null;
    url?: string | null;
}

interface CategoriesSidebarProps {
    categories: Category[];
    locale: string;
}

export function CategoriesSidebar({ categories, locale }: CategoriesSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCategories = categories.filter((cat) => {
        const label = cat.labelFr || cat.label;
        return label.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Split categories: first 14 are main, rest go after separator
    const mainCategories = filteredCategories.slice(0, 14);
    const additionalCategories = filteredCategories.slice(14);

    return (
        <div className="w-[304px] bg-white rounded border border-[#E6E9EC]">
            {/* Title */}
            <div className="px-[26px] pt-[27px] pb-4">
                <h2 className="text-[#212B36] text-[16px] font-semibold leading-[22px]" style={{ fontFamily: 'Inter' }}>
                    Catégories
                </h2>
            </div>

            {/* Search Input */}
            <div className="px-[26px] pb-[16px]">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Rechercher une catégorie"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-[38px] pl-[36px] pr-4 bg-white border border-[#C4CDD5] rounded-md text-[13px] text-[#212B36] placeholder:text-[#637381] focus:outline-none focus:ring-2 focus:ring-[#0077C7]"
                        style={{ fontFamily: 'Inter' }}
                    />
                    <Search
                        className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#212B36]"
                        size={20}
                    />
                </div>
            </div>

            {/* Categories List */}
            <div className="pb-4">
                {/* Main Categories */}
                {mainCategories.map((category) => (
                    <Link
                        key={category.id}
                        href={category.url || `/${locale}/pieces-detachees/${category.id}`}
                        className="flex items-center h-[30px] px-[26px] hover:bg-gray-50 transition-colors group"
                    >
                        <svg
                            className="w-[10px] h-[10px] mr-[15px] flex-shrink-0"
                            viewBox="0 0 10 10"
                            fill="none"
                        >
                            <path
                                d="M2.79 1.10L6.69 5L2.79 8.90"
                                stroke="#212B36"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <span
                            className="text-[#212B36] text-[14px] font-medium leading-[20px] line-clamp-2"
                            style={{ fontFamily: 'Inter' }}
                        >
                            {category.labelFr || category.label}
                        </span>
                    </Link>
                ))}

                {/* Separator if there are additional categories */}
                {additionalCategories.length > 0 && (
                    <div className="border-t border-[#E6E9EC] my-[10px] mx-[26px]" />
                )}

                {/* Additional Categories */}
                {additionalCategories.map((category) => (
                    <Link
                        key={category.id}
                        href={category.url || `/${locale}/pieces-detachees/${category.id}`}
                        className="flex items-center h-[30px] px-[26px] hover:bg-gray-50 transition-colors group"
                    >
                        <svg
                            className="w-[10px] h-[10px] mr-[15px] flex-shrink-0"
                            viewBox="0 0 10 10"
                            fill="none"
                        >
                            <path
                                d="M2.79 1.10L6.69 5L2.79 8.90"
                                stroke="#212B36"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <span
                            className="text-[#212B36] text-[14px] font-medium leading-[20px] line-clamp-2"
                            style={{ fontFamily: 'Inter' }}
                        >
                            {category.labelFr || category.label}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
