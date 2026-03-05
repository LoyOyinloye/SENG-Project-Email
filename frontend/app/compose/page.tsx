"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ComposePage() {
    const { user, isLoading } = useAuth() as any;
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [sending, setSending] = useState(false);
    const [formData, setFormData] = useState({
        to_user_id: '',
        subject: '',
        body: ''
    });
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState('');

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
        fetchUsers();
    }, [user, isLoading]);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const res = await fetch('/api/proxy/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else {
                console.error('Failed to fetch users');
            }
        } catch (e) {
            console.error('Error fetching users:', e);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        const data = new FormData();
        data.append('to_user_id', formData.to_user_id);
        data.append('subject', formData.subject);
        data.append('body', formData.body);
        if (file) data.append('attachment', file);

        try {
            const res = await fetch('/api/proxy/messages', {
                method: 'POST',
                body: data
            });
            if (res.ok) {
                router.push('/sent');
            } else {
                const err = await res.json().catch(() => ({ error: 'Unknown error' }));
                alert(`Failed to send message: ${err.error || 'Unknown error'}`);
            }
        } catch (e) {
            console.error(e);
            alert('Error sending message');
        } finally {
            setSending(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">Compose Message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">To:</label>
                    <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        value={formData.to_user_id}
                        onChange={(e) => setFormData({ ...formData, to_user_id: e.target.value })}
                        required
                        disabled={loadingUsers}
                    >
                        <option value="">{loadingUsers ? 'Loading users...' : 'Select Recipient'}</option>
                        {users.filter(u => u.user_id !== user?.id).map(u => (
                            <option key={u.user_id} value={u.user_id}>{u.name} ({u.role})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Subject:</label>
                    <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Message:</label>
                    <textarea
                        rows={6}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        value={formData.body}
                        onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Attachment (Optional):</label>
                    <input
                        type="file"
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        onChange={(e) => {
                            const selected = e.target.files ? e.target.files[0] : null;
                            if (selected && selected.size > 5 * 1024 * 1024) {
                                setFileError('File size exceeds 5MB limit');
                                setFile(null);
                                e.target.value = '';
                            } else {
                                setFileError('');
                                setFile(selected);
                            }
                        }}
                    />
                    {fileError && <p className="mt-1 text-sm text-red-600">{fileError}</p>}
                    <p className="mt-1 text-xs text-gray-400">Maximum file size: 5MB</p>
                </div>
                <div className="flex justify-end">
                    <button type="button" onClick={() => router.back()} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-4">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={sending}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {sending ? 'Sending...' : 'Send Message'}
                    </button>
                </div>
            </form>
        </div>
    );
}
