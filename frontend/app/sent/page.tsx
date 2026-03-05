"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Send, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';

const STATUS_TABS = [
    { key: 'all', label: 'All' },
    { key: 'sent', label: 'Sent' },
    { key: 'resent', label: 'Resent' },
    { key: 'forwarded', label: 'Forwarded' },
    { key: 'returned', label: 'Returned' },
    { key: 'completed', label: 'Completed' },
];

const STATUS_COLORS: Record<string, string> = {
    sent: 'bg-blue-100 text-blue-800',
    resent: 'bg-purple-100 text-purple-800',
    forwarded: 'bg-indigo-100 text-indigo-800',
    returned: 'bg-amber-100 text-amber-800',
    completed: 'bg-green-100 text-green-800',
    draft: 'bg-gray-100 text-gray-800',
};

export default function SentPage() {
    const { user, isLoading } = useAuth() as any;
    const [messages, setMessages] = useState<any[]>([]);
    const [loadingSent, setLoadingSent] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
        if (user) fetchSent();
    }, [user, isLoading]);

    const fetchSent = async () => {
        setLoadingSent(true);
        try {
            const res = await fetch('/api/proxy/messages/sent');
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingSent(false);
        }
    };

    const handleDelete = async (messageId: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) return;
        try {
            const res = await fetch('/api/proxy/messages/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message_id: messageId })
            });
            if (res.ok) {
                setMessages(prev => prev.filter(m => m.message_id !== messageId));
            } else {
                const err = await res.json().catch(() => ({ error: 'Unknown error' }));
                alert(`Failed to delete: ${err.error}`);
            }
        } catch (e) {
            alert('Error deleting message');
        }
    };

    const filteredMessages = useMemo(() => {
        if (activeTab === 'all') return messages;
        return messages.filter(m => m.current_status === activeTab);
    }, [messages, activeTab]);

    // Count per status for tab badges
    const counts = useMemo(() => {
        const c: Record<string, number> = { all: messages.length };
        STATUS_TABS.forEach(t => {
            if (t.key !== 'all') {
                c[t.key] = messages.filter(m => m.current_status === t.key).length;
            }
        });
        return c;
    }, [messages]);

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Sent Messages</h1>

            <div className="bg-white shadow rounded-lg border border-gray-100">
                {/* Header */}
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center">
                        <Send className="h-5 w-5 text-gray-400 mr-2" />
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            Outbox
                        </h3>
                    </div>
                    <button
                        onClick={fetchSent}
                        disabled={loadingSent}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 flex items-center"
                    >
                        <RefreshCw className={`h-4 w-4 mr-1 ${loadingSent ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Status Tabs */}
                <div className="border-b border-gray-200 px-4 sm:px-6">
                    <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                        {STATUS_TABS.map(tab => {
                            const isActive = activeTab === tab.key;
                            const count = counts[tab.key] || 0;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${isActive
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    {tab.label}
                                    {count > 0 && (
                                        <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Message List */}
                {filteredMessages.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <p>{activeTab === 'all' ? 'No sent messages found.' : `No ${activeTab} messages.`}</p>
                    </div>
                ) : (
                    <ul role="list" className="divide-y divide-gray-200">
                        {filteredMessages.map((msg) => (
                            <li key={msg.message_id} className="block hover:bg-gray-50 transition duration-150 ease-in-out">
                                <div className="flex items-center">
                                    <Link href={`/message/${msg.message_id}?from=sent`} className="block px-4 py-4 sm:px-6 flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm font-medium text-indigo-600 truncate flex items-center">
                                                {msg.subject}
                                            </div>
                                            <div className="ml-2 flex-shrink-0 flex">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[msg.current_status] || 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {msg.current_status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-2 sm:flex sm:justify-between">
                                            <div className="sm:flex">
                                                <p className="flex items-center text-sm text-gray-500">
                                                    To: {msg.current_owner_name}
                                                </p>
                                            </div>
                                            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                                <p>
                                                    {new Date(msg.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                    <div className="pr-4 flex-shrink-0">
                                        <button
                                            onClick={(e) => handleDelete(msg.message_id, e)}
                                            className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                                            title="Delete message"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
