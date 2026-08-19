// Icon paths lifted verbatim from StageChart Design Spec.dc.html (Lucide
// icon set, per the Classical readme) so the app matches the spec pixel for
// pixel rather than substituting a different icon library's glyphs.
import React from 'react';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const base = (size: number, strokeWidth: number, color: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: color,
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function MenuIcon({ size = 16, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Line x1="3" y1="6" x2="21" y2="6" />
      <Line x1="3" y1="12" x2="21" y2="12" />
      <Line x1="3" y1="18" x2="21" y2="18" />
    </Svg>
  );
}

export function EditIcon({ size = 16, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </Svg>
  );
}

export function SettingsIcon({ size = 17, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}

export function PdfFileIcon({ size = 26, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <Path d="M14 2v6h6" />
    </Svg>
  );
}

export function XmlFileIcon({ size = 12, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </Svg>
  );
}

export function TypeInIcon({ size = 12, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Svg>
  );
}

export function UploadIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <Polyline points="17 8 12 3 7 8" />
      <Line x1="12" y1="3" x2="12" y2="15" />
    </Svg>
  );
}

export function PlusIcon({ size = 16, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="M5 12h14" />
      <Path d="M12 5v14" />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = 16, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

export function GripIcon({ size = 14, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth={strokeWidth}>
      <Circle cx="9" cy="6" r="1.2" />
      <Circle cx="15" cy="6" r="1.2" />
      <Circle cx="9" cy="12" r="1.2" />
      <Circle cx="15" cy="12" r="1.2" />
      <Circle cx="9" cy="18" r="1.2" />
      <Circle cx="15" cy="18" r="1.2" />
    </Svg>
  );
}

export function ZapIcon({ size = 20, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
    </Svg>
  );
}

export function TunerIcon({ size = 17, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </Svg>
  );
}

export function PitchPipeIcon({ size = 17, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="M9 18V5l12-2v13" />
      <Circle cx="6" cy="18" r="3" />
      <Circle cx="18" cy="16" r="3" />
    </Svg>
  );
}

export function StageDarkIcon({ size = 17, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </Svg>
  );
}

export function UndoIcon({ size = 16, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="M9 14 4 9l5-5" />
      <Path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </Svg>
  );
}

export function TrashIcon({ size = 16, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="M3 6h18" />
      <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <Line x1="10" y1="11" x2="10" y2="17" />
      <Line x1="14" y1="11" x2="14" y2="17" />
    </Svg>
  );
}
