'use client';

import { useState } from 'react';

interface NewsletterBannerProps {
  locale?: string;
}

export function NewsletterBanner({ locale = 'fr' }: NewsletterBannerProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simuler l'envoi (à remplacer par votre API)
    setTimeout(() => {
      setMessage('Merci pour votre inscription !');
      setEmail('');
      setIsSubmitting(false);
      setTimeout(() => setMessage(''), 3000);
    }, 1000);
  };

  return (
    <div className="relative mx-auto max-w-[1408px] rounded bg-[#1E1E1E] px-4 py-3">
      <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M31.9288 16.9257C31.8715 16.6239 31.7773 16.3303 31.6485 16.0515L28.2335 10.0781L21.5071 13.9597L25.7007 21.2756L20.3341 21.2339L20.4172 17.7686L16.5869 24.8763L20.3964 31.5156L20.4483 28.4977L24.3305 28.5498C24.7298 28.5438 25.122 28.4436 25.4754 28.2574C25.8289 28.0712 26.1337 27.8041 26.365 27.4779C26.365 27.4779 31.279 19.7771 31.3683 19.6002C31.6416 19.2176 31.8325 18.7824 31.929 18.322C32.0256 17.8615 32.0255 17.3861 31.9288 16.9257Z" fill="#FFCC00"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M24.0612 10.4208L27.7565 3.71892L25.151 5.23828L23.1789 1.87696C22.9048 1.40155 22.4704 1.03988 21.9539 0.857114L21.217 0.690611L11.9059 0.482479C11.4384 0.445028 10.9683 0.505228 10.5252 0.659276C10.0821 0.813324 9.67568 1.05787 9.33167 1.37744C9.10555 1.58265 8.90355 1.81308 8.72963 2.06427L5.38721 8.10009L12.1966 11.8464L16.2967 4.44738L19.0163 9.09912L16.0061 10.8162L24.0612 10.4208Z" fill="#FFCC00"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M6.24886 21.0042L8.92695 16.3629L11.8853 18.1633L7.65019 11.2949H0L2.59505 12.8455L0.612432 16.1964C0.325936 16.6703 0.219084 17.2318 0.311406 17.7782C0.341905 18.0271 0.411995 18.2696 0.519009 18.4963C0.519009 18.4963 4.76035 26.6134 4.85792 26.7799C5.05047 27.2049 5.32885 27.5852 5.67546 27.8969C6.02207 28.2086 6.42938 28.4448 6.87168 28.5906C7.27512 28.7471 7.70564 28.8214 8.13806 28.8092H14.6568V21.0042H6.24886Z" fill="#FFCC00"/>
          </svg>
          <span className="text-xl font-semibold text-[#FFCC00]">KFB Auto</span>
        </div>

        {/* Texte */}
        <p className="text-center text-sm text-zinc-100 md:text-left">
          Inscrivez-vous à notre newsletter pour recevoir nos offres exclusives
        </p>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="flex w-full max-w-md items-center gap-2 md:w-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Votre adresse email"
            required
            className="flex-1 rounded-lg border-2 border-[#FFCC00] bg-white px-4 py-2 text-sm text-[#2F3740] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFCC00]"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="whitespace-nowrap rounded-lg bg-[#FFCC00] px-6 py-2 text-sm font-bold text-[#1E1E1E] outline outline-2 outline-offset-[-2px] outline-[#FFCC00] transition-all hover:bg-[#FFD633] disabled:opacity-50"
          >
            {isSubmitting ? 'Envoi...' : "S'inscrire"}
          </button>
        </form>
      </div>

      {/* Message de confirmation */}
      {message && (
        <div className="mt-2 text-center text-sm text-[#FFCC00]">
          {message}
        </div>
      )}
    </div>
  );
}



