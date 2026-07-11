import React from 'react';
import { Route } from 'react-router-dom';
import ProtectedRoute from '../../../components/auth/ProtectedRoute';

const PreLiquidacionView = React.lazy(() => import('../pages/HORAS_EXTRAS/PreLiquidacionView'));
const CalculoListView = React.lazy(() => import('../pages/HORAS_EXTRAS/CalculoListView'));
const CalculoDetailView = React.lazy(() => import('../pages/HORAS_EXTRAS/CalculoDetailView'));
const BolsaView = React.lazy(() => import('../pages/HORAS_EXTRAS/BolsaView'));
const CostosOtView = React.lazy(() => import('../pages/HORAS_EXTRAS/CostosOtView'));
const FestivosView = React.lazy(() => import('../pages/HORAS_EXTRAS/FestivosView'));
const HorarioSemanaView = React.lazy(() => import('../pages/HORAS_EXTRAS/HorarioSemanaView'));
const ConfiguracionHorasExtrasView = React.lazy(() => import('../pages/HORAS_EXTRAS/ConfiguracionHorasExtrasView'));
const NovedadesView = React.lazy(() => import('../pages/HORAS_EXTRAS/NovedadesView'));
const NovedadFormView = React.lazy(() => import('../pages/HORAS_EXTRAS/NovedadFormView'));
const PlanificadorSemanalView = React.lazy(() => import('../pages/HORAS_EXTRAS/PlanificadorSemanalView'));
const EmpleadosActivosView = React.lazy(() => import('../pages/HORAS_EXTRAS/EmpleadosActivosView'));
const PlantillasHorario = React.lazy(() => import('../pages/HORAS_EXTRAS/PlantillasHorario'));
const AlcanceEmpleados = React.lazy(() => import('../pages/AlcanceEmpleados'));
const BiometriaModule = React.lazy(() => import('../pages/Biometria/BiometriaModule'));

const protegida = (element: React.ReactElement, moduleCode = 'nomina_horas_extras.leer') => (
  <ProtectedRoute moduleCode={moduleCode}>{element}</ProtectedRoute>
);

export const createServicePortalFeatureRoutes = () => [
  <Route key="he-pre" path="horas-extras/pre-liquidacion" element={protegida(<PreLiquidacionView />, 'nomina_horas_extras.planificar')} />,
  <Route key="he-list" path="horas-extras/calculos" element={protegida(<CalculoListView />)} />,
  <Route key="he-detail" path="horas-extras/calculos/:calculoId" element={protegida(<CalculoDetailView />)} />,
  <Route key="he-bolsa" path="horas-extras/bolsa" element={protegida(<BolsaView />)} />,
  <Route key="he-empleados" path="horas-extras/empleados" element={protegida(<EmpleadosActivosView />)} />,
  <Route key="he-costos" path="horas-extras/costos-ot" element={protegida(<CostosOtView />)} />,
  <Route key="he-festivos" path="horas-extras/festivos" element={protegida(<FestivosView />)} />,
  <Route key="he-config" path="horas-extras/configuracion" element={protegida(<ConfiguracionHorasExtrasView />, 'nomina_horas_extras.admin')} />,
  <Route key="he-horario" path="horas-extras/horario" element={protegida(<HorarioSemanaView />, 'nomina_horas_extras.planificar')} />,
  <Route key="he-horario-id" path="horas-extras/horario/:cedula" element={protegida(<HorarioSemanaView />, 'nomina_horas_extras.planificar')} />,
  <Route key="he-novedades" path="horas-extras/novedades" element={protegida(<NovedadesView />)} />,
  <Route key="he-novedad-new" path="horas-extras/novedades/nueva" element={protegida(<NovedadFormView />, 'nomina_horas_extras.planificar')} />,
  <Route key="he-novedad" path="horas-extras/novedades/:id" element={protegida(<NovedadFormView />, 'nomina_horas_extras.planificar')} />,
  <Route key="he-plan" path="horas-extras/planificador" element={protegida(<PlanificadorSemanalView />, 'nomina_horas_extras.planificar')} />,
  <Route key="he-plantillas" path="horas-extras/plantillas" element={protegida(<PlantillasHorario />, 'nomina_horas_extras.plantillas_horario.administrar')} />,
  <Route key="alcance" path="alcance-empleados" element={protegida(<AlcanceEmpleados />, 'alcance_empleados.administrar')} />,
  <Route key="biometria" path="biometria" element={protegida(<BiometriaModule />, 'biometria')} />,
];
