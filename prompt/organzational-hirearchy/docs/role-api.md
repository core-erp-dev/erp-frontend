# Role API Documentation

## Overview
The Role API provides endpoints for managing user roles in the system. Roles define user permissions and access levels within the ERP system.

**Base URL:** `http://localhost:8080/api/v1/roles`

**Authentication:** Required (Bearer Token)

---

## Default Roles

The system comes with pre-configured roles that are seeded on application startup:

| Role | Description | Permissions |
|------|-------------|-------------|
| ADMIN | Full system access | All permissions |
| MANAGER | Can manage subordinates | View and manage subordinates |
| STAFF | Basic staff access | Standard user operations |
| HR | Human resources access | HR-related operations |

---

## Entity Structure

### Role Entity

| Field | Type | Description |
|-------|------|-------------|
| id | Long | Unique identifier |
| name | String | Role name (unique) |
| description | String | Role description |
| users | List<User> | Users assigned to this role |

---

## Notes

- Roles are managed internally and seeded automatically via `DataSeeder` on application startup
- Default roles cannot be modified through API endpoints
- Users are assigned roles during registration or through admin operations
- The role system integrates with Spring Security for authorization
- Role-based access control (RBAC) is implemented using `@PreAuthorize` annotations

---

## Role-Based Access Control

The application uses Spring Security's role-based authorization:

### Role Hierarchy
```
ADMIN > MANAGER > STAFF > HR
```

### Authorization Annotations

The application uses the following authorization patterns:

```java
@PreAuthorize("hasRole('ADMIN')")       // Requires ADMIN role
@PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")  // Requires MANAGER or ADMIN
```

---

## Endpoints Summary

Currently, the Role entity is managed through:

1. **Authentication** - Roles are assigned during user registration
2. **User Management** - User endpoints return role information
3. **Internal Seeding** - Default roles are created on application startup

### Available Role Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/v1/roles | Get all roles | ADMIN only |
| GET | /api/v1/roles/{id} | Get role by ID | ADMIN only |
| POST | /api/v1/roles | Create new role | ADMIN only |
| PUT | /api/v1/roles/{id} | Update role | ADMIN only |
| DELETE | /api/v1/roles/{id} | Delete role | ADMIN only |

---

## Role Operations

### Get All Roles

**Endpoint:** `GET /api/v1/roles`

**Headers:**
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer <access_token> |

**Authorization:** Requires `ADMIN` role

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "Success",
  "data": [
    {
      "id": 1,
      "name": "ADMIN",
      "description": "Full system access"
    },
    {
      "id": 2,
      "name": "MANAGER",
      "description": "Can manage subordinates"
    },
    {
      "id": 3,
      "name": "STAFF",
      "description": "Basic staff access"
    },
    {
      "id": 4,
      "name": "HR",
      "description": "Human resources access"
    }
  ]
}
```

**Example Request:**
```bash
curl -X GET http://localhost:8080/api/v1/roles \
  -H "Authorization: Bearer your-access-token-here"
```

---

### Get Role by ID

**Endpoint:** `GET /api/v1/roles/{id}`

**Headers:**
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer <access_token> |

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | long | Role's unique identifier |

**Authorization:** Requires `ADMIN` role

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "id": 1,
    "name": "ADMIN",
    "description": "Full system access"
  }
}
```

**Example Request:**
```bash
curl -X GET http://localhost:8080/api/v1/roles/1 \
  -H "Authorization: Bearer your-access-token-here"
```

---

### Create Role

Create a new role in the system.

**Endpoint:** `POST /api/v1/roles`

**Headers:**
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer <access_token> |

**Authorization:** Requires `ADMIN` role

**Request Body:**
```json
{
  "name": "string",
  "description": "string"
}
```

**Parameters:**
| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| name | string | Yes | Unique, 3-50 characters | Role name |
| description | string | No | Max 255 characters | Role description |

**Response (201 Created):**
```json
{
  "status": 201,
  "message": "Role created successfully",
  "data": {
    "id": 5,
    "name": "SUPERVISOR",
    "description": "Supervisory access"
  }
}
```

**Example Request:**
```bash
curl -X POST http://localhost:8080/api/v1/roles \
  -H "Authorization: Bearer your-access-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "SUPERVISOR",
    "description": "Supervisory access"
  }'
```

---

### Update Role

Update an existing role.

**Endpoint:** `PUT /api/v1/roles/{id}`

**Headers:**
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer <access_token> |

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | long | Role's unique identifier |

**Authorization:** Requires `ADMIN` role

**Request Body:**
```json
{
  "name": "string",
  "description": "string"
}
```

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "Role updated successfully",
  "data": {
    "id": 5,
    "name": "SUPERVISOR",
    "description": "Updated description"
  }
}
```

**Example Request:**
```bash
curl -X PUT http://localhost:8080/api/v1/roles/5 \
  -H "Authorization: Bearer your-access-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "SUPERVISOR",
    "description": "Updated description"
  }'
```

---

### Delete Role

Delete a role from the system.

**Endpoint:** `DELETE /api/v1/roles/{id}`

**Headers:**
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer <access_token> |

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | long | Role's unique identifier |

**Authorization:** Requires `ADMIN` role

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "Role deleted successfully",
  "data": null
}
```

**Example Request:**
```bash
curl -X DELETE http://localhost:8080/api/v1/roles/5 \
  -H "Authorization: Bearer your-access-token-here"
```

---

## Error Responses

| Status Code | Description |
|-------------|-------------|
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - User doesn't have ADMIN role |
| 404 | Not Found - Role not found |
| 409 | Conflict - Role name already exists |
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

## Important Notes

1. **Default roles cannot be deleted** - ADMIN, MANAGER, STAFF, and HR are system-defined
2. **Role assignments** - Users must have at least one role
3. **Cascade effects** - Deleting a role may affect users assigned to that role
4. **Security** - Only ADMIN users can manage roles
5. **Audit** - Role changes should be logged for security purposes
