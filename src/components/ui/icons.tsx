import React from 'react';
import { ICON_PATHS } from './iconPaths';

export interface DuotoneIconProps extends React.SVGProps<SVGSVGElement> {
  name: keyof typeof ICON_PATHS;
  size?: number;
}

export const DuotoneIcon: React.FC<DuotoneIconProps> = ({
  name,
  size = 24,
  className = '',
  ...rest
}) => {
  const def = ICON_PATHS[name] || ICON_PATHS.shieldCheck;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="currentColor"
      className={`inline-block shrink-0 select-none ${className}`}
      aria-hidden="true"
      dangerouslySetInnerHTML={{
        __html: `${def.tone || ''}${def.stroke}`,
      }}
      {...rest}
    />
  );
};
