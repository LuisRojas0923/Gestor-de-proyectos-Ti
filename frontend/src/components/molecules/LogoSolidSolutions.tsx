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

  const barWidth = isLarge ? 'w-2' : isSmall ? 'w-1' : 'w-[5px]';
  const barGap = isLarge ? 'gap-1' : isSmall ? 'gap-0.5' : 'gap-0.5';
  const barHeight = isLarge ? 'h-8' : isSmall ? 'h-[18px]' : 'h-6';

  return (
    <div className="flex items-center select-none" style={{ gap: isIconOnly ? '0' : '0.5rem' }}>
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
        className={`flex items-end pb-0.5 ${barGap}`}
        style={{ height: isLarge ? '32px' : isSmall ? '18px' : '24px' }}
      >
        <div
          className={`rounded-sm ${barWidth}`}
          style={{
            height: '40%',
            background: fixedColors ? 'var(--white)' : 'var(--text-primary)',
          }}
        />
        <div
          className={`rounded-sm ${barWidth}`}
          style={{
            height: '70%',
            background: 'var(--powder-blue-400)',
          }}
        />
        <div
          className={`rounded-sm ${barWidth}`}
          style={{
            height: '100%',
            background: 'var(--deep-navy-800)',
            boxShadow: '0 0 12px rgba(90, 145, 255, 0.6)',
          }}
        />
      </div>
    </div>
  );
};

export default LogoSolidSolutions;
