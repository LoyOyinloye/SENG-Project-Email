import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import Sidebar from '../components/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: "Babcock University Workflow",
    description: "Internal Workflow System",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className="h-full bg-gray-50">
            <body className={`${inter.className} h-full`}>
                <AuthProvider>
                    <div className="flex h-[100dvh] overflow-hidden bg-gray-50 flex-col md:flex-row">
                        <Sidebar />
                        {/* 
                          On mobile (below md), the bottom nav takes up 4rem (16 units) 
                          at the bottom. We use pb-16 to ensure we can scroll to the very 
                          bottom without content hiding behind the nav. 
                          On desktop (md and above), there's no bottom nav, so pb-0.
                        */}
                        <div className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0 relative z-0">
                            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                                {children}
                            </main>
                        </div>
                    </div>
                </AuthProvider>
            </body>
        </html>
    )
}
