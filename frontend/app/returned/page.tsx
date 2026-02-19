"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ReturnedPage() {
    const { user, isLoading } = useAuth() as any;
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
        if (user) fetchReturned();
    }, [user, isLoading]);

    const fetchReturned = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/proxy/messages/returned');
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Returned to Me</h1>

            <div className={`p-4 rounded-md bg-amber-50 border border-amber-200 flex items-start`}>
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                    These messages have been returned for correction. Please review the comments and resubmit.
                </p>
            </div>

            <div className="bg-white shadow rounded-lg border border-gray-100">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Action Required</h3>
                    <button
                        onClick={fetchReturned}
                        disabled={loading}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 flex items-center"
                    >
                        <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {messages.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <p>No returned messages. Good job!</p>
                    </div>
                ) : (
                    <ul role="list" className="divide-y divide-gray-200">
                        {messages.map((msg) => (
                            <li key={msg.message_id} onClick={() => router.push(`/message/${msg.message_id}`)} className="hover:bg-gray-50 cursor-pointer block transition duration-150 ease-in-out">
                                <div className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium text-indigo-600 truncate flex items-center">
                                            {msg.subject}
                                        </div>
                                        <div className="ml-2 flex-shrink-0 flex">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                                                start correction
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 sm:flex sm:justify-between">
                                        <div className="sm:flex">
                                            <p className="flex items-center text-sm text-gray-500">
                                                Last updated: {new Date(msg.updated_at).toLocaleString()}
                                            </p>
                                        </div>
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
