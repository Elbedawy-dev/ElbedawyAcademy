# Elbedawy Academy: API Contract

> Generated directly from the backend source (`routes/`, `validators/`, `controllers/`, `utils/constants.js`, `sockets/`, `models/`). It is the **only** reference the front end may use. If something is missing here, it does not exist: stop and ask; do not invent an endpoint or field.


## 1. Conventions

- **Base URL:** `{API_URL}/api/v1` (all paths below already include `/api/v1`).
- **Success envelope:** `{ "success": true, "message": string, "data": any, "meta"?: object }`
- **List endpoints** return `data` as an array plus `meta`: `{ page, limit, total, totalPages, hasNextPage, hasPrevPage }`. Query params: `page` (default 1), `limit` (default and max set per endpoint), `sort` (e.g. `-createdAt`), plus endpoint-specific filters.
- **Error envelope:** `{ "success": false, "message": string, "code": string, "errors"?: [{ path, message }] }`. Known codes include: `PERMISSION_DENIED`, `TEACHER_NOT_APPROVED`, `TOKEN_INVALID`, `TOKEN_EXPIRED`, `INVALID_ID`, `DUPLICATE_KEY`, `FILE_TOO_LARGE`, `TOO_MANY_FILES`, `UPLOAD_ERROR`, `INTERNAL_ERROR`, `ENROLLMENT_NOT_PAYABLE`, `ENROLLMENT_INVALID_STATE`, `DUPLICATE_PAYMENT`, `INVITE_ONLY_GROUP`, `PAYMENT_NOT_CONFIGURED`, `PAYMENT_PROVIDER_ERROR`, `INVALID_SIGNATURE`, `PAYMENT_AMOUNT_MISMATCH`, `INVALID_STUDENT`, `GROUP_CLOSED`, `GROUP_FULL`. Validation failures return 400/422 with `errors[]` (field path + message): map them onto form fields.
- **Auth:** header `Authorization: Bearer <accessToken>`. Access token is short-lived (15 min); refresh tokens are rotated on use (see Auth section: confirm the exact refresh route there). On 401 with `TOKEN_EXPIRED` refresh once, then retry.
- **Roles (lowercase!):** `admin`, `teacher`, `student`, `parent`. All enum values below are lowercase / snake_case exactly as written.
- **Dates:** ISO 8601 in UTC; convert to the user's timezone in the UI.
- **Hidden resources:** the backend returns **404** (not 403) for resources a user must not know exist (e.g. groups they do not belong to).
- **Uploads:** `multipart/form-data`. Limits are in section 2 (`UPLOAD_LIMITS`).


## 2. Enums (exact values)

- `ASSIGNMENT_TYPES`: "homework", "quiz"
- `ATTENDANCE_STATUS`: "present", "absent", "late", "excused"
- `AUDIT_ACTIONS`: `{"TEACHER_APPROVED": "teacher.approved", "TEACHER_REJECTED": "teacher.rejected", "TEACHER_SUSPENDED": "teacher.suspended", "CERTIFICATE_REVIEWED": "teacher.certificate_reviewed", "USER_CREATED": "user.created", "USER_UPDATED": "user.updated", "USER_SENSITIVE_UPDATED": "user.sensitive_updated", "USER_DELETED": "user.deleted", "USER_STATUS_CHANGED": "user.status_changed", "GROUP_PRICE_CHANGED": "group.price_changed", "GROUP_DELETED": "group.deleted", "MEMBER_REMOVED": "group.member_removed", "MEMBER_MOVED": "group.member_moved", "PAYMENT_REFUNDED": "payment.refunded", "PAYOUT_CALCULATED": "payout.calculated", "PAYOUT_APPROVED": "payout.approved", "PAYOUT_PAID": "payout.paid", "SETTINGS_UPDATED": "settings.updated", "REVIEW_MODERATED": "review.moderated", "REPORT_RESOLVED": "report.resolved", "CERTIFICATE_ISSUED": "certificate.issued", "CERTIFICATE_REVOKED": "certificate.revoked", "MESSAGE_DELETED": "chat.message_deleted", "STUDENT_MUTED": "chat.student_muted"}`
- `BILLING_CYCLES`: "monthly", "per_session", "full_course"
- `CERTIFICATE_FILE_TYPES`: "ijazah", "degree", "course", "other"
- `CERTIFICATE_TYPES`: "juz_completion", "surah", "course"
- `CERT_VERIFICATION_STATUS`: "pending", "verified", "rejected"
- `CURRENCIES`: "EGP", "USD", "SAR", "AED", "KWD", "EUR", "GBP"
- `CURRENT_ENROLLMENT_STATUSES`: "pending", "active", "paused", "awaiting_payment"
- `DAYS_OF_WEEK`: 0, 1, 2, 3, 4, 5, 6
- `ENROLLMENT_STATUS`: "pending", "active", "paused", "cancelled", "awaiting_payment"
- `GENDERS`: "male", "female"
- `GROUP_GENDER_TYPES`: "boys", "girls", "mixed"
- `GROUP_LEVELS`: "primary_1", "primary_2", "primary_3", "primary_4", "primary_5", "primary_6", "prep_1", "prep_2", "prep_3", "secondary_1", "secondary_2", "secondary_3", "all_ages", "kids", "adults", "beginner", "intermediate", "advanced"
- `GROUP_STATUS`: "open", "full", "closed"
- `JOIN_MODES`: "invite_only", "request", "open"
- `LANGUAGES`: "ar", "en"
- `MATN_DAYS`: 0, 4
- `MATN_TYPES`: "matn_tuhfa", "matn_jazariyyah"
- `MEMBER_ENROLLMENT_STATUSES`: "active", "paused"
- `MESSAGE_TYPES`: "text", "image", "file", "audio"
- `NOTIFICATION_TYPES`: "session_reminder", "session_started", "session_cancelled", "absence_alert", "progress_entry", "assignment_new", "assignment_due", "assignment_graded", "payment_success", "payment_failed", "payment_refunded", "subscription_expiring", "subscription_expired", "teacher_approved", "teacher_rejected", "teacher_suspended", "enrollment_request", "enrollment_accepted", "enrollment_rejected", "enrollment_removed", "parent_link_request", "parent_link_accepted", "certificate_issued", "payout_paid", "chat_mention", "broadcast"
- `PAYMENT_METHODS`: "card", "wallet"
- `PAYMENT_PROVIDERS`: "paymob", "manual"
- `PAYMENT_STATUS`: "pending", "paid", "failed", "refunded", "expired"
- `PAYOUT_STATUS`: "pending", "approved", "paid"
- `QURAN_ENTRY_TYPES`: "new_memorization", "near_review", "far_review", "tajweed", "tafsir"
- `QURAN_LEVELS`: "all_ages", "kids", "adults", "beginner", "intermediate", "advanced"
- `QURAN_RATINGS`: "excellent", "very_good", "good", "needs_repeat"
- `REPORT_STATUS`: "open", "reviewing", "resolved", "dismissed"
- `REPORT_TARGETS`: "message", "user", "group"
- `REVIEW_ENTRY_TYPES`: "near_review", "far_review"
- `REVIEW_STATUS`: "visible", "hidden"
- `ROLES`: `{"ADMIN": "admin", "TEACHER": "teacher", "STUDENT": "student", "PARENT": "parent"}`
- `ROLE_VALUES`: "admin", "teacher", "student", "parent"
- `SCHOOL_GRADES`: "primary_1", "primary_2", "primary_3", "primary_4", "primary_5", "primary_6", "prep_1", "prep_2", "prep_3", "secondary_1", "secondary_2", "secondary_3"
- `SCHOOL_TERMS`: "term_1", "term_2", "summer", "full_year"
- `SELF_REGISTER_ROLES`: "student", "parent", "teacher"
- `SENSITIVE_USER_FIELDS`: "email", "dateOfBirth", "name"
- `SESSION_STATUS`: "scheduled", "live", "ended", "cancelled"
- `SESSION_TYPES`: "quran", "tafsir", "review", "matn_tuhfa", "matn_jazariyyah", "lesson"
- `STUDENT_GRADES`: "primary_1", "primary_2", "primary_3", "primary_4", "primary_5", "primary_6", "prep_1", "prep_2", "prep_3", "secondary_1", "secondary_2", "secondary_3", "none"
- `STUDENT_QURAN_LEVELS`: "none", "beginner", "intermediate", "advanced", "hafiz"
- `SUBJECT_TYPES`: "quran", "tajweed_matn", "school"
- `SUBMISSION_STATUS`: "submitted", "graded", "late"
- `SUBSCRIPTION_STATUS`: "none", "active", "grace", "expired"
- `TEACHER_SPECIALTIES`: "quran", "tajweed", "school"
- `TEACHER_STATUS`: "pending", "approved", "rejected", "suspended"
- `UPLOAD_LIMITS`: `{"avatar": {"maxSize": 2097152, "mimes": ["image/jpeg", "image/png", "image/webp"]}, "certificate": {"maxSize": 5242880, "maxFiles": 5, "mimes": ["image/jpeg", "image/png", "image/webp", "application/pdf"]}, "attachment": {"maxSize": 10485760, "maxFiles": 5, "mimes": ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "audio/mpeg", "audio/mp4", "audio/aac", "audio/ogg", "audio/wav", "audio/webm", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/plain"]}}`

## 3. Endpoints


### auth  (10 endpoints)

#### `POST /api/v1/auth/register`
- **Access:** public · rate-limited (authLimiter)
- **Response (201):** `message: 'User registered successfully. Please verify your email.', data: result,`
- **Request validation** (`registerSchema`, Zod; `body`/`params`/`query` as written):
```js
export const registerSchema = z.object({
  body: z
    .object({
      name: z.string().min(2, 'Name must be at least 2 characters').max(100),
      email: z.string().email('Invalid email address').max(160),
      phone: z.string().min(8, 'Phone number must be at least 8 digits').max(20),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      role: z.enum(SELF_REGISTER_ROLES, {
        errorMap: () => ({ message: 'Role must be student, parent, or teacher' }),
      }),
      gender: z.enum(GENDERS, {
        errorMap: () => ({ message: 'Gender must be male or female' }),
      }),
      dateOfBirth: z.coerce.date().refine((d) => d < new Date(), {
        message: 'Date of birth cannot be in the future',
      }),
      address: addressSchema,
      language: z.enum(LANGUAGES).optional().default('ar'),
      timezone: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const now = new Date();
      const birth = new Date(data.dateOfBirth);
      let age = now.getUTCFullYear() - birth.getUTCFullYear();
      const m = now.getUTCMonth() - birth.getUTCMonth();
      if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;

      if (data.role === 'teacher' && age < 18) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Teachers must be at least 18 years old',
          path: ['dateOfBirth'],
        });
      }
    }),
});
```
#### `POST /api/v1/auth/login`
- **Access:** public · rate-limited (authLimiter)
- **Response (200):** `message: 'Login successful', data: result,`
- **Request validation** (`loginSchema`, Zod; `body`/`params`/`query` as written):
```js
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().optional(),
    password: z.string().min(1, 'Password is required'),
    fcmToken: z.string().optional(),
  }).refine((data) => data.email || data.phone, {
    message: 'Either email or phone is required to log in',
    path: ['email'],
  }),
});
```

#### `POST /api/v1/auth/refresh`
- **Access:** public
- **Response (200):** `message: 'Token refreshed successfully', data: result,`
- **Request validation** (`refreshTokenSchema`, Zod; `body`/`params`/`query` as written):
```js
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});
```

#### `GET /api/v1/auth/verify-email`
- **Access:** public
- **Response (200):** `message: result.message`
- **Query params (detected):** `token` (plus `page`, `limit`, `sort` where paginated)
- **Request validation** (`verifyEmailSchema`, Zod; `body`/`params`/`query` as written):
```js
export const verifyEmailSchema = z.object({
  query: z.object({
    token: z.string().min(1, 'Verification token is required'),
  }),
});
```

#### `POST /api/v1/auth/forgot-password`
- **Access:** public · rate-limited (authLimiter)
- **Response (200):** `message: result.message`
- **Request validation** (`forgotPasswordSchema`, Zod; `body`/`params`/`query` as written):
```js
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});
```

#### `POST /api/v1/auth/reset-password`
- **Access:** public · rate-limited (authLimiter)
- **Response (200):** `message: result.message`
- **Request validation** (`resetPasswordSchema`, Zod; `body`/`params`/`query` as written):
```js
export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});
```

#### `POST /api/v1/auth/logout`
- **Access:** authenticated
- **Response (200):** `message: 'Logged out successfully'`

#### `POST /api/v1/auth/logout-all`
- **Access:** authenticated
- **Response (200):** `message: 'All sessions logged out successfully'`

#### `POST /api/v1/auth/change-password`
- **Access:** authenticated
- **Response (200):** `message: result.message`
- **Request validation** (`changePasswordSchema`, Zod; `body`/`params`/`query` as written):
```js
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
});
```

#### `PUT /api/v1/auth/fcm-token`
- **Access:** authenticated
- **Response (200):** `message: 'FCM token updated successfully'`
- **Request validation** (`fcmTokenSchema`, Zod; `body`/`params`/`query` as written):
```js
export const fcmTokenSchema = z.object({
  body: z.object({
    fcmToken: z.string().min(1, 'FCM token is required'),
  }),
});
```


### user  (9 endpoints)

#### `GET /api/v1/users/me`
- **Access:** authenticated
- **Response (200):** `data: user`

#### `PATCH /api/v1/users/me`
- **Access:** authenticated
- **Response (200):** `message: 'Profile updated successfully', data: user`
- **Request validation** (`updateMeSchema`, Zod; `body`/`params`/`query` as written):
```js
export const updateMeSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().min(8).max(20).optional(),
    gender: z.enum(GENDERS).optional(),
    dateOfBirth: z.coerce.date().refine((d) => d < new Date(), {
      message: 'Date of birth cannot be in the future',
    }).optional(),
    address: addressSchema.optional(),
    language: z.enum(LANGUAGES).optional(),
    timezone: z.string().optional(),
    email: z.string().email().max(160).optional(),
  }),
});
```

#### `PUT /api/v1/users/me/avatar`
- **Access:** authenticated
- **Upload (multipart/form-data):** single file, field name `avatar`
- **Response (200):** `message: 'Avatar updated successfully', data: user`

#### `DELETE /api/v1/users/me/avatar`
- **Access:** authenticated
- **Response (200):** `message: 'Avatar removed successfully', data: user`

#### `GET /api/v1/users`
- **Access:** authenticated · roles: admin
- **Response (200):** `data: result.data, meta: result.meta`
- **Query params (detected):** `isActive`, `limit`, `page`, `role`, `search` (plus `page`, `limit`, `sort` where paginated)
- **Request validation** (`listUsersSchema`, Zod; `body`/`params`/`query` as written):
```js
export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    role: z.enum(ROLE_VALUES).optional(),
    isActive: z.enum(['true', 'false']).optional(),
    search: z.string().optional(),
    sort: z.string().optional(),
  }),
});
```

#### `GET /api/v1/users/:id`
- **Access:** authenticated · roles: admin
- **Response (200):** `data: user`

#### `PATCH /api/v1/users/:id`
- **Access:** authenticated · roles: admin
- **Response (200):** `message: 'User updated successfully', data: user`
- **Request validation** (`adminUpdateUserSchema`, Zod; `body`/`params`/`query` as written):
```js
export const adminUpdateUserSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().max(160).optional(),
    phone: z.string().min(8).max(20).optional(),
    role: z.enum(ROLE_VALUES).optional(),
    gender: z.enum(GENDERS).optional(),
    dateOfBirth: z.coerce.date().optional(),
    address: addressSchema.optional(),
    isActive: z.boolean().optional(),
    isEmailVerified: z.boolean().optional(),
    language: z.enum(LANGUAGES).optional(),
    timezone: z.string().optional(),
  }),
});
```

#### `PATCH /api/v1/users/:id/toggle-active`
- **Access:** authenticated · roles: admin
- **Response (200):** `message: 'User status updated', data: user`

#### `DELETE /api/v1/users/:id`
- **Access:** authenticated · roles: admin
- **Response (200):** `message: result.message`


### teacher  (10 endpoints)

#### `GET /api/v1/teachers/catalogue`
- **Access:** public
- **Response (200):** `data: result.data, meta: result.meta`
- **Query params (detected):** `gender`, `limit`, `page`, `rating`, `search`, `specialty`, `subject` (plus `page`, `limit`, `sort` where paginated)
- **Request validation** (`catalogueQuerySchema`, Zod; `body`/`params`/`query` as written):
```js
export const catalogueQuerySchema = z.object({
  query: z.object({
    subject: z.string().optional(),
    grade: z.string().optional(),
    rating: z.coerce.number().min(1).max(5).optional(),
    gender: z.enum(GENDERS).optional(),
    specialty: z.enum(TEACHER_SPECIALTIES).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sort: z.string().optional(),
  }),
});
```

#### `GET /api/v1/teachers/profile/:id`
- **Access:** public
- **Response (200):** `data: profile`

#### `GET /api/v1/teachers/me/profile`
- **Access:** authenticated · roles: teacher
- **Response (200):** `data: profile`

#### `PATCH /api/v1/teachers/me/profile`
- **Access:** authenticated · roles: teacher
- **Response (200):** `message: 'Teacher profile updated', data: profile`
- **Request validation** (`updateTeacherProfileSchema`, Zod; `body`/`params`/`query` as written):
```js
export const updateTeacherProfileSchema = z.object({
  body: z.object({
    bio: z.string().max(2000).optional(),
    specialties: z.array(z.enum(TEACHER_SPECIALTIES)).optional(),
    subjects: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
    yearsOfExperience: z.number().min(0).max(80).optional(),
    bankOrWalletInfo: z.record(z.any()).optional(),
  }),
});
```

#### `POST /api/v1/teachers/me/certificates`
- **Access:** authenticated · roles: teacher
- **Upload (multipart/form-data):** up to 5 files, field name `files`
- **Response (201):** `message: 'Certificates uploaded successfully', data: certs`
- **Request validation** (`addCertificateSchema`, Zod; `body`/`params`/`query` as written):
```js
export const addCertificateSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(150),
    issuer: z.string().max(150).optional(),
    type: z.enum(CERTIFICATE_FILE_TYPES).optional(),
  }),
});
```

#### `DELETE /api/v1/teachers/me/certificates/:certId`
- **Access:** authenticated · roles: teacher
- **Response (200):** `message: result.message`

#### `GET /api/v1/teachers/me/certificates/:certId/download`
- **Access:** authenticated · roles: teacher, admin
- **Response (200):** `data: result`

#### `PATCH /api/v1/teachers/:id/approval`
- **Access:** authenticated · roles: admin
- **Response (200):** `message: `Teacher status updated to ${req.body.status}`, data: profile,`
- **Request validation** (`teacherApprovalSchema`, Zod; `body`/`params`/`query` as written):
```js
export const teacherApprovalSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    status: z.enum(['approved', 'rejected', 'suspended']),
    reason: z.string().max(1000).optional(),
  }).refine((data) => {
    if ((data.status === 'rejected' || data.status === 'suspended') && !data.reason) {
      return false;
    }
    return true;
  }, {
    message: 'Reason is required when rejecting or suspending a teacher',
    path: ['reason'],
  }),
});
```

#### `PATCH /api/v1/teachers/:teacherId/certificates/:certId/review`
- **Access:** authenticated · roles: admin
- **Response (200):** `message: 'Certificate reviewed', data: cert`
- **Request validation** (`reviewCertificateSchema`, Zod; `body`/`params`/`query` as written):
```js
export const reviewCertificateSchema = z.object({
  params: z.object({
    teacherId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    certId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    status: z.enum(CERT_VERIFICATION_STATUS),
    adminNote: z.string().max(500).optional(),
  }),
});
```

#### `GET /api/v1/teachers/:teacherId/certificates/:certId/download`
- **Access:** authenticated · roles: admin
- **Response (200):** `data: result`


### parent  (5 endpoints)

#### `POST /api/v1/parents/student/generate-code`
- **Access:** authenticated · roles: student
- **Response (200):** `message: 'Link code generated', data: result`

#### `GET /api/v1/parents/children`
- **Access:** authenticated · roles: parent, admin
- **Response (200):** `data: children`

#### `POST /api/v1/parents/children`
- **Access:** authenticated · roles: parent, admin
- **Response (201):** `message: 'Child account created successfully', data: child`
- **Request validation** (`createChildAccountSchema`, Zod; `body`/`params`/`query` as written):
```js
export const createChildAccountSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    gender: z.enum(GENDERS),
    dateOfBirth: z.coerce.date().refine((d) => d < new Date(), {
      message: 'Date of birth cannot be in the future',
    }),
    grade: z.enum(STUDENT_GRADES).default('none'),
    schoolName: z.string().max(150).optional(),
    password: z.string().min(6).optional(),
  }),
});
```

#### `POST /api/v1/parents/link-by-code`
- **Access:** authenticated · roles: parent, admin
- **Response (200):** `message: result.message, data: result.student`
- **Request validation** (`linkChildByCodeSchema`, Zod; `body`/`params`/`query` as written):
```js
export const linkChildByCodeSchema = z.object({
  body: z.object({
    code: z.string().min(4).max(30).trim(),
  }),
});
```

#### `GET /api/v1/parents/children/:studentId/summary`
- **Access:** authenticated · roles: parent, admin
- **Response (200):** `data: summary`


### room  (3 endpoints)

#### `GET /api/v1/rooms/me`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `data: room`

#### `PATCH /api/v1/rooms/me`
- **Access:** authenticated · approved-teacher-or-admin
- **Upload (multipart/form-data):** single file, field name `cover`
- **Response (200):** `message: 'Room updated successfully', data: room`

#### `GET /api/v1/rooms/me/stats`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `data: result`


### group  (8 endpoints)

#### `GET /api/v1/groups`
- **Access:** authenticated
- **Response (200):** `data: result.data, meta: result.meta`
- **Query params (detected):** `limit`, `page`, `status`, `subjectId`, `teacherId` (plus `page`, `limit`, `sort` where paginated)

#### `GET /api/v1/groups/:id`
- **Access:** authenticated
- **Response (200):** `data: group`

#### `GET /api/v1/groups/:id/members`
- **Access:** authenticated
- **Query params:** `status` (optional, allowed for the group's teacher and admin only: `pending | awaiting_payment | active | paused`). Non-teacher, non-admin users attempting to supply `?status=` receive **403** `PERMISSION_DENIED` ("Only group teacher or admin can filter members by status"). For students/parents querying without `status`, defaults to active/paused members only.
- **Response (200):** `data: members`

#### `POST /api/v1/groups`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (201):** `message: 'Group created successfully', data: group`
- **Request validation** (`createGroupSchema`, Zod; `body`/`params`/`query` as written):
```js
export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    subject: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid subject ID'),
    gradeLevel: z.enum(GROUP_LEVELS),
    genderType: z.enum(GROUP_GENDER_TYPES),
    maxStudents: z.number().int().min(1).max(100).default(15),
    price: priceSchema,
    schedule: z.array(scheduleSlotSchema).min(1, 'At least one weekly slot is required'),
    joinMode: z.enum(JOIN_MODES).default('request'),
  }),
});
```

#### `PATCH /api/v1/groups/:id`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `message: 'Group updated successfully', data: group`
- **Request validation** (`updateGroupSchema`, Zod; `body`/`params`/`query` as written):
```js
export const updateGroupSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    gradeLevel: z.enum(GROUP_LEVELS).optional(),
    genderType: z.enum(GROUP_GENDER_TYPES).optional(),
    maxStudents: z.number().int().min(1).max(100).optional(),
    price: priceSchema.optional(),
    schedule: z.array(scheduleSlotSchema).optional(),
    joinMode: z.enum(JOIN_MODES).optional(),
    status: z.enum(['open', 'full', 'closed']).optional(),
  }),
});
```

#### `POST /api/v1/groups/:id/regenerate-code`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `message: 'Join code regenerated', data: result`

#### `DELETE /api/v1/groups/:groupId/members/:studentId`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `message: result.message`
- **Request validation** (`removeMemberSchema`, Zod; `body`/`params`/`query` as written):
```js
export const removeMemberSchema = z.object({
  params: z.object({
    groupId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    studentId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});
```

#### `POST /api/v1/groups/:groupId/move-member`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `message: result.message`
- **Request validation** (`moveMemberSchema`, Zod; `body`/`params`/`query` as written):
```js
export const moveMemberSchema = z.object({
  params: z.object({
    groupId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    studentId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    targetGroupId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
});
```


### enrollment  (4 endpoints)

#### `POST /api/v1/enrollments/request`
- **Access:** authenticated · roles: student
- **Response (201):** `message: enrollment.status === 'active' ? 'Joined group successfully' : 'Join request submitted', data: enrollment,`
- **Request validation** (`requestEnrollmentSchema`, Zod; `body`/`params`/`query` as written):
```js
export const requestEnrollmentSchema = z.object({
  body: z.object({
    groupId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid group ID'),
  }),
});
```

#### `POST /api/v1/enrollments/join-by-code`
- **Access:** authenticated · roles: student
- **Response (200):** `message: 'Enrolled in group successfully', data: enrollment`
- **Request validation** (`joinByCodeSchema`, Zod; `body`/`params`/`query` as written):
```js
export const joinByCodeSchema = z.object({
  body: z.object({
    code: z.string().min(4).max(30).trim(),
  }),
});
```

#### `POST /api/v1/enrollments/parent-enroll`
- **Access:** authenticated · roles: parent, admin
- **Response (201):** `message: 'Child enrolled in group successfully', data: enrollment`
- **Request validation** (`parentEnrollSchema`, Zod; `body`/`params`/`query` as written):
```js
export const parentEnrollSchema = z.object({
  body: z.object({
    groupId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid group ID'),
    studentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid student ID'),
  }),
});
```

#### `PATCH /api/v1/enrollments/:id/status`
- **Access:** authenticated · roles: teacher, admin
- **Response (200):** `message: 'Enrollment status updated', data: enrollment`
- **Request validation** (`updateEnrollmentStatusSchema`, Zod; `body`/`params`/`query` as written):
```js
export const updateEnrollmentStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    action: z.enum(['accept', 'reject', 'pause', 'resume', 'cancel']),
    reason: z.string().max(500).optional(),
  }),
});
```


### session  (5 endpoints)

#### `GET /api/v1/sessions/calendar`
- **Access:** authenticated
- **Response (200):** `data: sessions`
- **Reads query params** but names could not be detected statically: ask before assuming any.
- **Request validation** (`calendarQuerySchema`, Zod; `body`/`params`/`query` as written):
```js
export const calendarQuerySchema = z.object({
  query: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    groupId: z.string().optional(),
    timezone: z.string().optional(),
  }).refine((data) => data.endDate >= data.startDate, {
    message: 'endDate must be greater than or equal to startDate',
    path: ['endDate'],
  }),
});
```

#### `POST /api/v1/sessions`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (201):** `message: 'Session scheduled successfully', data: session`
- **Request validation** (`createSessionSchema`, Zod; `body`/`params`/`query` as written):
```js
export const createSessionSchema = z.object({
  body: z.object({
    group: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid group ID'),
    title: z.string().min(2).max(150),
    type: z.enum(SESSION_TYPES),
    scheduledStart: z.coerce.date(),
    scheduledEnd: z.coerce.date(),
    notes: z.string().max(2000).optional(),
  }).refine((data) => data.scheduledEnd > data.scheduledStart, {
    message: 'scheduledEnd must be after scheduledStart',
    path: ['scheduledEnd'],
  }),
});
```

#### `POST /api/v1/sessions/recurring`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (201):** `message: `${sessions.length} recurring session instances generated`, data: sessions,`
- **Request validation** (`generateRecurringSessionsSchema`, Zod; `body`/`params`/`query` as written):
```js
export const generateRecurringSessionsSchema = z.object({
  body: z.object({
    groupId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    startDate: z.coerce.date(),
    weeksAhead: z.number().int().min(1).max(12).default(4),
  }),
});
```

#### `PATCH /api/v1/sessions/:id`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `message: 'Session updated successfully', data: session`
- **Request validation** (`updateSessionSchema`, Zod; `body`/`params`/`query` as written):
```js
export const updateSessionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    title: z.string().min(2).max(150).optional(),
    type: z.enum(SESSION_TYPES).optional(),
    scheduledStart: z.coerce.date().optional(),
    scheduledEnd: z.coerce.date().optional(),
    notes: z.string().max(2000).optional(),
    status: z.enum(['scheduled', 'cancelled']).optional(),
    cancellationReason: z.string().max(500).optional(),
  }),
});
```

#### `POST /api/v1/sessions/:id/cancel`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `message: 'Session cancelled', data: session`


### live  (5 endpoints)

#### `GET /api/v1/live/sessions/:sessionId/token`
- **Access:** authenticated
- **Response (200):** `message: 'Join token acquired', data: tokenData`

#### `POST /api/v1/live/sessions/:sessionId/start`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `message: 'Live session started', data: credentials`

#### `POST /api/v1/live/sessions/:sessionId/end`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `message: 'Live session ended', data: session`

#### `POST /api/v1/live/sessions/:sessionId/kick/:studentId`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `message: result.message`

#### `POST /api/v1/live/sessions/:sessionId/mute/:studentId`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `message: result.message`


### attendance  (4 endpoints)

#### `GET /api/v1/attendance/students/:studentId/report`
- **Access:** authenticated
- **Response (200):** `data: report`

#### `GET /api/v1/attendance/sessions/:sessionId`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `data: records`

#### `PATCH /api/v1/attendance/sessions/:sessionId/students/:studentId`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `message: 'Attendance updated', data: attendance`
- **Request validation** (`updateAttendanceSchema`, Zod; `body`/`params`/`query` as written):
```js
export const updateAttendanceSchema = z.object({
  params: z.object({
    sessionId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    studentId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    status: z.enum(ATTENDANCE_STATUS),
    note: z.string().max(500).optional(),
  }),
});
```

#### `GET /api/v1/attendance/groups/:groupId/report`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `data: report`


### progress  (8 endpoints)

#### `GET /api/v1/progress/quran/student/:studentId`
- **Access:** authenticated
- **Response (200):** `data: result.data, meta: { ...result.meta, summary: result.summary }`
- **Query params (detected):** `entryType`, `juz`, `limit`, `page`, `surah` (plus `page`, `limit`, `sort` where paginated)

#### `GET /api/v1/progress/quran/student/:studentId/needs-review`
- **Access:** authenticated
- **Response (200):** `data: result`
- **Query params (detected):** `days` (plus `page`, `limit`, `sort` where paginated)

#### `GET /api/v1/progress/school/student/:studentId`
- **Access:** authenticated
- **Response (200):** `data: records`

#### `GET /api/v1/progress/student/:studentId/pdf`
- **Access:** authenticated

#### `POST /api/v1/progress/quran`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (201):** `message: 'Quran progress recorded', data: entry`
- **Request validation** (`createQuranProgressSchema`, Zod; `body`/`params`/`query` as written):
```js
export const createQuranProgressSchema = z.object({
  body: z.object({
    student: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid student ID'),
    group: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    session: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    date: z.coerce.date().optional(),
    entryType: z.enum(QURAN_ENTRY_TYPES),
    surah: z.number().int().min(1).max(114),
    fromAyah: z.number().int().min(1),
    toAyah: z.number().int().min(1),
    pageFrom: z.number().int().min(1).max(604).optional(),
    pageTo: z.number().int().min(1).max(604).optional(),
    juz: z.number().int().min(1).max(30),
    rating: z.enum(QURAN_RATINGS).default('good'),
    mistakes: z.object({
      hifz: z.number().int().min(0).optional(),
      tajweed: z.number().int().min(0).optional(),
      notes: z.string().max(500).optional(),
    }).optional(),
    tafsirCovered: z.object({
      covered: z.boolean().default(false),
      notes: z.string().max(1000).optional(),
    }).optional(),
    teacherNote: z.string().max(1000).optional(),
  }).refine((data) => data.toAyah >= data.fromAyah, {
    message: 'toAyah must be greater than or equal to fromAyah',
    path: ['toAyah'],
  }),
});
```

#### `PATCH /api/v1/progress/quran/:id`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `message: 'Progress entry updated', data: entry`
- **Request validation** (`updateQuranProgressSchema`, Zod; `body`/`params`/`query` as written):
```js
export const updateQuranProgressSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    entryType: z.enum(QURAN_ENTRY_TYPES).optional(),
    surah: z.number().int().min(1).max(114).optional(),
    fromAyah: z.number().int().min(1).optional(),
    toAyah: z.number().int().min(1).optional(),
    pageFrom: z.number().int().min(1).max(604).optional(),
    pageTo: z.number().int().min(1).max(604).optional(),
    juz: z.number().int().min(1).max(30).optional(),
    rating: z.enum(QURAN_RATINGS).optional(),
    mistakes: z.object({
      hifz: z.number().int().min(0).optional(),
      tajweed: z.number().int().min(0).optional(),
      notes: z.string().max(500).optional(),
    }).optional(),
    tafsirCovered: z.object({
      covered: z.boolean().optional(),
      notes: z.string().max(1000).optional(),
    }).optional(),
    teacherNote: z.string().max(1000).optional(),
  }),
});
```

#### `DELETE /api/v1/progress/quran/:id`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `message: result.message`

#### `POST /api/v1/progress/school`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (201):** `message: 'School progress recorded', data: progress`
- **Request validation** (`createSchoolProgressSchema`, Zod; `body`/`params`/`query` as written):
```js
export const createSchoolProgressSchema = z.object({
  body: z.object({
    student: z.string().regex(/^[0-9a-fA-F]{24}$/),
    group: z.string().regex(/^[0-9a-fA-F]{24}$/),
    subject: z.string().regex(/^[0-9a-fA-F]{24}$/),
    term: z.enum(SCHOOL_TERMS).default('term_1'),
    topicsCovered: z.array(z.string().trim()).optional(),
    grades: z.array(
      z.object({
        title: z.string().min(1).max(120),
        score: z.number().min(0),
        maxScore: z.number().min(1),
        date: z.coerce.date().optional(),
      }),
    ).optional(),
    teacherNote: z.string().max(1500).optional(),
  }),
});
```


### assignment  (5 endpoints)

#### `GET /api/v1/assignments/groups/:groupId`
- **Access:** authenticated
- **Response (200):** `data: assignments`

#### `POST /api/v1/assignments`
- **Access:** authenticated · approved-teacher-or-admin
- **Upload (multipart/form-data):** up to 5 files, field name `files`
- **Response (201):** `message: 'Assignment created successfully', data: assignment`
- **Request validation** (`createAssignmentSchema`, Zod; `body`/`params`/`query` as written):
```js
export const createAssignmentSchema = z.object({
  body: z.object({
    group: z.string().regex(/^[0-9a-fA-F]{24}$/),
    title: z.string().min(2).max(150),
    description: z.string().max(3000).optional(),
    type: z.enum(ASSIGNMENT_TYPES).default('homework'),
    dueDate: z.coerce.date(),
    maxScore: z.number().min(1).default(100),
  }),
});
```

#### `POST /api/v1/assignments/:id/submit`
- **Access:** authenticated
- **Upload (multipart/form-data):** up to 5 files, field name `files`
- **Response (201):** `message: 'Assignment submitted successfully', data: submission`

#### `GET /api/v1/assignments/:id/submissions`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `data: submissions`

#### `PATCH /api/v1/assignments/submissions/:id/grade`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `message: 'Submission graded successfully', data: submission`
- **Request validation** (`gradeSubmissionSchema`, Zod; `body`/`params`/`query` as written):
```js
export const gradeSubmissionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    score: z.number().min(0),
    feedback: z.string().max(2000).optional(),
  }),
});
```


### chat  (6 endpoints)

#### `GET /api/v1/chat/groups/:groupId/messages`
- **Access:** authenticated
- **Response (200):** `data: result.data, meta: result.meta`
- **Query params (detected):** `before`, `limit`, `page` (plus `page`, `limit`, `sort` where paginated)

#### `POST /api/v1/chat/groups/:groupId/messages`
- **Access:** authenticated
- **Upload (multipart/form-data):** up to 5 files, field name `attachments`
- **Response (201):** `message: 'Message sent', data: message`

#### `PATCH /api/v1/chat/messages/:id`
- **Access:** authenticated
- **Response (200):** `message: 'Message edited', data: message`

#### `DELETE /api/v1/chat/messages/:id`
- **Access:** authenticated
- **Response (200):** `message: result.message`

#### `POST /api/v1/chat/groups/:groupId/read`
- **Access:** authenticated
- **Response (200):** `message: 'Messages marked as read'`

#### `POST /api/v1/chat/groups/:groupId/mute/:studentId`
- **Access:** authenticated · approved-teacher-or-admin
- **Response (200):** `message: result.message`


### notification  (3 endpoints)

#### `GET /api/v1/notifications`
- **Access:** authenticated
- **Response (200):** `data: result.data, meta: result.meta`
- **Query params (detected):** `isRead`, `limit`, `page` (plus `page`, `limit`, `sort` where paginated)

#### `PATCH /api/v1/notifications/:id/read`
- **Access:** authenticated
- **Response (200):** `message: 'Notification marked as read', data: notification`

#### `PATCH /api/v1/notifications/read-all`
- **Access:** authenticated
- **Response (200):** `message: 'All notifications marked as read'`


### payment  (4 endpoints)

#### `POST /api/v1/payments/webhook`
- **Access:** public
- **Response (200):** `data: result`

#### `POST /api/v1/payments/checkout`
- **Access:** authenticated (any authenticated payer allowed; `studentId` defaults to payer if omitted)
- **Gate & Validation Rules:**
  - Target student must be an existing user with role `student` (otherwise 400 `INVALID_STUDENT`).
  - Group must exist, not deleted, not closed (400 `GROUP_CLOSED`), not full (400 `GROUP_FULL`), and gender segregation must match.
  - Enrollment check: accepts ONLY an existing enrollment in `awaiting_payment` for `(groupId, studentId)`. Otherwise returns 409 `ENROLLMENT_NOT_PAYABLE`. Enrollments are never created inside checkout.
  - When checkout is created for an enrollment, any older `pending` payments for that enrollment are marked `expired`.
  - Provider check: `paymobConfig.isConfigured` requires `apiKey`, `hmacSecret`, `iframeId`, and the integration id for `paymentMethod` (`cardIntegrationId` or `walletIntegrationId`); otherwise returns 503 `PAYMENT_NOT_CONFIGURED`.
- **Response (201):** `message: 'Checkout session created', data: result`
- **Response payload (`data`):**
```json
{
  "paymentId": "67123456789abcdef0123499",
  "paymentToken": "mock_token_67123456789abcdef0123499",
  "checkoutUrl": "https://accept.paymob.com/api/acceptance/iframes/123456?payment_token=...",
  "amount": 450,
  "currency": "EGP",
  "isMock": false
}
```
- **Request validation** (`createCheckoutSchema`, Zod):
```js
export const createCheckoutSchema = z.object({
  body: z.object({
    groupId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid group ID'),
    studentId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).default('card'),
  }),
});
```

#### `GET /api/v1/payments/history`
- **Access:** authenticated
- **Response (200):** `data: result.data, meta: result.meta`
- **Query params (detected):** `limit`, `page`, `status`, `userId` (plus `page`, `limit`, `sort` where paginated)

#### `POST /api/v1/payments/:id/refund`
- **Access:** authenticated · roles: admin
- **Response (200):** `message: 'Payment refunded successfully', data: payment`
- **Request validation** (`refundPaymentSchema`, Zod; `body`/`params`/`query` as written):
```js
export const refundPaymentSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    reason: z.string().min(3).max(500),
  }),
});
```


### payout  (4 endpoints)

#### `GET /api/v1/payouts/teacher/dashboard`
- **Access:** authenticated · roles: teacher
- **Response (200):** `data`

#### `GET /api/v1/payouts/all`
- **Access:** authenticated · roles: admin
- **Response (200):** `data: result.data, meta: result.meta`
- **Query params (detected):** `limit`, `page`, `period`, `status`, `teacherId` (plus `page`, `limit`, `sort` where paginated)

#### `POST /api/v1/payouts/calculate`
- **Access:** authenticated · roles: admin
- **Response (200):** `message: `${payouts.length} teacher payouts calculated for period ${req.body.period || 'last month'}`, data: payouts,`

#### `PATCH /api/v1/payouts/:id/status`
- **Access:** authenticated · roles: admin
- **Response (200):** `message: `Payout marked as ${req.body.status}`, data: payout`
- **Request validation** (`updatePayoutStatusSchema`, Zod; `body`/`params`/`query` as written):
```js
export const updatePayoutStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    status: z.enum(['approved', 'paid']),
    reference: z.string().max(200).optional(),
    notes: z.string().max(1000).optional(),
  }),
});
```


### certificate  (4 endpoints)

#### `GET /api/v1/certificates/verify/:code`
- **Access:** public
- **Response (200):** `data: result`

#### `GET /api/v1/certificates/download/:code`
- **Access:** public

#### `GET /api/v1/certificates/student/:studentId`
- **Access:** authenticated
- **Response (200):** `data: certs`

#### `POST /api/v1/certificates/issue/:studentId`
- **Access:** authenticated · roles: teacher, admin
- **Response (201):** `message: 'Certificate issued successfully', data: cert`


### review  (3 endpoints)

#### `GET /api/v1/reviews/teachers/:teacherId`
- **Access:** public
- **Response (200):** `data: result.data, meta: result.meta`
- **Query params (detected):** `limit`, `page` (plus `page`, `limit`, `sort` where paginated)

#### `POST /api/v1/reviews`
- **Access:** authenticated
- **Response (201):** `message: 'Review submitted successfully', data: review`
- **Request validation** (`createReviewSchema`, Zod; `body`/`params`/`query` as written):
```js
export const createReviewSchema = z.object({
  body: z.object({
    group: z.string().regex(/^[0-9a-fA-F]{24}$/),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
  }),
});
```

#### `PATCH /api/v1/reviews/:id/moderate`
- **Access:** authenticated · roles: admin
- **Response (200):** `message: `Review marked as ${req.body.status}`, data: review`


### report  (3 endpoints)

#### `POST /api/v1/reports`
- **Access:** authenticated
- **Response (201):** `message: 'Report submitted successfully', data: report`
- **Request validation** (`createReportSchema`, Zod; `body`/`params`/`query` as written):
```js
export const createReportSchema = z.object({
  body: z.object({
    targetType: z.enum(REPORT_TARGETS),
    targetId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    reason: z.string().min(3).max(1000),
  }),
});
```

#### `GET /api/v1/reports`
- **Access:** authenticated · roles: admin
- **Response (200):** `data: result.data, meta: result.meta`
- **Query params (detected):** `limit`, `page`, `status`, `targetType` (plus `page`, `limit`, `sort` where paginated)

#### `PATCH /api/v1/reports/:id/resolve`
- **Access:** authenticated · roles: admin
- **Response (200):** `message: 'Report resolved', data: report`
- **Request validation** (`resolveReportSchema`, Zod; `body`/`params`/`query` as written):
```js
export const resolveReportSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    status: z.enum(['resolved', 'dismissed']),
    resolutionNotes: z.string().max(1000).optional(),
  }),
});
```


### settings  (4 endpoints)

#### `GET /api/v1/settings`
- **Access:** authenticated · roles: admin
- **Response (200):** `data: settings`

#### `PATCH /api/v1/settings`
- **Access:** authenticated · roles: admin
- **Response (200):** `message: 'Settings updated successfully', data: settings`
- **Request validation** (`updateSettingsSchema`, Zod; `body`/`params`/`query` as written):
```js
export const updateSettingsSchema = z.object({
  body: z.object({
    platformCommissionPercent: z.number().min(0).max(100).optional(),
    allowMixedGroups: z.boolean().optional(),
    enforceGenderMatch: z.boolean().optional(),
    minAgeForOwnAccount: z.number().min(5).max(21).optional(),
    subscriptionGraceDays: z.number().min(0).max(30).optional(),
    minSessionsBeforeReview: z.number().min(1).max(50).optional(),
    chatEditWindowMinutes: z.number().min(1).max(1440).optional(),
    supportedCurrencies: z.array(z.enum(CURRENCIES)).optional(),
    maintenanceMode: z.boolean().optional(),
  }),
});
```

#### `GET /api/v1/settings/audit-logs`
- **Access:** authenticated · roles: admin
- **Response (200):** `data: result.data, meta: result.meta`
- **Query params (detected):** `action`, `actor`, `entity`, `fromDate`, `limit`, `page`, `toDate` (plus `page`, `limit`, `sort` where paginated)

#### `GET /api/v1/settings/analytics`
- **Access:** authenticated · roles: admin
- **Response (200):** `data: analytics`



### subjects (1 endpoint)

#### `GET /api/v1/subjects`
- **Access:** public (no authentication required)
- **Description:** Returns an array of active academic & Quranic subjects sorted by `order` ascending.
- **Query parameters:**
  - `type` (optional, enum: `quran` | `tajweed_matn` | `school`): filter subjects by type.
- **Response (200):**
  - `status`: "success"
  - `results`: number
  - `data`: array of Subject objects (see Data Models & docs/samples/subjects.json)
- **Sample Response:** See [docs/samples/subjects.json](samples/subjects.json)

## 3b. Auth response shapes (verified from auth.service.js)

- `POST /auth/register` and `POST /auth/login` return `data: { user, tokens: { accessToken, refreshToken, expiresIn } }`.
- `POST /auth/refresh` takes `{ refreshToken }` in the body and returns `data: { accessToken, refreshToken, expiresIn }`. The refresh token is **rotated**: store the new one every time.
- Tokens are returned in the JSON body (no cookies). Store them securely (web: memory/secure storage strategy decided in the front end phase; mobile: secure store).
- `POST /payments/webhook` is called by Paymob only (not by the front end).


## 4. Real-time (Socket.io)

### Connection & Authentication
- **URL:** `ws://<host>:<port>` (or fallback long-polling).
- **Authentication Handshake:** Pass JWT access token via handshake auth `{ auth: { token: "<accessToken>" } }` or Authorization header `Bearer <token>`.
- **User Validation:** Server rejects socket with "User unauthorized or inactive" if token invalid, expired, or user is deleted/inactive.

### Rooms & Auto-Join
On successful handshake, the server automatically places the socket into:
1. **User Personal Room:** `user:<userId>` — used for targeted notifications (e.g. `notification:new`).
2. **Group Rooms:** `group:<groupId>` — automatically joined based on role:
   - **Teachers:** all active groups where `teacher == user._id`.
   - **Students:** all active/paused groups where student has an active/paused `Enrollment`.
   - **Parents:** all active/paused groups where any linked child has an active/paused `Enrollment`.
3. **Session Live Rooms:** `live:<sessionId>` — dynamically joined/left during live sessions via `live:join` and `live:leave`.

### Socket Events Reference

| Event Name | Direction | Payload | Description / Acknowledgment |
|------------|-----------|---------|------------------------------|
| `chat:send` | Client -> Server | `{ groupId, content, replyTo? }` | Sends message to group. Ack: `{ success: true, data: ChatMessage }` or `{ success: false, error }`. Broadcasts `chat:message` to `group:<groupId>`. |
| `chat:typing` | Client -> Server | `{ groupId, isTyping }` | Broadcasts `chat:typing` to other members in `group:<groupId>`. |
| `chat:typing` | Server -> Client | `{ groupId, userId, userName, isTyping }` | Received when someone in the group starts/stops typing. |
| `chat:read` | Client -> Server | `{ groupId }` | Marks unread messages in the group as read for the user. |
| `chat:message` | Server -> Client | `ChatMessage` object | Emitted to `group:<groupId>` when a new message is posted. |
| `live:join` | Client -> Server | `{ sessionId }` | Joins live session room `live:<sessionId>`, records attendance join, increments active attendees count. Ack: `{ success: true }`. |
| `live:leave` | Client -> Server | `{ sessionId }` | Leaves live room, records attendance leave, decrements attendee count. Ack: `{ success: true }`. |
| `presence:update` | Server -> Client | `{ sessionId, userId, name, action: 'joined' | 'left' }` | Broadcast to all attendees in `live:<sessionId>` when a participant joins or leaves. |
| `notification:read` | Client -> Server | `{ notificationId }` | Marks a specific notification as read. Ack: `{ success: true, data: Notification }`. |
| `notification:new` | Server -> Client | `Notification` object | Real-time push notification delivered to `user:<userId>`. |

## 5. Data models (Mongoose schema definitions)

Responses are serialized versions of these models (passwords, token hashes and other sensitive fields are stripped by the backend toJSON transforms). Nested sub-schemas are documented directly under their parent model.

#### Assignment
- **Parent Model:** `src/models/Assignment.js`
```js
{
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, trim: true, maxlength: 3000 },
  type: { type: String, enum: ASSIGNMENT_TYPES, default: 'homework', index: true },
  attachments: { type: [fileSchema], default: [] },
  dueDate: { type: Date, required: true, index: true },
  maxScore: { type: Number, default: 100, min: 1 },
}
```

#### Attendance
- **Parent Model:** `src/models/Attendance.js`
```js
{
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ATTENDANCE_STATUS, default: 'absent', index: true },
  joinedAt: { type: Date },
  leftAt: { type: Date },
  durationMinutes: { type: Number, default: 0 },
  markedAutomatically: { type: Boolean, default: false },
  note: { type: String, trim: true, maxlength: 500 },
}
```

#### AuditLog
- **Parent Model:** `src/models/AuditLog.js`
```js
{
  action: { type: String, enum: Object.values(AUDIT_ACTIONS), required: true, index: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: { type: String },
  userAgent: { type: String },
}
```

#### Certificate
- **Parent Model:** `src/models/Certificate.js`
```js
{
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: CERTIFICATE_TYPES, required: true, index: true },
  title: { type: localizedStringSchema, required: true },
  description: { type: localizedStringSchema },
  metadata: {
    juzNumber: { type: Number, min: 1, max: 30 },
    surahNumber: { type: Number, min: 1, max: 114 },
    surahName: { type: localizedStringSchema },
    grade: { type: String },
  },
  issuedAt: { type: Date, default: Date.now, index: true },
  pdfUrl: { type: String },
  qrCodeUrl: { type: String },
  isRevoked: { type: Boolean, default: false, index: true },
  revokedAt: { type: Date },
  revokedReason: { type: String },
}
```

#### ChatMessage
- **Parent Model:** `src/models/ChatMessage.js`
```js
{
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String, trim: true, maxlength: 2000 },
  type: { type: String, enum: MESSAGE_TYPES, default: 'text' },
  attachments: { type: [fileSchema], default: [] },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
  readBy: [readBySchema],
  deletedAt: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false },
}
```
- **Nested Sub-schemas:**
  - `readBySchema`: `{ user: ObjectId(User), readAt: Date }`

#### Enrollment
- **Parent Model:** `src/models/Enrollment.js`
```js
{
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  status: { type: String, enum: ENROLLMENT_STATUS, default: 'pending', index: true },
  joinedAt: { type: Date, default: Date.now },
  subscription: subscriptionSchema,
  attendanceRate: { type: Number, default: 0, min: 0, max: 100 },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: { type: Date },
  cancelReason: { type: String, trim: true, maxlength: 300 },
}
```
- **Nested Sub-schemas:**
  - `subscriptionSchema`: `{ status: String(SUBSCRIPTION_STATUS), startDate: Date, endDate: Date, graceUntil: Date, autoRenew: Boolean, lastPayment: ObjectId(Payment) }`

#### Group
- **Parent Model:** `src/models/Group.js`
```js
{
  name: { type: String, required: true, trim: true, maxlength: 100 },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  gradeLevel: { type: String, enum: GROUP_LEVELS, required: true, index: true },
  genderType: { type: String, enum: GROUP_GENDER_TYPES, required: true },
  maxStudents: { type: Number, required: true, min: 1, max: 100, default: 20 },
  activeMembersCount: { type: Number, default: 0, min: 0 },
  schedule: [scheduleSchema],
  price: priceSchema,
  status: { type: String, enum: GROUP_STATUS, default: 'open', index: true },
  joinMode: { type: String, enum: JOIN_MODES, default: 'request' },
  joinCode: { type: String, trim: true, uppercase: true, unique: true, sparse: true, index: true },
  academicYear: { type: String },
  term: { type: String, enum: SCHOOL_TERMS, default: 'term_1' },
  deletedAt: { type: Date, default: null, index: true },
}
```
- **Nested Sub-schemas:**
  - `scheduleSchema`: `{ dayOfWeek: Number(0-6), startTime: String(HH:mm), endTime: String(HH:mm), timezone: String }`
  - `priceSchema`: `{ amount: Number, currency: String, billingCycle: String }`

#### Notification
- **Parent Model:** `src/models/Notification.js`
```js
{
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: NOTIFICATION_TYPES, required: true, index: true },
  title: { type: localizedStringSchema, required: true },
  body: { type: localizedStringSchema, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date },
}
```

#### ParentLink
- **Parent Model:** `src/models/ParentLink.js`
```js
{
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending', index: true },
  initiatedBy: { type: String, enum: ['parent', 'student'], required: true },
}
```

#### ParentProfile
- **Parent Model:** `src/models/ParentProfile.js`
```js
{
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  preferredNotificationChannel: { type: String, enum: ['in_app', 'push', 'email', 'sms'], default: 'in_app' },
}
```

#### Payment
- **Parent Model:** `src/models/Payment.js`
```js
{
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  enrollment: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', index: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: CURRENCIES, default: 'EGP' },
  provider: { type: String, enum: PAYMENT_PROVIDERS, default: 'paymob' },
  providerOrderId: { type: String, index: true },
  providerTransactionId: { type: String, index: true },
  method: { type: String, enum: PAYMENT_METHODS, default: 'card' },
  status: { type: String, enum: PAYMENT_STATUS, default: 'pending', index: true },
  needsRefund: { type: Boolean, default: false },
  failedAttempts: { type: Array, default: [] },
  paidAt: { type: Date },
  refundedAt: { type: Date },
  refundAmount: { type: Number },
  meta: { type: mongoose.Schema.Types.Mixed },
}
```

#### Payout
- **Parent Model:** `src/models/Payout.js`
```js
{
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  grossAmount: { type: Number, required: true, min: 0 },
  platformFee: { type: Number, required: true, min: 0 },
  netAmount: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: CURRENCIES, default: 'EGP' },
  status: { type: String, enum: PAYOUT_STATUS, default: 'pending', index: true },
  paidAt: { type: Date },
  breakdown: [
    {
      group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
      studentCount: { type: Number, default: 0 },
      collectedAmount: { type: Number, default: 0 },
      teacherShare: { type: Number, default: 0 },
    },
  ],
}
```

#### QuranProgress
- **Parent Model:** `src/models/QuranProgress.js`
```js
{
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  entryType: { type: String, enum: QURAN_ENTRY_TYPES, required: true, index: true },
  surahNumber: { type: Number, required: true, min: 1, max: 114, index: true },
  surahName: { type: localizedStringSchema, required: true },
  fromAyah: { type: Number, required: true, min: 1 },
  toAyah: { type: Number, required: true, min: 1 },
  ayahsCount: { type: Number, required: true, min: 1 },
  rating: { type: String, enum: QURAN_RATINGS, required: true },
  mistakesCount: { type: Number, default: 0, min: 0 },
  hesitationsCount: { type: Number, default: 0, min: 0 },
  tajweedNotes: { type: String, trim: true, maxlength: 1000 },
  teacherNotes: { type: String, trim: true, maxlength: 1000 },
  audioRecordingUrl: { type: String },
  date: { type: Date, default: Date.now, index: true },
}
```

#### QuranSummary
- **Parent Model:** `src/models/QuranSummary.js`
```js
{
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  totalAyahsMemorized: { type: Number, default: 0 },
  totalSurahsMemorized: { type: Number, default: 0 },
  totalJuzMemorized: { type: Number, default: 0 },
  surahStatuses: [
    {
      surahNumber: { type: Number, min: 1, max: 114 },
      status: { type: String, enum: ['not_started', 'in_progress', 'memorized', 'mastered'], default: 'not_started' },
      memorizedAyahsCount: { type: Number, default: 0 },
      totalAyahs: { type: Number },
      lastReviewedAt: { type: Date },
      rating: { type: String, enum: QURAN_RATINGS },
    },
  ],
  lastActivityDate: { type: Date, default: Date.now },
}
```

#### Report
- **Parent Model:** `src/models/Report.js`
```js
{
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType: { type: String, enum: REPORT_TARGETS, required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: REPORT_STATUS, default: 'open', index: true },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolutionNotes: { type: String, trim: true, maxlength: 1000 },
  resolvedAt: { type: Date },
}
```

#### Review
- **Parent Model:** `src/models/Review.js`
```js
{
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 1000 },
  status: { type: String, enum: REVIEW_STATUS, default: 'visible', index: true },
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  moderationReason: { type: String, trim: true },
}
```

#### Room
- **Parent Model:** `src/models/Room.js`
```js
{
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  channelName: { type: String, required: true, unique: true },
  isLive: { type: Boolean, default: false },
  currentSession: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  maxDurationMinutes: { type: Number, default: 120 },
}
```

#### SchoolProgress
- **Parent Model:** `src/models/SchoolProgress.js`
```js
{
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  lessonTitle: { type: String, required: true, trim: true, maxlength: 150 },
  unit: { type: String, trim: true, maxlength: 100 },
  score: { type: Number, min: 0, max: 100 },
  notes: { type: String, trim: true, maxlength: 1000 },
  date: { type: Date, default: Date.now, index: true },
}
```

#### Session
- **Parent Model:** `src/models/Session.js`
```js
{
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  type: { type: String, enum: SESSION_TYPES, default: 'quran', index: true },
  scheduledStart: { type: Date, required: true, index: true },
  scheduledEnd: { type: Date, required: true, index: true },
  status: { type: String, enum: SESSION_STATUS, default: 'scheduled', index: true },
  live: liveSchema,
  cancellationReason: { type: String, trim: true, maxlength: 500 },
}
```
- **Nested Sub-schemas:**
  - `liveSchema`: `{ channelName: String, token: String, teacherJoined: Boolean, studentJoined: Boolean, activeAttendeesCount: Number }`

#### Settings
- **Parent Model:** `src/models/Settings.js`
```js
{
  platformFeePercent: { type: Number, default: 15, min: 0, max: 100 },
  supportedCurrencies: { type: [String], default: ['EGP', 'USD', 'SAR', 'AED'] },
  gracePeriodDays: { type: Number, default: 3, min: 0 },
  allowMockPayments: { type: Boolean, default: false },
  allowMockLive: { type: Boolean, default: false },
}
```

#### StudentProfile
- **Parent Model:** `src/models/StudentProfile.js`
```js
{
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  grade: { type: String, enum: STUDENT_GRADES, default: 'none' },
  quranLevel: { type: String, enum: STUDENT_QURAN_LEVELS, default: 'beginner' },
  guardianName: { type: String, trim: true, maxlength: 100 },
  guardianPhone: { type: String, trim: true, maxlength: 20 },
}
```

#### Subject
- **Parent Model:** `src/models/Subject.js`
```js
{
  name: { type: localizedStringSchema, required: true },
  type: { type: String, enum: SUBJECT_TYPES, required: true, index: true },
  description: { type: localizedStringSchema },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
}
```

#### Submission
- **Parent Model:** `src/models/Submission.js`
```js
{
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String, trim: true, maxlength: 3000 },
  attachments: { type: [fileSchema], default: [] },
  status: { type: String, enum: SUBMISSION_STATUS, default: 'submitted', index: true },
  submittedAt: { type: Date, default: Date.now },
  grade: { type: Number, min: 0 },
  feedback: { type: String, trim: true, maxlength: 1000 },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gradedAt: { type: Date },
}
```

#### TeacherProfile
- **Parent Model:** `src/models/TeacherProfile.js`
```js
{
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  bio: { type: localizedStringSchema },
  specialties: { type: [String], enum: TEACHER_SPECIALTIES, default: [] },
  certificates: [certificateSchema],
  status: { type: String, enum: TEACHER_STATUS, default: 'pending', index: true },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewsCount: { type: Number, default: 0, min: 0 },
  totalStudents: { type: Number, default: 0, min: 0 },
  hourlyRate: { type: Number, min: 0 },
}
```
- **Nested Sub-schemas:**
  - `certificateSchema`: `{ title: String, file: fileSchema, type: String(CERTIFICATE_FILE_TYPES), verificationStatus: String(CERT_VERIFICATION_STATUS), verifiedAt: Date, rejectionReason: String }`

#### User
- **Parent Model:** `src/models/User.js`
```js
{
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone: { type: String, required: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ROLE_VALUES, required: true, index: true },
  gender: { type: String, enum: GENDERS, required: true },
  dateOfBirth: { type: Date, required: true },
  address: addressSchema,
  avatar: { type: fileSchema },
  language: { type: String, enum: LANGUAGES, default: 'ar' },
  timezone: { type: String, default: 'Africa/Cairo' },
  isActive: { type: Boolean, default: true, index: true },
  isEmailVerified: { type: Boolean, default: false },
  refreshTokens: [refreshTokenSchema],
  deletedAt: { type: Date, default: null, index: true },
}
```
- **Nested Sub-schemas:**
  - `addressSchema`: `{ country: String, city: String, street: String }`
  - `refreshTokenSchema`: `{ tokenHash: String, createdAt: Date, expiresAt: Date }`

#### Shared Sub-schemas
- **Defined in:** `src/models/schemas.js`
```js
localizedStringSchema = {
  ar: { type: String, required: true, trim: true },
  en: { type: String, trim: true },
};

fileSchema = {
  url: { type: String, required: true },
  filename: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now },
};
```

## 6. Captured Sample Payloads (docs/samples/)

Real JSON payloads captured from live API endpoints against the seeded local database:
1. [auth-login.json](samples/auth-login.json)
2. [auth-register.json](samples/auth-register.json)
3. [users-me.json](samples/users-me.json)
4. [teachers-catalogue.json](samples/teachers-catalogue.json)
5. [teachers-profile.json](samples/teachers-profile.json)
6. [groups-list.json](samples/groups-list.json)
7. [groups-detail.json](samples/groups-detail.json)
8. [groups-members.json](samples/groups-members.json)
9. [enrollments.json](samples/enrollments.json)
10. [enrollments-paid-request-pending.json](samples/enrollments-paid-request-pending.json)
11. [enrollments-paid-request-accepted.json](samples/enrollments-paid-request-accepted.json)
12. [groups-members-pending.json](samples/groups-members-pending.json)
13. [sessions-calendar.json](samples/sessions-calendar.json)
14. [progress-quran.json](samples/progress-quran.json)
15. [notifications.json](samples/notifications.json)
16. [payments-checkout.json](samples/payments-checkout.json)
17. [payments-history.json](samples/payments-history.json)
18. [subjects.json](samples/subjects.json)
