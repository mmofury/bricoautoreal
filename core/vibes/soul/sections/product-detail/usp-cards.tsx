'use client';

export function USPCards() {
    const cards = [
        {
            icon: (
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <path d="M20 5L25 15L35 20L25 25L20 35L15 25L5 20L15 15L20 5Z" stroke="#212B36" strokeWidth="2" />
                </svg>
            ),
            title: 'Des options de paiement sûres',
            description: 'Nous travaillons uniquement avec les\nsystèmes de paiement les plus sécurisés.',
        },
        {
            icon: (
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <path d="M10 20C10 14.5 14.5 10 20 10C25.5 10 30 14.5 30 20C30 25.5 25.5 30 20 30" stroke="#212B36" strokeWidth="2" />
                    <path d="M15 25L10 30L5 25" stroke="#212B36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            title: 'Conditions de retour sous 90 jours',
            description: 'Nous faisons tous les efforts possibles\npour préserver la satisfaction de nos\nclients.',
        },
        {
            icon: (
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <circle cx="20" cy="20" r="15" stroke="#212B36" strokeWidth="2" />
                    <path d="M20 10V20L25 25" stroke="#212B36" strokeWidth="2" strokeLinecap="round" />
                </svg>
            ),
            title: 'Livraison internationale',
            description: 'Des pièces auto de qualité livrées\ndirectement chez vous.',
        },
        {
            icon: (
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <path d="M15 10L25 10L25 30L15 30L15 10Z" stroke="#212B36" strokeWidth="2" />
                    <path d="M20 15V25M15 20H25" stroke="#212B36" strokeWidth="2" strokeLinecap="round" />
                </svg>
            ),
            title: 'Vérification de la compatibilité des\nproduits',
            description: 'Nous vérifions la compatibilité des\nproduits commandés avec votre véhicule.',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-8">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className="bg-white rounded-[6px] border border-[#C4CDD5] p-6 flex flex-col items-center text-center"
                >
                    <div className="mb-4">{card.icon}</div>
                    <h3
                        className="text-[#212B36] text-[14px] font-medium mb-3 whitespace-pre-line"
                        style={{ fontFamily: 'Inter' }}
                    >
                        {card.title}
                    </h3>
                    <p
                        className="text-[#637381] text-[14px] font-normal whitespace-pre-line"
                        style={{ fontFamily: 'Inter', lineHeight: '20px' }}
                    >
                        {card.description}
                    </p>
                </div>
            ))}
        </div>
    );
}
