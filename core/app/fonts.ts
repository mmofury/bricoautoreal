import { Inter, Roboto, Roboto_Mono } from 'next/font/google';

const inter = Inter({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-family-body',
});

const roboto = Roboto({
  display: 'swap',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-family-heading',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-family-mono',
});

export const fonts = [inter, roboto, robotoMono];
