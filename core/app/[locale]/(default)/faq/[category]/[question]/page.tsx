import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{
    locale: string;
    category: string;
    question: string;
  }>;
}

// Base de données des questions/réponses
const faqData: Record<string, Record<string, { question: string; answer: string }>> = {
  produits: {
    'qualite-produits': {
      question: 'Quelle est la qualité des produits vendus ?',
      answer: `Nous proposons uniquement des pièces détachées de qualité équivalente ou supérieure aux pièces d'origine (OEM). Toutes nos pièces proviennent de fabricants reconnus et respectent les normes européennes en vigueur.

Nos fournisseurs sont sélectionnés avec soin et nos produits sont garantis pour assurer votre sécurité et la longévité de votre véhicule.`,
    },
    'origine-produits': {
      question: 'D\'où proviennent les pièces détachées ?',
      answer: `Nos pièces détachées proviennent de fabricants européens reconnus dans l'industrie automobile. Nous travaillons avec des marques de renom qui fournissent également les constructeurs automobiles.

Chaque pièce est accompagnée de sa documentation technique et de son certificat de conformité.`,
    },
    'compatibilite': {
      question: 'Comment vérifier la compatibilité avec mon véhicule ?',
      answer: `Pour vérifier la compatibilité d'une pièce avec votre véhicule :

1. Utilisez notre sélecteur de véhicule en haut de page
2. Sélectionnez la marque, le modèle et la motorisation de votre véhicule
3. Les pièces compatibles s'afficheront automatiquement

Vous pouvez également vérifier la compatibilité en consultant les références constructeur (OEM) indiquées sur chaque fiche produit.`,
    },
    'references': {
      question: 'Comment trouver la référence de ma pièce ?',
      answer: `Pour trouver la référence de votre pièce :

1. Consultez le carnet d'entretien de votre véhicule
2. Vérifiez la référence inscrite sur la pièce d'origine
3. Utilisez notre moteur de recherche avec le numéro OEM
4. Contactez notre service client avec votre numéro de châssis

Notre équipe peut vous aider à identifier la bonne référence si nécessaire.`,
    },
  },
  commande: {
    'passer-commande': {
      question: 'Comment passer une commande ?',
      answer: `Pour passer une commande sur BricoAuto :

1. Sélectionnez votre véhicule avec notre sélecteur
2. Recherchez les pièces dont vous avez besoin
3. Ajoutez-les à votre panier
4. Vérifiez votre panier et cliquez sur "Commander"
5. Créez un compte ou connectez-vous
6. Renseignez votre adresse de livraison
7. Choisissez votre mode de paiement
8. Validez votre commande

Vous recevrez une confirmation par email immédiatement.`,
    },
    'modifier-commande': {
      question: 'Puis-je modifier ma commande ?',
      answer: `Vous pouvez modifier votre commande tant qu'elle n'a pas été expédiée.

Pour modifier votre commande :
- Contactez notre service client au plus vite
- Indiquez votre numéro de commande
- Précisez les modifications souhaitées

Une fois la commande expédiée, vous devrez procéder à un retour selon nos conditions de retour.`,
    },
    'annuler-commande': {
      question: 'Comment annuler ma commande ?',
      answer: `Vous disposez d'un délai de rétractation de 14 jours pour annuler votre commande.

Pour annuler :
1. Connectez-vous à votre compte
2. Accédez à "Mes commandes"
3. Sélectionnez la commande à annuler
4. Cliquez sur "Annuler la commande"

Si la commande a déjà été expédiée, vous devrez la refuser à la livraison ou procéder à un retour.`,
    },
    'suivre-commande': {
      question: 'Comment suivre ma commande ?',
      answer: `Pour suivre votre commande :

1. Connectez-vous à votre compte
2. Accédez à "Mes commandes"
3. Cliquez sur la commande concernée
4. Consultez le statut et le numéro de suivi

Vous recevrez également des emails à chaque étape :
- Confirmation de commande
- Expédition avec numéro de suivi
- Livraison

Le numéro de suivi vous permet de suivre votre colis en temps réel sur le site du transporteur.`,
    },
  },
  'livraison-paiement': {
    'delais-livraison': {
      question: 'Quels sont les délais de livraison ?',
      answer: `Nos délais de livraison varient selon le mode de livraison choisi :

**Livraison Standard** : 3 à 5 jours ouvrés
**Livraison Express** : 24 à 48h ouvrées
**Point Relais** : 3 à 4 jours ouvrés

Les délais commencent à partir de l'expédition de votre commande. Vous recevez un email avec le numéro de suivi dès l'expédition.

Note : Les délais peuvent être allongés en période de forte activité (soldes, promotions).`,
    },
    'frais-livraison': {
      question: 'Quels sont les frais de livraison ?',
      answer: `Nos frais de livraison sont les suivants :

**Livraison Standard** : 6,90 €
**Livraison Express** : 12,90 €
**Point Relais** : 4,90 €

**Livraison gratuite** à partir de 100 € d'achat (hors livraison express)

Les frais de livraison sont calculés automatiquement lors de la validation de votre panier.`,
    },
    'modes-paiement': {
      question: 'Quels sont les modes de paiement acceptés ?',
      answer: `Nous acceptons les modes de paiement suivants :

- **Carte bancaire** : Visa, Mastercard, American Express
- **PayPal** : Paiement sécurisé via votre compte PayPal
- **Virement bancaire** : Pour les professionnels uniquement
- **Paiement en 3x ou 4x** : Sans frais à partir de 100 €

Tous les paiements sont sécurisés et cryptés SSL.`,
    },
    'securite-paiement': {
      question: 'Le paiement est-il sécurisé ?',
      answer: `Oui, tous vos paiements sont 100% sécurisés.

**Nos garanties de sécurité** :
- Cryptage SSL 256 bits
- Certification PCI-DSS
- 3D Secure pour les cartes bancaires
- Aucune conservation de vos données bancaires

Vos informations de paiement sont transmises directement à notre prestataire de paiement sécurisé et ne transitent jamais par nos serveurs.`,
    },
  },
  retours: {
    'retourner-produit': {
      question: 'Comment retourner un produit ?',
      answer: `Pour retourner un produit :

1. Connectez-vous à votre compte
2. Accédez à "Mes commandes"
3. Sélectionnez la commande concernée
4. Cliquez sur "Retourner un article"
5. Sélectionnez le(s) produit(s) à retourner
6. Indiquez le motif du retour
7. Imprimez le bon de retour

Renvoyez le colis avec le bon de retour à l'adresse indiquée. Le produit doit être dans son emballage d'origine, non utilisé et complet.`,
    },
    'delai-retour': {
      question: 'Quel est le délai pour retourner un produit ?',
      answer: `Vous disposez de **14 jours** à compter de la réception de votre commande pour exercer votre droit de rétractation.

Le produit doit être retourné :
- Dans son emballage d'origine
- Non utilisé et non monté
- Avec tous ses accessoires
- Accompagné du bon de retour

Le délai de 14 jours commence à la date de réception indiquée sur votre bon de livraison.`,
    },
    'frais-retour': {
      question: 'Qui paie les frais de retour ?',
      answer: `Les frais de retour dépendent du motif :

**Retour pour erreur de notre part** : Frais de retour à notre charge
- Produit défectueux
- Erreur de référence
- Produit endommagé à la livraison

**Retour pour changement d'avis** : Frais de retour à votre charge
- Vous pouvez utiliser le transporteur de votre choix
- Nous recommandons un envoi avec suivi

Dans tous les cas, conservez votre preuve d'expédition.`,
    },
    'remboursement': {
      question: 'Quand serai-je remboursé ?',
      answer: `Le remboursement intervient dans les **14 jours** suivant la réception de votre retour dans nos entrepôts.

**Délai de traitement** :
1. Réception du colis : 2-3 jours
2. Contrôle qualité : 2-3 jours
3. Validation du remboursement : 1 jour
4. Virement bancaire : 3-5 jours

Vous recevez un email à chaque étape. Le remboursement s'effectue sur le moyen de paiement utilisé lors de la commande.`,
    },
  },
  garantie: {
    'duree-garantie': {
      question: 'Quelle est la durée de garantie ?',
      answer: `Toutes nos pièces détachées bénéficient d'une garantie :

**Garantie légale** : 2 ans minimum
**Garantie constructeur** : Selon la marque (généralement 2 à 5 ans)

La durée de garantie spécifique est indiquée sur chaque fiche produit.

La garantie couvre :
- Les défauts de fabrication
- Les vices cachés
- Les non-conformités

Elle ne couvre pas l'usure normale ni les dommages dus à une mauvaise installation.`,
    },
    'conditions-garantie': {
      question: 'Quelles sont les conditions de garantie ?',
      answer: `Pour bénéficier de la garantie, les conditions suivantes doivent être respectées :

**Installation** :
- Par un professionnel qualifié
- Selon les préconisations du constructeur
- Avec les outils appropriés

**Conservation** :
- Facture d'achat
- Emballage d'origine
- Notice d'installation

**Exclusions** :
- Usure normale
- Mauvaise installation
- Modification de la pièce
- Utilisation non conforme

La garantie ne couvre pas les frais de main d'œuvre.`,
    },
    'faire-valoir-garantie': {
      question: 'Comment faire valoir ma garantie ?',
      answer: `Pour faire valoir votre garantie :

1. **Contactez notre service client** avec :
   - Votre numéro de commande
   - La référence du produit
   - Une description du problème
   - Des photos si possible

2. **Nous analysons votre demande** :
   - Vérification de la garantie
   - Diagnostic du problème
   - Validation de la prise en charge

3. **Retour du produit** :
   - Bon de retour fourni
   - Frais de retour à notre charge
   - Emballage sécurisé

4. **Traitement** :
   - Échange ou remboursement
   - Délai : 15 jours maximum

Notre service client vous accompagne à chaque étape.`,
    },
  },
  compte: {
    'creer-compte': {
      question: 'Comment créer un compte ?',
      answer: `Pour créer votre compte BricoAuto :

1. Cliquez sur "Connexion" en haut à droite
2. Sélectionnez "Créer un compte"
3. Renseignez vos informations :
   - Email
   - Mot de passe
   - Nom et prénom
   - Adresse
4. Acceptez les conditions générales
5. Cliquez sur "Créer mon compte"

Vous recevrez un email de confirmation. Votre compte vous permet de :
- Suivre vos commandes
- Enregistrer vos véhicules
- Accéder à vos factures
- Bénéficier d'offres exclusives`,
    },
    'modifier-informations': {
      question: 'Comment modifier mes informations personnelles ?',
      answer: `Pour modifier vos informations :

1. Connectez-vous à votre compte
2. Accédez à "Mon compte"
3. Sélectionnez "Mes informations"
4. Modifiez les champs souhaités :
   - Coordonnées
   - Adresses
   - Mot de passe
5. Cliquez sur "Enregistrer"

Les modifications sont prises en compte immédiatement. Vous recevez un email de confirmation pour toute modification importante (email, mot de passe).`,
    },
    'mot-de-passe-oublie': {
      question: 'J\'ai oublié mon mot de passe',
      answer: `Pour réinitialiser votre mot de passe :

1. Cliquez sur "Connexion"
2. Sélectionnez "Mot de passe oublié ?"
3. Saisissez votre adresse email
4. Cliquez sur "Réinitialiser"
5. Consultez votre boîte email
6. Cliquez sur le lien de réinitialisation
7. Créez un nouveau mot de passe

Le lien est valable 24 heures. Si vous ne recevez pas l'email :
- Vérifiez vos spams
- Vérifiez l'adresse email saisie
- Contactez notre service client`,
    },
    'donnees-personnelles': {
      question: 'Comment sont utilisées mes données personnelles ?',
      answer: `Vos données personnelles sont protégées et utilisées uniquement pour :

**Gestion de votre compte** :
- Traitement de vos commandes
- Service client
- Facturation

**Communication** :
- Suivi de commande
- Offres personnalisées (avec votre accord)
- Enquêtes de satisfaction

**Vos droits** :
- Accès à vos données
- Rectification
- Suppression
- Opposition au traitement
- Portabilité

Vos données ne sont jamais vendues à des tiers. Consultez notre politique de confidentialité pour plus de détails.`,
    },
  },
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { category, question } = await props.params;
  
  const questionData = faqData[category]?.[question];
  
  if (!questionData) {
    return {
      title: 'Question non trouvée',
    };
  }

  return {
    title: `${questionData.question} - FAQ BricoAuto`,
    description: questionData.answer.substring(0, 160),
  };
}

export default async function FAQQuestionPage(props: Props) {
  const { locale, category, question } = await props.params;
  setRequestLocale(locale);

  const questionData = faqData[category]?.[question];

  if (!questionData) {
    return notFound();
  }

  // Trouver les autres questions de la même catégorie
  const relatedQuestions = Object.entries(faqData[category] || {})
    .filter(([slug]) => slug !== question)
    .map(([slug, data]) => ({
      slug,
      question: data.question,
    }));

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#e5e7eb]">
        <div className="mx-auto w-full max-w-screen-2xl px-4 py-4 md:px-8">
          <nav className="flex items-center gap-2 text-sm text-[#64748b]">
            <Link href={`/${locale}`} className="hover:text-[#0077c7]">
              Accueil
            </Link>
            <span>/</span>
            <Link href={`/${locale}/faq`} className="hover:text-[#0077c7]">
              FAQ
            </Link>
            <span>/</span>
            <span className="text-[#0f172a]">{questionData.question}</span>
          </nav>
        </div>
      </div>

      <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 md:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Contenu principal */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-[#e5e7eb] bg-white p-8">
              <h1 className="text-3xl font-bold text-[#0f172a] mb-6">
                {questionData.question}
              </h1>
              <div className="prose prose-slate max-w-none">
                {questionData.answer.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="mb-4 text-[#475569] leading-relaxed whitespace-pre-line">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Cet article vous a-t-il été utile ? */}
              <div className="mt-8 pt-8 border-t border-[#e5e7eb]">
                <p className="text-sm font-semibold text-[#0f172a] mb-3">
                  Cet article vous a-t-il été utile ?
                </p>
                <div className="flex gap-3">
                  <button className="rounded-lg border border-[#e5e7eb] px-4 py-2 text-sm font-medium text-[#0f172a] transition hover:border-[#0077c7] hover:text-[#0077c7]">
                    👍 Oui
                  </button>
                  <button className="rounded-lg border border-[#e5e7eb] px-4 py-2 text-sm font-medium text-[#0f172a] transition hover:border-[#0077c7] hover:text-[#0077c7]">
                    👎 Non
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Questions liées */}
            {relatedQuestions.length > 0 && (
              <div className="rounded-lg border border-[#e5e7eb] bg-white p-6">
                <h2 className="text-lg font-semibold text-[#0f172a] mb-4">
                  Questions liées
                </h2>
                <ul className="space-y-3">
                  {relatedQuestions.map((related) => (
                    <li key={related.slug}>
                      <Link
                        href={`/${locale}/faq/${category}/${related.slug}`}
                        className="text-sm text-[#475569] hover:text-[#0077c7] hover:underline"
                      >
                        {related.question}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Contact */}
            <div className="rounded-lg border border-[#e5e7eb] bg-white p-6">
              <h2 className="text-lg font-semibold text-[#0f172a] mb-3">
                Besoin d'aide ?
              </h2>
              <p className="text-sm text-[#64748b] mb-4">
                Notre équipe est disponible pour répondre à vos questions
              </p>
              <Link
                href={`/${locale}/contact`}
                className="block w-full rounded-lg bg-[#0077c7] px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-[#005fa3]"
              >
                Contactez-nous
              </Link>
            </div>

            {/* Retour à la FAQ */}
            <Link
              href={`/${locale}/faq`}
              className="block rounded-lg border border-[#e5e7eb] bg-white p-4 text-center text-sm font-medium text-[#0f172a] transition hover:border-[#0077c7] hover:text-[#0077c7]"
            >
              ← Retour à la FAQ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

