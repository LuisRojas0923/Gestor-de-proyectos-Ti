import React from 'react';
import { Text } from '../atoms';

interface LogoSolidSolutionsProps {
  size?: 'small' | 'normal' | 'large';
  color?: string;
  variant?: 'full' | 'short' | 'erp' | 'portal' | 'icon';
  fixedColors?: boolean;
}

const LogoSolidSolutions: React.FC<LogoSolidSolutionsProps> = ({
  size = 'normal',
  color = 'var(--text-primary)',
  variant = 'full',
  fixedColors = false,
}) => {
  const isSmall = size === 'small';
  const isLarge = size === 'large';
  const isShort = variant === 'short';
  const isERP = variant === 'erp';
  const isPortal = variant === 'portal';
  const isIconOnly = variant === 'icon';

  const barWidth = isLarge ? 'w-[8px]' : isSmall ? 'w-1' : 'w-[5px]';
  const barGap = isLarge ? 'gap-[3px]' : isSmall ? 'gap-0.5' : 'gap-0.5';
  const barHeight = isLarge ? 'h-10' : isSmall ? 'h-[18px]' : 'h-6';

  return (
    <div className={`flex items-center select-none ${isIconOnly ? 'gap-0' : 'gap-2'}`}>
      {!isIconOnly && (
        <div className="flex items-center leading-none">
          <Text as="span" weight="bold" className="italic font-['Inter'] tracking-tight">
            Solid
          </Text>
          {!isShort && (
            <>
              <Text as="span" weight="bold" className="italic font-['Inter'] tracking-tight mx-0.5">
                -
              </Text>
              <Text as="span" weight="bold" className="italic font-['Inter'] tracking-tight">
                {isERP ? 'ERP' : isPortal ? 'Portal de Servicios' : 'Solutions'}
              </Text>
            </>
          )}
        </div>
      )}

      <div
        className={`flex items-end ${isLarge ? 'pb-1' : 'pb-0.5'} ${barGap} ${barHeight}`}
      >
        <div
          className={`rounded-sm ${barWidth} h-[40%] ${fixedColors ? 'bg-[var(--white)]' : 'bg-[var(--text-primary)]'}`}
        />
        <div
          className={`rounded-sm ${barWidth} h-[70%] bg-[var(--powder-blue-400)]`}
        />
        <div
          className={`rounded-sm ${barWidth} h-full bg-[var(--deep-navy-800)] ${isLarge ? 'shadow-[0_0_18px_rgba(90,145,255,0.6)]' : 'shadow-[0_0_12px_rgba(90,145,255,0.6)]'}`}
        />
      </div>
    </div>
  );
};

export default LogoSolidSolutions;
