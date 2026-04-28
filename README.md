# Expense Tracker (MERN Stack)

A robust, production-ready full-stack Expense Tracker built to gracefully handle real-world network instability, ensure strict financial data correctness, and provide a seamless user experience.

> **Live Deployment:** [Insert Live App URL Here]

---

## 🚀 Quick Start (Running Locally)

You will need two terminal windows to run the frontend and backend concurrently.

### 0. Environment Setup
Before running the application, you must configure the environment variables.

In the `backend` folder, create a `.env` file:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
REDIS_URL=your_redis_connection_string
CORS_ORIGIN=http://localhost:5173
```

In the `frontend` folder, create a `.env` file:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 1. Start the Backend
```bash
cd backend
npm install
npm run dev
```
*(The API will start on `http://localhost:5000`)*

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
*(The React app will start on `http://localhost:5173`)*

---

## 🏗️ Architecture & Tech Stack

* **Frontend:** React, TypeScript, Vite, Tailwind CSS, Axios, React Router, React Hot Toast.
* **Backend:** Node.js, Express 5, TypeScript.
* **Database Choice:** MongoDB (via Mongoose)
  * **Why MongoDB?** MongoDB was chosen for its flexibility and excellent support for rapid schema iteration. More importantly, MongoDB's powerful `Compound Unique Indexes` allowed me to mathematically guarantee idempotency at the database engine level, entirely preventing race conditions during concurrent duplicate requests.
* **Caching:** Upstash Redis (via `ioredis`) for rapid `GET` query resolution.

---

## 🧠 Key Design Decisions

To ensure production-grade reliability under unreliable network conditions, several advanced design patterns were implemented:

### 1. Bulletproof Idempotency (Handling Network Flakes & Retries)
* **Problem:** Users clicking "submit" multiple times, refreshing the page during submission, or experiencing slow connections can result in duplicate expense records.
* **Solution:** The frontend dynamically generates a UUID (`uuidv4`) and sends it via an `Idempotency-Key` HTTP header. 
  * If a request is dropped or times out, the frontend intelligently **retains** the same UUID for the retry. 
  * A MongoDB Unique Compound Index over `(user, idempotencyKey)` prevents duplicates at the database level. 
  * If the backend detects an identical key, it bypasses creation and gracefully returns a `200 OK` with the existing record, safely handling rapid double-clicks without throwing raw server errors.

### 2. Integer Math for Accurate Money Handling
* **Problem:** JavaScript represents numbers as double-precision floats (e.g., `0.1 + 0.2 = 0.30000000000000004`), which introduces dangerous rounding errors in financial applications.
* **Solution:** The Mongoose `Expense` schema rigidly enforces that the `amount` is stored as an **Integer** (in Paise/Cents). The frontend handles multiplying user decimal inputs by `100` before POSTing, and dividing by `100` before display, guaranteeing absolute mathematical precision.

### 3. Graceful UI/UX for Edge Cases
* Implemented `react-hot-toast` to provide clear, non-intrusive feedback for success and error states.
* Submit buttons are explicitly disabled (`isLoading`) during API transit to visually prevent multi-clicks.
* Total expenses are calculated dynamically based only on the currently filtered/sorted view.

### 4. Rate Limiting & Caching
* **Rate Limiting:** `express-rate-limit` protects the API from brute force and DDOS attacks (100 reqs/15 min globally, 20 reqs/15 min for Auth endpoints).
* **Caching:** The `GET /expenses` endpoint caches complex sorted/filtered queries in Redis. Successfully executing a `POST /expenses` immediately invalidates the user's specific cache keys, ensuring absolute data consistency.

---

## ⚖️ Trade-offs & Intentional Omissions

Given the strict timebox constraints, I prioritized deep engineering rigor (data correctness, money handling, idempotency, and edge-case resilience) over a wide breadth of superficial features.

**Things I intentionally did NOT do:**
1. **Pagination:** I intentionally excluded infinite scrolling or page chunking for the `GET /expenses` route to focus entirely on robust caching and exact idempotency logic.
2. **Complex Summary Views / Charts:** While a "Total per Category" summary or pie chart is a "Nice to Have", I opted instead to polish the core table UI and implement a highly reliable "Total Expenses" metric for the currently visible list.
