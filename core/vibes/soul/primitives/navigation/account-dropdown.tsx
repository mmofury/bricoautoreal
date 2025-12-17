'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { User, ChevronDown } from 'lucide-react';
import { Link } from '~/components/link';

interface AccountDropdownProps {
    isLoggedIn: boolean;
    accountLabel?: string;
    accountHref: string;
    ordersHref?: string;
    addressesHref?: string;
    wishlistsHref?: string;
    logoutAction?: () => void | Promise<void>;
}

export function AccountDropdown({
    isLoggedIn,
    accountLabel = 'Profile',
    accountHref,
    ordersHref = '/account/orders',
    addressesHref = '/account/addresses',
    wishlistsHref = '/account/wishlists',
    logoutAction,
}: AccountDropdownProps) {
    const navButtonClassName =
        'relative rounded-lg bg-[var(--nav-button-background,transparent)] p-1.5 text-[var(--nav-button-icon,hsl(var(--foreground)))] ring-[var(--nav-focus,hsl(var(--primary)))] transition-colors focus-visible:outline-0 focus-visible:ring-2 @4xl:hover:bg-[var(--nav-button-background-hover,hsl(var(--contrast-100)))] @4xl:hover:text-[var(--nav-button-icon-hover,hsl(var(--foreground)))]';

    if (!isLoggedIn) {
        return (
            <Link aria-label={accountLabel} className={navButtonClassName} href={accountHref}>
                <User size={20} strokeWidth={1} />
            </Link>
        );
    }

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button
                    aria-label="Mon compte"
                    className={`${navButtonClassName} flex items-center gap-1`}
                >
                    <User size={20} strokeWidth={1} />
                    <span className="hidden text-sm font-medium @4xl:inline">Mon compte</span>
                    <ChevronDown className="hidden @4xl:inline" size={16} strokeWidth={1.5} />
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align="end"
                    className="z-50 min-w-[200px] rounded-lg bg-white p-1 shadow-lg ring-1 ring-black/5 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                    sideOffset={8}
                >
                    <DropdownMenu.Item asChild>
                        <Link
                            className="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100"
                            href={ordersHref}
                        >
                            Commandes
                        </Link>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item asChild>
                        <Link
                            className="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100"
                            href={addressesHref}
                        >
                            Adresses
                        </Link>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item asChild>
                        <Link
                            className="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100"
                            href={accountHref}
                        >
                            Compte
                        </Link>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item asChild>
                        <Link
                            className="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100"
                            href={wishlistsHref}
                        >
                            Listes d'envies
                        </Link>
                    </DropdownMenu.Item>

                    <DropdownMenu.Separator className="my-1 h-px bg-gray-200" />

                    <DropdownMenu.Item asChild>
                        {logoutAction ? (
                            <button
                                className="flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-sm font-medium text-red-600 outline-none transition-colors hover:bg-red-50 hover:text-red-700 focus:bg-red-50"
                                onClick={logoutAction}
                                type="button"
                            >
                                Déconnexion
                            </button>
                        ) : (
                            <Link
                                className="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm font-medium text-red-600 outline-none transition-colors hover:bg-red-50 hover:text-red-700 focus:bg-red-50"
                                href="/logout"
                            >
                                Déconnexion
                            </Link>
                        )}
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
