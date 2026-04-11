# User API Documentation

## Overview
The User API provides endpoints for managing user information, retrieving current user details, and accessing subordinate data.

**Base URL:** `http://localhost:8080/api/v1/users`

**Authentication:** Required (Bearer Token)

---

## Endpoints

### 1. Get Current User

Retrieve the currently authenticated user's information.

**Endpoint:** `GET /api/v1/users/me`

**Headers:**
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer <access_token> |

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "id": "long",
    "username": "string",
    "email": "string",
    "role": "string",
    "managerId": "long",
    "createdAt": "datetime",
    "updatedAt": "datetime"
  }
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | long | User's unique identifier |
| username | string | User's username |
| email | string | User's email address |
| role | string | User's role (e.g., ADMIN, MANAGER, USER) |
| managerId | long | ID of the user's manager (null if no manager) |
| createdAt | datetime | Timestamp when the user was created |
| updatedAt | datetime | Timestamp when the user was last updated |

**Example Request:**
```bash
curl -X GET http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer your-access-token-here"
```

---

### 2. Get User by ID

Retrieve a specific user's information by their ID.

**Endpoint:** `GET /api/v1/users/{id}`

**Headers:**
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer <access_token> |

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | long | User's unique identifier |

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "id": "long",
    "username": "string",
    "email": "string",
    "role": "string",
    "managerId": "long",
    "createdAt": "datetime",
    "updatedAt": "datetime"
  }
}
```

**Example Request:**
```bash
curl -X GET http://localhost:8080/api/v1/users/1 \
  -H "Authorization: Bearer your-access-token-here"
```

---

### 3. Get Subordinates

Retrieve list of subordinates for the current user. Only accessible by users with MANAGER or ADMIN role.

**Endpoint:** `GET /api/v1/users/subordinates`

**Headers:**
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer <access_token> |

**Authorization:** Requires role `MANAGER` or `ADMIN`

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "Success",
  "data": [
    {
      "id": "long",
      "username": "string",
      "email": "string",
      "role": "string",
      "managerId": "long",
      "createdAt": "datetime",
      "updatedAt": "datetime"
    },
    {
      "id": "long",
      "username": "string",
      "email": "string",
      "role": "string",
      "managerId": "long",
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
  ]
}
```

**Example Request:**
```bash
curl -X GET http://localhost:8080/api/v1/users/subordinates \
  -H "Authorization: Bearer your-access-token-here"
```

---

## Error Responses

| Status Code | Description |
|-------------|-------------|
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - User doesn't have required role |
| 404 | Not Found - User not found |
| 500 | Internal Server Error |

**Error Response Format:**
```json
{
  "status": 401,
  "message": "Error message description",
  "data": null
}
```

---

## User Roles

| Role | Description |
|------|-------------|
| ADMIN | Full system access |
| MANAGER | Can manage subordinates |
| USER | Standard user access |

---

## Notes

- The `/me` endpoint returns the authenticated user's own information
- The `/subordinates` endpoint is protected and requires MANAGER or ADMIN role
- All endpoints require a valid JWT access token in the Authorization header
- The manager-subordinate hierarchy is established during user registration by providing a `managerId`
