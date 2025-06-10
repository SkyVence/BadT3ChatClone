import './globals.css'
import type { Metadata } from 'next'
import { Provider } from '@/components/provider/provider'

export const metadata: Metadata = {
    title: 'FastChat - Cloneathon',
    description: 'FastChat - Cloneathon',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <Provider>
                    {children}
                </Provider>
            </body>
        </html>
    )
}