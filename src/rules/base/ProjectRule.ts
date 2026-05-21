import { Severity, ValidationContext, Issue } from '../../types';
import { BaseRule } from './BaseRule';
import * as path from 'path';
import * as fs from 'fs';
import { MulePaths } from './MulePaths';
import { isChBgId } from './MulePaths';

/**
 * ProjectRule - Base class for rules that operate at project level
 *
 * Unlike regular rules that validate individual XML documents, ProjectRules
 * validate project-wide concerns like file existence, directory structure,
 * or configuration consistency across files.
 *
 * Key differences from BaseRule:
 * - Should only run once per scan (not once per file)
 * - Don't need the XML document to perform validation
 * - Return issues with line: 0 to indicate project-level issues
 *
 * Examples: MULE-001 (global error handler exists), YAML-001 (environment files),
 * DW-002 (DWL naming), DW-003 (common modules)
 */
export abstract class ProjectRule extends BaseRule {
  /**
   * Marker to identify this as a project-level rule
   */
  readonly isProjectRule = true;

  /**
   * Track if this rule has already run during this scan
   * Reset by LintEngine at the start of each scan
   */
  private hasRun = false;

  /**
   * Override validate to implement run-once semantics
   */
  validate(doc: Document, context: ValidationContext): Issue[] {
    // Only run once per scan
    if (this.hasRun) {
      return [];
    }
    this.hasRun = true;

    return this.validateProject(context);
  }

  /**
   * Reset the run state for a new scan
   */
  reset(): void {
    this.hasRun = false;
  }

  /**
   * Implement this method to validate project-level concerns
   * The XML document is not passed because project rules
   * typically don't need it
   */
  protected abstract validateProject(context: ValidationContext): Issue[];

  /**
   * Create a project-level issue (line 0 indicates project scope)
   */
  protected createProjectIssue(
    message: string,
    options?: { suggestion?: string; severity?: Severity },
  ): Issue {
    return {
      line: 0,
      message,
      ruleId: this.id,
      severity: options?.severity ?? this.severity,
      suggestion: options?.suggestion,
    };
  }
  protected getProjectArtifactIdFromPom(context: ValidationContext): string | null {
    //get POM path from context
    const pomPath = path.join(context.projectRoot, 'pom.xml');
    if (!fs.existsSync(pomPath)) {
      return null;
    }
    //read POM file
    const content = fs.readFileSync(pomPath, 'utf-8');
    // Remove XML comments to avoid matching commented sections
    const noComments = content.replace(/<!--[\s\S]*?-->/g, '');

    // Match <project>...</project> first (scopes search)
    const projectMatch = noComments.match(/<project\b[\s\S]*?<\/project>/);
    if (!projectMatch) return null;
    const projectXml = projectMatch[0];
    // Remove <parent>...</parent> block to avoid picking parent artifactId
    const withoutParent = projectXml.replace(/<parent\b[\s\S]*?<\/parent>/, '');
    // Now safely match the project's artifactId
    const m = withoutParent.match(/<artifactId>\s*([^<\s]+)\s*<\/artifactId>/);
    return m ? m[1].trim() : null;
  }

  protected getProjectGroupIdFromPom(context: ValidationContext): string | null {
    //get POM path from context
    const pomPath = path.join(context.projectRoot, 'pom.xml');
    if (!fs.existsSync(pomPath)) {
      return null;
    }
    //read POM file
    const content = fs.readFileSync(pomPath, 'utf-8');
    // Remove XML comments to avoid matching commented sections
    const noComments = content.replace(/<!--[\s\S]*?-->/g, '');

    // Match <project>...</project> first (scopes search)
    const projectMatch = noComments.match(/<project\b[\s\S]*?<\/project>/);
    if (!projectMatch) return null;
    const projectXml = projectMatch[0];
    // Remove <parent>...</parent> block to avoid picking parent artifactId
    const withoutParent = projectXml.replace(/<parent\b[\s\S]*?<\/parent>/, '');
    // Now safely match the project's groupId
    const m = withoutParent.match(/<groupId>\s*([^<\s]+)\s*<\/groupId>/);
    return m ? m[1].trim() : null;
  }

  protected getAppDeployPlatform(context: ValidationContext): string | null {
    //get POM path from context
    const pomPath = path.join(context.projectRoot, 'pom.xml');
    if (!fs.existsSync(pomPath)) {
      return null;
    }
    //read POM file
    const content = fs.readFileSync(pomPath, 'utf-8');
    // Remove XML comments to avoid matching commented sections
    const noComments = content.replace(/<!--[\s\S]*?-->/g, '');
    const projGroupId = this.getProjectGroupIdFromPom(context);
    const awServer = this.readAwMuleServer(content);
    const awPlatform = this.readAwMulePlatform(content);
    const Ch2BgIds = MulePaths.CH_BG_IDS;

    if (awPlatform != null && awPlatform.length > 0) {
      return awPlatform;
    } else if (projGroupId != null && projGroupId.length > 0) {
      return isChBgId(projGroupId) ? 'cloudhub' : null;
    } else {
      return null;
    }
  }
  protected readAwMuleServer(pomXml: string): string | null {
    const match = pomXml.match(/<aw\.mule\.server>\s*([^<]+)\s*<\/aw\.mule\.server>/i);
    return match?.[1]?.trim() ?? null;
  }

  protected readAwMulePlatform(pomXml: string): string | null {
    const match = pomXml.match(/<aw\.mule\.platform>\s*([^<]+)\s*<\/aw\.mule\.platform>/i);
    return match?.[1]?.trim() ?? null;
  }
  protected getParentArtifactId(pomXml: string): string | null {
    const match = pomXml.match(
      /<parent>[\s\S]*?<artifactId>(.*?)<\/artifactId>[\s\S]*?<\/parent>/i,
    );
    return match?.[1]?.trim() ?? null;
  }
}
