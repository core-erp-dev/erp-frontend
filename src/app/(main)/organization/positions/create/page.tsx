'use client';

import { useRouter } from 'next/navigation';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { PositionForm } from '@/modules/organization/positions/components/position-form';

export default function CreatePositionPage() {
  const router = useRouter();
  const { hasPerm } = usePermission();

  if (!hasPerm(PERM.POSITION_MANAGE)) {
    return <ForbiddenAccess />;
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PositionForm
        mode="create"
        onSuccess={(newId) => {
          // Create → replace to the new Detail (browser Back must not return
          // to the form).
          if (newId) {
            router.replace(`/organization/positions/${newId}`);
          }
        }}
      />
    </div>
  );
}
