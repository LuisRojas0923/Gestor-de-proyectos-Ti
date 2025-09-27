import { useState, useCallback } from 'react';

export const useModals = () => {
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, development: null });
  const [activityDeleteModal, setActivityDeleteModal] = useState({ isOpen: false, activity: null });
  const [shouldRollbackStage, setShouldRollbackStage] = useState(false);
  const [activityEditModal, setActivityEditModal] = useState({ isOpen: false, activity: null, form: null });
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [activityEditErrors, setActivityEditErrors] = useState<string[]>([]);

  const validateActivityEditForm = useCallback((form: any) => {
    const errors: string[] = [];
    if (form.start_date && form.end_date && new Date(form.start_date) > new Date(form.end_date)) {
      errors.push('La fecha de inicio no puede ser mayor que la de fin.');
    }
    return errors;
  }, []);

  const updateActivityEditForm = useCallback((patch: Partial<any>) => {
    setActivityEditModal(prev => {
      if (!prev.form) return prev;
      const newForm = { ...prev.form, ...patch };
      setActivityEditErrors(validateActivityEditForm(newForm));
      return { ...prev, form: newForm };
    });
  }, [validateActivityEditForm]);

  return {
    isImportModalOpen, setImportModalOpen,
    deleteConfirmModal, setDeleteConfirmModal,
    activityDeleteModal, setActivityDeleteModal,
    shouldRollbackStage, setShouldRollbackStage,
    activityEditModal, setActivityEditModal,
    isEditModalOpen, setEditModalOpen,
    activityEditErrors,
    updateActivityEditForm,
    openDeleteConfirmModal: (dev: any) => setDeleteConfirmModal({ isOpen: true, development: dev }),
    closeDeleteConfirmModal: () => setDeleteConfirmModal({ isOpen: false, development: null }),
    openActivityDeleteModal: (act: any) => setActivityDeleteModal({ isOpen: true, activity: act }),
    closeActivityDeleteModal: () => setActivityDeleteModal({ isOpen: false, activity: null }),
    openActivityEditModal: (act: any) => setActivityEditModal({ isOpen: true, activity: act, form: act }),
    closeActivityEditModal: () => setActivityEditModal({ isOpen: false, activity: null, form: null }),
  };
};
