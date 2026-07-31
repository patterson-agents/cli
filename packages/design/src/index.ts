/**
 * @patterson/design — vendored design-system snapshot + template materializer
 * (E-P3). Fully offline: every export reads only the byte-verified snapshot
 * under assets/snapshot/. The authenticated refresh flow lives behind
 * `patterson design refresh` (FR-014).
 */
export {
  DESIGN_PROJECT_ID,
  loadDsManifest,
  loadSnapshotManifest,
  loadTheme,
  resetSnapshotCaches,
  SNAPSHOT_DIR,
  snapshotInfo,
} from "./snapshot.ts";
export type {
  DsManifest,
  DsTemplateEntry,
  SnapshotFileRecord,
  SnapshotInfo,
  SnapshotManifest,
} from "./snapshot.ts";
export {
  getDesignTemplate,
  listDesignTemplates,
  materializeDesignTemplate,
  SHARED_ASSETS_DIR,
} from "./templates.ts";
export type { DesignTemplateInfo, MaterializedTemplate } from "./templates.ts";
