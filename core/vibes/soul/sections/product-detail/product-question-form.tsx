'use client';

import { useState } from 'react';

interface Props {
    productName: string;
    productId: number;
}

export function ProductQuestionForm({ productName, productId }: Props) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        comment: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/product-question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId,
                    productName,
                    ...formData,
                }),
            });

            if (!response.ok) {
                throw new Error('Erreur lors de l\'envoi');
            }

            setSubmitted(true);
            setFormData({ name: '', email: '', comment: '' });

            // Réinitialiser après 3 secondes
            setTimeout(() => setSubmitted(false), 3000);
        } catch (error) {
            console.error('Erreur:', error);
            alert('Une erreur est survenue. Veuillez réessayer.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full bg-[#F8F9F9] py-14">
            <div className="flex gap-14 items-start">
                {/* Left side - Text */}
                <div className="flex-shrink-0" style={{ width: '442px' }}>
                    <h2
                        className="text-[#212B36] text-[20px] font-semibold mb-4"
                        style={{ fontFamily: 'Inter', lineHeight: '24px' }}
                    >
                        Des questions sur le produit: {productName}?
                    </h2>
                    <p
                        className="text-[#637381] text-[14px] font-normal"
                        style={{ fontFamily: 'Inter', lineHeight: '24px' }}
                    >
                        Si vous rencontrez des problèmes ou si vous avez besoin d'une
                        assistance supplémentaire, n'hésitez pas à contacter notre service
                        clientèle qui se fera un plaisir de vous aider.
                    </p>
                </div>

                {/* Right side - Form */}
                <div className="flex-1 max-w-[760px]">
                    <div className="bg-white rounded-[10px] border border-[#DFE3E8] p-4">
                        {submitted ? (
                            <div className="py-20 text-center">
                                <p className="text-[#0077C7] text-[16px] font-medium" style={{ fontFamily: 'Inter' }}>
                                    ✓ Votre message a été envoyé avec succès !
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Name and Email row */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Name field */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full h-[47px] px-3 bg-white rounded-md border border-[#DFE3E8] text-[#212B36] text-[14px] outline-none focus:border-[#0077C7]"
                                            style={{ fontFamily: 'Inter' }}
                                            placeholder=" "
                                        />
                                        <label
                                            className="absolute left-3 top-[14px] text-[#637381] text-[14px] pointer-events-none transition-all"
                                            style={{ fontFamily: 'Inter', lineHeight: '18px' }}
                                        >
                                            Nom <span className="text-[#D72B2B]">*</span>
                                        </label>
                                    </div>

                                    {/* Email field */}
                                    <div className="relative">
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full h-[47px] px-3 bg-white rounded-md border border-[#DFE3E8] text-[#212B36] text-[14px] outline-none focus:border-[#0077C7]"
                                            style={{ fontFamily: 'Inter' }}
                                            placeholder=" "
                                        />
                                        <label
                                            className="absolute left-3 top-[14px] text-[#637381] text-[14px] pointer-events-none"
                                            style={{ fontFamily: 'Inter', lineHeight: '18px' }}
                                        >
                                            E-mail <span className="text-[#D72B2B]">*</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Comment field */}
                                <div className="relative">
                                    <textarea
                                        required
                                        value={formData.comment}
                                        onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                                        rows={5}
                                        className="w-full px-3 pt-8 pb-3 bg-white rounded-md border border-[#DFE3E8] text-[#212B36] text-[14px] outline-none focus:border-[#0077C7] resize-none"
                                        style={{ fontFamily: 'Inter' }}
                                        placeholder=" "
                                    />
                                    <label
                                        className="absolute left-3 top-4 text-[#637381] text-[14px] pointer-events-none"
                                        style={{ fontFamily: 'Inter', lineHeight: '22px' }}
                                    >
                                        Commentaire <span className="text-[#D72B2B]">*</span>
                                    </label>
                                </div>

                                {/* Submit button */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-[42px] bg-[#0077C7] hover:bg-[#0066B3] disabled:opacity-50 rounded-md border border-[#0077C7] text-white text-[14px] font-medium transition-colors"
                                    style={{ fontFamily: 'Inter', lineHeight: '20px' }}
                                >
                                    {isSubmitting ? 'Envoi en cours...' : 'Envoyer'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
