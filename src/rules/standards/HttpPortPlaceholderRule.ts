import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';
import { MulePaths } from '../base/MulePaths';
//import { PomHelper } from "../../core/PomHelper";
import { PomValues } from "../base/PomValues";
import * as path from 'path';
import * as fs from 'fs';
/**
 * OPS-002: HTTP Port Placeholder
 *
 * HTTP listener ports should use property placeholders, not hardcoded values.
 */
export class HttpPortPlaceholderRule extends BaseRule {
  id = 'OPS-002';
  name = 'HTTP Port Placeholder';
  description = 'HTTP listener ports should use property placeholders';
  severity = 'error' as const;
  category = 'standards' as const;

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    const pomPath = path.join(_context.projectRoot, MulePaths.POM_XML);
    if (!fs.existsSync(pomPath)) {
        issues.push(
        this.createFileIssue('Missing pom.xml file in project root', {
            severity: 'error',
        }),
        );
        return issues;
    } 
    const isCloudApp = PomValues.isCloudHubApp(pomPath);
    console.log("app isCloudApp from HttpListenerValidationRule:", isCloudApp);
    // Check HTTP listener configurations
    const listenerConfigs = this.select('//*[local-name()="listener-config"]', doc);

    for (const config of listenerConfigs) {
      const conns = this.select('//*[local-name()="listener-connection"]', config);
      for (const conn of conns) {
        const port = this.getAttribute(conn, 'port');
        console.log("port in listener HttpListenerValidationRule1:", port);
        //if (port && /^\d+$/.test(port)) {
        if (port && isCloudApp && !(port == '8081')) {
          // Port is a hardcoded number
          const name = this.getNameAttribute(config) ?? 'HTTP Listener Config';
          issues.push(
            this.createIssue(config, `HTTP config "${name}" should use 8081 as port in cloudhub"`, {
              suggestion: 'Use port=8081 for cloudhub application',
            }),
          );
          break;
        }
      }
    }

    return issues;
  }
}
/**
 * OPS-003: HTTPS Hybird Listener configuration
 *
 * Listener on Hybrid (onprem) should be https and azure should be http
 */
export class HttpListenerValidationRule extends BaseRule {
  id = 'OPS-004';
  name = 'HTTP Listener Placeholder';
  description = 'HTTP listener protocol should be http (azure) and https (onprem)';
  severity = 'error' as const;
  category = 'standards' as const;
  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    // Check HTTP listener configurations
    const pomPath = path.join(_context.projectRoot, MulePaths.POM_XML);
    if (!fs.existsSync(pomPath)) {
        issues.push(
        this.createFileIssue('Missing pom.xml file in project root', {
            severity: 'error',
        }),
        );
        return issues;
    }    
    const artifactId = PomValues.getArtifactId(pomPath);
    //console.log("app artifactId from HttpListenerValidationRule:", artifactId);
    const appPlatform = PomValues.getAppPlatform(pomPath);
    //console.log("app appPlatform from HttpListenerValidationRule:", appPlatform);    
    // Check HTTP listener configurations
    let lastConfigRef: string | undefined;
    const listenerConfigs = this.select('//*[local-name()="listener"]', doc);
    for (const config of listenerConfigs) {
      const configName = this.getAttribute(config, 'config-ref');
      //console.log(`Doc Name HttpListenerValidationRule: ${configName}`)        
      if (appPlatform != undefined && appPlatform == 'onprem' && configName != undefined && !(configName == 'https-listener-config')){
        issues.push(
          this.createIssue(config, `HTTP config "${configName}" is not valid in OnPrem"`, {
          suggestion: 'use https-listener-config from parent pom',
          }),
        );      
      } //endifOnPrem
      if (appPlatform != undefined && appPlatform == 'azcloud' && configName != undefined && !(configName == 'http-listener-config')){
        issues.push(
          this.createIssue(config, `HTTP config "${configName}" is not valid in Azure"`, {
          suggestion: 'use http-listener-config from parent pom',
          }),
        );      
      } //endifAzure
      break;
    }
    return issues;
  }
}