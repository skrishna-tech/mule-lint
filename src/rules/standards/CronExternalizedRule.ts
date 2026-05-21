import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * OPS-003: Cron Expression Externalized
 *
 * Cron expressions in schedulers should use property placeholders.
 */
export class CronExternalizedRule extends BaseRule {
  id = 'OPS-003';
  name = 'Externalized Cron Expression';
  description = 'Cron expressions should use property placeholders';
  severity = 'warning' as const;
  category = 'standards' as const;

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Find scheduler cron expressions
    const cronNodes = this.select('//*[local-name()="cron"]', doc);

    for (const node of cronNodes) {
      const expression = this.getAttribute(node, 'expression');

      if (expression && !expression.includes('${')) {
        issues.push(
          this.createIssue(node, `Hardcoded cron expression: "${expression}"`, {
            suggestion:
              'Use expression="${scheduler.cron}" to allow environment-specific scheduling',
          }),
        );
      }
    }

    return issues;
  }
}

/**
 * OPS-004: Scheduler disallowConcurrentExecution is not set or set as False
 *
 * disallowConcurrentExecution on Scheduler is recommended to set as true, so there won't be any duplicate schedules.
 */
export class SchedulerPropertyRule extends BaseRule {
  id = 'OPS-004';
  name = 'Scheduler Property disallowConcurrentExecution is not set';
  description = 'disallowConcurrentExecution on Scheduler is recommended to set as true';
  severity = 'warning' as const;
  category = 'standards' as const;
  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    // Find scheduler tag
    const schedulerNodes = this.select('//*[local-name()="scheduler"]', doc);
    for (const node of schedulerNodes) {
      const expression = this.getAttribute(node, 'disallowConcurrentExecution');

      if (expression != null && expression != 'true') {
        issues.push(
          this.createIssue(
            node,
            `disallowConcurrentExecution is not set or the value is set as false`,
            {
              suggestion:
                'disallowConcurrentExecution on Scheduler is recommended to set as true, edit this in XML view disallowConcurrentExecution="true"',
            },
          ),
        );
      }
    }
    return issues;
  }
}
