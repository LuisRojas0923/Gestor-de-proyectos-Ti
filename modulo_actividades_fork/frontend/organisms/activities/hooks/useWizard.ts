import { useState, useCallback } from 'react';

export interface WizardStep {
  id: number;
  title: string;
  description: string;
  isValid: boolean;
}

export interface UseWizardProps {
  steps: WizardStep[];
  onStepChange?: (step: number) => void;
}

export interface UseWizardReturn {
  currentStep: number;
  canGoNext: () => boolean;
  canGoPrevious: () => boolean;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (step: number) => void;
  isLastStep: boolean;
  isFirstStep: boolean;
  currentStepData: WizardStep;
  progressPercentage: number;
}

export const useWizard = ({ steps, onStepChange }: UseWizardProps): UseWizardReturn => {
  const [currentStep, setCurrentStep] = useState(1);

  const currentStepData = steps[currentStep - 1];

  const canGoNext = useCallback((): boolean => {
    const currentStepData = steps[currentStep - 1];
    return currentStepData?.isValid || false;
  }, [steps, currentStep]);

  const canGoPrevious = useCallback((): boolean => {
    return currentStep > 1;
  }, [currentStep]);

  const goToNextStep = useCallback(() => {
    if (canGoNext() && currentStep < steps.length) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      onStepChange?.(newStep);
    }
  }, [canGoNext, currentStep, steps.length, onStepChange]);

  const goToPreviousStep = useCallback(() => {
    if (canGoPrevious()) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      onStepChange?.(newStep);
    }
  }, [canGoPrevious, currentStep, onStepChange]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= steps.length) {
      setCurrentStep(step);
      onStepChange?.(step);
    }
  }, [steps.length, onStepChange]);

  const isLastStep = currentStep === steps.length;
  const isFirstStep = currentStep === 1;
  const progressPercentage = (currentStep / steps.length) * 100;

  return {
    currentStep,
    canGoNext,
    canGoPrevious,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    isLastStep,
    isFirstStep,
    currentStepData,
    progressPercentage,
  };
};
