'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
    }));
    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#e8ecf0',
                        boxShadow: '8px 8px 16px #c8cfd8, -8px -8px 16px #ffffff',
                        borderRadius: '12px',
                        color: '#1e2a3a',
                        fontWeight: 500,
                    },
                }}
            />
        </QueryClientProvider>
    );
}
