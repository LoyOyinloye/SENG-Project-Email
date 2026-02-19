"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AlertTriangle, Send } from 'lucide-react';

export default function MessageDetail({ params }: { params: { id: string } }) {
    const { id } = params;
    const router = useRouter();
    const { user } = useAuth() as any;
    const [message, setMessage] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [returnComment, setReturnComment] = useState('');
    const [forwardUserId, setForwardUserId] = useState('');
    const [forwardComment, setForwardComment] = useState('');
    const [users, setUsers] = useState<any[]>([]);

    // Edit Mode State
    const [editBody, setEditBody] = useState('');

    useEffect(() => {
        if (user) {
            fetchMessage();
            fetchUsers();
        }
    }, [id, user]);

    const fetchMessage = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/proxy/messages/${id}`);
            if (res.ok) {
                const data = await res.json();
                setMessage(data);
                setEditBody(data.body);
            } else {
                alert('Message not found or access denied');
                router.push('/');
            }
        } catch (e) {
            console.error('Error fetching message:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/proxy/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (e) {
            console.error('Error fetching users:', e);
        }
    };

    const handleReturn = async () => {
        const res = await fetch('/api/proxy/messages/return', {
            method: 'POST',
            body: JSON.stringify({ message_id: id, comment: returnComment }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
            router.push('/');
        } else {
            alert('Failed to return message');
        }
    };

    const handleForward = async () => {
        if (!forwardUserId) {
            alert('Please select a user to forward to');
            return;
        }
        const res = await fetch('/api/proxy/messages/forward', {
            method: 'POST',
            body: JSON.stringify({ message_id: id, new_owner_id: forwardUserId, comment: forwardComment }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
            router.push('/');
        } else {
            alert('Failed to forward message');
        }
    };

    const handleComplete = async () => {
        if (!confirm('Mark as completed?')) return;
        const res = await fetch('/api/proxy/messages/complete', {
            method: 'POST',
            body: JSON.stringify({ message_id: id }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
            router.push('/');
        } else {
            alert('Failed to complete message');
        }
    };

    const handleResubmit = async () => {
        const res = await fetch('/api/proxy/messages/resubmit', {
            method: 'POST',
            body: JSON.stringify({ message_id: id, body: editBody }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
            alert('Message Resubmitted!');
            router.push('/');
        } else {
            alert('Failed to resubmit message');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading message...</div>;
    if (!message) return <div className="p-8 text-center text-gray-500">Message not found</div>;

    // Find the latest return comment
    const lastReturnLog = message.workflow_logs
        ? [...message.workflow_logs].reverse().find((l: any) => l.action_type === 'RETURNED')
        : null;

    const isOwner = message.current_owner_id === user?.id;
    const isReturned = message.current_status === 'returned';

    return (
        <div className="bg-white shadow rounded-lg p-6 space-y-6">
            <button onClick={() => router.push('/')} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium inline-block">
                ← Back to Inbox
            </button>

            <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold">{message.subject}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold
                    ${message.current_status === 'returned' ? 'bg-amber-100 text-amber-800' :
                        message.current_status === 'completed' ? 'bg-green-100 text-green-800' :
                            message.current_status === 'forwarded' ? 'bg-indigo-100 text-indigo-800' :
                                'bg-blue-100 text-blue-800'}`}>
                    {message.current_status}
                </span>
            </div>

            <div className="border-b pb-4 text-sm text-gray-600">
                <p><strong>From:</strong> {message.sender_name}</p>
                <p><strong>Date:</strong> {new Date(message.created_at).toLocaleString()}</p>
            </div>

            {/* Correction Alert */}
            {isReturned && lastReturnLog && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-amber-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-amber-800">Returned for Correction</h3>
                            <div className="mt-2 text-sm text-amber-700">
                                <p><strong>{lastReturnLog.previous_owner_name} says:</strong> {lastReturnLog.comment}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Message Body (Editable if Returned & Owner) */}
            <div className="prose max-w-none">
                {isReturned && isOwner ? (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Edit Message Body:</label>
                        <textarea
                            className="w-full border rounded-md p-3 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            rows={8}
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                        />
                    </div>
                ) : (
                    <div className="whitespace-pre-wrap">{message.body}</div>
                )}
            </div>

            {/* Resubmit Action */}
            {isReturned && isOwner && (
                <div className="border-t pt-6 flex justify-end">
                    <button
                        onClick={handleResubmit}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm font-medium flex items-center"
                    >
                        <Send className="h-4 w-4 mr-2" />
                        Resubmit for Review
                    </button>
                </div>
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
                <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Attachments</h4>
                    <ul className="space-y-1">
                        {message.attachments.map((att: any) => (
                            <li key={att.attachment_id} className="text-sm text-indigo-600 hover:underline">
                                📎 {att.filename}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Workflow History */}
            {message.workflow_logs && message.workflow_logs.length > 0 && (
                <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Workflow History</h4>
                    <ul className="space-y-2">
                        {message.workflow_logs.map((log: any, i: number) => (
                            <li key={i} className="text-xs text-gray-500 flex items-center gap-2">
                                <span className={`font-medium ${log.action_type === 'RETURNED' ? 'text-amber-600' : 'text-gray-700'}`}>
                                    {log.action_type}
                                </span>
                                <span>—</span>
                                <span>{log.previous_owner_name} → {log.new_owner_name}</span>
                                {log.comment && <span className="italic text-gray-600">"{log.comment}"</span>}
                                <span className="ml-auto">{new Date(log.timestamp).toLocaleString()}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Actions for Current Owner (Reviewer) */}
            {isOwner && !isReturned && message.current_status !== 'completed' && (
                <div className="border-t pt-6 flex gap-4">
                    <button onClick={() => setShowReturnModal(true)} className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 text-sm font-medium">
                        Return for Correction
                    </button>
                    <button onClick={() => setShowForwardModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm font-medium">
                        Forward
                    </button>
                    <button onClick={handleComplete} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium ml-auto">
                        Mark as Completed
                    </button>
                </div>
            )}

            {/* Return Modal */}
            {showReturnModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold mb-4">Return Message</h3>
                        <p className="text-sm text-gray-500 mb-4">Please provide a reason for returning this message.</p>
                        <textarea
                            className="w-full border rounded p-2 mb-4"
                            rows={4}
                            placeholder="Reason for return (required)..."
                            value={returnComment}
                            onChange={e => setReturnComment(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowReturnModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                                Cancel
                            </button>
                            <button
                                onClick={handleReturn}
                                disabled={!returnComment.trim()}
                                className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
                            >
                                Confirm Return
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Forward Modal */}
            {showForwardModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold mb-4">Forward Message</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Forward to:</label>
                            <select
                                className="w-full border rounded p-2"
                                value={forwardUserId}
                                onChange={e => setForwardUserId(e.target.value)}
                            >
                                <option value="">Select user...</option>
                                {users.filter(u => u.user_id !== user?.id).map((u: any) => (
                                    <option key={u.user_id} value={u.user_id}>{u.name} ({u.role})</option>
                                ))}
                            </select>
                        </div>
                        <textarea
                            className="w-full border rounded p-2 mb-4"
                            rows={3}
                            placeholder="Comment (optional)..."
                            value={forwardComment}
                            onChange={e => setForwardComment(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowForwardModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                                Cancel
                            </button>
                            <button onClick={handleForward} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                                Confirm Forward
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
