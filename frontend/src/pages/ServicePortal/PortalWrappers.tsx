import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import CategoryView, { Category } from './pages/CategoryView';
import TicketFormView from './pages/TicketFormView';
import TicketDetailView from './pages/TicketDetailView';

export const CategoryWrapper: React.FC<{
    categories: Category[],
    onSelect: (c: Category) => void,
    onBack: () => void
}> = ({ categories, onSelect, onBack }) => {
    const { area } = useParams<{ area: string }>();

    const filteredCategories = categories.filter(c => {
        if (area === 'sistemas') return c.section === 'soporte';
        if (area === 'mejoramiento') return c.id === 'soporte_mejora' || c.id === 'nuevos_desarrollos_mejora';
        if (area === 'desarrollo') return c.id === 'control_cambios' || c.id === 'nuevos_desarrollos_solid';
        return true;
    });

    return <CategoryView categories={filteredCategories} onSelect={onSelect} onBack={onBack} />;
};

export const TicketFormWrapper: React.FC<{
    selectedCategory: any,
    categories: Category[],
    user: any,
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>,
    onBack: () => void,
    isLoading: boolean,
    selectedFiles: File[],
    onFilesChange: React.Dispatch<React.SetStateAction<File[]>>
}> = ({ selectedCategory, categories, user, onSubmit, onBack, isLoading, selectedFiles, onFilesChange }) => {
    const { categoryId } = useParams<{ categoryId: string }>();
    const category = selectedCategory || categories.find(c => c.id === categoryId);

    if (!category && categories.length > 0) {
        return <Navigate to="/service-portal/servicios" replace />;
    }

    if (categories.length === 0) {
        return <div className="p-20 text-center"><div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-[var(--color-primary)] rounded-full" role="status"></div></div>;
    }

    return (
        <TicketFormView
            selectedCategory={category}
            user={user as any}
            onSubmit={onSubmit}
            onBack={onBack}
            isLoading={isLoading}
            selectedFiles={selectedFiles}
            onFilesChange={onFilesChange}
        />
    );
};

export const TicketDetailWrapper: React.FC<{
    selectedTicket: any,
    tickets: any[],
    user: any,
    onBack: () => void,
    onUpdate: (e: React.FormEvent<HTMLFormElement>) => Promise<void>
}> = ({ selectedTicket, tickets, user, onBack, onUpdate }) => {
    const { ticketId } = useParams<{ ticketId: string }>();
    const ticket = selectedTicket || tickets.find(t => t.id === ticketId);

    if (!ticket && tickets.length > 0) {
        return <Navigate to="/service-portal/mis-tickets" replace />;
    }

    if (tickets.length === 0) {
        return <div className="p-20 text-center"><div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-[var(--color-primary)] rounded-full" role="status"></div></div>;
    }

    return (
        <TicketDetailView
            selectedTicket={ticket}
            user={user as any}
            onBack={onBack}
            onUpdate={onUpdate}
        />
    );
};
