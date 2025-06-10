"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { Fragment, ReactNode, useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AuthProvider } from "./context"
import { AppContent } from "@/components/content"
import { usePathname } from "next/navigation"

export function Provider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 120 * 1000, // 2 minutes
            },
        },
    }))
    const pathname = usePathname()
    const noSidebarRoutes = ["/settings"]

    return (
        <AuthProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <SidebarProvider>
                    <QueryClientProvider client={queryClient}>
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
                    </QueryClientProvider>
                </SidebarProvider>
            </ThemeProvider>
        </AuthProvider>
    )
}