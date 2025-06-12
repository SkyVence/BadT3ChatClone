"use client"

import { ThemeProvider } from "next-themes"
import { Fragment, ReactNode } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AuthProvider } from "@/context/auth"
import { StreamerProvider } from "@/context/chat"
import { AppContent } from "@/components/content"
import { usePathname } from "next/navigation"
import { TRPCReactProvider } from "@/trpc/react"


export function Provider({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const noSidebarRoutes = ["/settings", "/chat/test"]

    return (
        <AuthProvider>
            <TRPCReactProvider>
                <StreamerProvider>
                    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                        <SidebarProvider>
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
                        </SidebarProvider>
                    </ThemeProvider>
                </StreamerProvider>
            </TRPCReactProvider>
        </AuthProvider>
    )
}