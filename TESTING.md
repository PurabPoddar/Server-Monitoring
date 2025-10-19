# 🧪 Testing Guide - Server Monitoring Portal

## Quick Test - Login Feature

### 1. Start the Backend (Terminal 1)

```bash
cd /Users/stalin/Workspace/Server-Monitoring
source venv/bin/activate
python run_backend.py
```

Backend will start on: `http://localhost:5001`

You should see:
```
 * Running on http://0.0.0.0:5001
 * Debug mode: on
```

### 2. Start the Frontend (Terminal 2)

```bash
cd /Users/stalin/Workspace/Server-Monitoring/frontend
npm run dev
```

Frontend will start on: `http://localhost:5173`

### 3. Test Login

#### Option A: Use the Browser
1. Open: `http://localhost:5173/login`
2. Enter credentials:
   - **Username**: `admin`
   - **Password**: `admin123`
3. Click **Sign In**
4. You should be redirected to the dashboard
5. Check the navbar - you'll see:
   - Your username: "admin"
   - Role badge: "admin"
   - Avatar with "A"
6. Click the avatar to see the profile menu

#### Option B: Test API Directly

```bash
# Test login API
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**Expected Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGci...",
  "user": {
    "email": "admin@servermonitor.com",
    "id": 1,
    "role": "admin",
    "username": "admin"
  }
}
```

### 4. Test Protected Routes

After login, try accessing:
- **Dashboard**: `http://localhost:5173/dashboard`
- **Servers**: `http://localhost:5173/servers`
- **Metrics**: `http://localhost:5173/metrics`
- **Reports**: `http://localhost:5173/reports`

All should work when logged in.

### 5. Test Logout

1. Click on your avatar in the navbar
2. Select **Logout** from the dropdown
3. You should be redirected to `/login`
4. Try accessing `/dashboard` - you should be redirected back to login

## Demo Users

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| user | user123 | user |

## Testing Profile Menu

When logged in:

1. **Avatar Display**:
   - First letter of username in circle
   - Colored background (primary theme)

2. **User Info in Navbar**:
   - Username displayed
   - Role badge (chip)
   - Hidden on mobile screens

3. **Dropdown Menu**:
   - User info header (username, email, role)
   - My Profile option
   - Settings option
   - Logout button (red)

## Common Issues

### Issue: "FormEvent import error"
**Solution**: ✅ Fixed! Changed to `React.FormEvent<HTMLFormElement>`

### Issue: Backend not responding
**Solution**: 
- Check if port 5001 is free: `lsof -i :5001`
- macOS uses port 5000, so we use 5001
- Kill any conflicting process: `kill -9 <PID>`

### Issue: CORS errors
**Solution**: Backend has CORS enabled. Check browser console for specific errors.

### Issue: Login not working
**Checklist**:
- ✅ Backend running on port 5001
- ✅ Frontend running on port 5173
- ✅ PyJWT installed: `pip install PyJWT==2.8.0`
- ✅ Check browser Network tab for API calls
- ✅ Verify credentials: admin/admin123

## API Endpoints to Test

### Authentication
```bash
# Login
POST http://localhost:5001/api/auth/login
Body: {"username": "admin", "password": "admin123"}

# Verify Token
GET http://localhost:5001/api/auth/verify
Headers: Authorization: Bearer <token>

# Logout
POST http://localhost:5001/api/auth/logout
```

### Servers
```bash
# List all servers
GET http://localhost:5001/api/servers

# Get server metrics (with mock data)
GET http://localhost:5001/api/servers/1/metrics?mock=true

# Add new server
POST http://localhost:5001/api/servers
Body: {
  "name": "Test Server",
  "hostname": "test-server-01",
  "ip": "192.168.1.100",
  "os_type": "linux",
  "username": "ubuntu"
}
```

## Testing Flow

1. ✅ **Backend starts** → Port 5001
2. ✅ **Frontend starts** → Port 5173
3. ✅ **Visit /login** → See login page
4. ✅ **Enter admin/admin123** → Click Sign In
5. ✅ **API call to /api/auth/login** → Returns token
6. ✅ **Token stored** in localStorage
7. ✅ **Redirect to /dashboard** → See dashboard
8. ✅ **Navbar shows profile** → Avatar, username, role
9. ✅ **Click avatar** → Dropdown menu appears
10. ✅ **Click Logout** → Redirect to /login

## Success Indicators

- ✅ Backend running without errors
- ✅ Frontend compiling without errors
- ✅ Login page loads with beautiful gradient
- ✅ Login with demo credentials works
- ✅ JWT token received and stored
- ✅ Profile menu shows in navbar
- ✅ Protected routes accessible after login
- ✅ Logout clears token and redirects

## Next Steps

After successful testing:
1. Add real server SSH connections
2. Implement actual metrics collection
3. Add user management UI
4. Deploy to production hosting
5. Set up HTTPS/SSL
6. Configure production database (PostgreSQL)

---

**Last Updated**: October 19, 2025
**Status**: ✅ All core features working
**Backend**: http://localhost:5001
**Frontend**: http://localhost:5173

