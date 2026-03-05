"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Inbox, AlertTriangle, Send, Archive, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const REFRESH_INTERVAL = 30000; // 30 seconds

export default function Dashboard() {
    const { user, isLoading } = useAuth() as any;
    const [messages, setMessages] = useState<any[]>([]);
    const [recentSent, setRecentSent] = useState<any[]>([]);
    const [sentCount, setSentCount] = useState(0);
    const [archivesCount, setArchivesCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const router = useRouter();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
        if (user) loadData();
    }, [user, isLoading]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (user) {
            intervalRef.current = setInterval(() => {
                refreshRecentActivity();
            }, REFRESH_INTERVAL);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchInbox(),
                fetchSent(),
                fetchArchives(),
            ]);
            setLastRefresh(new Date());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchInbox = async () => {
        const res = await fetch('/api/proxy/messages/inbox');
        if (res.ok) {
            const data = await res.json();
            setMessages(data);
        }
    };

    const fetchSent = async () => {
        const res = await fetch('/api/proxy/messages/sent');
        if (res.ok) {
            const data = await res.json();
            setSentCount(data.length);
            setRecentSent(data);
        }
    };

    const fetchArchives = async () => {
        const res = await fetch('/api/proxy/messages/archives');
        if (res.ok) {
            const data = await res.json();
            setArchivesCount(data.length);
        }
    };

    // Lightweight refresh for the recent activity section
    const refreshRecentActivity = useCallback(async () => {
        if (!user) return;
        setIsRefreshing(true);
        try {
            await Promise.all([fetchInbox(), fetchSent(), fetchArchives()]);
            setLastRefresh(new Date());
        } catch (e) {
            console.error('Auto-refresh failed:', e);
        } finally {
            setIsRefreshing(false);
        }
    }, [user]);

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    const returnedCount = messages.filter(m => m.current_status === 'returned').length;
    const inboxCount = messages.filter(m => !m.is_read).length;

    // Combine inbox + sent, sort by date, take 8 most recent
    const recentActivity = [
        ...messages.map(m => ({ ...m, _type: 'inbox' as const })),
        ...recentSent.map(m => ({ ...m, _type: 'sent' as const }))
    ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .reduce((acc: any[], msg) => {
            // Deduplicate by message_id
            if (!acc.find(m => m.message_id === msg.message_id)) {
                acc.push(msg);
            }
            return acc;
        }, [])
        .slice(0, 8);

    const stats = [
        {
            name: 'Inbox (Action Items)',
            count: inboxCount,
            icon: Inbox,
            color: 'bg-blue-600',
            href: '/inbox',
            linkText: 'View all'
        },
        {
            name: 'Returned to Me',
            count: returnedCount,
            icon: AlertTriangle,
            color: 'bg-amber-500',
            href: '/returned',
            linkText: 'View all'
        },
        {
            name: 'Sent / Pending',
            count: sentCount,
            icon: Send,
            color: 'bg-indigo-600',
            href: '/sent',
            linkText: 'View all'
        },
        {
            name: 'Archives',
            count: archivesCount,
            icon: Archive,
            color: 'bg-gray-500',
            href: '/archives',
            linkText: 'View all'
        },
    ];

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((item) => (
                    <div key={item.name} className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden border border-gray-100">
                        <dt>
                            <div className={`absolute rounded-md p-3 ${item.color}`}>
                                <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                            </div>
                            <p className="ml-16 text-sm font-medium text-gray-500 truncate">{item.name}</p>
                        </dt>
                        <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                            <p className="text-2xl font-semibold text-gray-900">{item.count}</p>
                        </dd>
                        <div className="absolute bottom-0 inset-x-0 bg-gray-50 px-4 py-4 sm:px-6">
                            <div className="text-sm">
                                <Link href={item.href} className="font-medium text-indigo-600 hover:text-indigo-500">
                                    {item.linkText} <span aria-hidden="true">&rarr;</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="bg-white shadow rounded-lg border border-gray-100">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
                        {lastRefresh && (
                            <p className="text-xs text-gray-400 mt-0.5">
                                Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 30s
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={refreshRecentActivity}
                            disabled={isRefreshing}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 flex items-center"
                            title="Refresh now"
                        >
                            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <Link href="/inbox" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                            View All
                        </Link>
                    </div>
                </div>

                {recentActivity.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <p>No recent activity. You&apos;re all caught up!</p>
                    </div>
                ) : (
                    <ul role="list" className="divide-y divide-gray-200">
                        {recentActivity.map((msg) => (
                            <li key={`${msg._type}-${msg.message_id}`} className="block hover:bg-gray-50 transition duration-150 ease-in-out">
                                <Link href={`/message/${msg.message_id}`} className="block px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium text-indigo-600 truncate flex items-center">
                                            {msg._type === 'sent' && (
                                                <span className="inline-flex items-center mr-2 px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                                                    <Send className="h-3 w-3 mr-0.5" />
                                                    Sent
                                                </span>
                                            )}
                                            {msg.subject}
                                            {msg._type === 'inbox' && !msg.is_read && <span className="ml-2 h-2 w-2 bg-blue-600 rounded-full"></span>}
                                        </div>
                                        <div className="ml-2 flex-shrink-0 flex">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${msg.current_status === 'returned' ? 'bg-amber-100 text-amber-800' :
                                                    msg.current_status === 'completed' ? 'bg-green-100 text-green-800' :
                                                        msg.current_status === 'forwarded' ? 'bg-indigo-100 text-indigo-800' :
                                                            'bg-blue-100 text-blue-800'}`}>
                                                {msg.current_status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 sm:flex sm:justify-between">
                                        <div className="sm:flex">
                                            <p className="flex items-center text-sm text-gray-500">
                                                {msg._type === 'sent'
                                                    ? `To: ${msg.current_owner_name}`
                                                    : `From: ${msg.sender_name}`
                                                }
                                            </p>
                                        </div>
                                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                            <p>
                                                {new Date(msg.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
