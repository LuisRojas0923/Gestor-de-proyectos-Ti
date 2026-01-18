import React from 'react';
import { Text, TextProps } from './Text';

export interface SubtitleProps extends Omit<TextProps, 'variant'> {
    variant?: 'h4' | 'h5' | 'h6' | 'body1';
}

/**
 * Subtitle component - A semantic wrapper around the Text atom for sub-headings.
 */
export const Subtitle: React.FC<SubtitleProps> = ({
    children,
    variant = 'h5',
    as,
    ...props
}) => {
    return (
        <Text
            as={as || (variant.startsWith('h') ? variant as any : 'h5')}
            variant={variant}
            weight="medium"
            color="text-secondary"
            {...props}
        >
            {children}
        </Text>
    );
};
