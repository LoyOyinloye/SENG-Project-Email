# Institutional Email Workflow System

## Prerequisites
To run this application, you need either:
- **Docker Desktop** (Recommended)
- OR **PHP 8.2+**, **Apache**, and **MySQL 8.0+** installed locally (e.g., via MAMP/XAMPP).

## Running with Docker (Recommended)
1.  Install [Docker Desktop](https://www.docker.com/products/docker-desktop).
2.  Open a terminal in this directory.
3.  Run:
    ```bash
    docker-compose up -d --build
    ```
4.  Open your browser and navigate to `http://localhost:3000` (Frontend).
    - API is running at `http://localhost:8080`, managed automatically by the frontend proxy.
5.  Login with:
    - **Email**: `admin@institution.edu`
    - **Password**: `admin123`

## Development
- **Frontend**: Source in `frontend/`. 
  - To add packages: `docker-compose exec frontend npm install <package>`
- **Backend**: Source in `public/` & `src/`.


## Architecture
- **Backend**: PHP (Vanilla with Router) `public/index.php` (Port 8080)
- **Frontend**: Next.js (React + Tailwind) `frontend/` (Port 3000)
- **Database**: MySQL `schema.sql` (Port 3306)

## Key Features
- **Send & Receive**: Internal messaging system.
- **Workflow**: Return for Correction logic.
- **Attachments**: File upload support.
- **Security**: Password hashing, PDO prepared statements.

