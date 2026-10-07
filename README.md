# ⚡ ARCHON FITNESS LEADERBOARD & ANALYTICS

A modern, privacy-first fitness tracking and competitive leaderboard web application built following **Human-Computer Interaction (HCI) principles**, **zero paid technologies**, and enterprise-grade security.

---

## 🌟 Key Features

### 1. 🔒 Privacy-Preserving "Shadow" Leaderboard
Traditional leaderboards force users into an all-or-nothing privacy dilemma: either broadcast workout habits publicly, or get excluded from tracking personal progress. **ARCHON** introduces a **Dual-Consensus Shadow Leaderboard**:
- **Private Workout Option**: When logging any activity (walking, running, cycling, swimming, etc.), users can toggle **"🔒 Private Workout"**.
- **Personal View**: A user sees their own personalized standing based on **ALL their workouts (public + private)**.
- **Public View**: All other users and visitors see the leaderboard computed strictly from **public entries**.
- **Concrete Demonstration**:
  - Demo user **`abc`** has private workouts yielding **467 points**. When `abc` logs in, `abc` sees themselves ranked at **Rank #8**!
  - Other users viewing the public board do **NOT** see user `abc`. The 9th athlete (**Henry Ford**, 360 points) automatically shifts into **Rank #8** on the public board!
  - `abc` can click **"🌐 Public View"** to verify that their name and private logs are completely invisible to the outside world.

### 2. 📈 Discrete Numbers & Ratio Analytics
Fitness improvement cannot be measured by a single vanity metric. ARCHON evaluates performance across dual dimensions:
- **Discrete Gains (Physical Units)**:
  - $\Delta \text{Distance} = \text{Distance}_{\text{current}} - \text{Distance}_{\text{previous}}$ (in kilometers, e.g. $+5.4\text{ km}$)
  - $\Delta \text{Duration}$ (in active minutes, e.g. $+45\text{ mins}$)
  - $\Delta \text{Workouts}$ (discrete session count)
  - Pace delta (min/km velocity change)
- **Ratio Analytics (Normalized Growth)**:
  - **Growth Ratio**: $(\text{Distance}_{\text{current}} / \text{Distance}_{\text{previous}})$ and percentage change (e.g. $+28.5\%$ or $1.28\times$), allowing fair comparison between beginners and high-mileage athletes.
  - **Consistency Ratio**: $\frac{\text{Active Days in Period}}{\text{Total Days in Period}}$ (e.g. 5 of 7 days = $71.4\%$ consistency).
  - **Composite Improvement Score**: Weighted algorithm rewarding both tangible volume growth and percentage acceleration.

### 3. 👑 Admin Custom Activity Creation
- Admins can provision **any new activity type** beyond the core defaults (Walking, Running, Cycling).
- Admin fields: Activity Name, Icon Emoji (🏊‍♂️, 🚣‍♂️, 🥾, 🥊, 🧘), Primary Unit (km, mi, laps, reps, min), Calorie Burn Rate per unit, and Description.
- Newly created activities are instantly available in the workout logger for all community members.
- Non-admin users attempting to provision activities are strictly blocked with `HTTP 403 Forbidden`.

### 4. 🛡️ Strict User Ownership & Security
- **Independent User Accounts**: Bcrypt-hashed credentials with 10 salt rounds and signed JWT authentication.
- **Strict Authorization**: Users can **ONLY update or delete their own activity scores**. Attempting to modify another user's record via direct API calls returns `HTTP 403 Forbidden`.
- **SQL Injection Prevention**: 100% prepared SQL statements via Better-SQLite3.
- **Security Headers & Rate Limiting**: Helmet with strict Content Security Policy (CSP), CORS, and brute-force auth rate limiting.

### 5. ⚖️ User-Based Head-to-Head Comparison
- Select any two community members to benchmark side-by-side.
- Relative progress bars comparing volume, active minutes, and session frequency.
- Discrete difference badges and ratio comparisons.
- Category Honors declaring winners for Total Distance, Consistency, Growth %, and Fitness Score.

---

## 🎨 Human-Computer Interaction (HCI) Foundations

Built adhering to **Jakob Nielsen's 10 Usability Heuristics**:

| Heuristic | Implementation in ARCHON |
| :--- | :--- |
| **1. Visibility of System Status** | Real-time status banners ("Personal Shadow Board Active" vs "Public Board"), live calculation previews while typing workout numbers, instant feedback toasts. |
| **2. Match Between System & Real World** | Familiar fitness metaphors (pace in min/km, kcal burn rates, streaks, sports icons 🏃‍♂️, 🚴‍♂️, 🚶‍♂️, podium trophies 🏆). |
| **3. User Control & Freedom** | Edit and delete own scores anytime with confirmation guards; seamless toggle between Public and Personal shadow view. |
| **4. Consistency & Standards** | Unified dark-mode design system with color-coded badges (rose for private entries, cyan for public entries, amber for admin/podium). |
| **5. Error Prevention** | Number bounds (`min="0"`, `min="1"`), date validation (capped at today), live client-side validation before network submission. |
| **6. Recognition rather than Recall** | Top Interactive Demo Bar allowing 1-click switching between test profiles (`User ABC`, `Henry`, `Elena`, `Admin`) without remembering passwords. |
| **7. Flexibility & Efficiency** | 1-click `⚡ Compare` shortcuts directly on leaderboard rows; quick filter pills; responsive mobile & desktop layout. |
| **8. Aesthetic & Minimalist Design** | Glassmorphism surfaces, subtle glow effects, uncluttered metric cards, WCAG AA contrast compliance. |
| **9. Help Users Recover from Errors** | Clear, human-readable error banners on failed logins or invalid inputs. |
| **10. Help & Documentation** | Dedicated "How It Works" interactive guide built directly into the application. |

---

## 💻 Tech Stack (100% Free & Open Source)

- **Backend**: Node.js & Express 5
- **Database**: SQLite with WAL Mode via `better-sqlite3` (ACID-compliant, embedded, zero cloud database costs)
- **Authentication**: `bcryptjs` + `jsonwebtoken`
- **Security**: `helmet`, `express-rate-limit`, `cors`
- **Frontend**: Vanilla HTML5, CSS3 Glassmorphism Design System, Modern ES6+ JavaScript (Zero framework overhead, blazing fast load times)
- **Deployment**: Multi-stage `Dockerfile` (deployable anywhere for free: Render, Railway, Fly.io, or VPS)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or newer recommended, tested on Node v24)
- npm

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/saadrahman8/project_1.git
cd project_1

# Install dependencies (100% free open-source packages)
npm install
```

### 2. Seed Database
Initialize the database with demo users, multi-week workouts, and the privacy showcase scenario:
```bash
npm run seed
```

### 3. Start the Server
```bash
npm start
```
The application will be live at **`http://localhost:3000`**.

---

## 🔑 Pre-Seeded Test Accounts

| Account | Username | Password | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `Admin123!` | `admin` | Can create new custom activities and manage catalog. |
| **User ABC** | `abc` | `Password123!` | `user` | **Private Demo Athlete**: Ranked **#8** on personal board; completely invisible on the public board! |
| **Henry Ford** | `henry_fit` | `Password123!` | `user` | **Public Rank #8**: Appears at #8 on the public board when ABC's private logs are hidden. |
| **Elena** | `elena_pro` | `Password123!` | `user` | **Top Athlete (Rank #1)**: 150+ km of running history. |
| **Marcus** | `marcus_speed` | `Password123!` | `user` | **Rank #2 Cyclist**: High-intensity interval workouts. |

*(All other demo user passwords are set to `Password123!`)*

---

## 🐳 Docker Deployment

Deploy in one command using Docker:
```bash
docker build -t archon-fitness .
docker run -p 3000:3000 archon-fitness
```

### Free Cloud Deployment Options:
- **Render / Railway / Fly.io**: Connect your GitHub repository (`saadrahman8/project_1`) and select "Node.js" or "Dockerfile". The app binds to `PORT` automatically and requires zero external database setup.

---

## 📄 License
ISC License &bull; Free and Open Source for community and personal fitness tracking.
