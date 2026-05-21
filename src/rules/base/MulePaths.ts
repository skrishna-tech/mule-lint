// src/constants/MulePaths.ts
export const MulePaths = {
  SRC_MAIN_MULE: "src/main/mule",
  SRC_MAIN_RESOURCES: "src/main/resources",
  SRC_MAIN_JAVA: "src/main/java",
  YAML_CONFIG_PATH: "src/main/resources/config/mule",
  SECURE_YAML_CONFIG_PATH: "src/main/resources/config/mule/secure",
  DWL_PATH: "src/main/resources/dwl",
  CONFIG_PATH: "src/main/resources/config",
  CERTS_PATH: "src/main/resources/certs",
  SRC_TEST_RESOURCES: "src/test/resources",
  TEST_YAML_CONFIG_PATH: "src/test/resources/config/mule",
  MUNIT_DIR: "src/test/munit",
  POM_XML: "pom.xml",
  LOG4J2_XML: "src/main/resources/log4j2.xml",
  POM_JSON_LOGGER: "aw-json-logger",
  POM_ERROR_HANDLING_LIB: "eai-core-error-handling-lib",
  ENVIRONMENTS: ["dev", "tst", "stg", "prd"],
  MUNIT_ENV: ['munit'],
  CH_BG_IDS: ["a13a3b77-7e7c-4dbb-bee2-ab32776c3813", "4ad706e2-9ef8-4154-b30d-ae94d465ef4b", "98dbb603-9f15-47d1-8d9c-1087c4740c1c", "ded1b019-fdb4-494f-9243-9269e19a04a1"],
} as const;

// ---- Derived helpers (outside the const object) ----
export type ChBgId = (typeof MulePaths.CH_BG_IDS)[number];

const CH_BG_ID_SET = new Set<string>(MulePaths.CH_BG_IDS);

/** Runtime check for string membership */
export function isChBgId(value: string): value is ChBgId {
  return CH_BG_ID_SET.has(value);
}
