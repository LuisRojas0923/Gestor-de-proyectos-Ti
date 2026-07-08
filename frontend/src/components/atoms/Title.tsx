import React from 'react';
import { Text, TextProps } from './Text';

export interface TitleProps extends Omit<TextProps, 'variant'> {
    variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2';
}

/**
 * Title component - A semantic wrapper around the Text atom for headings.
 */
export const Title: React.FC<TitleProps> = ({
    children,
    variant = 'h1',
    as,
    ...props
}) => {
    let resolvedAs = as;
    if (!resolvedAs) {
        if (variant === 'subtitle1' || variant === 'subtitle2') {
            resolvedAs = 'h6';
        } else {
            resolvedAs = variant;
        }
    }

    return (
        <Text
            as={resolvedAs}
            variant={variant}
            weight="bold"
            {...props}
        >
            {children}
        </Text>
    );
};
