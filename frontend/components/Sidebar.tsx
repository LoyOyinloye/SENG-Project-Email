"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    LayoutDashboard,
    PenSquare,
    Inbox,
    AlertTriangle,
    Send,
    Archive,
    Users,
    FileText,
    LogOut,
    UserCircle
} from 'lucide-react';

export default function Sidebar() {
    const { user, logout } = useAuth() as any;
    const pathname = usePathname();

    if (!user || pathname === '/login') return null;

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Compose New', href: '/compose', icon: PenSquare },
        { name: 'Inbox', href: '/inbox', icon: Inbox }, // Note: /inbox isn't a route yet, usually Dashboard IS inbox. I'll point to / for now or specific filter.
        { name: 'Returned to Me', href: '/returned', icon: AlertTriangle },
        { name: 'Sent / Pending', href: '/sent', icon: Send },
        { name: 'Archives', href: '/archives', icon: Archive },
    ];

    const adminNavigation = [
        { name: 'User Management', href: '/admin/users', icon: Users },
        { name: 'System Logs', href: '/admin/logs', icon: FileText },
    ];

    return (
        <>
            {/* Desktop Sidebar */}
            <div className="hidden md:flex flex-col h-[100dvh] w-64 bg-white border-r border-gray-200 flex-shrink-0">
                {/* Logo */}
                <div className="flex items-center h-20 px-6 border-b border-gray-200">
                    <img src="/bu_logo_main.png" alt="Babcock Logo" className="h-12 w-auto mr-3" />
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-blue-900 uppercase tracking-wider">Babcock</span>
                        <span className="text-xs font-semibold text-gray-500">Workflow System</span>
                    </div>
                </div>

                {/* Main Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'}`} />
                                {item.name}
                                {/* Counter badges could go here if we fetch counts */}
                            </Link>
                        );
                    })}

                    {/* Admin Section */}
                    {user.role === 'admin' && (
                        <div className="mt-8">
                            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Admin
                            </h3>
                            <div className="mt-2 space-y-1">
                                {adminNavigation.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                                }`}
                                        >
                                            <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </nav>

                {/* User Profile */}
                <div className="border-t border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                <span className="font-semibold text-xs">{user.name.charAt(0)}</span>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900 truncate w-32">{user.name}</p>
                                <p className="text-xs text-gray-500 truncate w-32">{user.role}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Sign Out"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex justify-around items-center px-1 z-50 pb-safe">
                {[
                    { name: 'Home', href: '/', icon: LayoutDashboard },
                    { name: 'Compose', href: '/compose', icon: PenSquare },
                    { name: 'Inbox', href: '/inbox', icon: Inbox },
                    { name: 'Sent', href: '/sent', icon: Send },
                    { name: 'Returned', href: '/returned', icon: AlertTriangle },
                ].map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            <item.icon className="h-5 w-5" />
                            <span className="text-[10px] font-medium text-center leading-tight truncate px-1 w-full">{item.name}</span>
                        </Link>
                    )
                })}
            </div>
        </>
    );
}
