"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Inbox, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function InboxPage() {
    const { user, isLoading } = useAuth() as any;
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState<number | null>(null);

    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
        if (user) fetchInbox();
    }, [user, isLoading]);

    const fetchInbox = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/proxy/messages/inbox');
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

    const confirmDelete = (messageId: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setMessageToDelete(messageId);
        setDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!messageToDelete) return;
        setDeleteModalOpen(false);
        try {
            const res = await fetch('/api/proxy/messages/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message_id: messageToDelete })
            });
            if (res.ok) {
                setMessages(prev => prev.filter(m => m.message_id !== messageToDelete));
            } else {
                const err = await res.json().catch(() => ({ error: 'Unknown error' }));
                alert(`Failed to delete: ${err.error}`);
            }
        } catch (e) {
            alert('Error deleting message');
        } finally {
            setMessageToDelete(null);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>

            <div className="bg-white shadow rounded-lg border border-gray-100">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center">
                        <Inbox className="h-5 w-5 text-blue-600 mr-2" />
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            Incoming Messages
                        </h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                            {messages.filter(m => !m.is_read).length} unread
                        </span>
                        <button
                            onClick={fetchInbox}
                            disabled={loading}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 flex items-center"
                        >
                            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {messages.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <p>No messages in your inbox.</p>
                    </div>
                ) : (
                    <ul role="list" className="divide-y divide-gray-200">
                        {messages.map((msg) => (
                            <li key={msg.message_id} className="block hover:bg-gray-50 transition duration-150 ease-in-out">
                                <div className="flex items-center">
                                    <Link href={`/message/${msg.message_id}`} className="block px-4 py-4 sm:px-6 flex-1 min-w-0">
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
                                    {msg.current_status !== 'returned' && (
                                        <div className="pr-4 flex-shrink-0">
                                            <button
                                                onClick={(e) => confirmDelete(msg.message_id, e)}
                                                className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                                                title="Delete message"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <ConfirmModal
                isOpen={deleteModalOpen}
                onCancel={() => setDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Confirm Deletion"
                message="Are you sure you want to delete this message? This action cannot be undone."
            />
        </div>
    );
}
