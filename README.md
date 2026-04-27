# ZenAura

ZenAura is a modern mental wellness application featuring an AI-powered conversational assistant, journal tracking, Quora-like community questions, and real-time messaging. It uses a **Node.js, Express, and PostgreSQL** backend combined with an **Angular** frontend.

---

## 🛠️ Prerequisites

Make sure you have the following installed on your machine:
- **Node.js** (v18 or higher recommended)
- **PostgreSQL** database running locally
- **Angular CLI** (install globally using `npm install -g @angular/cli`)

---

## 💻 Backend Setup

The backend manages APIs, Socket.io real-time chat, Database operations, and integration with the Gemini AI model.

1. **Navigate to the backend directory:**
   ```bash
   cd back-end
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```
   *This will install highly critical packages including Express, Socket.io, Postgres Client (pg), and @google/generative-ai.*

3. **Configure Environment Variables:**
   Create a `.env` file in the `back-end` directory and configure the following parameters:
   ```env
   DB_USER=postgres
   DB_PASSWORD=your_db_password
   DB_HOST=localhost
   DB_DATABASE=zenAura
   DB_PORT=5432
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key_from_google_ai_studio
   ```

4. **Run the Backend Server:**
   ```bash
   npm run dev
   ```
   *The server runs on Nodemon by default and is configured to start on `http://localhost:3000`.*

---

## 🎨 Frontend Setup

The frontend is built with Angular natively supporting standalone components, dynamic CSS gradients, and glassmorphism UI/UX designs.

1. **Navigate to the frontend directory:**
   ```bash
   cd front-end/zenAura
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Run the Angular Development Server:**
   ```bash
   ng serve
   ```
   
4. **View the Application:**
   Open a browser and navigate to `http://localhost:4200`.

---

## 📝 Note on Source Control

We've specifically configured `.gitignore` files to ensure that your `.env` (which holds sensitive keys like database passwords and AI API keys) and `node_modules` are excluded from Git commits. 

If you just cloned this repo, you will strictly need to run `npm install` in **both** the frontend and backend folders before running the app!
