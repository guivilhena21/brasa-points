# QR Check-In System Implementation Guide

## Overview
The BRASA Points app now has a complete QR-based check-in system that replaces manual code entry with secure QR scanning.

---

## 1. Database Setup (Required First Step)

Run the SQL migration in your Supabase dashboard:

1. Go to **Supabase Console** → Your Project → **SQL Editor**
2. Copy the contents of [`supabase/qr-schema-update.sql`](supabase/qr-schema-update.sql)
3. Run the SQL to add:
   - `qr_token` column to `checkin_codes` table
   - `process_qr_checkin()` RPC function
   - `generate_qr_token()` helper function

This is **critical** for the QR system to work.

---

## 2. Admin Side: Generate QR Codes

### Location
- Admin screen → **Codes Tab**

### How it works
1. Admin clicks **"📱 Generate QR"** on any upcoming event
2. App calls database to generate a unique QR token
3. QR code displays on screen
4. Admin shares the QR with attendees (display it on projector, print it, etc.)
5. QR code expires after the set duration (default: 20 minutes)

### Features
- **One-time use**: Each QR token can only be scanned once per user
- **Expiring tokens**: Automatically invalidate after duration
- **Visual display**: Large QR code displayed on admin screen
- **Fallback**: Shows token prefix for manual entry (if QR scanner fails)

---

## 3. Member Side: Scan to Check In

### Location
- Events screen → tap any event → **"📱 Scan QR Code"** button

### How it works
1. Member opens an event
2. Member taps **"📱 Scan QR Code"** button
3. Browser requests camera permission
4. Member points camera at the QR code
5. Scanner reads the token automatically
6. App sends token to backend
7. Backend validates and awards points atomically
8. Success screen shows points earned

### Features
- **Live scanning**: Continuous camera feed with auto-detection
- **One-time per event**: Cannot double-check-in
- **Instant feedback**: Success or error message
- **Error recovery**: Can retry if QR is invalid/expired

---

## 4. Security Features

### Server-Side Validation
Every check-in is validated by the database:
- Token must exist and match an event
- Token must not be expired
- User cannot check in twice to same event
- Points are awarded atomically

### Protection Against
- Manual points inflation (only database can award points)
- Token reuse (one-time per user/event)
- Replay attacks (token tied to event ID)
- Expiry bypass (checked server-side)

---

## 5. Technical Details

### Frontend Libraries
- **qrcode.react**: Generates QR code images
- **html5-qrcode**: Scans QR codes using browser camera

### Database Functions
- `generate_qr_token()`: Creates unique 32-character tokens
- `process_qr_checkin()`: Validates and processes check-in atomically

### Files Changed
- [`src/screens/EventsScreen.jsx`](src/screens/EventsScreen.jsx) — Member scanning UI
- [`src/screens/AdminScreen.jsx`](src/screens/AdminScreen.jsx) — Admin QR generation
- [`supabase/qr-schema-update.sql`](supabase/qr-schema-update.sql) — Database schema

---

## 6. Testing the System

### Prerequisites
- Development bypass enabled (browser console):
  ```js
  localStorage.setItem('dev-bypass', 'true')
  location.reload()
  ```

### Test Flow
1. Go to Admin → Codes tab
2. Create an event (if needed)
3. Click **"📱 Generate QR"**
4. Copy the QR code to your phone or use a QR code generator to test
5. Go to Events screen
6. Click on the event
7. Tap **"📱 Scan QR Code"**
8. Scan the code with your phone/camera
9. Verify success message

---

## 7. Production Deployment Checklist

- [ ] SQL migration applied to Supabase
- [ ] Test QR generation in admin screen
- [ ] Test QR scanning on mobile device
- [ ] Verify points are awarded correctly
- [ ] Test error cases (expired QR, duplicate scan, invalid QR)
- [ ] Remove dev bypass code before release
- [ ] Update documentation for admins/members

---

## 8. Fallback: Manual Entry (Optional)

If QR scanning fails, members can still check in by entering the token manually:
1. Admin displays QR code (shows fallback token prefix)
2. Member enters token manually if camera unavailable
3. Backend processes the same token

---

## Notes

- QR tokens are 32 characters (alphanumeric)
- Tokens are unique across all events
- Expires after admin-set duration (1-120 minutes)
- Each event can have multiple active QR codes (regenerate anytime)
- Old/expired tokens don't allow new check-ins

---

## Support

If QR scanning doesn't work:
1. Check browser has camera permission
2. Verify QR code is not expired
3. Ensure Supabase SQL migration was applied
4. Check browser console for errors
5. Try manual token entry as fallback
