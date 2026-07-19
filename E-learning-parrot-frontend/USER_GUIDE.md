# Xander Learning Hub — User Guide

**Version:** 1.0 (Phase 1)  
**Platform:** Xander Learning Hub by Xander Global Scholars  
**Slogan:** *Study. Learn. Succeed Globally.*

---

## 1. Introduction

Xander Learning Hub is an e-learning platform for **language training**, **international exam preparation** (IELTS, TOEFL, DELF, TOPIK, HSK, and more), and **live online classes** via Zoom. Students enroll in courses, pay through Stripe, and join live sessions. Admins and staff manage courses, learners, and meetings.

This guide covers how to run the platform locally, sign in by role, and use each part of the system.

---

## 2. System requirements

| Component | Requirement |
|-----------|-------------|
| PHP | 8.2+ |
| Composer | Latest |
| Node.js | 18+ |
| MySQL | XAMPP or similar |
| Browser | Chrome, Edge, or Firefox (latest) |

**Database name:** `xander-elearning`  
**Backend API:** `http://localhost:8000/api/admin`  
**Frontend:** `http://localhost:8080`

---

## 3. How to start the platform

### Step 1 — Start MySQL (XAMPP)
Open XAMPP Control Panel and start **MySQL**.

### Step 2 — Backend (CMD window 1)
```cmd
cd /d "c:\methode\water_level\xander learning\parrot-backend"
php artisan serve --host=127.0.0.1 --port=8000
```

### Step 3 — Frontend (CMD window 2)
```cmd
cd /d "c:\methode\water_level\xander learning\parrot-frontend"
npm run dev
```

Open **http://localhost:8080** in your browser.

---

## 4. Environment configuration

### Backend `.env` (not in Git — configure on each server)

| Variable | Purpose |
|----------|---------|
| `ZOOM_ACCOUNT_ID` | Zoom Server-to-Server OAuth |
| `ZOOM_CLIENT_ID` | Zoom app client ID |
| `ZOOM_CLIENT_SECRET` | Zoom app secret |
| `STRIPE_SECRET_KEY` | Stripe backend (starts with `sk_test_` or `sk_live_`) |
| `STRIPE_PUBLIC_KEY` | Stripe publishable key |
| `DB_*` | MySQL connection |
| `MAIL_*` | Email notifications |

### Frontend `.env`

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Must be `http://localhost:8000/api/admin` locally |
| `VITE_APP_NAME` | Display name: Xander Learning Hub |
| `VITE_PCLOUD_*` | Optional file storage for course materials |

Copy `.env.example` to `.env` on new installs. Never commit real `.env` files.

---

## 5. Registered platform users (current)

These accounts exist in the **`users`** table:

| ID | Name | Email | Role | Access |
|----|------|-------|------|--------|
| 24 | JEANDEDIEU Hakizimana | info@xanderglobalscholars.com | **admin** | Full control: users, courses, students, Zoom, payments, reports |
| 29 | Emmanuel Niyonzima | emmanuel@xanderglobalscholars.com | **staff** | Operations: courses, students, classes, schedules (same dashboard as admin) |
| 28 | NDIKUMANA Eric | ndikumanaeric001@gmail.com | **meeting_user** | Webinar signups and available schedules only |

**Learners** are stored in the separate **`students`** table and sign in with the same login page; the system assigns role `learner` automatically.

**Instructors** may exist in the **`users`** table (`role = instructor`) or **`agents`** table (login returns role `instructor`).

> Passwords are stored hashed. Use the password set in the database or contact your administrator. Default fallback for empty passwords in development is `12345678`.

---

## 6. Signing in

1. Go to **http://localhost:8080/login**
2. Enter your **email** and **password**
3. You are redirected by role:

| Role after login | Dashboard URL |
|------------------|---------------|
| admin | `/dashboard/admin` |
| staff | `/dashboard/admin` |
| meeting_user | `/dashboard/meeting-registrations` |
| instructor | `/dashboard/instructor` |
| learner | `/dashboard/learner` |

---

## 7. Public website

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Overview, categories, featured courses |
| Courses | `/courses` | Full course catalog |
| About | `/about` | About Xander Global Scholars |
| Sign up | `/signup` | Student registration |
| Login | `/login` | All user types |
| Webinar signup | `/meeting-registration` | Public meeting registration form |

---

## 8. Learner guide

### Register
1. Click **Start learning** or go to `/signup`
2. Complete profile, select courses, accept terms
3. Account status may be **Pending** until admin approves under **Students**

### Dashboard (`/dashboard/learner`)
- View enrollment stats and quick actions
- Browse and apply for courses

### My Courses (`/dashboard/my-courses`)
- See enrolled courses and status: `enrolled`, `paid`, `rejected`
- Continue to payment when required

### Browse Courses (`/dashboard/browse`)
- View all active courses and enroll

### Pay for a course
1. Select a course and go to **Payment**
2. Click **Continue to secure payment**
3. Complete checkout on **Stripe** (test mode in development)
4. Admin may still need to mark enrollment as **paid** until webhook automation is added

### Settings (`/dashboard/settings`)
- Update profile and change password

---

## 9. Instructor guide

| Menu item | Purpose |
|-----------|---------|
| Dashboard | Overview of assigned courses |
| My Courses | Courses assigned to you |
| Live Classes | Schedule Zoom classes for students |
| Materials | Upload lessons, PDFs, and resources |
| Settings | Profile and password |

---

## 10. Admin & staff guide

| Menu item | Purpose |
|-----------|---------|
| Overview | Metrics: students, courses, applications |
| Courses | Create, edit, price, and deactivate courses |
| Students | Approve pending students, manage learners |
| Instructors | Assign courses to instructors |
| Live Classes | Schedule classes with Zoom links |
| Zoom Meetings | Create/list/delete Zoom meetings |
| Recordings | View Zoom cloud recordings |
| Webinar Signups | Approve/reject meeting registrations |
| Schedules | Available time slots for bookings |
| Live Cohorts | Recurring live Zoom cohort slots |
| Materials | Upload course content |
| Users | Manage admin/staff accounts |
| Settings | Profile and password |

### Typical admin workflow
1. **Create course** → set title, price, description  
2. **Approve student** → Students → set status to **Active**  
3. **Review enrollment** → Courses → enrolled students → **Mark paid** or **Reject**  
4. **Schedule live class** → Live Classes → creates Zoom meeting + emails staff  
5. **Manage webinars** → Webinar Signups → Approve → sends Zoom join link by email  

---

## 11. Meeting coordinator guide (`meeting_user`)

For **NDIKUMANA Eric** and similar accounts:

| Menu item | Purpose |
|-----------|---------|
| Webinar Signups | Review, approve, reject, remind registrants |
| Schedules | Manage available booking times |
| Settings | Profile and password |

---

## 12. Payments (Stripe)

- Configured via `STRIPE_SECRET_KEY` and `STRIPE_PUBLIC_KEY` in backend `.env`
- Learners pay in **USD** through Stripe Checkout
- Course price is set on each course in **Course Management**
- Free courses skip payment

**Production tip:** Set `APP_URL` to your live frontend URL so Stripe redirect URLs work correctly.

---

## 13. Zoom integration

- Configured via `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`
- Used for: creating meetings, webinars, recordings, class scheduling, webinar approval emails
- Test token: `GET /api/admin/zoom/test-token` → should return `{ "token_present": true }`

---

## 14. Course enrollment statuses

| Status | Meaning |
|--------|---------|
| `enrolled` | Student applied; awaiting admin review/payment |
| `paid` | Approved; full access to materials and live classes |
| `rejected` | Application declined |

---

## 15. Phase 1 vs future features

**Available now (Phase 1):**
- Student portal, course catalog, enrollment, Stripe checkout
- Admin/staff dashboards, Zoom meetings & recordings
- Meeting registration workflow, email notifications
- Course materials upload

**Coming later (from roadmap):**
- Progress tracking, certificates with QR verification
- Quizzes, mock exams, mobile apps
- PayPal, Flutterwave, mobile money
- Instructor marketplace revenue sharing (70–80% / 20–30%)
- AI assistant, scholarship matching

---

## 16. Troubleshooting

| Problem | Solution |
|---------|----------|
| API errors / blank data | Check `VITE_API_URL=http://localhost:8000/api/admin` and backend running |
| Login fails | Verify email/password; check MySQL `users` or `students` table |
| Zoom not working | Verify Zoom credentials in `.env`; test `/api/admin/zoom/test-token` |
| Payment fails | Ensure course has a price > 0 and Stripe keys are valid test keys |
| Student cannot enroll | Check student status is **Active** in admin Students page |
| Emails not sent | Check `MAIL_*` settings in backend `.env` |

---

## 17. Support

- **Email:** admission@xanderglobalscholars.com  
- **Organization:** Xander Global Scholars (Xander Tech LLC)

---

## 18. Quick reference — URLs

```
Frontend:     http://localhost:8080
Backend:      http://localhost:8000
API base:     http://localhost:8000/api/admin
Health:       http://localhost:8000/up
GitHub API:   https://github.com/kass2024/xander-elearning-backend
```

---

*Document generated for Xander Learning Hub Phase 1 rebuild. Aligns with the E-Learning HUB project specification.*
