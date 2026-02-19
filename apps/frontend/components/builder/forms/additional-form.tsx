'use client';

import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AdditionalInfo,
  AdditionalSectionKey,
  DEFAULT_ADDITIONAL_SECTION_ORDER,
} from '@/components/dashboard/resume-component';
import { useTranslations } from '@/lib/i18n';
import { GripVertical } from 'lucide-react';

interface AdditionalFormProps {
  data: AdditionalInfo;
  onChange: (data: AdditionalInfo) => void;
}

const ADDITIONAL_FIELD_KEYS: AdditionalSectionKey[] = DEFAULT_ADDITIONAL_SECTION_ORDER;

function getLabelKey(key: AdditionalSectionKey): string {
  switch (key) {
    case 'technicalSkills':
      return 'resume.additional.technicalSkills';
    case 'languages':
      return 'resume.sections.languages';
    case 'certificationsTraining':
      return 'resume.sections.certifications';
    case 'awards':
      return 'resume.sections.awards';
    case 'creativeTools':
      return 'resume.sections.creativeTools';
    default:
      return key;
  }
}

function getPlaceholderKey(key: AdditionalSectionKey): string {
  const base = 'builder.additionalForm.placeholders.';
  switch (key) {
    case 'technicalSkills':
      return `${base}technicalSkills`;
    case 'languages':
      return `${base}languages`;
    case 'certificationsTraining':
      return `${base}certifications`;
    case 'awards':
      return `${base}awards`;
    case 'creativeTools':
      return `${base}creativeTools`;
    default:
      return `${base}technicalSkills`;
  }
}

interface SortableAdditionalRowProps {
  id: string;
  titleLabel: string;
  titleValue: string;
  fieldKey: AdditionalSectionKey;
  value: string;
  placeholder: string;
  onTitleChange: (key: AdditionalSectionKey, value: string) => void;
  onValueChange: (key: AdditionalSectionKey, value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

const SortableAdditionalRow: React.FC<SortableAdditionalRowProps> = ({
  id,
  titleLabel,
  titleValue,
  fieldKey,
  value,
  placeholder,
  onTitleChange,
  onValueChange,
  onKeyDown,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative flex gap-3 items-start">
      <div
        {...attributes}
        {...listeners}
        className="mt-8 flex shrink-0 cursor-grab active:cursor-grabbing touch-none"
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-700" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <Label
          htmlFor={`${id}-title`}
          className="font-mono text-xs uppercase tracking-wider text-gray-500"
        >
          {titleLabel}
        </Label>
        <Input
          id={`${id}-title`}
          value={titleValue}
          onChange={(e) => onTitleChange(fieldKey, e.target.value)}
          placeholder={titleLabel}
          className="font-mono text-xs uppercase tracking-wider text-black rounded-none border-black bg-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-blue-700"
        />
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onValueChange(fieldKey, e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="min-h-[100px] text-black rounded-none border-black bg-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-blue-700 resize-y"
        />
      </div>
    </div>
  );
};

export const AdditionalForm: React.FC<AdditionalFormProps> = ({ data, onChange }) => {
  const { t } = useTranslations();

  const order = data.additionalSectionOrder ?? ADDITIONAL_FIELD_KEYS;

  const handleArrayChange = (field: AdditionalSectionKey, value: string) => {
    const items = value.split('\n').filter((item) => item.trim() !== '');
    onChange({
      ...data,
      [field]: items,
    });
  };

  const formatArray = (arr?: string[]) => arr?.join('\n') || '';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') e.stopPropagation();
  };

  const handleSubsectionLabelChange = (key: AdditionalSectionKey, value: string) => {
    const next = { ...data.additionalSubsectionLabels };
    if (value.trim() === '') {
      delete next[key];
    } else {
      next[key] = value;
    }
    onChange({
      ...data,
      additionalSubsectionLabels: Object.keys(next).length ? next : undefined,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = order.indexOf(active.id as AdditionalSectionKey);
    const newIndex = order.indexOf(over.id as AdditionalSectionKey);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = [...order];
    const [removed] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, removed);
    onChange({ ...data, additionalSectionOrder: newOrder });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const leftRatioPercent = Math.round(
    Math.min(0.75, Math.max(0.25, data.skillsLeftColumnRatio ?? 0.5)) * 100
  );
  const gapRem = Math.min(2.5, Math.max(0.5, data.skillsColumnGapRem ?? 1.25));

  const handleColumnRatioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value) / 100;
    onChange({ ...data, skillsLeftColumnRatio: value });
  };
  const handleColumnGapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    onChange({ ...data, skillsColumnGapRem: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3 font-mono text-xs">
        <Label className="text-gray-600 uppercase tracking-wider">
          {t('builder.additionalForm.columnRatioLabel')}
        </Label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={25}
            max={75}
            step={5}
            value={leftRatioPercent}
            onChange={handleColumnRatioChange}
            className="flex-1 h-2 rounded-none accent-blue-700 border border-black"
          />
          <span className="shrink-0 w-28 text-black">
            Left {leftRatioPercent}% · Right {100 - leftRatioPercent}%
          </span>
        </div>
        <p className="text-blue-700 border-l-2 border-blue-700 pl-2">
          {t('builder.additionalForm.columnRatioHint')}
        </p>
        <div className="flex items-center gap-3 pt-1">
          <Label className="text-gray-600 uppercase tracking-wider shrink-0">
            {t('builder.additionalForm.columnGapLabel')}
          </Label>
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.25}
            value={gapRem}
            onChange={handleColumnGapChange}
            className="flex-1 max-w-[200px] h-2 rounded-none accent-blue-700 border border-black"
          />
          <span className="shrink-0 w-14 text-black">{gapRem} rem</span>
        </div>
      </div>
      <p className="font-mono text-xs text-blue-700 border-l-2 border-blue-700 pl-3">
        {t('builder.additionalForm.instructions')}
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            {order.map((key) => (
              <SortableAdditionalRow
                key={key}
                id={key}
                titleLabel={t(getLabelKey(key))}
                titleValue={data.additionalSubsectionLabels?.[key] ?? ''}
                fieldKey={key}
                value={formatArray(data[key])}
                placeholder={t(getPlaceholderKey(key))}
                onTitleChange={handleSubsectionLabelChange}
                onValueChange={handleArrayChange}
                onKeyDown={handleKeyDown}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
