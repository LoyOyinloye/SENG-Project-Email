-- Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('staff', 'hod', 'admin') DEFAULT 'staff',
    department_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    thread_id INT,
    sender_id INT NOT NULL,
    current_owner_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body LONGTEXT,
    is_read BOOLEAN DEFAULT FALSE,
    current_status ENUM('draft', 'sent', 'returned', 'forwarded', 'completed') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(user_id),
    FOREIGN KEY (current_owner_id) REFERENCES users(user_id)
);

-- Workflow Logs Table
CREATE TABLE IF NOT EXISTS workflow_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NOT NULL,
    previous_owner_id INT,
    new_owner_id INT,
    action_type VARCHAR(50) NOT NULL, -- e.g., 'SENT', 'FORWARDED', 'RETURNED', 'COMPLETED'
    comment TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(message_id),
    FOREIGN KEY (previous_owner_id) REFERENCES users(user_id),
    FOREIGN KEY (new_owner_id) REFERENCES users(user_id)
);

-- Attachments Table
CREATE TABLE IF NOT EXISTS attachments (
    attachment_id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) DEFAULT NULL,
    mime_type VARCHAR(100),
    file_size INT DEFAULT 0,
    file_data LONGBLOB,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(message_id) ON DELETE CASCADE
);

-- Migration: Add columns if upgrading from older schema
-- These are safe to run multiple times due to IF NOT EXISTS behavior
-- ALTER TABLE attachments ADD COLUMN IF NOT EXISTS file_data LONGBLOB;
-- ALTER TABLE attachments ADD COLUMN IF NOT EXISTS file_size INT DEFAULT 0;

-- Insert Default Admin User (password: admin123)
-- Hash generated using password_hash('admin123', PASSWORD_DEFAULT)
INSERT INTO users (name, email, password_hash, role) 
SELECT 'System Admin', 'admin@institution.edu', '$2y$10$YOboSSGMDKIovY4SvYzIvezRM6F.zNG9hyNkkm/a6c2ImDSd3JiKy', 'admin'
WHERE NOT EXISTS (SELECT * FROM users WHERE email = 'admin@institution.edu');

-- Insert Test Users (password: admin123)
INSERT INTO users (name, email, password_hash, role) 
SELECT 'Staff Member A', 'staff_a@institution.edu', '$2y$10$YOboSSGMDKIovY4SvYzIvezRM6F.zNG9hyNkkm/a6c2ImDSd3JiKy', 'staff'
WHERE NOT EXISTS (SELECT * FROM users WHERE email = 'staff_a@institution.edu');

INSERT INTO users (name, email, password_hash, role) 
SELECT 'HOD Department B', 'hod_b@institution.edu', '$2y$10$YOboSSGMDKIovY4SvYzIvezRM6F.zNG9hyNkkm/a6c2ImDSd3JiKy', 'hod'
WHERE NOT EXISTS (SELECT * FROM users WHERE email = 'hod_b@institution.edu');

-- Insert Staff User (password: admin123)
INSERT INTO users (name, email, password_hash, role, department_id) 
SELECT 'Jane Doe', 'jane@institution.edu', '$2y$10$gOaKI9DhPZxRzrsrAwuJAOQ694EA9uYibmVEeB.75XxPj72NhLKQa', 'staff', 1
WHERE NOT EXISTS (SELECT * FROM users WHERE email = 'jane@institution.edu');

-- Insert HOD User (password: admin123)
INSERT INTO users (name, email, password_hash, role, department_id) 
SELECT 'Dr. Smith', 'smith@institution.edu', '$2y$10$gOaKI9DhPZxRzrsrAwuJAOQ694EA9uYibmVEeB.75XxPj72NhLKQa', 'hod', 1
WHERE NOT EXISTS (SELECT * FROM users WHERE email = 'smith@institution.edu');

