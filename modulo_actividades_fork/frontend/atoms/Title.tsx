import React from 'react';
import { Text, TextProps } from './Text';

export interface TitleProps extends Omit<TextProps, 'variant'> {
    variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
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
    return (
        <Text
            as={as || variant}
            variant={variant}
            weight="bold"
            {...props}
        >
            {children}
        </Text>
    );
};
