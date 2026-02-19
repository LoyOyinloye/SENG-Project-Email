Hello! I am ready to help. Acting as a Senior Product Designer and Lead Software Engineer with over a decade of experience in building enterprise-grade systems, I have analyzed your Product Requirement Document (PRD).

The document outlines a classic **Document Management System (DMS)** with an emphasis on "Workflow" and "Correction Loops," which distinguishes it from a standard email client.

Below, I have first **extracted the content** from your document as requested, followed by a **comprehensive technical execution plan** to build this to a world-class standard.

---

# Part 1: Content Extraction (from PDF)

Here is the digitized content of your PRD, including text, logic, and database schemas.

### **Title:** Internal Email Workflow System for Institutional Use (e.g., BU)

### **1. Overview**
This application is a web-based internal communication system that allows staff within an institution (such as Babcock University) to send, receive, review, correct, and forward emails within a controlled environment.

It functions like an internal mail workflow system where a message can:
*   Move from one staff member to another
*   Be returned to the sender for correction
*   Be forwarded to another officer for further action
*   Be tracked through its entire lifecycle
*   It will get to the recipient and the writer will be issued a copy and a copy will eventually be saved in archive

**The system is built using:**
*   **Frontend:** HTML, CSS, JavaScript
*   **Backend:** PHP (running on WAMP server)
*   **Database:** MySQL
*   **Server:** Local intranet or institutional network

### **2. Core Features**
**A. Email Sending**
*   Users compose messages using a web form.
*   Messages are stored in the database and delivered to the recipient’s inbox.

**B. Email Receiving**
*   Each user has an inbox showing all messages addressed to them.
*   Messages can be marked as *read, unread, pending,* or *completed*.

**C. Workflow Movement**
A message can move through the following states:
*   Sent → Received
1.  Received → Forwarded
2.  Received → Returned for Correction
3.  Corrected → Resent
4.  Completed / Closed

**D. Error Correction**
*   If a message contains errors, the recipient can click **“Return for Correction”**.
*   The sender receives the message back with comments.
*   The sender edits and resubmits it.

**E. Tracking**
*   Every action (send, forward, return, correct) is logged.
*   Users can view the full history of a message.

### **3. Architecture**
*(Visual Diagram Description)*
*   **Client Side:** User Web Browser (HTML, CSS, JS) sends HTTP Requests.
*   **Server Side:** WAMP Server (Apache + PHP) receives requests.
*   **Database Interaction:** PHP sends SQL Queries to MySQL DB.
*   **Data Return:** MySQL returns data to PHP, which sends HTML/JSON responses back to the browser.

### **4. Database Structure (Simplified)**

**Users Table**
| Field | Type | Description |
| :--- | :--- | :--- |
| user_id | INT | Unique ID |
| name | VARCHAR | Staff name |
| email | VARCHAR | Institutional email |
| role | VARCHAR | e.g., Lecturer, HOD, Admin |
| password | VARCHAR | Hashed password |

**Messages Table**
| Field | Type | Description |
| :--- | :--- | :--- |
| message_id | INT | Unique message ID |
| sender_id | INT | User who sent the message |
| receiver_id | INT | Current recipient |
| subject | VARCHAR | Message subject |
| body | TEXT | Message content |
| status | VARCHAR | sent, received, returned, corrected, completed |
| timestamp | DATETIME | Time of action |

**Workflow Logs Table**
| Field | Type | Description |
| :--- | :--- | :--- |
| log_id | INT | Unique log entry |
| message_id | INT | Related message |
| action | VARCHAR | sent, forwarded, returned, corrected |
| from_user | INT | User performing action |
| to_user | INT | Recipient |
| comments | TEXT | Optional notes |
| timestamp | DATETIME | Time of action |

### **6. Application Modules**
**A. Login Module:** Authenticates users; Redirects to dashboard.
**B. Dashboard:** Inbox, Sent items, Pending corrections, Completed messages.
**C. Compose Message:** HTML form for writing messages; JavaScript validation; PHP backend to save message.
**D. Message Viewer:** Displays message details; Buttons: Forward, Return for Correction, Mark as Completed.
**E. Correction Module:** Sender receives returned message; Edits and resubmits.
**F. Admin Panel:** Manage users, View system logs, Monitor workflow.

### **7. Technologies Used**
*   **Frontend:** HTML5, CSS3, JavaScript.
*   **Backend:** PHP, Apache.
*   **Database:** MySQL.
*   **Server:** WAMP (Windows, Apache, MySQL, PHP).

---

# Part 2: Product Execution Strategy (Expert Roadmap)

As a senior developer, my assessment is that while the PRD outlines a solid "Happy Path," a world-class system requires robustness in security, UI interaction, and data integrity. The "WAMP" stack is great for development, but for a university production environment, we will structure this for stability.

Here is the step-by-step build process.

## Phase 1: Architecture & Process Flow

We need to formalize the logic so the code doesn't become "spaghetti." We will use the **MVC (Model-View-Controller)** pattern within PHP to keep the code clean.

### 1. The High-Level Logic
*   **The Memos/Email Object:** This is the core entity. It is not just text; it is a "state machine."
*   **The State Machine:** We must strictly enforce logic. For example, a user cannot "Complete" a message that has been "Returned for Correction."

### 2. Detailed Process Map
1.  **Initiation:** Staff A writes Message -> System validates input -> System saves as `status: SENT` -> Logs entry.
2.  **Notification:** System detects new message for Staff B -> Staff B sees "Unread" badge.
3.  **Review Logic:**
    *   *Option A (Good):* Staff B reads -> Clicks "Complete" -> System updates `status: COMPLETED` -> Logs entry.
    *   *Option B (Forward):* Staff B reads -> Selects Staff C -> Adds Note -> Clicks "Forward" -> System updates owner to Staff C -> Logs entry.
    *   *Option C (Correction - **The USP**):* Staff B spots error -> Clicks "Return" -> Adds Comment (Required) -> System updates `status: RETURNED` -> Changes owner back to Staff A -> Logs entry.

## Phase 2: User Flow & UX Strategy

To make this "world-class," the UX must be intuitive. It shouldn't look like a basic HTML form; it should feel like a modern app (e.g., Gmail or Outlook).

**Key User Journeys:**

1.  **The "Correction" User Flow (Critical Path):**
    *   **User:** Receiver.
    *   **Action:** Opens email. Notice a button clearly labeled "Reject/Return."
    *   **Interaction:** Clicking "Return" opens a **Modal/Popup**.
    *   **Requirement:** The modal forces the user to type *why* it is being returned. (Prevents confusion).
    *   **Result:** The email vanishes from the Receiver's "Action Items" and appears in the Sender's "Needs Attention" folder.

2.  **The "Dashboard" Flow:**
    *   Instead of just a list, we design a **Priority Matrix**:
        *   *Top Section:* "Requires Action" (Pending corrections, New emails).
        *   *Bottom Section:* "FYI / Completed" (Archives).

## Phase 3: Design (UI)

We will use a Clean Corporate Design System.

*   **Color Palette:** Institutional Blue (Trust), Red/Orange (Correction/Action Needed), Green (Completed).
*   **Typography:** Sans-serif (Inter or Roboto) for high readability on screens.
*   **Component Library:**
    *   *Rich Text Editor:* For the Compose body (Bold, Italic, Lists).
    *   *Timeline Component:* A vertical visual line showing the history of the message (Sent -> Forwarded -> Returned).

## Phase 4: Database Refinement

The simplified database in the PRD is a good start, but to make it robust, we need to add a few technical fields.

**Refined SQL Schema Suggestion:**

```sql
-- Enhanced Users Table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Never store plain text
    role ENUM('staff', 'hod', 'admin') DEFAULT 'staff',
    department_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced Messages Table
CREATE TABLE messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    thread_id INT, -- To group conversation threads
    sender_id INT,
    current_owner_id INT, -- Tracks who currently "has" the file
    subject VARCHAR(255),
    body LONGTEXT,
    is_read BOOLEAN DEFAULT FALSE,
    current_status ENUM('draft', 'sent', 'returned', 'forwarded', 'completed') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (current_owner_id) REFERENCES users(user_id)
);

-- Enhanced Workflow/Audit Logs
CREATE TABLE workflow_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT,
    previous_owner_id INT,
    new_owner_id INT,
    action_type VARCHAR(50), -- e.g., 'RETURNED_WITH_ERROR'
    comment TEXT, -- The correction instructions
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Phase 5: Frontend Development

We will use **Vanilla JavaScript** (as per PRD) but structure it professionally using ES6 modules to keep it organized.

*   **AJAX/Fetch API:** We will use AJAX for form submissions. When a user sends an email, the page should *not* reload. A "Spinner" should appear, followed by a "Success Toast Notification."
*   **Dynamic UI:**
    *   When "Return for Correction" is clicked, JS will unhide the `comment` text area.
    *   When viewing logs, JS will render the timestamps in the user's local time.

## Phase 6: Backend Development (PHP)

Since the requirement is PHP without a framework (like Laravel), we will build a **Micro-Framework** structure:

1.  **Config.php:** Database connection settings (PDO for security against SQL Injection).
2.  **Auth.php:** Handle Login, Session Start, and CSRF Token generation (Security).
3.  **Controllers:**
    *   `MessageController.php`: Handles logic for sending, updating status.
    *   `UserController.php`: Handles profile fetching.
4.  **Security Measures (Mandatory for World-Class status):**
    *   **Sanitization:** Use `htmlspecialchars()` on all outputs to prevent XSS attacks.
    *   **Prepared Statements:** Use `$stmt->prepare("SELECT * FROM users WHERE...")` to prevent SQL Injection.
    *   **Access Control:** Ensure a user cannot view `message_id=5` if they are not the sender or receiver (IDOR protection).

## Phase 7: Launch & Deployment

Moving from WAMP (Development) to Production.

1.  **Environment Setup:**
    *   Do not use WAMP for the live server. Use **IIS (Windows Server)** or **Apache on Linux** for the institutional network.
2.  **Migration:**
    *   Export SQL from local phpMyAdmin.
    *   Import to Production DB.
    *   Update `db_connection.php` credentials.
3.  **Testing:**
    *   **Unit Test:** Test the "Return" loop. What happens if the original sender has left the company? (Edge case handling).
    *   **Load Test:** Ensure the system handles 100 staff logging in at 9:00 AM.
4.  **Training:**
    *   Create a simple PDF manual showing how to "Return" an email properly, as this is the new behavior users won't be used to.

This structure moves the idea from a "Student Project" level to a professional, auditable Institutional Workflow System.