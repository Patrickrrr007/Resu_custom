'use client';

import { useMemo } from 'react';
import {
  type ResumeData,
  type AdditionalSectionKey,
  DEFAULT_ADDITIONAL_SECTION_ORDER,
} from '@/components/dashboard/resume-component';
import { segmentTextByKeywords } from '@/lib/utils/keyword-matcher';
import { FileUser, Briefcase, GraduationCap, FolderKanban, Wrench } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';

interface HighlightedResumeViewProps {
  resumeData: ResumeData;
  keywords: Set<string>;
}

/**
 * Display resume content with matching keywords highlighted.
 * Shows all resume sections with visual highlighting of JD matches.
 */
export function HighlightedResumeView({ resumeData, keywords }: HighlightedResumeViewProps) {
  const { t } = useTranslations();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-200 bg-gray-50">
        <FileUser className="w-4 h-4 text-gray-600" />
        <h3 className="font-mono text-sm font-bold uppercase text-gray-700">
          {t('builder.jdMatch.yourResume')}
        </h3>
        <span className="text-xs text-gray-500 ml-2">
          {t('builder.jdMatch.matchingKeywordsHighlighted')}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Summary */}
        {resumeData.summary && (
          <Section title={t('resume.sections.summary')} icon={<FileUser className="w-4 h-4" />}>
            <HighlightedText text={resumeData.summary} keywords={keywords} />
          </Section>
        )}

        {/* Work Experience */}
        {resumeData.workExperience && resumeData.workExperience.length > 0 && (
          <Section title={t('resume.sections.experience')} icon={<Briefcase className="w-4 h-4" />}>
            {resumeData.workExperience.map((exp) => (
              <div key={exp.id} className="mb-4 last:mb-0">
                <div className="font-semibold text-gray-900">
                  <HighlightedText text={exp.title || ''} keywords={keywords} />
                  {exp.company && (
                    <span className="text-gray-600">
                      {t('builder.jdMatch.atSeparator')}
                      <HighlightedText text={exp.company} keywords={keywords} />
                    </span>
                  )}
                </div>
                {exp.years && <div className="text-xs text-gray-500 mb-1">{exp.years}</div>}
                {exp.description && (
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {exp.description.map((bullet, i) => (
                      <li key={i} className="text-gray-700">
                        <HighlightedText text={bullet} keywords={keywords} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Education */}
        {resumeData.education && resumeData.education.length > 0 && (
          <Section
            title={t('resume.sections.education')}
            icon={<GraduationCap className="w-4 h-4" />}
          >
            {resumeData.education.map((edu) => (
              <div key={edu.id} className="mb-3 last:mb-0">
                <div className="font-semibold text-gray-900">
                  <HighlightedText text={edu.degree || ''} keywords={keywords} />
                </div>
                {edu.institution && (
                  <div className="text-sm text-gray-600">
                    <HighlightedText text={edu.institution} keywords={keywords} />
                  </div>
                )}
                {edu.years && <div className="text-xs text-gray-500">{edu.years}</div>}
              </div>
            ))}
          </Section>
        )}

        {/* Projects */}
        {resumeData.personalProjects && resumeData.personalProjects.length > 0 && (
          <Section
            title={t('resume.sections.projects')}
            icon={<FolderKanban className="w-4 h-4" />}
          >
            {resumeData.personalProjects.map((proj) => (
              <div key={proj.id} className="mb-4 last:mb-0">
                <div className="font-semibold text-gray-900">
                  <HighlightedText text={proj.name || ''} keywords={keywords} />
                  {proj.role && (
                    <span className="text-gray-600 font-normal">
                      {' '}
                      {t('builder.jdMatch.roleSeparator')}{' '}
                      <HighlightedText text={proj.role} keywords={keywords} />
                    </span>
                  )}
                </div>
                {proj.years && <div className="text-xs text-gray-500 mb-1">{proj.years}</div>}
                {proj.description && (
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {proj.description.map((bullet, i) => (
                      <li key={i} className="text-gray-700">
                        <HighlightedText text={bullet} keywords={keywords} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Skills - left bar layout, ordered subsections */}
        {resumeData.additional &&
          (() => {
            const additional = resumeData.additional;
            const order: AdditionalSectionKey[] =
              additional.additionalSectionOrder ?? DEFAULT_ADDITIONAL_SECTION_ORDER;
            const defaultLabels: Record<AdditionalSectionKey, string> = {
              technicalSkills: t('resume.additional.technicalSkills'),
              languages: t('resume.sections.languages'),
              certificationsTraining: t('resume.sections.certifications'),
              awards: t('resume.sections.awards'),
              creativeTools: t('resume.sections.creativeTools'),
            };
            const labelByKey: Record<AdditionalSectionKey, string> = {
              technicalSkills:
                additional.additionalSubsectionLabels?.technicalSkills?.trim() ||
                defaultLabels.technicalSkills,
              languages:
                additional.additionalSubsectionLabels?.languages?.trim() || defaultLabels.languages,
              certificationsTraining:
                additional.additionalSubsectionLabels?.certificationsTraining?.trim() ||
                defaultLabels.certificationsTraining,
              awards: additional.additionalSubsectionLabels?.awards?.trim() || defaultLabels.awards,
              creativeTools:
                additional.additionalSubsectionLabels?.creativeTools?.trim() ||
                defaultLabels.creativeTools,
            };
            const rows = order
              .map((key) => {
                const items = additional[key] ?? [];
                return items.length > 0 ? { key, label: labelByKey[key], items } : null;
              })
              .filter(
                (r): r is { key: AdditionalSectionKey; label: string; items: string[] } =>
                  r !== null
              );
            if (rows.length === 0) return null;
            const mid = Math.ceil(rows.length / 2);
            const leftRows = rows.slice(0, mid);
            const rightRows = rows.slice(mid);
            const leftRatio = Math.min(
              0.75,
              Math.max(0.25, additional.skillsLeftColumnRatio ?? 0.5)
            );
            const gapRem = Math.min(2.5, Math.max(0.5, additional.skillsColumnGapRem ?? 1.25));
            const renderRow = ({ key: rowKey, label, items }: (typeof rows)[number]) => (
              <div key={rowKey} className="flex gap-2">
                <span className="font-bold shrink-0 text-gray-700">{label}:</span>
                <span className="text-gray-700">
                  <HighlightedText text={items.join(', ')} keywords={keywords} />
                </span>
              </div>
            );
            return (
              <Section title={t('resume.sections.skills')} icon={<Wrench className="w-4 h-4" />}>
                <div
                  className="border-l-4 border-gray-500 pl-3 grid space-y-1 text-sm"
                  style={{
                    gridTemplateColumns: `${leftRatio}fr ${1 - leftRatio}fr`,
                    columnGap: `${gapRem}rem`,
                  }}
                >
                  <div className="space-y-1">{leftRows.map(renderRow)}</div>
                  <div className="space-y-1">{rightRows.map(renderRow)}</div>
                </div>
              </Section>
            );
          })()}
      </div>
    </div>
  );
}

/**
 * Section wrapper component
 */
function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 bg-white rounded">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
        {icon}
        <span className="font-mono text-xs font-bold uppercase text-gray-600">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

/**
 * Component to render text with highlighted keywords.
 */
function HighlightedText({ text, keywords }: { text: string; keywords: Set<string> }) {
  const segments = useMemo(() => segmentTextByKeywords(text, keywords), [text, keywords]);

  return (
    <span>
      {segments.map((segment, i) =>
        segment.isMatch ? (
          <mark key={i} className="bg-yellow-200 text-gray-900 px-0.5 rounded-sm">
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </span>
  );
}
