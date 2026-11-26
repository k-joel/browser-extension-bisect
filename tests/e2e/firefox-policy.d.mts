export declare const FIREFOX_GECKO_ID: string;

export interface PolicyCacheOptions {
  cacheDir?: string;
  portableRoot?: string;
}

export interface FirefoxSourceOptions {
  cacheRoots?: string[];
}

export interface PolicyExtension {
  id: string;
  slug?: string;
  xpi: string;
}

export interface WrittenPolicy {
  policyPath: string;
  badExtensionId: string | null;
  restore(): void;
}

export declare function resolveFirefoxSourceDir(options?: FirefoxSourceOptions): string;

export declare function ensurePolicyFirefox(sourceDir: string, options?: PolicyCacheOptions): string;

export declare function buildSelfXpi(options: { buildDir: string; artifactsDir: string }): string;

export declare function writeFirefoxPolicy(options: {
  installDir: string;
  selfXpi: string | null;
  candidateXpis: PolicyExtension[];
  badXpi?: string | null;
  badExtensionId?: string | null;
}): WrittenPolicy;

export declare function assertPolicyAdmin(
  surface: unknown,
): Promise<{ selfId: string; installType: string; extensionCount: number }>;

export declare function firefoxPolicyPlan(options: {
  extensionsDir?: string;
  buildDir: string;
  artifactsDir: string;
  browserName?: string;
  includeSelf?: boolean;
  badExtensionDir?: string | null;
}): {
  entries: PolicyExtension[];
  candidateXpis: PolicyExtension[];
  selfXpi: string | null;
  badXpi: string | null;
  badExtensionId: string | null;
};
