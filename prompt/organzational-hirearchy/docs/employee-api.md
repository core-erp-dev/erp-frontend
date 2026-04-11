# Employee Management API Documentation

## Overview
The Employee Management API provides endpoints for managing organization hierarchy, user position assignments, and application roles. This module replaces the old managerId-based hierarchy with a position-based system.

**Base URL:** `http://localhost:8080/api`

**Authentication:** Required (Bearer Token)

---

## Default Roles

The system comes with pre-configured ERP roles that are seeded on application startup:

| Role | Description | Permissions |
|------|-------------|-------------|
| SUPER_ADMIN | Full system access across all ERP modules | All permissions |
| HR_ADMIN | Human resources administration access | HR operations, user management |
| USER_APPROVER | Can approve user requests | Approval workflows |
| USER_STAFF | Basic staff access | Standard user operations |

---

## Entity Structures

### Core User Entity
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique identifier |
| authServiceId | UUID | Link to auth service |
| nip | String | Employee number |
| fullName | String | Employee's full name |
| email | String | Employee's email |
| isActive | Boolean | Whether user is active |
| lastSyncAt | DateTime | Last sync timestamp |

### Position Entity
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| positionCode | String | Unique position code |
| positionName | String | Position name |
| parentId | Integer | Parent position ID (for hierarchy) |
| positionLevel | Integer | Level in organization |
| isActive | Boolean | Whether position is active |

### User Position Entity
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique identifier |
| userId | UUID | User's ID |
| positionId | Integer | Position's ID |
| startDate | Date | Assignment start date |
| endDate | Date | Assignment end date |
| isPrimary | Boolean | Primary position flag |
| isActive | Boolean | Active assignment |

### Core Role Entity
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| roleCode | String | Unique role code |
| description | String | Role description |

---

## Endpoints

### 1. Get Position Tree

Retrieve the complete organization hierarchy as a tree structure.

**Endpoint:** `GET /api/positions/tree`

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
    "tree": [
      {
        "id": 1,
        "positionCode": "DIR",
        "positionName": "Director",
        "parentId": null,
        "parentName": null,
        "positionLevel": 1,
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00",
        "updatedAt": "2024-01-01T00:00:00",
        "children": [
          {
            "id": 2,
            "positionCode": "MGR",
            "positionName": "Manager",
            "parentId": 1,
            "parentName": "Director",
            "positionLevel": 2,
            "isActive": true,
            "children": [],
            "assignedUser": {
              "id": "uuid",
              "fullName": "John Doe",
              "email": "john@example.com",
              "nip": "EMP001"
            }
          }
        ]
      }
    ]
  }
}
```

**Example Request:**
```bash
curl -X GET http://localhost:8080/api/positions/tree \
  -H "Authorization: Bearer your-access-token-here"
```

---

### 2. Create Position

Create a new position in the organization.

**Endpoint:** `POST /api/positions`

**Headers:**
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer <access_token> |

**Request Body:**
```json
{
  "positionCode": "string",
  "positionName": "string",
  "parentId": "integer (optional)",
  "positionLevel": "integer (optional)"
}
```

**Parameters:**
| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| positionCode | string | Yes | Unique, max 50 chars | Unique position code |
| positionName | string | Yes | Max 100 chars | Position name |
| parentId | integer | No | Valid parent ID | Parent position ID |
| positionLevel | integer | No | Positive integer | Level in organization |

**Response (201 Created):**
```json
{
  "status": 201,
  "message": "Success",
  "data": {
    "id": 3,
    "positionCode": "SUP",
    "positionName": "Supervisor",
    "parentId": 2,
    "parentName": "Manager",
    "positionLevel": 3,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00",
    "updatedAt": "2024-01-01T00:00:00"
  }
}
```

**Example Request:**
```bash
curl -X POST http://localhost:8080/api/positions \
  -H "Authorization: Bearer your-access-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "positionCode": "SUP",
    "positionName": "Supervisor",
    "parentId": 2,
    "positionLevel": 3
  }'
```

---

### 3. Update Position

Update an existing position.

**Endpoint:** `PUT /api/positions/{id}`

**Headers:**
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer <access_token> |

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Position's unique identifier |

**Request Body:**
```json
{
  "positionCode": "string (optional)",
  "positionName": "string (optional)",
  "positionLevel": "integer (optional)",
  "isActive": "boolean (optional)"
}
```

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "id": 3,
    "positionCode": "SUP",
    "positionName": "Senior Supervisor",
    "positionLevel": 3,
    "isActive": true,
    "updatedAt": "2024-01-02T00:00:00"
  }
}
```

**Example Request:**
```bash
curl -X PUT http://localhost:8080/api/positions/3 \
  -H "Authorization: Bearer your-access-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "positionName": "Senior Supervisor"
  }'
```

---

### 4. Delete Position

Soft delete a position (only if no children or active users).

**Endpoint:** `DELETE /api/positions/{id}`

**Headers:**
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer <access_token> |

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Position's unique identifier |

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "Success",
  "data": null
}
```

**Validation Errors:**
- Cannot delete position with child positions
- Cannot delete position with active users

**Example Request:**
```bash
curl -X DELETE http://localhost:8080/api/positions/3 \
  -H "Authorization: Bearer your-access-token-here"
```

---

### 5. Assign User to Position

Assign a user to a position.

**Endpoint:** `POST /api/user-positions`

**Headers:**
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer <access_token> |

**Request Body:**
```json
{
  "userId": "uuid",
  "positionId": "integer",
  "startDate": "date (optional)",
  "endDate": "date (optional)",
  "isPrimary": "boolean (default: false)"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | UUID | Yes | User's unique identifier |
| positionId | integer | Yes | Position's unique identifier |
| startDate | date | No | Assignment start date |
| endDate | date | No | Assignment end date |
| isPrimary | boolean | No | Primary position flag |

**Response (201 Created):**
```json
{
  "status": 201,
  "message": "Success",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "positionId": 3,
    "positionName": "Supervisor",
    "positionCode": "SUP",
    "startDate": "2024-01-01",
    "endDate": null,
    "isPrimary": true,
    "isActive": true,
    "assignedBy": "uuid",
    "createdAt": "2024-01-01T00:00:00"
  }
}
```

**Example Request:**
```bash
curl -X POST http://localhost:8080/api/user-positions \
  -H "Authorization: Bearer your-access-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "positionId": 3,
    "startDate": "2024-01-01",
    "isPrimary": true
  }'
```

---

### 6. Get User Positions

Get position history for a specific user.

**Endpoint:** `GET /api/user-positions/{userId}`

**Headers:**
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer <access_token> |

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| userId | UUID | User's unique identifier |

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "Success",
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "positionId": 3,
      "positionName": "Supervisor",
      "positionCode": "SUP",
      "startDate": "2024-01-01",
      "endDate": null,
      "isPrimary": true,
      "isActive": true,
      "assignedBy": "uuid",
      "createdAt": "2024-01-01T00:00:00"
    }
  ]
}
```

**Example Request:**
```bash
curl -X GET http://localhost:8080/api/user-positions/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer your-access-token-here"
```

---

### 7. Get All Users

List all ERP users.

**Endpoint:** `GET /api/users`

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
  "data": [
    {
      "id": "uuid",
      "authServiceId": "uuid",
      "nip": "EMP001",
      "fullName": "John Doe",
      "email": "john@example.com",
      "isActive": true,
      "lastSyncAt": "2024-01-01T00:00:00",
      "createdAt": "2024-01-01T00:00:00",
      "updatedAt": "2024-01-01T00:00:00",
      "roles": [
        {
          "id": 1,
          "roleCode": "USER_STAFF",
          "description": "Basic staff access"
        }
      ],
      "primaryPosition": {
        "positionId": 3,
        "positionName": "Supervisor"
      }
    }
  ]
}
```

**Example Request:**
```bash
curl -X GET http://localhost:8080/api/users \
  -H "Authorization: Bearer your-access-token-here"
```

---

### 8. Assign Role to User

Assign a role to a user.

**Endpoint:** `POST /api/user-roles`

**Headers:**
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer <access_token> |

**Request Body:**
```json
{
  "userId": "uuid",
  "roleId": "integer"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | UUID | Yes | User's unique identifier |
| roleId | integer | Yes | Role's unique identifier |

**Response (201 Created):**
```json
{
  "status": 201,
  "message": "Success",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "userName": "John Doe",
    "roleId": 2,
    "roleCode": "HR_ADMIN",
    "roleDescription": "Human resources administration access",
    "assignedBy": "uuid",
    "assignedAt": "2024-01-01T00:00:00"
  }
}
```

**Example Request:**
```bash
curl -X POST http://localhost:8080/api/user-roles \
  -H "Authorization: Bearer your-access-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "roleId": 2
  }'
```

---

### 9. Change User Role

Change a user's role (replaces all existing roles).

**Endpoint:** `PUT /api/user-roles/{userId}`

**Headers:**
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer <access_token> |

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| userId | UUID | User's unique identifier |

**Request Body:**
```json
{
  "roleId": "integer"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| roleId | integer | Yes | New role's unique identifier |

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "userName": "John Doe",
    "roleId": 1,
    "roleCode": "SUPER_ADMIN",
    "roleDescription": "Full system access across all ERP modules",
    "assignedBy": "uuid",
    "assignedAt": "2024-01-02T00:00:00"
  }
}
```

**Example Request:**
```bash
curl -X PUT http://localhost:8080/api/user-roles/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer your-access-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": 1
  }'
```

---

## Error Responses

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Duplicate entry |
| 500 | Internal Server Error |

**Error Response Format:**
```json
{
  "title": "Bad Request",
  "status": 400,
  "detail": "Error message description",
  "timestamp": "2024-01-01T00:00:00"
}
```

---

## Audit Logging

All important actions are logged in the `core_audit_logs` table:

| Action Type | Description |
|-------------|-------------|
| CREATE_POS | Position created |
| UPDATE_POS | Position updated |
| DELETE_POS | Position deleted (soft delete) |
| ASSIGN_USER | User assigned to position |
| ASSIGN_ROLE | Role assigned to user |
| CHANGE_ROLE | User's role changed |

---

## Important Notes

1. **Hierarchy Management** - Position hierarchy is now managed via `core_positions` and `core_user_positions` tables
2. **Primary Position** - Each user can have one primary position; additional positions can be temporary/secondary
3. **Circular Reference Prevention** - System prevents creating circular references in position hierarchy
4. **Soft Delete** - Deleting a position doesn't remove it, just marks as inactive
5. **Role Migration** - Old roles (ADMIN, MANAGER, STAFF, HR) are kept for backward compatibility; new ERP roles are SUPER_ADMIN, HR_ADMIN, USER_APPROVER, USER_STAFF
6. **Subordinate Lookup** - Subordinates are now determined by traversing the position tree, not via managerId
