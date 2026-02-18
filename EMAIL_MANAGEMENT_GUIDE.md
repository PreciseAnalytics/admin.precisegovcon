# Email Management Page - Quick Guide

**Location:** `/dashboard/emails`
**Access:** Click "Email Management" in the sidebar navigation

---

## 🎯 Overview

The Email Management page provides a centralized location for:
- Monitoring email verification status of all users
- Resending verification emails (individually or in bulk)
- Tracking which users have verified their emails
- Quick access to verification tokens (for debugging)

---

## 📊 Dashboard Stats

Three key statistics displayed at the top:

### Total Users
- Total count of all registered users
- Includes both verified and unverified

### Verified
- Count of users who have verified their email
- Shows percentage of total users
- Example: "42 verified (84% of users)"

### Pending Verification
- Count of users who haven't verified email yet
- These users likely received but didn't click verification link

---

## 🔍 Search & Filter

### Search Bar
- Search by email address, first name, last name, or full name
- Real-time filtering as you type
- Case-insensitive matching

### Filter Dropdown
Three options:
- **All Users** - Show everyone
- **Verified Only** - Show only verified users
- **Unverified Only** - Show only users pending verification

**Tip:** Filter by "Unverified Only" to quickly see who needs a resend

---

## ✅ User List

### Desktop View (Table)
Columns shown:
| Column | Purpose |
|--------|---------|
| ☐ (Checkbox) | Select users for bulk operations |
| Email | User's email address |
| Name | First name, last name, or display name |
| Status | Green "Verified" or Orange "Pending" badge |
| Joined | Date user account was created |
| Token | Show/hide verification token (for debugging) |
| Actions | Resend button (if unverified) |

### Mobile View (Cards)
Each user shown as a card with:
- Email and name
- Status badge
- Join date
- Resend button (if applicable)

---

## 🔄 Resending Verification Emails

### Individual Resend
1. Find the unverified user in the list
2. Click the **Resend** button on the right
3. Verification email is sent immediately
4. Button shows "Sending..." while processing
5. Toast notification confirms success

**Note:** Unverified users show a "Pending" status badge. Verified users show "Verified" and won't have a resend button.

### Bulk Resend
1. Use search/filter to find users you want to resend to
2. Check the checkbox next to each user (or check header to select all visible)
3. A bulk action bar appears showing selected count
4. Click **Send Verification Emails** button
5. Email sent to all selected users
6. Shows count of successful sends

**Tip:** Filter by "Unverified Only" first, then select all to resend to all unverified users.

---

## 🔐 Verification Token

For debugging or troubleshooting:

### Show Token
1. Look at the "Token" column for an unverified user
2. Click the eye icon to toggle visibility
3. Token appears below the icon (32-character hex string)
4. Click again to hide

**Security Note:** Tokens are sensitive. Only share with the specific user via secure channel.

### Token Format
- 64-character hexadecimal string
- Example: `a1b2c3d4e5f6...` (32 bytes encoded as hex)
- Unique per user
- Expires in 7 days

---

## 📧 What Happens When Email is Sent

### Email Template
Users receive an email titled: **"✉️ Verify Your Email - PreciseGovCon"**

Email contains:
- Greeting with first name
- Account details summary
- Large blue "Verify Email Address" button
- Link to verification URL (pre-filled token)
- Expiration warning (7 days)
- Security notice

### Verification Link
Format: `https://yourdomain.com/verify-email?token=XXXXX`
- Pre-filled with user's token
- User just clicks button to verify
- One-time use (token deleted after use)
- Expires in 7 days

### After User Verifies
1. User's status changes from "Pending" to "Verified"
2. Account becomes fully active
3. User can now log in
4. Email badge changes to green

---

## 💡 Common Tasks

### "I need to verify all pending users"
1. Filter by "Unverified Only"
2. Click the header checkbox to select all visible
3. Click "Send Verification Emails"
4. Wait for success notification

### "A user says they didn't get the email"
1. Search for their email address
2. If status is "Pending", click **Resend**
3. Ask them to check spam folder
4. Can also show them the token to manually construct URL

### "I want to see a specific user's token"
1. Search for their email
2. Look for eye icon in Token column
3. Click to reveal (or click again to hide)
4. Note: Only visible for unverified users

### "It's been 7 days, email expired"
1. User needs to sign up again OR
2. You can resend from this page
3. New token is generated with 7-day expiration

---

## 🚨 Important Notes

### Unverified Users
- Cannot log in until they verify email
- Account exists but is inactive
- Email can be resent unlimited times
- Verification link expires after 7 days

### Verified Users
- Have "Verified" badge
- Can log in immediately
- No resend button (not needed)
- Email status is permanent

### Email Service
- Currently in test/mock mode
- Production needs: SendGrid, AWS SES, Resend, or similar
- Check server logs to see mock email output

### Bulk Operations Limits
- Can select multiple users
- System processes all at once
- Returns count of successful sends
- Individual failures logged but doesn't break bulk operation

---

## 🎓 Tips & Tricks

✅ **Keyboard Friendly**: Use Tab to navigate, Space to select checkboxes

✅ **Mobile Optimized**: Page works great on phones, swipe to see actions

✅ **Responsive Design**: Table on desktop, cards on mobile

✅ **Fast Searching**: Start typing email to quickly find users

✅ **Clear Indicators**: Green = verified, Orange = pending

---

## 📞 Troubleshooting

| Issue | Solution |
|-------|----------|
| Email not received | Click Resend, check spam folder |
| Token not visible | Only shown for unverified users |
| Link expired (>7 days) | Resend from this page to get new token |
| Bulk send failed | Check individual users, try again |
| User shows as verified but can't login | Check if account is active (different system) |

---

**Last Updated:** February 18, 2026
**Version:** 1.0 - Email Management System
