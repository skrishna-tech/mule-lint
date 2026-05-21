// PomValues.ts
import { PomHelper, PomInfo, DistributionManagement, MavenPlugin } from '../../core/PomHelper';
import { MulePaths } from './MulePaths';
import { isChBgId } from './MulePaths';
export type PomValuesOptions = {
  /** default: true */
  resolvePlaceholders?: boolean;

  /** default: true */
  inheritFromParent?: boolean;

  /** extra values used when resolving ${...} */
  placeholderSources?: Record<string, string>;
};

export class PomValues {
  /**
   * Always parse fresh (NO cache) — safe when app changes every run
   */
  private static readPom(pomPath: string, options: PomValuesOptions = {}): PomInfo {
    return PomHelper.fromFile(pomPath, {
      resolvePlaceholders: options.resolvePlaceholders ?? true,
      inheritFromParent: options.inheritFromParent ?? true,
      placeholderSources: options.placeholderSources ?? {},
    });
  }

  // -------------------------
  // Project coordinates
  // -------------------------

  static getArtifactId(pomPath: string, options?: PomValuesOptions): string | undefined {
    return this.readPom(pomPath, options).artifactId;
  }

  static getGroupId(pomPath: string, options?: PomValuesOptions): string | undefined {
    return this.readPom(pomPath, options).groupId;
  }

  static getVersion(pomPath: string, options?: PomValuesOptions): string | undefined {
    return this.readPom(pomPath, options).version;
  }

  static getAppPlatform(pomPath: string, options?: PomValuesOptions): string | undefined {
    const appPlatform = this.readPom(pomPath, options).properties['aw.mule.platform'];
    return appPlatform;
  }

  static isCloudHubApp(pomPath: string, options?: PomValuesOptions): string | undefined {
    const Ch2BgIds = MulePaths.CH_BG_IDS;
    const groupId = this.readPom(pomPath, options).groupId;
    if (groupId != null && groupId.length > 0) {
      return isChBgId(groupId) ? 'Yes' : 'No';
    } else {
      return 'No';
    }
  }

  // -------------------------
  // Distribution Management
  // -------------------------

  static getDistributionManagement(
    pomPath: string,
    options?: PomValuesOptions,
  ): DistributionManagement | undefined {
    return this.readPom(pomPath, options).distributionManagement;
  }

  static getReleaseRepoId(pomPath: string, options?: PomValuesOptions): string | undefined {
    return this.readPom(pomPath, options).distributionManagement?.repository?.id;
  }

  static getReleaseRepoUrl(pomPath: string, options?: PomValuesOptions): string | undefined {
    return this.readPom(pomPath, options).distributionManagement?.repository?.url;
  }

  static getSnapshotRepoId(pomPath: string, options?: PomValuesOptions): string | undefined {
    return this.readPom(pomPath, options).distributionManagement?.snapshotRepository?.id;
  }

  static getSnapshotRepoUrl(pomPath: string, options?: PomValuesOptions): string | undefined {
    return this.readPom(pomPath, options).distributionManagement?.snapshotRepository?.url;
  }

  /**
   * Convenience: return both ids in one shot
   */
  static getDistributionRepoIds(
    pomPath: string,
    options?: PomValuesOptions,
  ): { releaseRepoId?: string; snapshotRepoId?: string } {
    const dm = this.getDistributionManagement(pomPath, options);
    return {
      releaseRepoId: dm?.repository?.id,
      snapshotRepoId: dm?.snapshotRepository?.id,
    };
  }

  // -------------------------
  // Strict helpers (throw if missing)
  // -------------------------

  static requireArtifactId(pomPath: string, options?: PomValuesOptions): string {
    const v = this.getArtifactId(pomPath, options);
    if (!v) throw new Error(`artifactId not found in POM: ${pomPath}`);
    return v;
  }

  static requireDistributionRepoIds(
    pomPath: string,
    options?: PomValuesOptions,
  ): { releaseRepoId?: string; snapshotRepoId?: string } {
    const ids = this.getDistributionRepoIds(pomPath, options);
    if (!ids.releaseRepoId && !ids.snapshotRepoId) {
      throw new Error(`distributionManagement repo ids not found in POM: ${pomPath}`);
    }
    return ids;
  }
}
