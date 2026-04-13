import React from 'react';

interface AdobePdfIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

/**
 * Átomo AdobePdfIcon que representa el logo oficial de Acrobat PDF.
 * Utilizado para descargas de certificados y documentos legales.
 */
export const AdobePdfIcon: React.FC<AdobePdfIconProps> = ({ 
  size = 24, 
  color = "#F40F02", 
  className = "",
  ...props 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Fondo de tarjeta de archivo */}
      <path 
        d="M4 2H14L20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V2Z" 
        fill={color}
      />
      {/* Esquina doblada */}
      <path 
        d="M14 2L20 8H14V2Z" 
        fill="white" 
        fillOpacity="0.3"
      />
      {/* Logo Squiggle de Adobe (Simplificado para claridad en 24px) */}
      <path 
        d="M12 11.5c-0.6 0-1.1 0.3-1.1 0.8 0 0.5 0.5 0.8 1.1 0.8 0.6 0 1.1-0.3 1.1-0.8 0-0.5-0.5-0.8-1.1-0.8zM15.5 13.5c-0.8 0.1-1.5 0.3-2.2 0.5 0.2 0.4 0.4 0.9 0.4 1.3 0 0.2-0.1 0.4-0.1 0.4 -0.1 0.1-0.2 0.1-0.3 0.1 -0.1 0-0.3-0.1-0.4-0.2 -0.2-0.2-0.4-0.4-0.4-0.6 0-0.2 0.1-0.4 0.3-0.8 0.2-0.3 0.3-0.5 0.5-0.7 -0.1 0-0.2 0-0.3 0 -0.8 0-1.6 0.1-2.2 0.2 0.1 0 0.3-0.1 0.3-0.1 0.1 0 0.2-0.1 0.2-0.1 0.3-0.3 0.6-0.8 0.6-1.3 0-0.4-0.1-0.7-0.3-0.9 -0.1-0.1-0.2-0.1-0.3-0.1h-0.1c-0.2 0-0.4 0.1-0.6 0.3 -0.1 0.2-0.2 0.4-0.2 0.7 0 0.7 0.2 1.3 0.6 1.8 -0.3 0.1-0.5 0.2-0.8 0.3 -0.5 0.2-1 0.4-1.4 0.7 -0.1 0.1-0.3 0.2-0.4 0.4 -0.1 0.1-0.2 0.2-0.2 0.4 0 0.2 0.1 0.3 0.2 0.4 0.1 0.1 0.2 0.2 0.3 0.2 0.1 0 0.2-0.1 0.3-0.2 0.2-0.2 1-0.9 1.8-1.4 0.6-0.3 1.2-0.6 1.8-0.8l0.4-0.1c0.7-0.2 1.5-0.3 2.2-0.4 0.1 0 0.3 0.1 0.3 0.2 0.1 0.2 0.1 0.4 0 0.6l-0.1 0.2c-0.2 0.2-0.5 0.4-0.8 0.6 -0.1 0.1-0.3 0.2-0.5 0.2h-0.1c-0.2 0-0.4-0.1-0.5-0.2 -0.1-0.1-0.2-0.3-0.2-0.5 0-0.1 0-0.2 0.1-0.3C15.9 13.9 15.8 13.7 15.5 13.5z" 
        fill="white"
      />
    </svg>
  );
};

export default AdobePdfIcon;
