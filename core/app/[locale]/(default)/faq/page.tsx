import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  return {
    title: 'Questions fréquentes - FAQ',
    description: 'Trouvez des réponses à vos questions sur BricoAuto : commande, livraison, paiement, retours et garantie.',
  };
}

const faqCategories = [
  {
    id: 'produits',
    title: 'Les produits vendus sur BricoAuto',
    icon: '📦',
    questions: [
      {
        id: 'qualite-produits',
        question: 'Quelle est la qualité des produits vendus ?',
        slug: 'qualite-produits',
      },
      {
        id: 'origine-produits',
        question: 'D\'où proviennent les pièces détachées ?',
        slug: 'origine-produits',
      },
      {
        id: 'compatibilite',
        question: 'Comment vérifier la compatibilité avec mon véhicule ?',
        slug: 'compatibilite',
      },
      {
        id: 'references',
        question: 'Comment trouver la référence de ma pièce ?',
        slug: 'references',
      },
    ],
  },
  {
    id: 'commande',
    title: 'Passer ma commande',
    icon: '🛒',
    questions: [
      {
        id: 'passer-commande',
        question: 'Comment passer une commande ?',
        slug: 'passer-commande',
      },
      {
        id: 'modifier-commande',
        question: 'Puis-je modifier ma commande ?',
        slug: 'modifier-commande',
      },
      {
        id: 'annuler-commande',
        question: 'Comment annuler ma commande ?',
        slug: 'annuler-commande',
      },
      {
        id: 'suivre-commande',
        question: 'Comment suivre ma commande ?',
        slug: 'suivre-commande',
      },
    ],
  },
  {
    id: 'livraison-paiement',
    title: 'La livraison et le paiement',
    icon: '🚚',
    questions: [
      {
        id: 'delais-livraison',
        question: 'Quels sont les délais de livraison ?',
        slug: 'delais-livraison',
      },
      {
        id: 'frais-livraison',
        question: 'Quels sont les frais de livraison ?',
        slug: 'frais-livraison',
      },
      {
        id: 'modes-paiement',
        question: 'Quels sont les modes de paiement acceptés ?',
        slug: 'modes-paiement',
      },
      {
        id: 'securite-paiement',
        question: 'Le paiement est-il sécurisé ?',
        slug: 'securite-paiement',
      },
    ],
  },
  {
    id: 'retours',
    title: 'Mes retours',
    icon: '↩️',
    questions: [
      {
        id: 'retourner-produit',
        question: 'Comment retourner un produit ?',
        slug: 'retourner-produit',
      },
      {
        id: 'delai-retour',
        question: 'Quel est le délai pour retourner un produit ?',
        slug: 'delai-retour',
      },
      {
        id: 'frais-retour',
        question: 'Qui paie les frais de retour ?',
        slug: 'frais-retour',
      },
      {
        id: 'remboursement',
        question: 'Quand serai-je remboursé ?',
        slug: 'remboursement',
      },
    ],
  },
  {
    id: 'garantie',
    title: 'La garantie',
    icon: '🛡️',
    questions: [
      {
        id: 'duree-garantie',
        question: 'Quelle est la durée de garantie ?',
        slug: 'duree-garantie',
      },
      {
        id: 'conditions-garantie',
        question: 'Quelles sont les conditions de garantie ?',
        slug: 'conditions-garantie',
      },
      {
        id: 'faire-valoir-garantie',
        question: 'Comment faire valoir ma garantie ?',
        slug: 'faire-valoir-garantie',
      },
    ],
  },
  {
    id: 'compte',
    title: 'Compte client et données personnelles',
    icon: '👤',
    questions: [
      {
        id: 'creer-compte',
        question: 'Comment créer un compte ?',
        slug: 'creer-compte',
      },
      {
        id: 'modifier-informations',
        question: 'Comment modifier mes informations personnelles ?',
        slug: 'modifier-informations',
      },
      {
        id: 'mot-de-passe-oublie',
        question: 'J\'ai oublié mon mot de passe',
        slug: 'mot-de-passe-oublie',
      },
      {
        id: 'donnees-personnelles',
        question: 'Comment sont utilisées mes données personnelles ?',
        slug: 'donnees-personnelles',
      },
    ],
  },
];

export default async function FAQPage(props: Props) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Hero Section */}
      <div className="bg-white border-b border-[#e5e7eb]">
        <div className="mx-auto w-full max-w-screen-2xl px-4 py-12 md:px-8">
          <h1 className="text-4xl font-bold text-[#0f172a] mb-3">
            Questions fréquentes
          </h1>
          <p className="text-lg text-[#64748b]">
            Trouvez rapidement des réponses à vos questions
          </p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 md:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {faqCategories.map((category) => (
            <div
              key={category.id}
              className="rounded-lg border border-[#e5e7eb] bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="text-3xl">{category.icon}</span>
                <h2 className="text-xl font-semibold text-[#0f172a]">
                  {category.title}
                </h2>
              </div>
              <ul className="space-y-3">
                {category.questions.map((question) => (
                  <li key={question.id}>
                    <Link
                      href={`/${locale}/faq/${category.id}/${question.slug}`}
                      className="text-sm text-[#475569] hover:text-[#0077c7] hover:underline"
                    >
                      {question.question}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 md:px-8">
        <div className="rounded-lg border border-[#e5e7eb] bg-white p-8 text-center">
          <h2 className="text-2xl font-bold text-[#0f172a] mb-3">
            Vous ne trouvez pas de réponse ?
          </h2>
          <p className="text-[#64748b] mb-6">
            Notre équipe est là pour vous aider
          </p>
          <Link
            href={`/${locale}/contact`}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0077c7] px-6 py-3 text-white font-semibold transition hover:bg-[#005fa3]"
          >
            Contactez-nous
          </Link>
        </div>
      </div>
    </div>
  );
}

