This is a comprehensive **User Flow & System Logic Map**.

As a senior product designer, I have structured this not just as a list of clicks, but as a logical flow of **User Actions**, **System Decisions**, and **Data State Changes**. This ensures the development team knows exactly what triggers what, covering the "Happy Path" (everything goes right) and the "Edge Cases" (corrections and errors).

---

### **Legend / Key**
*   **[User Action]**: Physical interaction by the human.
*   **<System Logic>**: Backend processing (PHP/MySQL) invisible to the user.
*   **{Decision Point}**: A fork in the road where the flow splits.
*   **((State Change))**: An update to the database status field.

---

### **1. Authentication Flow (Security Entry)**
*Goal: Ensure only authorized staff access institutional data.*

1.  **Start**: User opens web application URL on Intranet.
2.  **[User Action]**: Views Login Screen. Enters `Institutional Email` and `Password`.
3.  **[User Action]**: Clicks "Login".
4.  **<System Logic>**:
    *   Sanitizes input (prevents SQL injection).
    *   Hashes entered password (MD5/Bcrypt).
    *   Compares against `Users Table`.
5.  **{Decision Point}**: Credentials Match?
    *   *No*: **<System Response>** Show error "Invalid Credentials" → Return to Step 2.
    *   *Yes*: **<System Response>** Generate Session Token → Redirect to **Dashboard**.

---

### **2. Dashboard & Navigation Flow**
*Goal: Provide a "Command Center" view of pending work.*

1.  **Start**: User lands on Dashboard.
2.  **<System Logic>**: Query `Messages Table` where `receiver_id` = Current User AND `status` != 'completed'.
3.  **[User Action]**: User scans the **Priority Matrix**:
    *   **Inbox (Action Items):** Messages waiting for review.
    *   **Returned to Me:** Messages sent by user but rejected for errors (High Priority).
    *   **Sent/Pending:** Messages user sent that are waiting on others.
    *   **Archives:** Closed/Completed workflows.
4.  **{Decision Point}**: What does the user want to do?
    *   *Create New*: Go to **Flow 3 (Compose)**.
    *   *Review Message*: Click on an item in Inbox → Go to **Flow 4 (Review)**.
    *   *Fix Error*: Click on item in "Returned" → Go to **Flow 5 (Correction)**.

---

### **3. Composition Flow (Initiation)**
*Goal: Create a new workflow instance.*

1.  **Start**: User clicks "Compose New Message".
2.  **[User Action]**: Selects Recipient from Dropdown (Populated from `Users Table`).
3.  **[User Action]**: Enters `Subject`.
4.  **[User Action]**: Types `Body` content (Rich text: Bold, Lists, etc.).
5.  **[User Action]**: Clicks "Send Message".
6.  **<System Logic>**:
    *   Validates fields (JS check for empty fields).
    *   **((State Change))**: Inserts new row in `Messages Table` with status `SENT`.
    *   **((State Change))**: Inserts entry in `Workflow Logs Table` (Action: "Initiated").
7.  **<System Response>**: Show "Success Toast Notification" → Redirect to Dashboard.

---

### **4. Receiver Flow (The Review Process)**
*Goal: The recipient decides the fate of the message.*

1.  **Start**: User clicks a message in their "Inbox".
2.  **[User Action]**: Views "Message Details" (Subject, Body, Sender, Timestamp).
3.  **<System Logic>**: Updates `is_read` to `TRUE` in database.
4.  **{Decision Point}**: User evaluates content.
    *   *Path A: Content is valid & requires no further action.* -> **[User Action]**: Clicks **"Mark as Completed"**.
        *   **((State Change))**: Update Status to `COMPLETED`.
        *   **((State Change))**: Log Action "Completed".
        *   **Result**: Message moves to Archive for both parties.
    
    *   *Path B: Content needs to go to someone else.* -> **[User Action]**: Clicks **"Forward"**.
        *   **[User Action]**: Selects New Recipient from dropdown.
        *   **[User Action]**: Adds "Forwarding Note" (Optional).
        *   **((State Change))**: Update `receiver_id` to New User.
        *   **((State Change))**: Log Action "Forwarded".
        *   **Result**: Message disappears from User's Inbox, appears in New User's Inbox.

    *   *Path C: Content has errors.* -> **[User Action]**: Clicks **"Return for Correction"**. -> **Go to Flow 5**.

---

### **5. The Correction Loop (Crucial Workflow)**
*Goal: Enforce quality control without creating new email threads.*

1.  **Start**: Receiver identifies an error (Path C above).
2.  **[User Action]**: Clicks "Return for Correction" button.
3.  **<System Response>**: Opens Modal/Popup "Return Message".
4.  **[User Action]**: **MUST** enter `Correction Comments` (e.g., "Budget attachment missing" or "Typos in paragraph 2"). *System validation prevents submission without comments.*
5.  **[User Action]**: Clicks "Send Back".
6.  **<System Logic>**:
    *   **((State Change))**: Update Status to `RETURNED`.
    *   **((State Change))**: Swap `sender_id` and `receiver_id` logic (Conceptually returns ownership).
    *   **((State Change))**: Write to `Workflow Logs`: Action "Returned", Comment "Budget missing".
7.  **Result**: Message vanishes from Receiver's Inbox.

**--- The Original Sender's Experience ---**

8.  **[User Action]**: Original Sender sees notification "Action Required: 1 Returned Message".
9.  **[User Action]**: Opens message.
10. **<System Response>**: Displays Original Message **AND** the "Correction Comment" from the reviewer prominently at the top (e.g., in a red alert box).
11. **[User Action]**: Clicks "Edit".
12. **[User Action]**: Modifies the message body to fix the error.
13. **[User Action]**: Clicks "Resubmit".
14. **<System Logic>**:
    *   **((State Change))**: Update Status from `RETURNED` to `RESENT`.
    *   **((State Change))**: Log Action "Resubmitted".
15. **Result**: Workflow returns to **Flow 4 (Receiver Flow)**.

---

### **6. Tracking & History Flow**
*Goal: Audit trail and transparency.*

1.  **Start**: User views any message (Inbox, Sent, or Archive).
2.  **[User Action]**: Clicks "View History / Logs" tab or button.
3.  **<System Logic>**: Query `Workflow Logs Table` WHERE `message_id` matches. Sort by Date DESC.
4.  **<System Response>**: Render a Timeline View.
    *   *10:00 AM* - Initiated by User A.
    *   *10:05 AM* - Received by User B.
    *   *10:15 AM* - **Returned** by User B (Comment: "Fix typo").
    *   *10:30 AM* - **Resubmitted** by User A.
    *   *10:35 AM* - **Completed** by User B.

---

### **7. Admin User Flow**
*Goal: System maintenance.*

1.  **Start**: Admin logs in.
2.  **[User Action]**: Navigates to "User Management".
3.  **[User Action]**: Clicks "Add New Staff".
4.  **[User Action]**: Inputs Name, Email, Role, Department.
5.  **<System Logic>**: Creates User ID, generates default password.
6.  **[User Action]**: Navigates to "System Logs".
7.  **<System Response>**: View global list of all message movements (for auditing institutional bottlenecks).

---

### **Summary of Message States**
To implement this flow successfully, your backend must strictly enforce these states:

1.  **DRAFT:** Created, not sent (Optional, if we add draft feature).
2.  **SENT:** In Recipient's Inbox, unread.
3.  **READ:** In Recipient's Inbox, opened.
4.  **FORWARDED:** Passed to a third party.
5.  **RETURNED:** Sent back to origin for edits.
6.  **RESENT:** Edits made, back in Recipient's court.
7.  **COMPLETED:** Finalized and Archived.