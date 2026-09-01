import { corporateKpiApi } from '@/modules/kpi/corporate/corporate-kpi-api';
import { corporateKpiStructuresApi } from '@/modules/kpi/corporate/corporate-kpi-structures-api';
import type { CorporateKpiNode } from '@/modules/kpi/corporate/corporate-kpi.types';
import type { KpiActivityManageIndicatorOption } from './activity-v1.types';

export interface ActivityFormKpiOptions {
  periodYears: number[];
  indicators: KpiActivityManageIndicatorOption[];
}

/**
 * Loads the canonical KPI options used by every activity form.
 *
 * Activity request pages cannot use the administrative manage-options endpoint
 * because it requires kpi_activity:manage. This read-only source applies the
 * same business rule instead: only non-deleted ACTIVE KPI structures and their
 * indicator nodes are eligible for activity references.
 */
export async function loadActivityFormKpiOptions(year?: number): Promise<ActivityFormKpiOptions> {
  const structures = await corporateKpiStructuresApi.list();
  const activeStructures = structures.filter(
    (structure) => structure.status === 'ACTIVE' && !structure.deletedAt,
  );
  const activeStructureIds = new Set(activeStructures.map((structure) => structure.id));
  const periodYears = [...new Set(
    activeStructures
      .map((structure) => structure.year)
      .filter((structureYear) => Number.isInteger(structureYear) && structureYear > 0),
  )].sort((left, right) => right - left);

  if (year == null) return { periodYears, indicators: [] };

  const tree = await corporateKpiApi.getTreeByYear(year);
  const indicators: KpiActivityManageIndicatorOption[] = [];
  const collect = (nodes: CorporateKpiNode[]) => {
    nodes.forEach((node) => {
      if (node.nodeType === 'INDICATOR' && activeStructureIds.has(node.structureId)) {
        indicators.push({ id: node.id, code: node.code, name: node.name });
      }
      if (node.children.length > 0) collect(node.children);
    });
  };
  collect(tree);

  return { periodYears, indicators };
}
