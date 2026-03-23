# Authentication & Onboarding Setup Guide

## Overview

The CRM Agent now includes a complete authentication system with user registration, login, and onboarding flow.

## Architecture

### Backend Auth Stack
- **Password Hashing**: PBKDF2 with SHA-256 (100K iterations)
- **Tokens**: JWT (HS256) with 24-hour expiry
- **Database**: PostgreSQL with `users` table
- **Routes**: `/api/auth/*`

### Frontend Auth Stack
- **State Management**: React Context (AuthContext)
- **Storage**: LocalStorage for JWT tokens
- **Protected Routes**: ProtectedRoute component
- **Components**: Login, Register, Onboarding

## Database Schema

### users Table
```sql
CREATE TABLE users (
  userid UUID PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,  -- PBKDF2 hash
  org_name VARCHAR(255),
  email VARCHAR(255),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  has_connected_crm BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

## Environment Variables

Add these to your `.env.local` files:

### Backend (.env.local)
```bash
# Authentication
JWT_SECRET=generate_with_node_-e_console.log_require_crypto_randomBytes_32_toString_hex

# Database URL (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/crm_agent_db

# Token Encryption
TOKEN_ENCRYPTION_KEY=generate_with_node_-e_console.log_require_crypto_randomBytes_32_toString_hex
```

### Frontend (.env.local)
```bash
# Optional: Override backend URL if not http://localhost:3001
VITE_BACKEND_URL=http://localhost:3001
```

## API Endpoints

### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "org_name": "Acme Corp" (optional)
}

Response:
{
  "user": { userid, username, email, org_name, ... },
  "token": "JWT_TOKEN"
}
```

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "securePassword123"
}

Response:
{
  "user": { ... },
  "token": "JWT_TOKEN"
}
```

### Get Current User (Protected)
```
GET /api/auth/me
Authorization: Bearer JWT_TOKEN

Response:
{
  "user": { userid, username, email, org_name, ... }
}
```

### Update Profile (Protected)
```
PUT /api/auth/profile
Authorization: Bearer JWT_TOKEN
Content-Type: application/json

{
  "org_name": "New Company Name",
  "email": "newemail@example.com"
}

Response:
{
  "user": { ... }
}
```

### Logout
```
POST /api/auth/logout

Response:
{
  "message": "Logout successful. Please delete your token on the client side."
}
```

## Flow

### 1. Registration
- User fills out `/register` form
- Backend creates user and hashes password
- JWT token returned and stored in localStorage
- User redirected to `/onboarding`

### 2. Onboarding
- Step 1: User clicks "Connect Your CRM"
- Merge Link widget opens for HubSpot/CRM auth
- Token exchanged and stored in DB (encrypted)
- Step 2: Success confirmation
- User can proceed to `/hubspot-dashboard`

### 3. Login
- User enters credentials on `/login` page
- JWT returned and stored in localStorage
- User redirected to dashboard
- If first time with CRM: redirect to `/onboarding`

### 4. Protected Routes
- All routes except `/login` and `/register` require authentication
- Token automatically included in all API requests via interceptor
- Invalid/expired tokens redirect to `/login`

## Security Features

### Password Security
- PBKDF2 with 100K iterations
- Random salt per password
- Never log passwords
- Minimum 6 characters required on frontend

### Token Security
- JWT with HS256 signature
- 24-hour expiry
- Stored in localStorage (XSS vulnerable, but acceptable for this use case)
- Include Authorization header in all requests

### CRM Token Encryption
- AES-256-GCM encryption for Merge API tokens
- Encrypted stored in DB
- Decrypted on-the-fly for API calls
- Key versioning support for rotation

## Testing

### Register Flow
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "org_name": "Test Org"
  }'
```

### Login Flow
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### Get User (with token)
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Frontend Usage

### Using Auth Context
```tsx
import { useAuth } from "@/context/AuthContext";

function MyComponent() {
  const { user, token, login, register, logout, isAuthenticated } = useAuth();

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome {user?.username}!</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <p>Please login</p>
      )}
    </div>
  );
}
```

## Migration Steps for Existing Database

1. Run the initial migration (001_init_token_store.sql)
2. Run the auth migration (002_add_auth_fields_to_users.sql)
3. Default values are set for backward compatibility

## Next Steps

- [ ] Implement email verification
- [ ] Add password reset functionality
- [ ] Implement refresh token rotation
- [ ] Add 2FA (optional)
- [ ] Build admin user management dashboard
- [ ] Implement audit logging for auth events
