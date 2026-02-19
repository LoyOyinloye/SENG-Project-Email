const Components = {
    dashboard: (user, messages) => `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <h3>Dashboard - ${user.name}</h3>
                <button onclick="App.renderInbox()" class="btn btn-secondary">Refresh</button>
            </div>
            
            <h4>Priority Inbox</h4>
            ${messages.length === 0 ? '<p>No messages found.</p>' : `
                <ul class="message-list">
                    ${messages.map(msg => Components.messageRow(msg)).join('')}
                </ul>
            `}
        </div>
    `,

    messageRow: (msg) => {
        const badgeClass = `badge-${msg.current_status}`;
        return `
        <li class="message-item ${msg.is_read == 0 ? 'unread' : ''}" onclick="App.viewMessage(${msg.message_id})">
            <div style="display:flex; justify-content:space-between;">
                <span><strong>${msg.subject}</strong> <span class="badge ${badgeClass}">${msg.current_status}</span></span>
                <span style="font-size:0.8rem; color:#666;">${new Date(msg.created_at).toLocaleString()}</span>
            </div>
            <div style="font-size:0.9rem; color:#444; margin-top:4px;">
                From: ${msg.sender_name || 'System'}
            </div>
        </li>
        `;
    },

    messageView: (msg) => `
        <div class="card">
            <button onclick="App.renderInbox()" class="btn btn-secondary" style="margin-bottom:1rem;">&larr; Back to Inbox</button>
            <h2>${msg.subject} <span class="badge badge-${msg.current_status}">${msg.current_status}</span></h2>
            <div style="border-bottom:1px solid #eee; padding-bottom:1rem; margin-bottom:1rem;">
                <strong>From:</strong> ${msg.sender_name} <br>
                <strong>Date:</strong> ${new Date(msg.created_at).toLocaleString()}
            </div>
            <div style="white-space: pre-wrap; font-family: sans-serif; line-height:1.6;">${msg.body}</div>
            
            <div style="margin-top:2rem; border-top:1px solid #eee; padding-top:1rem;">
                <h4>Actions</h4>
                <div style="display:flex; gap:10px;">
                    <button onclick="App.showModal('forward', ${msg.message_id})" class="btn btn-primary">Forward</button>
                    <button onclick="App.showModal('return', ${msg.message_id})" class="btn btn-danger">Return for Correction</button>
                    ${msg.current_status !== 'completed' ? `<button onclick="App.completeMessage(${msg.message_id})" class="btn btn-success">Mark as Completed</button>` : ''}
                </div>
            </div>
        </div>
    `,

    compose: (users) => `
        <div class="card">
            <h3>Compose New Message</h3>
            <form onsubmit="App.sendMessage(event)">
                <div class="form-group">
                    <label>To:</label>
                    <select name="to_user_id" class="form-control" required>
                        <option value="">Select Recipient...</option>
                        ${users.map(u => `<option value="${u.user_id}">${u.name} (${u.role})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Subject</label>
                    <input type="text" name="subject" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Message</label>
                    <textarea name="body" class="form-control" rows="8" required></textarea>
                </div>
                <div class="form-group">
                    <label>Attachment (Optional)</label>
                    <input type="file" name="attachment" class="form-control">
                </div>
                <button type="submit" class="btn btn-primary">Send Message</button>
            </form>
        </div>
    `,

    modals: {
        return: (id) => `
            <div class="modal-content">
                <h3>Return for Correction</h3>
                <form onsubmit="App.submitReturn(event, ${id})">
                    <div class="form-group">
                        <label>Reason for Return (Required)</label>
                        <textarea id="return-comment" class="form-control" rows="4" required></textarea>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:10px;">
                        <button type="button" onclick="App.closeModal()" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-danger">Return Message</button>
                    </div>
                </form>
            </div>
        `,
        forward: (id, users) => `
            <div class="modal-content">
                <h3>Forward Message</h3>
                <form onsubmit="App.submitForward(event, ${id})">
                    <div class="form-group">
                        <label>Forward To:</label>
                        <select id="forward-to" class="form-control" required>
                            ${users.map(u => `<option value="${u.user_id}">${u.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Comment</label>
                        <textarea id="forward-comment" class="form-control" rows="3"></textarea>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:10px;">
                        <button type="button" onclick="App.closeModal()" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Forward</button>
                    </div>
                </form>
            </div>
        `
    }
};
