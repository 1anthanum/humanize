import type { Issue, Language } from '@/types';
import { t } from '@/i18n';

interface IssuesListProps {
  issues: Issue[];
  language: Language;
}

export function IssuesList({ issues, language }: IssuesListProps) {
  if (issues.length === 0) {
    return (
      <div className="issue-card severity-success">
        <div className="issue-title">{t('issues.none.title', language)}</div>
        <div>{t('issues.none.desc', language)}</div>
      </div>
    );
  }

  return (
    <div className="issues-list">
      {issues.map((issue, i) => (
        <div key={i} className={`issue-card severity-${issue.severity}`}>
          <div className="issue-title">{issue.title}</div>
          <div className="issue-desc">{issue.description}</div>
          <div className="issue-suggestion">
            <strong>→</strong> {issue.suggestion}
          </div>
        </div>
      ))}
    </div>
  );
}
