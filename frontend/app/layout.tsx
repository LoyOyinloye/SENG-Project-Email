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
                    <div className="flex h-screen overflow-hidden">
                        <Sidebar />
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <main className="flex-1 overflow-y-auto p-8">
                                {children}
                            </main>
                        </div>
                    </div>
                </AuthProvider>
            </body>
        </html>
    )
}
