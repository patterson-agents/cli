/**
 * @patterson/generators — `patterson new …` engine + the six v1 generators
 * (E-P5, US5) and the shared MCP handshake validator (tutor-importable).
 */
export {
  GENERATOR_NAME_RE,
  renderPlanSpec,
  runGenerator,
  validateGeneratorName,
} from "./engine.ts";
export type {
  GeneratedOutput,
  Generator,
  GeneratorKind,
  RunGeneratorResult,
} from "./engine.ts";
export {
  ALL_GENERATORS,
  CLAUDE_PLUGIN_ROOT_TOKEN,
  claudePluginGenerator,
  cliPluginGenerator,
  commandGenerator,
  frontmatterName,
  marketplaceGenerator,
  mcpServerGenerator,
  PINS,
  pluginGenerator,
  PROVENANCE_TBD,
  SKILL_PROVENANCE_FILES,
  skillGenerator,
} from "./generators.ts";
export { validateMcpHandshake } from "./handshake.ts";
export type { HandshakeOptions, HandshakeReport, HandshakeStep } from "./handshake.ts";
