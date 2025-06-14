"use client"

import { ThemeProvider } from "next-themes"
import { Fragment, ReactNode } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AuthProvider } from "@/context/auth"
import { AppContent } from "@/components/content"
import { usePathname } from "next/navigation"
import { TRPCReactProvider } from "@/trpc/react"
import { BetterChatProvider } from "@/context/betterChatContext"


export function Provider({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const noSidebarRoutes = ["/settings", "/chat/test"]

    return (
        <AuthProvider>
            <TRPCReactProvider>
                <BetterChatProvider>
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
                </BetterChatProvider>
            </TRPCReactProvider>
        </AuthProvider>
    )
}