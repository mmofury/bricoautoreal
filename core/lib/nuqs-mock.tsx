import { ReactNode, Suspense } from 'react';

// Mock types
export type SearchParams = any;

// Mock adapter
export const NuqsAdapter = ({ children }: { children: ReactNode }) => {
    return <Suspense>{children}</Suspense>;
};

// Mock hooks
export const useQueryState = (key: string, options?: any) => {
    return [
        null as any,
        async (valueOrUpdater: any) => { return null; }
    ] as const;
};

export const useQueryStates = (keys: any, options?: any) => {
    return [
        {} as any,
        async (valuesOrUpdater: any) => { return null; }
    ] as const;
};

// Mock parsers
export const parseAsString = {
    withOptions: (...args: any[]) => parseAsString,
    withDefault: (...args: any[]) => parseAsString,
};

export const parseAsInteger = {
    withOptions: (...args: any[]) => parseAsInteger,
    withDefault: (...args: any[]) => parseAsInteger,
};

// Helper for array parser
const arrayParserMatches = {
    withOptions: (...args: any[]) => arrayParserMatches,
    withDefault: (...args: any[]) => ({}),
};

export const parseAsArrayOf = (parser: any) => arrayParserMatches;

// Mock loader
export const createLoader = (parsers: any) => {
    return (searchParams: any) => searchParams;
};

// Mock serializer
export const createSerializer = (parsers: any) => {
    const serializer = (base: string, params: any) => base;
    return serializer;
};

export const ParserBuilder = {};
