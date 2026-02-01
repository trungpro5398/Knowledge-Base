# Multi-Tenant Organization Architecture

## 📋 Overview

Implemented **multi-tenant organization support** để TET Education Group có thể quản lý nhiều spaces (tet-prosys, tet-finance, tet-hr, etc.) dưới một tổ chức duy nhất.

## 🏗️ Architecture

### Before (Flat Structure):
```
users → memberships → spaces → pages
```

**Problem**: Không có cách group spaces theo organization/tenant.

### After (Hierarchical Structure):
```
users → organization_memberships → organizations (TET Education Group)
                                        ↓
                                     spaces (tet-prosys, tet-finance, tet-hr...)
                                        ↓
                                     pages
```

**Benefit**: Rõ ràng, scalable, support multi-tenant.

---

## 📊 Database Schema

### 1. `organizations` Table

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                    -- "TET Education Group"
  slug TEXT NOT NULL UNIQUE,             -- "tet-education"
  icon TEXT,                             -- "🏫" or URL
  description TEXT,
  settings JSONB DEFAULT '{}'::jsonb,    -- Org-level settings
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ                 -- Soft delete
);
```

**Purpose**: Top-level tenant/organization container.

---

### 2. `organization_memberships` Table

```sql
CREATE TABLE organization_memberships (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('member', 'admin', 'owner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, organization_id)
);
```

**Roles**:
- `owner`: Full control, can delete org
- `admin`: Manage members, spaces, settings
- `member`: Access all spaces in org (viewer/editor determined by space-level role)

---

### 3. `spaces` Table (Updated)

```sql
ALTER TABLE spaces 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
```

**Behavior**:
- `organization_id = NULL`: Standalone space (legacy/personal)
- `organization_id = <uuid>`: Space belongs to organization

**Inheritance**: Users with org membership automatically see all org spaces.

---

## 🔐 Row Level Security (RLS)

### Organizations

```sql
-- Users can view organizations they belong to
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- Only org owners can update organization
CREATE POLICY "Org owners can update organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );
```

### Spaces (Updated)

```sql
CREATE POLICY "Users can view spaces"
  ON spaces FOR SELECT
  USING (
    -- Direct space membership
    id IN (
      SELECT space_id FROM memberships WHERE user_id = auth.uid()
    )
    OR
    -- Organization membership (if space belongs to org)
    (organization_id IS NOT NULL AND organization_id IN (
      SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid()
    ))
  );
```

**Logic**: User can see space if:
1. They have direct space membership, OR
2. Space belongs to an org they're a member of

---

## 🔧 Backend API

### New Endpoints

#### 1. List Organizations
```
GET /api/organizations
```

**Response**:
```json
{
  "data": [
    {
      "id": "00000000-0000-0000-0000-000000000001",
      "name": "TET Education Group",
      "slug": "tet-education",
      "icon": "🏫",
      "description": "Tổ chức giáo dục TET - quản lý tất cả tài liệu nội bộ",
      "settings": { "theme": "blue", "features": {...} },
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### 2. Get Organization by ID
```
GET /api/organizations/:id
```

**Response**: Single organization object.

---

#### 3. Get Organization Spaces
```
GET /api/organizations/:id/spaces
```

**Response**:
```json
{
  "data": [
    {
      "id": "...",
      "name": "TET ProSys - Operation Manual",
      "slug": "tet-prosys",
      "organization_id": "00000000-0000-0000-0000-000000000001"
    },
    {
      "id": "...",
      "name": "TET Finance - Policies",
      "slug": "tet-finance",
      "organization_id": "00000000-0000-0000-0000-000000000001"
    }
  ]
}
```

---

#### 4. Create Organization
```
POST /api/organizations
```

**Body**:
```json
{
  "name": "New Organization",
  "slug": "new-org",
  "icon": "🏢",
  "description": "Description here"
}
```

**Response**: Created organization object.

**Note**: Creator automatically becomes `owner`.

---

## 🎨 Frontend UI

### 1. Dashboard (Grouped by Organization)

**Before**:
```
Spaces của bạn
  - TET ProSys - Operation Manual
  - Some other space
```

**After**:
```
🏫 TET Education Group
   Tổ chức giáo dục TET - quản lý tất cả tài liệu nội bộ
   3 spaces

   📁 TET ProSys - Operation Manual
      tet-prosys
      5 trang • 3 published • 2 draft
      [Quản lý pages] [Xem Tài Liệu]

   📁 TET Finance - Policies
      tet-finance
      12 trang • 10 published • 2 draft
      [Quản lý pages] [Xem Tài Liệu]

Spaces độc lập
   📁 Personal Wiki
      ...
```

**Benefits**:
- ✅ Clear hierarchy
- ✅ Easy to see which spaces belong to which org
- ✅ Scalable for multiple orgs

---

### 2. OrganizationSwitcher Component

**Location**: Can be added to admin sidebar

**Features**:
- Dropdown to switch between organizations
- Shows current org icon + name
- If only 1 org → shows static (no dropdown)
- If 0 orgs → hidden

**Usage**:
```tsx
import { OrganizationSwitcher } from "@/components/organizations/OrganizationSwitcher";

<OrganizationSwitcher currentOrgId={orgId} />
```

---

## 🌱 Seed Data

### TET Education Group

```sql
INSERT INTO organizations (id, name, slug, icon, description, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'TET Education Group',
  'tet-education',
  '🏫',
  'Tổ chức giáo dục TET - quản lý tất cả tài liệu nội bộ',
  '{"theme": "blue", "features": {"comments": true, "versions": true, "templates": true}}'::jsonb
);
```

### Update Existing Spaces

```sql
UPDATE spaces 
SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE slug = 'tet-prosys';
```

### Migrate Existing Members

```sql
INSERT INTO organization_memberships (user_id, organization_id, role)
SELECT DISTINCT 
  m.user_id,
  '00000000-0000-0000-0000-000000000001'::uuid,
  CASE 
    WHEN m.role = 'admin' THEN 'admin'
    ELSE 'member'
  END
FROM memberships m
JOIN spaces s ON m.space_id = s.id
WHERE s.organization_id = '00000000-0000-0000-0000-000000000001'::uuid;
```

---

## 🔄 Migration Path

### Step 1: Run Migrations
```bash
# In supabase/migrations/
20240101000023_organizations.sql          # Create tables
20240101000024_seed_tet_organization.sql  # Seed TET Education Group
20240101000025_rls_organizations.sql      # RLS policies
```

### Step 2: Deploy Backend
```bash
cd apps/api
npm run build
# Deploy to Fly.io
```

### Step 3: Deploy Frontend
```bash
cd apps/web
npm run build
# Deploy to Vercel
```

---

## 📈 Use Cases

### 1. TET Education Group
```
🏫 TET Education Group
   ├─ tet-prosys (ProSys Operation Manual)
   ├─ tet-finance (Finance Policies)
   ├─ tet-hr (HR Handbook)
   ├─ tet-marketing (Marketing Guidelines)
   └─ tet-it (IT Documentation)
```

### 2. Multi-School Scenario (Future)
```
🏫 TET Education Group
   ├─ tet-prosys
   └─ ...

🏫 ABC School District
   ├─ abc-elementary
   ├─ abc-middle
   └─ abc-high
```

---

## 🎯 Benefits

### For Users:
1. **Clear Structure**: Easy to understand which spaces belong to which organization
2. **Scalability**: Can add unlimited spaces per org
3. **Access Control**: Org-level membership simplifies permissions
4. **Visual Hierarchy**: Dashboard shows clear grouping

### For Admins:
1. **Centralized Management**: Manage all org spaces from one place
2. **Bulk Operations**: Can apply settings to all spaces in org
3. **Member Management**: Add user to org → access all spaces
4. **Audit Trail**: Track changes at org level

### For Developers:
1. **Clean Architecture**: Clear separation of concerns
2. **Extensible**: Easy to add org-level features (billing, quotas, etc.)
3. **Multi-Tenant Ready**: Can support multiple organizations
4. **Backward Compatible**: Existing spaces still work (standalone)

---

## 🔮 Future Enhancements

### Phase 2:
1. **Organization Settings Page**: Manage org name, icon, description
2. **Member Management UI**: Add/remove org members, change roles
3. **Org-Level Templates**: Share templates across all spaces
4. **Org-Level Analytics**: Usage stats for entire organization

### Phase 3:
1. **Billing per Organization**: Subscription at org level
2. **Quotas**: Storage/page limits per org
3. **SSO Integration**: Org-level SSO (SAML, OAuth)
4. **Custom Domains**: `docs.tet-edu.com` → TET Education Group

### Phase 4:
1. **White-Label**: Custom branding per org
2. **API Keys**: Org-level API access
3. **Webhooks**: Org-level event notifications
4. **Advanced RBAC**: Custom roles per org

---

## 📝 Files Created/Modified

### Database Migrations:
- `supabase/migrations/20240101000023_organizations.sql`
- `supabase/migrations/20240101000024_seed_tet_organization.sql`
- `supabase/migrations/20240101000025_rls_organizations.sql`

### Backend API:
- `apps/api/src/modules/organizations/organizations.repo.ts`
- `apps/api/src/modules/organizations/organizations.service.ts`
- `apps/api/src/modules/organizations/organizations.routes.ts`
- `apps/api/src/routes/index.ts` (updated)

### Frontend:
- `apps/web/components/organizations/OrganizationSwitcher.tsx`
- `apps/web/app/(admin)/admin/page.tsx` (updated)

### Documentation:
- `MULTI_TENANT_ORGANIZATION_ARCHITECTURE.md` (this file)

---

## ✅ Testing Checklist

- [ ] Run migrations on Supabase
- [ ] Verify TET Education Group created
- [ ] Verify tet-prosys linked to org
- [ ] Test GET /api/organizations
- [ ] Test GET /api/organizations/:id/spaces
- [ ] Test Dashboard shows org grouping
- [ ] Test creating new space in org
- [ ] Test standalone spaces still work
- [ ] Test RLS policies (user can only see their orgs)
- [ ] Test org member can see all org spaces

---

## 🎉 Conclusion

**Status**: ✅ Complete

**Impact**: 
- Database: +2 tables, +1 column
- Backend: +3 modules, +4 endpoints
- Frontend: +1 component, Dashboard redesign

**Result**: TET Education Group can now manage multiple spaces (tet-prosys, tet-finance, tet-hr, etc.) under one organization with clear hierarchy and proper access control.

**Ready for**: Production deployment after testing.
