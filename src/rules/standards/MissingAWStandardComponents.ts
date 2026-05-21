import { ValidationContext, Issue, IssueType } from '../../types';
import { ProjectRule } from '../base/ProjectRule';
import { MulePaths } from '../base/MulePaths';
import { getErrorMessage } from '../../core/errors';
import { XMLParser } from "fast-xml-parser";
import * as fs from 'fs';
import * as path from 'path';

/**
 * AWSTND-001: App Deploy platform Not configured
 * Application deployment platform must be configured for Hybrid or Cloudhub2.0
 */
export class AppDeployPlatformNotConfigured extends ProjectRule {
  id = 'AWSTND-001';
  name = 'App Deploy Platform Not Configured';
  description = 'App deployment platform is not configured in pom.xml';
  severity = 'error' as const;
  category = 'standards' as const;
  issueType: IssueType = 'bug';
  validateProject(context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // projectRoot should exist in context (engine scans project)
    const pomPath = path.join(context.projectRoot, MulePaths.POM_XML);
    if (!fs.existsSync(pomPath)) {
        issues.push(
        this.createProjectIssue('Missing pom.xml file in project root', {
            severity: 'error',
        }),
        );
        return issues;
    }
    // Basic content check (simple string matching to avoid heavy XML parsing dependency if not needed)
    // In a real implementation, we might want to parse the XML, but for now string matching is faster/sufficient
    // for these specific checks.
    try{
        const content = fs.readFileSync(pomPath, 'utf-8');
        //read artifactId        
        const artifactId = this.getProjectArtifactIdFromPom(context);
        //console.log(`artifactId: ${artifactId}`);
        const appPlatform = this.getAppDeployPlatform(context);
        //console.log(`appPlatform: ${appPlatform}`);
        if (appPlatform == null){
            issues.push(
            this.createProjectIssue(`pom.xml is not configured properly to deploy in Cloudhub or hybrid enviroment.`, {
            severity: 'error',          
          }));
        }
    } catch (error) {
      issues.push(
        this.createProjectIssue(`Error reading pom.xml: ${getErrorMessage(error)}`, {
          severity: 'warning',
        }),
      );
    }
    return issues;
  }  
}

/**
 * AWSTND-002: Mule App name length check
 * Mule app name should be less than 42 characters for Hybrid and 38 characters for Cloudhub (as CH2.0 appends environment before the App Name)
 */
export class OrgAppNameRule extends ProjectRule {
  id = 'AWSTND-002';
  name = 'App Name Convention';
  description = 'App name (pom.xml artifactId) must be lowercase, use a-z0-9 and dashes only, and be < 42 characters for hybird and <38 characters for cloudhub';
  severity = 'error' as const;
  category = 'standards' as const;
  issueType: IssueType = 'bug';
  validateProject(context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // projectRoot should exist in context (engine scans project)
    const pomPath = path.join(context.projectRoot, MulePaths.POM_XML);
    if (!fs.existsSync(pomPath)) {
        issues.push(
        this.createProjectIssue('Missing pom.xml file in project root', {
            severity: 'error',
        }),
        );
        return issues;
    }
    // Basic content check (simple string matching to avoid heavy XML parsing dependency if not needed)
    // In a real implementation, we might want to parse the XML, but for now string matching is faster/sufficient
    // for these specific checks.
    try{
        const content = fs.readFileSync(pomPath, 'utf-8');
        //read artifactId        
        const artifactId = this.getProjectArtifactIdFromPom(context);
        //console.log(`artifactId: ${artifactId}`);
        const appPlatform = this.getAppDeployPlatform(context);
        //console.log(`appPlatform: ${appPlatform}`);        
        const pattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        if (artifactId != null && !pattern.test(artifactId)){
            issues.push(
            this.createProjectIssue(`artifactId "${artifactId}" must match ${pattern} (lowercase, a-z0-9 and dashes only)`, {
            severity: 'error',          
          }));
        }        
        if (appPlatform != null && appPlatform == "cloudhub") {
          const maxLen = 38;
          if (artifactId != null && artifactId.length > maxLen) {
          issues.push(
              this.createProjectIssue(`artifactId "${artifactId}" is too long (${artifactId.length}). Must be <38 characters.`, {
              severity: 'error',          
            }));
          }
        } else if (appPlatform != null && (appPlatform == "hybrid" || appPlatform == "azcloud" || appPlatform == "onprem")) {
          const maxLen = 41;
          if (artifactId != null && artifactId.length > maxLen) {
          issues.push(
              this.createProjectIssue(`artifactId "${artifactId}" is too long (${artifactId.length}). Must be <42 characters.`, {
              severity: 'error',          
            }));
          }
        } else {
          const maxLen = 38;
          if (artifactId != null && artifactId.length > maxLen) {
          issues.push(
              this.createProjectIssue(`artifactId "${artifactId}" is too long (${artifactId.length}). Must be <38 characters for CloudHub and <42 characters for hybird environment.`, {
              severity: 'error',          
            }));
          }
        }
        
    } catch (error) {
      issues.push(
        this.createProjectIssue(`Error reading pom.xml: ${getErrorMessage(error)}`, {
          severity: 'warning',
        }),
      );
    }

    return issues;
  }  
}

/**
 * AWSTND-003: Missing AW JSON Logger dependency
 * Missing Andersen Corporation standard AW JSON Logger dependency 
 */
export class MissingAwJSONLoggerRule extends ProjectRule {
  id = 'AWSTND-003';
  name = 'Missing AW JSON Logger dependency';
  description = 'Projects with aw-json-logger dependency';
  severity = 'error' as const;
  category = 'standards' as const;
  issueType: IssueType = 'bug';
  protected validateProject(context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    // projectRoot should exist in context (engine scans project)
    const pomPath = path.join(context.projectRoot, MulePaths.POM_XML);
    if (!fs.existsSync(pomPath)) {
        issues.push(
        this.createProjectIssue('Missing pom.xml file in project root', {
            severity: 'error',
        }),
        );
        return issues;
    }
    try{
        const content = fs.readFileSync(pomPath, 'utf-8');
        const appDeployPlatform = this.getAppDeployPlatform(context);
        const hybridErrMsg = "add dependency <dependency><groupId>com.andersen.eai</groupId><artifactId>aw-json-logger</artifactId><version>4.0.0</version><classifier>mule-plugin</classifier></dependency>";
        const ch2ErrMsg = "add depdendency <dependency><groupId>09d89140-dc6e-4bac-ad5d-f55fc59af462</groupId><artifactId>aw-json-logger</artifactId><version>4.5.0</version><classifier>mule-plugin</classifier></dependency>";
        // Check for mule-maven-plugin
        if (!content.includes('aw-json-logger')) {
            issues.push(
            this.createProjectIssue('Missing aw-json-logger dependency in pom.xml', {
                severity: 'error',
                suggestion: appDeployPlatform == "hybrid" ? hybridErrMsg : ch2ErrMsg,
            }),
            );
        }
    }catch (error) {
        issues.push(
        this.createProjectIssue(`Error reading pom.xml: ${getErrorMessage(error)}`, {
            severity: 'error',
        }),
        );
    }
    return issues;
  }
}

/**
 * AWSTND-004: Missing AW error handling library dependency
 * Missing Andersen Corporation standard error handling library dependency
 */
export class MissingAwErrorHandlingLibRule extends ProjectRule {
  id = 'AWSTND-004';
  name = 'Missing AW Error Handling Library dependency';
  description = 'Projects with eai-core-error-handling-lib dependency';
  severity = 'error' as const;
  category = 'standards' as const;
  issueType: IssueType = 'bug';
  protected validateProject(context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    // projectRoot should exist in context (engine scans project)
    const pomPath = path.join(context.projectRoot, MulePaths.POM_XML);
    if (!fs.existsSync(pomPath)) {
        issues.push(
        this.createProjectIssue('Missing pom.xml file in project root', {
            severity: 'error',
        }),
        );
        return issues;
    }
    try{
        const content = fs.readFileSync(pomPath, 'utf-8');
        const appDeployPlatform = this.getAppDeployPlatform(context);
        const hybridErrMsg = "add dependency <dependency><groupId>com.andersen.eai</groupId><artifactId>eai-core-error-handling-lib</artifactId><version>2.3.0</version><classifier>mule-plugin</classifier></dependency>";
        const ch2ErrMsg = "add depdendency <dependency><groupId>09d89140-dc6e-4bac-ad5d-f55fc59af462</groupId><artifactId>eai-core-error-handling-lib</artifactId><version>3.0.1</version><classifier>mule-plugin</classifier></dependency>";
        // Check for mule-maven-plugin
        if (!content.includes('eai-core-error-handling-lib')) {
            issues.push(
            this.createProjectIssue('Missing eai-core-error-handling-lib dependency in pom.xml', {
                severity: 'error',
                suggestion: 
                    appDeployPlatform == "hybrid"
                        ? hybridErrMsg
                        : ch2ErrMsg
            }),
            );
        }
    }catch (error) {
        issues.push(
        this.createProjectIssue(`Error reading pom.xml: ${getErrorMessage(error)}`, {
            severity: 'error',
        }),
        );
    }
    return issues;
  }
}

/**
 * AWSTND-005: Missing AW EAI Core Logging library dependency
 * Missing EAI Core Logging Library to log request responses
 */
export class MissingCoreLoggingLibrary extends ProjectRule {
  id = 'AWSTND-005';
  name = 'Missing AW EAI Core Logging library dependency';
  description = 'Missing EAI Core logging library dependency for request response logging';
  severity = 'info' as const;
  category = 'standards' as const;
  
  protected validateProject(context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    // projectRoot should exist in context (engine scans project)
    const pomPath = path.join(context.projectRoot, MulePaths.POM_XML);
    if (!fs.existsSync(pomPath)) {
        issues.push(
        this.createProjectIssue('Missing pom.xml file in project root', {
            severity: 'error',
        }),
        );
        return issues;
    }
    try{
        const content = fs.readFileSync(pomPath, 'utf-8');
        const appDeployPlatform = this.getAppDeployPlatform(context);
        const ch2ErrMsg = "add depdendency <dependency><groupId>com.andersen.eai</groupId><artifactId>eai-core-logging-lib</artifactId><version>1.0.0-SNAPSHOT</version></dependency>";
        // Check for mule-maven-plugin
        if (appDeployPlatform == "cloudhub" && !content.includes('eai-core-logging-lib')) {
            issues.push(
            this.createProjectIssue('Missing eai-core-logging-lib dependency in pom.xml', {
                severity: 'info',
                suggestion: ch2ErrMsg
            }),
            );
        }
    }catch (error) {
        issues.push(
        this.createProjectIssue(`Error reading pom.xml: ${getErrorMessage(error)}`, {
            severity: 'error',
        }),
        );
    }
    return issues;
  }
}

/**
 * AWSTND-006: log4j2.xml is not modified for Hybrid environment
 * Standard log4j2.xml is not modified for Hybrid environment
 */
export class Log4JNotModifiedRule extends ProjectRule {
  id = 'AWSTND-006';
  name = 'Default log4j2.xml is not modified';
  description = 'Default log4j2.xml is not modified in hybird environment';
  severity = 'error' as const;
  category = 'standards' as const;
  issueType: IssueType = 'bug';
  protected validateProject(context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    // projectRoot should exist in context (engine scans project)
    const log4j2Path = path.join(context.projectRoot, MulePaths.LOG4J2_XML);
    if (!fs.existsSync(log4j2Path)) {
        issues.push(
        this.createProjectIssue('Missing log4j2.xml file in project root', {
            severity: 'error',
        }),
        );
        return issues;
    }
    try{
        const content = fs.readFileSync(log4j2Path, 'utf-8');
        const appDeployPlatform = this.getAppDeployPlatform(context);

        if (appDeployPlatform != null && appDeployPlatform == "cloudhub" && content.includes('mule.log.path')) {
            issues.push(
            this.createProjectIssue('logj4j2.xml should be reset to default and should not have custom paths.', {
                severity: 'error',
                suggestion: "Default log4j2.xml is modified, change fileName to change to sys:mule.home and filePattern as well",
            }),
            );
        }
        
        // Check for mule-maven-plugin
        if (!content.includes('mule.log.path') && (appDeployPlatform == "hybrid" || appDeployPlatform == "onprem" || appDeployPlatform == "azcloud")) {
            issues.push(
            this.createProjectIssue('Default log4j2.xml is not modified.', {
                severity: 'error',
                suggestion: "Default log4j2.xml is not modified, change fileName to change to sys:mule.log.path and filePattern as well",
            }),
            );
        }
    }catch (error) {
        issues.push(
        this.createProjectIssue(`Error reading log4j2.xml: ${getErrorMessage(error)}`, {
            severity: 'error',
        }),
        );
    }
    return issues;
  }
}

/**
 * AWSTND-007: log4j2.xml is not modified for Hybrid environment
 * Standard log4j2.xml is not modified for Hybrid environment
 */
export class CH2SplunkLoggingNotEnabled extends ProjectRule {
  id = 'AWSTND-007';
  name = 'Splunk Logging is not enabled for CloudHub App';
  description = 'Splunk Logging is not enabled for CloudHub App';
  severity = 'warning' as const;
  category = 'standards' as const;
  issueType: IssueType = 'bug';
  protected validateProject(context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    // projectRoot should exist in context (engine scans project)
    const log4j2Path = path.join(context.projectRoot, MulePaths.LOG4J2_XML);
    if (!fs.existsSync(log4j2Path)) {
        issues.push(
        this.createProjectIssue('Missing log4j2.xml file in project root', {
            severity: 'error',
        }),
        );
        return issues;
    }
    try{
        const content = fs.readFileSync(log4j2Path, 'utf-8');
        const appDeployPlatform = this.getAppDeployPlatform(context);

        if (appDeployPlatform != null && appDeployPlatform == "cloudhub" && !content.includes('SplunkHttp')) {
            issues.push(
            this.createProjectIssue('log4j2.xml is not modified to send the logs to Splunk via HTTP', {
                severity: 'warning',
                suggestion: "Configure SplunkHttp in cloudhub app, refer Cloudhub2.0 playbook from Confluence",
            }),
            );
        }        
    }catch (error) {
        issues.push(
        this.createProjectIssue(`Error reading log4j2.xml: ${getErrorMessage(error)}`, {
            severity: 'error',
        }),
        );
    }
    return issues;
  }  
}

/**
 * AWSTND-008: Missing or incorrect distribution management
 * Incorrect repository urls for distribution management
 */
export class IncorrectDistributionManagement extends ProjectRule {
  id = 'AWSTND-008';
  name = 'Missing or incorrect distribution management';
  description = 'Incorrect repository urls for distribution management';
  severity = 'error' as const;
  category = 'standards' as const;
  
  protected validateProject(context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    // projectRoot should exist in context (engine scans project)
    const pomPath = path.join(context.projectRoot, MulePaths.POM_XML);
    if (!fs.existsSync(pomPath)) {
        issues.push(
        this.createProjectIssue('Missing pom.xml file in project root', {
            severity: 'error',
        }),
        );
        return issues;
    }
    try{
        const content = fs.readFileSync(pomPath, 'utf-8');
        const appDeployPlatform = this.getAppDeployPlatform(context);
        const distRepoIds = this.getDistMgmtIds(content);
        //console.log(`distExists: ${distRepoIds.exists}`);
        //console.log(`repoId: ${distRepoIds.repositoryId}`);
        //console.log(`snapshotRepositoryId: ${distRepoIds.snapshotRepositoryId}`);
        const ch2ErrMsg = "Use Parent POM or update the correct values in distribution management as per confluence CH2 playbook";
        // Check for mule-maven-plugin
        if (appDeployPlatform == "cloudhub" && distRepoIds.exists == true && distRepoIds.repositoryId == undefined || (distRepoIds.repositoryId != undefined && !distRepoIds.repositoryId.includes('release.repo.id'))) {
            issues.push(
            this.createProjectIssue('Missing distribution management repository Ids in pom.xml', {
                severity: 'info',
                suggestion: ch2ErrMsg
            }),
            );
        }
    }catch (error) {
        issues.push(
        this.createProjectIssue(`Error reading pom.xml: ${getErrorMessage(error)}`, {
            severity: 'error',
        }),
        );
    }
    return issues;
  }
  protected getDistMgmtIds(pomXml: string): {
    exists: boolean,
    repositoryId?: string;
    snapshotRepositoryId?: string;
    }{
        const parser = new XMLParser({ ignoreAttributes: false });
        const doc = parser.parse(pomXml);
        const project = doc?.project ?? doc;
        const distMgmt = project?.distributionManagement;
        if (!distMgmt) return { exists: false };
        const repositoryId = this.normalizeLeaf(distMgmt?.repository?.id);
        const snapshotRepositoryId = this.normalizeLeaf(distMgmt?.snapshotRepository?.id);
        return {
            exists: true,
            repositoryId: repositoryId || undefined,
            snapshotRepositoryId: snapshotRepositoryId || undefined
        };
  }
  protected normalizeLeaf(v: any): string {
    if (v == null) return "";
    if (Array.isArray(v)) return String(v[0] ?? "").trim();
    if (typeof v === "object") {
        // some parsers use "#text"
        if (typeof v["#text"] === "string") return v["#text"].trim();
        return "";
    }
    return String(v).trim();
  }
}