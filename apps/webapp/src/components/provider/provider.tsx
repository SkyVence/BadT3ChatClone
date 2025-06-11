"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { Fragment, ReactNode, useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AuthProvider } from "./context"
import { AppContent } from "@/components/content"
import { usePathname } from "next/navigation"
import { TRPCProvider } from "@/utils/trpc"
import { createTRPCClient, httpBatchLink } from "@trpc/client"
import type { AppRouter } from "@/routers"

export function Provider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 120 * 1000, // 2 minutes
            },
        },
    }))

    const [trpcClient] = useState(() =>
        createTRPCClient<AppRouter>({
            links: [
                httpBatchLink({
                    url: '/api/trpc',
                    fetch(url, options) {
                        return fetch(url, {
                            ...options,
                            credentials: "include",
                        });
                    },
                }),
            ],
        }),
    );

    const pathname = usePathname()
    const noSidebarRoutes = ["/settings", "/chat", "/chat/test"]

    return (
        <AuthProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <SidebarProvider>
                    <QueryClientProvider client={queryClient}>
                        <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
                            {noSidebarRoutes.includes(pathname) ? (
                                <Fragment>
                                    <main className="min-h-screen w-full">
                                        {children}
                                    </main>
                                </Fragment>
                            ) : (
                                <AppContent>
                                    {children}
                                </AppContent>
                            )}
                        </TRPCProvider>
                    </QueryClientProvider>
                </SidebarProvider>
            </ThemeProvider>
        </AuthProvider>
    )
}