# College Viva Voice-Agent Platform

This is an AI-powered viva platform for colleges that integrates voice AI with exam management workflows.

## Prerequisites

- **Python**: 3.9+
- **Node.js**: 16+
- **MongoDB**: A running instance (local or on Atlas)
- **Git**

## 1. Backend Setup (FastAPI)

Navigate to the backend directory:
```bash
cd backend
```

**Create a virtual environment:**
```bash
python -m venv venv
```

**Activate the virtual environment:**
- On Windows (PowerShell): `.\venv\Scripts\Activate.ps1`
- On Windows (Command Prompt): `venv\Scripts\activate.bat`
- On macOS/Linux: `source venv/bin/activate`
```

**Install dependencies:**
```bash
pip install -r requirements.txt
```

**Create `.env` file:**

Create a file named `.env` inside the `backend` directory and copy the contents from `backend/.env.example` (or the provided context). Update the values, especially `MONGO_URL`, `DB_NAME`, and `OPENAI_API_KEY`.

**Run the server:**

The server will run on `http://localhost:8000`.
```bash
uvicorn server:app --reload
```

## 2. Frontend Setup (React)

Navigate to the frontend directory:
```bash
cd frontend
```

**Install dependencies:**
```bash
npm install
```

**Create `.env` file:**

Create a file named `.env` inside the `frontend` directory with the following content (Vite uses the `VITE_` prefix):
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

**Run the development server:**

The app will be available at `http://localhost:5173`.
```bash
npm start
```

## 3. How to Run the Application

1.  **Start the Backend**: Follow the backend setup steps and run `uvicorn server:app --reload`.
2.  **Start the Frontend**: Follow the frontend setup steps and run `npm start`.
3.  **Register a College**: Open `http://localhost:5173` in your browser, click "Get Started", and register a new college.
    - **Note**: If you register with the `ADMIN_EMAIL` from your `.env` file (`****@gmail.com`), you will be a **Global Admin**. Any other email will be a **College Admin** with a pending subscription.
4.  **(Global Admin) Approve Subscription**: Log in as the Global Admin. Navigate to the Admin Dashboard and approve the subscription for the new college.
5.  **(College Admin) Manage College**: Log out and log back in as the College Admin.
    - Go to the College Dashboard.
    - Upload an Excel file of students.
    - Upload an Excel file of questions.
    - Create an Exam Set, assigning students and a schedule.
6.  **(Student) Take Exam**: Log out and log in as one of the students you uploaded.
    - You will see the scheduled exam on your dashboard.
    - Once the College Admin marks your attendance (this is a manual step in the current design, a future feature could automate this), the "Start Exam" button will be enabled at the scheduled time.
    - Click "Start Exam" to begin the viva.