"use client";

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

export default function Header() {
    const { user, logout } = useAuth() as any;
    const pathname = usePathname();

    if (!user && pathname !== '/login') return null; // Or show public header
    if (pathname === '/login') return null;

    return (
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <span className="text-xl font-bold text-indigo-600">BuMail</span>
                        </div>
                        <div className="ml-6 flex space-x-8">
                            <Link href="/" className={`${pathname === '/' ? 'border-indigo-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                                Dashboard
                            </Link>
                            <Link href="/sent" className={`${pathname === '/sent' ? 'border-indigo-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                                Sent
                            </Link>
                            <Link href="/returned" className={`${pathname === '/returned' ? 'border-indigo-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                                Returned
                            </Link>
                            <Link href="/archives" className={`${pathname === '/archives' ? 'border-indigo-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                                Archives
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <Link href="/compose">
                            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium mr-4">
                                Compose
                            </button>
                        </Link>
                        <div className="ml-3 relative flex items-center gap-4">
                            <span className="text-sm text-gray-700">Hello, {user?.name}</span>
                            <button onClick={logout} className="text-sm text-red-600 hover:text-red-800 font-medium">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
