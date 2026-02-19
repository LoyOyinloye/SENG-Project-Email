"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Inbox, AlertTriangle, Send, Archive } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
    const { user, isLoading } = useAuth() as any;
    const [messages, setMessages] = useState<any[]>([]);
    const [sentCount, setSentCount] = useState(0);
    const [archivesCount, setArchivesCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
        if (user) loadData();
    }, [user, isLoading]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch Inbox
            const inboxRes = await fetch('/api/proxy/messages/inbox');
            if (inboxRes.ok) {
                const data = await inboxRes.json();
                setMessages(data);
            }

            // Fetch Sent (just for count for now)
            const sentRes = await fetch('/api/proxy/messages/sent');
            if (sentRes.ok) {
                const data = await sentRes.json();
                setSentCount(data.length);
            }

            // Fetch Archives
            const archivesRes = await fetch('/api/proxy/messages/archives');
            if (archivesRes.ok) {
                const data = await archivesRes.json();
                setArchivesCount(data.length);
            }

            // We could add endpoints for 'returned' and 'archives' counts specifically later
            // For now, Returned is a subset of Inbox/Sent usually, or a specific status.
            // Let's assume 'Returned to Me' is in Inbox with status 'returned'.
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    const returnedCount = messages.filter(m => m.current_status === 'returned').length;
    // Inbox count excluding returned? Or returned counts as action item? 
    // Usually "Inbox" means everything needing attention.
    const inboxCount = messages.filter(m => !m.is_read).length;

    const stats = [
        {
            name: 'Inbox (Action Items)',
            count: inboxCount,
            icon: Inbox,
            color: 'bg-blue-600',
            href: '/',
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

            {/* Recent Action Items */}
            <div className="bg-white shadow rounded-lg border border-gray-100">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Action Items</h3>
                    <Link href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                        View All
                    </Link>
                </div>

                {messages.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <p>No pending action items. You're all caught up!</p>
                    </div>
                ) : (
                    <ul role="list" className="divide-y divide-gray-200">
                        {messages.slice(0, 5).map((msg) => (
                            <li key={msg.message_id} className="block hover:bg-gray-50 transition duration-150 ease-in-out">
                                <Link href={`/message/${msg.message_id}`} className="block px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium text-indigo-600 truncate flex items-center">
                                            {msg.subject}
                                            {!msg.is_read && <span className="ml-2 h-2 w-2 bg-blue-600 rounded-full"></span>}
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
                                                From: {msg.sender_name}
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

