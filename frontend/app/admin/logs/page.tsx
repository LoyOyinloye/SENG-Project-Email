"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { FileText, RefreshCw, ArrowRightLeft, Search } from 'lucide-react';
import Link from 'next/link';

const ACTION_COLORS: Record<string, string> = {
    SENT: 'bg-blue-100 text-blue-800',
    RESUBMITTED: 'bg-purple-100 text-purple-800',
    FORWARDED: 'bg-indigo-100 text-indigo-800',
    RETURNED: 'bg-amber-100 text-amber-800',
    COMPLETED: 'bg-green-100 text-green-800',
};

export default function SystemLogsPage() {
    const { user, isLoading } = useAuth() as any;
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
        if (user) {
            if (user.role !== 'admin') {
                router.push('/');
            } else {
                fetchLogs();
            }
        }
    }, [user, isLoading]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/proxy/system-logs');
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            } else {
                const err = await res.json().catch(() => ({}));
                if (err.error === 'Admin access required') {
                    router.push('/');
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Get unique action types for filter dropdown
    const actionTypes = useMemo(() => {
        const types = new Set(logs.map(l => l.action_type));
        return Array.from(types).sort();
    }, [logs]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;
            const matchesSearch = !searchTerm ||
                log.message_subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.previous_owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.new_owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.sender_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.comment?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesAction && matchesSearch;
        });
    }, [logs, actionFilter, searchTerm]);

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">System Logs</h1>

            <div className="bg-white shadow rounded-lg border border-gray-100">
                {/* Header */}
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center">
                            <FileText className="h-5 w-5 text-gray-400 mr-2" />
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                Workflow Activity Log
                            </h3>
                            <span className="ml-3 text-sm text-gray-500">
                                {filteredLogs.length} of {logs.length} entries
                            </span>
                        </div>
                        <button
                            onClick={fetchLogs}
                            disabled={loading}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 flex items-center"
                        >
                            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by subject, user, or comment..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="all">All Actions</option>
                            {actionTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Logs Table */}
                {filteredLogs.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <p>{loading ? 'Loading logs...' : 'No log entries found.'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Timestamp
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Action
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Message
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        From
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        To
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Comment
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredLogs.map((log) => (
                                    <tr key={log.log_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${ACTION_COLORS[log.action_type] || 'bg-gray-100 text-gray-800'
                                                }`}>
                                                <ArrowRightLeft className="h-3 w-3 mr-1" />
                                                {log.action_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <Link
                                                href={`/message/${log.message_id}`}
                                                className="text-indigo-600 hover:text-indigo-800 font-medium truncate block max-w-[200px]"
                                                title={log.message_subject}
                                            >
                                                {log.message_subject}
                                            </Link>
                                            <span className="text-xs text-gray-400">by {log.sender_name}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {log.previous_owner_name || '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {log.new_owner_name || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate" title={log.comment}>
                                            {log.comment || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
