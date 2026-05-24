import React from 'react';
import { WizardStep } from '../hooks/useWizard';
import { Button, Text } from '../../../atoms';

interface WizardProgressIndicatorProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick: (step: number) => void;
  darkMode: boolean;
  disabled?: boolean;
}

export const WizardProgressIndicator: React.FC<WizardProgressIndicatorProps> = ({
  steps,
  currentStep,
  onStepClick,
  darkMode,
  disabled = false,
}) => {
  const getStepStyles = (step: WizardStep, index: number) => {
    const isActive = step.id === currentStep;
    const isCompleted = step.id < currentStep;
    const isPending = step.id > currentStep;

    let baseClasses = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors';

    if (isActive) {
      baseClasses += darkMode ? ' bg-blue-600 text-white' : ' bg-blue-600 text-white';
    } else if (isCompleted) {
      baseClasses += darkMode ? ' bg-green-600 text-white' : ' bg-green-600 text-white';
    } else {
      baseClasses += darkMode ? ' bg-neutral-600 text-neutral-300' : ' bg-neutral-200 text-neutral-600';
    }

    if (disabled) {
      baseClasses += ' cursor-not-allowed opacity-50';
    } else {
      baseClasses += ' cursor-pointer hover:scale-105';
    }

    return baseClasses;
  };

  const getLineStyles = (index: number) => {
    const isCompleted = steps[index].id < currentStep;

    let baseClasses = 'flex-1 h-1 rounded transition-all duration-300';

    if (isCompleted) {
      baseClasses += darkMode ? ' bg-green-600' : ' bg-green-600';
    } else {
      baseClasses += darkMode ? ' bg-neutral-600' : ' bg-neutral-200';
    }

    return baseClasses;
  };

  return (
    <div className="flex items-center space-x-2">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <Button
            variant="ghost"
            onClick={() => !disabled && onStepClick(step.id)}
            className={getStepStyles(step, index)}
            disabled={disabled}
            title={`${step.title}: ${step.description}`}
            aria-label={`Paso ${step.id}: ${step.title}`}
          >
            {step.id < currentStep ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              step.id
            )}
          </Button>
          {index < steps.length - 1 && (
            <div className={getLineStyles(index)} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
