'use client';

import { useRouter } from 'next/navigation';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { OrgUnitForm } from '@/modules/organization/organization-units/components/org-unit-form';

export default function CreateOrganizationUnitPage() {
  const router = useRouter();
  const { hasPerm } = usePermission();

  // Guard BEFORE the form (and its tree lookup) is rendered.
  if (!hasPerm(PERM.ORGANIZATION_UNIT_MANAGE)) {
    return <ForbiddenAccess />;
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <OrgUnitForm
        mode="create"
        onSuccess={(unitId) => {
          // Deterministic: replace Create with the new unit's Detail page.
          router.replace(`/organization/organization-units/${unitId}`);
        }}
      />
    </div>
  );
}
