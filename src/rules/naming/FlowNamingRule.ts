import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-002: Flow Naming Convention
 *
 * Flows must end with "-flow" suffix, sub-flows with "-subflow".
 * This ensures consistent naming across the project.
 */
export class FlowNamingRule extends BaseRule {
  id = 'MULE-002';
  name = 'Flow Naming Convention';
  description = 'Flows should end with "-flow", sub-flows with "-subflow" for consistent naming';
  severity = 'warning' as const;
  category = 'naming' as const;

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    
    // Existing options still supported (string or string[])
    const flowSuffixOption = this.getOption(context, 'flowSuffix', undefined) as
      | string
      | string[]
      | undefined;

    const subflowSuffixOption = this.getOption(context, 'subflowSuffix', undefined) as
      | string
      | string[]
      | undefined;

    // Get configurable suffixes
    //const flowSuffix = this.getOption(context, 'flowSuffix', '-flow');
    //const subflowSuffix = this.getOption(context, 'subflowSuffix', '-subflow');
    const excludePatterns = this.getOption(context, 'excludePatterns', [
      '*-api-main',
      '*-main', // Common pattern for main flows
      '*-api-console',
      // APIKit auto-generated flow patterns (HTTP verb:resource:config format)
      'get:*',
      'post:*',
      'put:*',
      'patch:*',
      'delete:*',
      'options:*',
      'head:*',
    ]);

    // Default accepted suffix patterns (case-insensitive, - or _)
    // Matches: -flow, _flow, -FLOW, _Flow, etc.
    const defaultFlowSuffixRegex = /[-_]flow$/i;

    // Matches: -subflow, _subflow, -SUBFLOW, _SubFlow, etc.
    const defaultSubflowSuffixRegex = /[-_]subflow$/i;

    // Helper to determine if name ends with allowed suffix
    const endsWithAllowedSuffix = (
      name: string,
      option: string | string[] | undefined,
      fallbackRegex: RegExp,
    ): boolean => {
      if (Array.isArray(option)) {
        // exact suffix match for any provided
        return option.some((sfx) => name.endsWith(sfx));
      }
      if (typeof option === 'string' && option.length > 0) {
        // exact suffix match for provided single suffix
        return name.endsWith(option);
      }
      // default: case-insensitive -/_ variants
      return fallbackRegex.test(name);
    };

    const suggestionSuffixText = (kind: 'flow' | 'subflow'): string => {
      // Keep suggestions simple + aligned to the rule text
      return kind === 'flow' ? '-flow or _flow' : '-subflow or _subflow';
    };

    const suggestRename = (name: string, kind: 'flow' | 'subflow'): string => {
      // Prefer preserving existing delimiter if present; otherwise default to "-".
      const delimiter = name.includes('_') ? '_' : '-';
      const suffixBase = kind === 'flow' ? 'flow' : 'subflow';
      return `${name}${delimiter}${suffixBase}`;
    };

    // Check flows
    const flows = this.select('//mule:flow', doc);
    for (const flow of flows) {
      const name = this.getNameAttribute(flow);
      if (!name) {
        continue;
      }

      // Skip excluded patterns
      if (this.isExcluded(name, excludePatterns)) {
        continue;
      }
      /*
      if (!name.endsWith(flowSuffix)) {
        issues.push(
          this.createIssue(flow, `Flow "${name}" should end with "${flowSuffix}"`, {
            suggestion: `Rename to "${name}${flowSuffix}"`,
          }),
        );
      }
    }
    */
    const ok = endsWithAllowedSuffix(name, flowSuffixOption, defaultFlowSuffixRegex);
      if (!ok) {
        issues.push(
          this.createIssue(flow, `Flow "${name}" should end with ${suggestionSuffixText('flow')}`, {
            suggestion: `Rename to "${suggestRename(name, 'flow')}"`,
          }),
        );
      }
    }

    // Check sub-flows
    const subflows = this.select('//mule:sub-flow', doc);
    for (const subflow of subflows) {
      const name = this.getNameAttribute(subflow);
      if (!name) {
        continue;
      }

      // Skip excluded patterns
      if (this.isExcluded(name, excludePatterns)) {
        continue;
      }
      
      /*
      if (!name.endsWith(subflowSuffix)) {
        issues.push(
          this.createIssue(subflow, `Sub-flow "${name}" should end with "${subflowSuffix}"`, {
            suggestion: `Rename to "${name}${subflowSuffix}"`,
          }),
        );
      }
      */
      const ok = endsWithAllowedSuffix(name, subflowSuffixOption, defaultSubflowSuffixRegex);
      if (!ok) {
        issues.push(
          this.createIssue(
            subflow,
            `Sub-flow "${name}" should end with ${suggestionSuffixText('subflow')}`,
            {
              suggestion: `Rename to "${suggestRename(name, 'subflow')}"`,
            },
          ),
        );
      }
    }
    return issues;
  }
}
