# Field Tech Mobile Interface Design

**Date:** 2026-03-09
**Author:** LawnCare Pro Team
**Status:** Design Approved
**Approach:** Single Frappe Page (Vue.js + Tailwind)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Model Changes](#2-data-model-changes)
3. [Mobile UI Design](#3-mobile-ui-design)
4. [Offline Sync & IndexedDB Strategy](#4-offline-sync--indexeddb-strategy)
5. [Photo Upload Flow](#5-photo-upload-flow)
6. [Backend API Endpoints](#6-backend-api-endpoints)
7. [SMS Notification Logic](#7-sms-notification-logic)
8. [Security & Permissions](#8-security--permissions)
9. [Testing Strategy](#9-testing-strategy)

---

## 1. Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Field Tech Dashboard                         │
│                   (Single Frappe Page)                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Offline Indicator (Fixed Top Banner)                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Job List (Vue.js Component)                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Job Card (Vue.js Component, Repeated)                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Photo Modal (Vue.js Component, Conditional)              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Sync Now Button (Fixed Bottom)                            │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    IndexedDB (Client-Side)                        │
│  - Job Queue (Check-in, Complete, Photos)                      │
│  - Photo Blob Storage (compressed, until sync)                  │
│  - Max: 50 photos or 100MB                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Frappe Server API (Python Backend)                 │
│  - GET /api/method/get_todays_jobs                             │
│  - POST /api/method/checkin_job                                │
│  - POST /api/method/complete_job                               │
│  - POST /api/method/upload_photos                              │
│  - Job Schedule hooks (status → invoice → SMS)                  │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend:** Vue.js 3 (Composition API), Tailwind CSS
- **Storage:** IndexedDB (via IDB library)
- **API:** Frappe REST API (frappe.call)
- **Compression:** Canvas API (client-side)
- **Frappe Version:** v15 compatible

### Key Design Principles

1. **Offline-First:** All actions work offline; sync happens automatically
2. **Mobile-First:** 48px touch targets, large buttons, vertical scroll only
3. **Progressive Enhancement:** Core features work without JavaScript
4. **Simple State Management:** Vue.js reactive state, no Vuex needed

---

## 2. Data Model Changes

### DocTypes to Create

#### 1. Crew DocType (New)

```
Fields:
- crew_name (Data, Title)
- crew_leader (Link: User, optional)
- is_active (Check, default=Checked)

Child Table: Crew Members
- user (Link: User)
- role_in_crew (Data, optional)
- is_leader (Check)
```

**Permissions:**
- Role: "LawnCare Pro User" → Read, Write, Create, Delete

### DocTypes to Modify

#### 2. User DocType Modifications

Via Customize Form (or custom field):
```
Add to User:
- default_crew (Link: Crew, optional)
```

#### 3. Job Schedule DocType Modifications

Update `assigned_crew` field:
```
Change from: Data field
Change to: Link: Crew (instead of free text)
```

#### 4. Customer DocType Modifications

Via Customize Form (or custom field):
```
Add to Customer:
- send_sms_notifications (Check, default=Checked)
```

### DocTypes to Enhance

#### 5. Field Check-in DocType Modifications

Current fields (keep all):
```
- job_schedule (Link: Job Schedule, required)
- check_in_time (Datetime)
- check_out_time (Datetime)
- photos (Attach Image) → Change to support multiple
- notes (Text)
```

**Modification:**
- Change `photos` from single `Attach Image` to JSON field storing array of file URLs

**New Field:**
```
- checkin_status (Select: "Pending", "Completed")
```

---

## 3. Mobile UI Design

### File Structure

```
lawn_care_pro/page/field_tech_dashboard/
├── field_tech_dashboard.html       # Page template (Vue app mount)
├── field_tech_dashboard.js         # Vue.js components + logic
└── field_tech_dashboard.css        # Tailwind CSS overrides
```

### Page Layout

```html
<div id="app" class="min-h-screen bg-gray-50">
  <!-- Offline Indicator (Fixed) -->
  <div v-if="!isOnline" class="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 z-50">
    ⚠️ Offline - Changes will sync when connected
  </div>

  <!-- Header -->
  <header class="bg-white shadow-sm pt-6 pb-4 px-4">
    <h1 class="text-xl font-bold text-gray-900">Today's Jobs</h1>
    <p class="text-sm text-gray-600">{{ currentDate }}</p>
  </header>

  <!-- Job List -->
  <div class="px-4 py-4 space-y-4 pb-24">
    <job-card v-for="job in jobs" :key="job.name" :job="job"
      @check-in="handleCheckIn"
      @complete="handleComplete"
      @upload-photos="showPhotoModal = true; currentJob = job"
    />
  </div>

  <!-- Sync Button (Fixed Bottom) -->
  <div class="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
    <button @click="syncNow" :disabled="syncing"
      class="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">
      {{ syncing ? 'Syncing...' : 'Sync Now' }}
      <span v-if="pendingQueue.length > 0" class="ml-2 bg-red-500 text-xs px-2 py-1 rounded">
        {{ pendingQueue.length }} pending
      </span>
    </button>
  </div>

  <!-- Photo Modal -->
  <photo-modal v-if="showPhotoModal" :job="currentJob"
    @close="showPhotoModal = false"
    @upload="handlePhotoUpload"
  />
</div>
```

### Job Card Component

**Visual Layout:**
```
┌─────────────────────────────────────────────┐
│ Stop #3  🟢 Synced                          │
├─────────────────────────────────────────────┤
│                                             │
│ 123 Main Street                             │
│ John Doe                                    │
│                                             │
│ 🕐 8:00 AM - 10:00 AM                      │
│                                             │
│ 🔓 Gate Code: ABCD                         │
│ 🐕 Dog in backyard                         │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│ [  Check In   ]  [ Mark Complete  ]         │
│                                             │
└─────────────────────────────────────────────┘
```

### State-Based Rendering

```javascript
// Before Check-In
show: ['checkIn']
hide: ['uploadPhotos', 'complete']

// After Check-In, Before Complete
show: ['uploadPhotos', 'complete']
hide: ['checkIn']

// After Complete
show: ['viewInvoice']
hide: ['checkIn', 'uploadPhotos', 'complete']
```

### Vue.js State Management

**App State:**
```javascript
const state = reactive({
  isOnline: true,
  loading: false,
  jobs: [],
  pendingQueue: [],
  syncing: false,
  showPhotoModal: false,
  currentJob: null
})
```

---

## 4. Offline Sync & IndexedDB Strategy

### IndexedDB Schema

**Database Name:** `lawncare_offline`

**Stores:**
```javascript
// 1. Action Queue
{
  name: 'actions',
  keyPath: 'id',
  indexes: [
    { name: 'jobId', keyPath: 'jobId' },
    { name: 'actionType', keyPath: 'actionType' },
    { name: 'timestamp', keyPath: 'timestamp' }
  ]
}

// 2. Photo Blobs
{
  name: 'photos',
  keyPath: 'id',
  indexes: [{ name: 'actionId', keyPath: 'actionId' }]
}

// 3. Job Cache
{
  name: 'jobs',
  keyPath: 'name',
  indexes: [{ name: 'fetchedAt', keyPath: 'fetchedAt' }]
}
```

**Storage Limits:**
- Max 50 photos in queue
- Max 100MB total storage

### Sync Flow

**Auto-Sync (on Online Event):**
```javascript
window.addEventListener('online', () => {
  isOnline.value = true
  syncQueue()
})

window.addEventListener('offline', () => {
  isOnline.value = false
})
```

### Conflict Resolution

**Strategy: Last Write Wins**
- Server always trusts client timestamps
- Simple for this use case (technicians are the only ones changing job status)

### Sync Status UI

**Per-Action Status:**
```javascript
const statusIcons = {
  pending: '🟡',
  syncing: '🔄',
  synced: '🟢',
  failed: '🔴'
}
```

---

## 5. Photo Upload Flow

### Client-Side Compression

**Canvas API Compression Specs:**
- Max resolution: 1920x1080 (1080p)
- Quality: 80% JPEG
- Thumbnail: 200x200, 60% JPEG
- Strip EXIF: Canvas API automatically strips EXIF data
- Output format: JPEG

### Storage in IndexedDB

**Photo Object:**
```javascript
{
  id: 'photo-uuid-v4',
  actionId: 'action-uuid-v4',
  blob: Blob (compressed, max 2MB),
  thumbnail: Blob (compressed, ~10KB),
  originalName: 'IMG_20240325_081500.jpg',
  compressedSize: 1500000, // bytes
  uploadStatus: 'pending',
  retryCount: 0,
  timestamp: 1679768400000
}
```

### Photo Upload API

**Server Endpoint:** Frappe's `frappe.upload.upload_file` (existing)

```javascript
await frappe.call({
  method: 'frappe.upload.upload_file',
  args: {
    file: photo.blob,
    doctype: 'Field Check-in',
    docname: fieldCheckinName,
    fieldname: 'photos',
    is_private: 1
  }
})
```

---

## 6. Backend API Endpoints

### API File Structure

```
lawn_care_pro/page/field_tech_dashboard/api/
├── __init__.py
└── field_tech_dashboard.py   # Whitelisted API methods
```

### Endpoints

1. **GET /api/method/get_todays_jobs**
   - Return today's jobs for user's crew, ordered by route_order
   - Include property details, check-in status, photo count

2. **POST /api/method/checkin_job**
   - Create Field Check-in record with current timestamp
   - Validate not already checked in

3. **POST /api/method/complete_job**
   - Update Field Check-in with check-out time
   - Update Job Schedule status to "Completed"
   - Triggers invoice creation and SMS notification

4. **POST /api/method/upload_photos**
   - Handled by Frappe's built-in file upload

### API Permissions

**Role-Based Access:**
- All endpoints require: "LawnCare Pro Field Tech" role
- User can only access their crew's jobs (filtered by `default_crew`)
- User can only modify their own check-ins

---

## 7. SMS Notification Logic

### SMS Trigger Point

**Location:** New hook in `Job Schedule.before_save()`

**When to Send:** When status changes to "Completed"

### SMS Function (Stub Implementation)

**Creates Communication DocType:**
```python
communication = frappe.new_doc("Communication")
communication.communication_medium = "SMS"
communication.communication_type = "Outbound"
communication.status = "Not Sent (Stub)"
communication.content = message
communication.reference_doctype = "Customer"
communication.reference_name = customer
communication.insert()
```

### Future Twilio Integration

**Isolated Function:**
```python
def _send_sms_via_twilio(phone: str, message: str) -> bool:
    """Send SMS via Twilio API. Currently returns False (stub)."""
    return False  # Replace with actual Twilio call
```

### SMS Message Template

```
Hi {customer_name}, your lawn service at {property_address} is complete. View invoice: {invoice_url}
```

---

## 8. Security & Permissions

### Role-Based Access Control

**New Role:**
```
LawnCare Pro Field Tech
- Desk Access: Enabled
- Permissions: Read-only for most DocTypes, Write for Field Check-in and Job Schedule
```

### User-Crew Access Control

**Principle:** Technicians can only access their crew's jobs

**Server-Side Filter:**
```python
user = frappe.get_doc("User", frappe.session.user)
crew = user.default_crew

if crew:
    jobs = [j for j in jobs if j.assigned_crew == crew]
```

### Photo Access Control

**Principle:** Photos are private - only customer and staff can access

**Frappe File API:**
- `is_private: 1` (private file)
- Only users with access to the document can view

### Data Privacy

- Mobile numbers only used for SMS (never displayed to techs)
- Property address displayed to techs (necessary for navigation)
- EXIF data stripped from photos (location, device info)

---

## 9. Testing Strategy

### Unit Tests (Python)

```
lawn_care_pro/tests/
├── test_crew.py              # Crew DocType tests
├── test_field_tech_api.py     # Field Tech Dashboard API tests
└── test_sms_notification.py   # SMS notification tests
```

### Integration Tests (JavaScript)

```
lawn_care_pro/tests/js/
├── test_offline_sync.js      # IndexedDB sync logic tests
├── test_photo_compression.js # Photo compression tests
└── test_api_client.js        # API client tests
```

### Manual Testing Checklist

See [Owner Instructions](#owner-instructions) below for step-by-step testing guide.

### Performance Testing

**Mobile Performance Targets:**
- Page load time: < 2 seconds
- Photo compression: < 1 second per photo
- Sync queue (10 actions): < 5 seconds
- IndexedDB operations: < 100ms

---

## Owner Instructions

### How to Assign "Field Tech" Role and Test Page

#### Step 1: Create Crew DocType
1. Navigate to DocType List
2. Create new DocType: "Crew"
3. Add fields and permissions as per [Section 2](#2-data-model-changes)
4. Save and install

#### Step 2: Add default_crew to User
1. Navigate to User List
2. Select test user
3. Click "Customize Form"
4. Add custom field: `default_crew` (Link: Crew)

#### Step 3: Create Field Tech Role
1. Navigate to Role List
2. Create: "LawnCare Pro Field Tech"
3. Enable Desk Access
4. Save

#### Step 4: Assign Field Tech Role to User
1. Navigate to User List
2. Select test user
3. Add "LawnCare Pro Field Tech" role

#### Step 5: Create Crew and Assign Members
1. Navigate to Crew List
2. Create Crew with leader and members
3. Save

#### Step 6: Assign Crew to Job Schedules
1. Navigate to Job Schedule List
2. Filter by today's date
3. Edit jobs and assign crew to `assigned_crew` field

#### Step 7: Test Field Tech Dashboard
1. Logout as admin
2. Login as field tech user
3. Navigate to: `/app/field_tech_dashboard`
4. Verify all features work correctly

#### Step 8: Test Offline Sync
1. Disable network
2. Check in, complete jobs, upload photos
3. Enable network
4. Sync and verify

#### Step 9: Test SMS Notification
1. Complete a job
2. Check Customer Timeline
3. Verify Communication stub created

---

## Implementation Checklist

### Phase 1: Data Model
- [ ] Create Crew DocType
- [ ] Modify User DocType (default_crew)
- [ ] Modify Job Schedule DocType (assigned_crew)
- [ ] Modify Customer DocType (send_sms_notifications)
- [ ] Modify Field Check-in DocType (photos JSON, checkin_status)

### Phase 2: Backend API
- [ ] Create field_tech_dashboard page directory
- [ ] Implement get_todays_jobs API
- [ ] Implement checkin_job API
- [ ] Implement complete_job API
- [ ] Add SMS notification to Job Schedule.before_save()

### Phase 3: Frontend UI
- [ ] Create field_tech_dashboard.html
- [ ] Implement field_tech_dashboard.js (Vue.js app)
- [ ] Create field_tech_dashboard.css (Tailwind)
- [ ] Implement Job Card component
- [ ] Implement Photo Modal component
- [ ] Implement offline indicator

### Phase 4: Offline Sync
- [ ] Initialize IndexedDB
- [ ] Implement action queue
- [ ] Implement photo blob storage
- [ ] Implement sync queue logic
- [ ] Implement retry mechanism (3 attempts)

### Phase 5: Photo Upload
- [ ] Implement photo compression (Canvas API)
- [ ] Implement photo gallery UI
- [ ] Implement upload to Frappe File API
- [ ] Implement upload status indicators

### Phase 6: Testing
- [ ] Write unit tests (Python)
- [ ] Write integration tests (JavaScript)
- [ ] Manual testing checklist
- [ ] Performance testing

---

## Next Steps

1. ✅ Design approved
2. ⏳ Create implementation plan (via writing-plans skill)
3. ⏳ Execute implementation
4. ⏳ Testing and validation
5. ⏳ Deployment

---

**Document Version:** 1.0
**Last Updated:** 2026-03-09
**Status:** Ready for Implementation Planning
