"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Users, Shield, Plus, Edit2, Trash2, X } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function AdminUsersPage() {
    const { user, isLoading } = useAuth() as any;
    const [users, setUsers] = useState<any[]>([]);
    const router = useRouter();

    // Modal state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [userToDelete, setUserToDelete] = useState<number | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'staff',
        password: '',
        department_id: ''
    });

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
        if (user && user.role !== 'admin') {
            router.push('/');
            return;
        }
        if (user) fetchUsers();
    }, [user, isLoading]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/proxy/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleOpenForm = (u: any = null) => {
        if (u) {
            setEditingUser(u);
            setFormData({
                name: u.name,
                email: u.email,
                role: u.role,
                password: '', // blank on edit means no change
                department_id: u.department_id || ''
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                email: '',
                role: 'staff',
                password: '',
                department_id: ''
            });
        }
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isEdit = !!editingUser;
        const url = isEdit ? `/api/proxy/admin/users/${editingUser.user_id}` : '/api/proxy/admin/users';
        const method = isEdit ? 'PUT' : 'POST';

        const payload = { ...formData };
        if (isEdit && !payload.password) {
            delete payload.password;
        }

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsFormOpen(false);
                fetchUsers();
            } else {
                const err = await res.json().catch(() => ({ error: 'Error saving user' }));
                alert(err.error);
            }
        } catch (error) {
            alert('Failed to save user');
        }
    };

    const confirmDelete = (userId: number) => {
        setUserToDelete(userId);
        setIsConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (!userToDelete) return;
        try {
            const res = await fetch(`/api/proxy/admin/users/${userToDelete}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setIsConfirmOpen(false);
                fetchUsers();
            } else {
                const err = await res.json().catch(() => ({ error: 'Error deleting user' }));
                alert(err.error);
            }
        } catch (error) {
            alert('Failed to delete user');
        } finally {
            setUserToDelete(null);
        }
    };

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center">
                    <Shield className="h-8 w-8 text-indigo-600 mr-3" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                        <p className="text-sm text-gray-500">Manage user accounts and permissions.</p>
                    </div>
                </div>
                <button
                    onClick={() => handleOpenForm()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                </button>
            </div>

            <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((u) => (
                            <tr key={u.user_id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                            {u.name.charAt(0)}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{u.name}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{u.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                            u.role === 'hod' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {u.role.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {u.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleOpenForm(u)}
                                        className="text-indigo-600 hover:text-indigo-900 mr-4 inline-flex items-center"
                                        title="Edit User"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    {user.user_id !== u.user_id && u.is_active ? (
                                        <button
                                            onClick={() => confirmDelete(u.user_id)}
                                            className="text-red-600 hover:text-red-900 inline-flex items-center"
                                            title="Delete User"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    ) : (
                                        <span className="w-4 h-4 inline-block"></span> // Spacer for disabled delete
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit User Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsFormOpen(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <div className="absolute top-0 right-0 pt-4 pr-4">
                                <button type="button" onClick={() => setIsFormOpen(false)} className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    <span className="sr-only">Close</span>
                                    <X className="h-6 w-6" aria-hidden="true" />
                                </button>
                            </div>
                            <div className="sm:flex sm:items-start">
                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                        {editingUser ? 'Edit User' : 'Add New User'}
                                    </h3>
                                    <div className="mt-4">
                                        <form onSubmit={handleFormSubmit} className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                                                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                                    <option value="staff">Staff</option>
                                                    <option value="hod">HOD</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Password {editingUser && <span className="text-gray-400 font-normal">(Leave blank to keep current)</span>}
                                                </label>
                                                <input type="password" required={!editingUser} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                            </div>
                                            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                                <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                                                    {editingUser ? 'Save Changes' : 'Create User'}
                                                </button>
                                                <button type="button" onClick={() => setIsFormOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm">
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={isConfirmOpen}
                title="Deactivate User"
                message="Are you sure you want to deactivate this user? They will no longer be able to log in or use the system."
                confirmText="Deactivate"
                isDestructive={true}
                onConfirm={handleDelete}
                onCancel={() => {
                    setIsConfirmOpen(false);
                    setUserToDelete(null);
                }}
            />
        </div>
    );
}
