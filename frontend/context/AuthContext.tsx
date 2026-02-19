"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            // Try server-side session first via proxy
            const res = await fetch('/api/proxy/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                localStorage.setItem('user', JSON.stringify(data.user));
            } else {
                // Fall back to localStorage
                const stored = localStorage.getItem('user');
                if (stored) {
                    setUser(JSON.parse(stored));
                }
            }
        } catch (e) {
            // Fall back to localStorage if proxy not available
            try {
                const stored = localStorage.getItem('user');
                if (stored) {
                    setUser(JSON.parse(stored));
                }
            } catch (parseErr) {
                console.error(parseErr);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const res = await fetch('/api/proxy/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) throw new Error('Login failed');

            const data = await res.json();
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
            router.push('/');
        } catch (e) {
            alert('Login Failed');
            throw e;
        }
    };

    const logout = async () => {
        try {
            await fetch('/api/proxy/logout', { method: 'POST' });
        } catch (e) {
            console.error(e);
        }
        setUser(null);
        localStorage.removeItem('user');
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
