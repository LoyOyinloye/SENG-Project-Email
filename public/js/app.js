const App = {
    user: null,
    apiBase: '/api', // Use relative URLs — same origin, no CORS issues
    cachedUsers: [],

    init: async () => {
        try {
            const res = await fetch(`${App.apiBase}/me`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                App.user = data.user;
                document.getElementById('main-header').style.display = 'flex';
                App.loadUsers();
                App.renderInbox();
            }
        } catch (e) {
            console.error('Init error:', e);
        }
    },

    login: async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const data = Object.fromEntries(form.entries());

        try {
            const res = await fetch(`${App.apiBase}/login`, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (res.ok) {
                const result = await res.json();
                App.user = result.user;
                document.getElementById('main-header').style.display = 'flex';
                App.loadUsers();
                App.renderInbox();
            } else {
                alert('Login failed');
            }
        } catch (e) {
            console.error('Login error:', e);
            alert('Login failed');
        }
    },

    logout: async () => {
        await fetch(`${App.apiBase}/logout`, { method: 'POST', credentials: 'include' });
        window.location.reload();
    },

    loadUsers: async () => {
        try {
            const res = await fetch(`${App.apiBase}/users`, { credentials: 'include' });
            if (res.ok) {
                App.cachedUsers = await res.json();
            } else {
                // Fallback if endpoint not available
                App.cachedUsers = [
                    { user_id: 1, name: 'System Admin', role: 'admin' },
                ];
            }
        } catch (e) {
            console.error('Error loading users:', e);
            App.cachedUsers = [
                { user_id: 1, name: 'System Admin', role: 'admin' },
            ];
        }
    },

    navigate: (page) => {
        if (page === 'dashboard') App.renderInbox();
        if (page === 'compose') App.renderCompose();
    },

    renderInbox: async () => {
        try {
            const res = await fetch(`${App.apiBase}/messages/inbox`, { credentials: 'include' });
            const messages = await res.json();
            document.getElementById('main-content').innerHTML = Components.dashboard(App.user, messages);
        } catch (e) {
            console.error('Error fetching inbox:', e);
            document.getElementById('main-content').innerHTML = '<div class="card"><p>Error loading inbox. Please try again.</p></div>';
        }
    },

    renderCompose: () => {
        document.getElementById('main-content').innerHTML = Components.compose(App.cachedUsers);
    },

    sendMessage: async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);

        try {
            const res = await fetch(`${App.apiBase}/messages`, {
                method: 'POST',
                body: form,
                credentials: 'include'
            });

            if (res.ok) {
                alert('Message Sent!');
                App.renderInbox();
            } else {
                alert('Error sending message');
            }
        } catch (e) {
            console.error('Error sending message:', e);
            alert('Error sending message');
        }
    },

    viewMessage: (id) => {
        fetch(`${App.apiBase}/messages/${id}`, { credentials: 'include' })
            .then(r => {
                if (r.ok) return r.json();
                throw new Error('Failed to fetch message');
            })
            .then(msg => {
                document.getElementById('main-content').innerHTML = Components.messageView(msg);
            })
            .catch(e => {
                console.error(e);
                // Fallback: try filtering from inbox
                fetch(`${App.apiBase}/messages/inbox`, { credentials: 'include' })
                    .then(r => r.json())
                    .then(msgs => {
                        const msg = msgs.find(m => m.message_id == id);
                        if (msg) document.getElementById('main-content').innerHTML = Components.messageView(msg);
                    });
            });
    },

    showModal: (type, id) => {
        const modal = document.getElementById('modal-container');
        modal.classList.remove('hidden');
        if (type === 'return') {
            modal.innerHTML = Components.modals.return(id);
        } else if (type === 'forward') {
            modal.innerHTML = Components.modals.forward(id, App.cachedUsers);
        }
    },

    closeModal: () => {
        document.getElementById('modal-container').classList.add('hidden');
    },

    submitReturn: async (e, id) => {
        e.preventDefault();
        const comment = document.getElementById('return-comment').value;
        const res = await fetch(`${App.apiBase}/messages/return`, {
            method: 'POST',
            body: JSON.stringify({ message_id: id, comment }),
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        if (res.ok) {
            App.closeModal();
            App.renderInbox();
        }
    },

    submitForward: async (e, id) => {
        e.preventDefault();
        const new_owner_id = document.getElementById('forward-to').value;
        const comment = document.getElementById('forward-comment').value;

        const res = await fetch(`${App.apiBase}/messages/forward`, {
            method: 'POST',
            body: JSON.stringify({ message_id: id, new_owner_id, comment }),
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        if (res.ok) {
            App.closeModal();
            App.renderInbox();
        }
    },

    completeMessage: async (id) => {
        if (!confirm('Mark as completed?')) return;
        const res = await fetch(`${App.apiBase}/messages/complete`, {
            method: 'POST',
            body: JSON.stringify({ message_id: id }),
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        if (res.ok) {
            App.renderInbox();
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', App.init);
