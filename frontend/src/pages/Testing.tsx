import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import {
  Plus,
  Play,
  Pause,
  Clock,
  User,
  MoreHorizontal,
  Sparkles,
  Filter,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import LoadingSpinner from '../components/common/LoadingSpinner';

interface TestTask {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'testing' | 'blocked' | 'approved';
  requirementId: string;
  estimatedHours: number;
  actualHours: number;
  assignedTo: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  isTimerActive?: boolean;
}

const Testing: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useAppContext();
  const { darkMode } = state;
  const { post, loading } = useApi();

  const [tasks, setTasks] = useState<TestTask[]>([
    {
      id: '1',
      title: 'Validar formulario de registro',
      description: 'Probar validaciones de campos obligatorios y formato email',
      status: 'backlog',
      requirementId: 'REQ-0001',
      estimatedHours: 4,
      actualHours: 0,
      assignedTo: 'Ana García',
      priority: 'high',
      createdAt: '2025-01-15',
    },
    {
      id: '2',
      title: 'Test de integración API pagos',
      description: 'Verificar flujo completo de pago con tarjeta',
      status: 'testing',
      requirementId: 'REQ-0002',
      estimatedHours: 8,
      actualHours: 5,
      assignedTo: 'Carlos López',
      priority: 'high',
      createdAt: '2025-01-14',
      isTimerActive: true,
    },
    {
      id: '3',
      title: 'Prueba de carga dashboard',
      description: 'Validar rendimiento con 1000+ usuarios concurrentes',
      status: 'blocked',
      requirementId: 'REQ-0003',
      estimatedHours: 6,
      actualHours: 2,
      assignedTo: 'María Rodríguez',
      priority: 'medium',
      createdAt: '2025-01-13',
    },
    {
      id: '4',
      title: 'Test automatizado login',
      description: 'Crear suite de pruebas para autenticación',
      status: 'approved',
      requirementId: 'REQ-0004',
      estimatedHours: 3,
      actualHours: 3,
      assignedTo: 'Pedro Sánchez',
      priority: 'low',
      createdAt: '2025-01-12',
    },
  ]);

  const [filterPriority, setFilterPriority] = useState('all');
  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({});

  const columns = [
    { id: 'backlog', title: t('backlog'), color: 'bg-neutral-100 dark:bg-neutral-700' },
    { id: 'testing', title: t('testing'), color: 'bg-blue-100 dark:bg-blue-900/20' },
    { id: 'blocked', title: 'Bloqueado', color: 'bg-red-100 dark:bg-red-900/20' },
    { id: 'approved', title: 'Aprobado', color: 'bg-green-100 dark:bg-green-900/20' },
  ];

  useEffect(() => {
    // Update timers every minute
    const interval = setInterval(() => {
      setActiveTimers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(taskId => {
          updated[taskId] += 1;
        });
        return updated;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId) return;

    const updatedTasks = tasks.map(task => {
      if (task.id === draggableId) {
        return { ...task, status: destination.droppableId as TestTask['status'] };
      }
      return task;
    });

    setTasks(updatedTasks);
  };

  const toggleTimer = (taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const newTimerState = !task.isTimerActive;
        
        if (newTimerState) {
          setActiveTimers(timers => ({ ...timers, [taskId]: 0 }));
        } else {
          setActiveTimers(timers => {
            const { [taskId]: removed, ...rest } = timers;
            return rest;
          });
          // Update actual hours
          const additionalMinutes = activeTimers[taskId] || 0;
          return { ...task, actualHours: task.actualHours + (additionalMinutes / 60), isTimerActive: false };
        }
        
        return { ...task, isTimerActive: newTimerState };
      }
      return task;
    }));
  };

  const generateAIScenarios = async () => {
    try {
      const response = await post('/test/ai-scenarios', { 
        requirementIds: tasks.map(t => t.requirementId) 
      });
      if (response) {
        // Add generated scenarios to backlog
        // This would be handled by the API response
        console.log('AI scenarios generated:', response);
      }
    } catch (error) {
      console.error('Error generating AI scenarios:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-neutral-500';
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  const filteredTasks = tasks.filter(task => 
    filterPriority === 'all' || task.priority === filterPriority
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          {t('testing')}
        </h1>
        <div className="flex items-center space-x-4">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-neutral-700 border-neutral-600 text-white'
                : 'bg-white border-neutral-300 text-neutral-900'
            } focus:outline-none focus:ring-2 focus:ring-primary-500`}
          >
            <option value="all">Todas las prioridades</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
          <button
            onClick={generateAIScenarios}
            disabled={loading}
            className="bg-secondary-500 hover:bg-secondary-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            {loading ? <LoadingSpinner size="sm" /> : <Sparkles size={20} />}
            <span>{t('generateAIScenarios')}</span>
          </button>
          <button className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
            <Plus size={20} />
            <span>Nueva Tarea</span>
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {columns.map(column => (
            <div key={column.id} className={`${column.color} rounded-xl p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                  {column.title}
                </h3>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  darkMode ? 'bg-neutral-600 text-neutral-300' : 'bg-neutral-200 text-neutral-600'
                }`}>
                  {filteredTasks.filter(task => task.status === column.id).length}
                </span>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`space-y-3 min-h-[200px] transition-colors ${
                      snapshot.isDraggingOver ? 'bg-primary-50 dark:bg-primary-900/10' : ''
                    }`}
                  >
                    {filteredTasks
                      .filter(task => task.status === column.id)
                      .map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`${
                                darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
                              } border rounded-lg p-4 border-l-4 ${getPriorityColor(task.priority)} transition-all ${
                                snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className={`font-medium text-sm ${
                                  darkMode ? 'text-white' : 'text-neutral-900'
                                }`}>
                                  {task.title}
                                </h4>
                                <button className={`p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                                  darkMode ? 'text-neutral-400' : 'text-neutral-500'
                                }`}>
                                  <MoreHorizontal size={16} />
                                </button>
                              </div>

                              <p className={`text-xs mb-3 ${
                                darkMode ? 'text-neutral-400' : 'text-neutral-600'
                              }`}>
                                {task.description}
                              </p>

                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center space-x-2">
                                  <User size={12} className={darkMode ? 'text-neutral-400' : 'text-neutral-500'} />
                                  <span className={darkMode ? 'text-neutral-400' : 'text-neutral-600'}>
                                    {task.assignedTo}
                                  </span>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  task.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                  'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                }`}>
                                  {task.priority}
                                </span>
                              </div>

                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-600">
                                <div className="flex items-center space-x-2">
                                  <Clock size={12} className={darkMode ? 'text-neutral-400' : 'text-neutral-500'} />
                                  <span className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                                    {task.actualHours.toFixed(1)}h / {task.estimatedHours}h
                                  </span>
                                </div>
                                
                                {task.status === 'testing' && (
                                  <button
                                    onClick={() => toggleTimer(task.id)}
                                    className={`p-1 rounded transition-colors ${
                                      task.isTimerActive 
                                        ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400'
                                        : 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
                                    }`}
                                  >
                                    {task.isTimerActive ? <Pause size={12} /> : <Play size={12} />}
                                  </button>
                                )}
                              </div>

                              {task.isTimerActive && (
                                <div className="mt-2 text-center">
                                  <span className="text-xs font-mono bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                                    +{formatTime(activeTimers[task.id] || 0)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default Testing;