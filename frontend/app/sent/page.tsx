"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Send, RefreshCw } from 'lucide-react';

export default function SentPage() {
    const { user, isLoading } = useAuth() as any;
    const [messages, setMessages] = useState<any[]>([]);
    const [loadingSent, setLoadingSent] = useState(false);
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

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Sent Messages</h1>

            <div className="bg-white shadow rounded-lg border border-gray-100">
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

                {messages.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <p>No sent messages found.</p>
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
                                                To: {msg.current_owner_name}
                                            </p>
                                        </div>
                                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                            <p>
                                                {new Date(msg.created_at).toLocaleDateString()}
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

