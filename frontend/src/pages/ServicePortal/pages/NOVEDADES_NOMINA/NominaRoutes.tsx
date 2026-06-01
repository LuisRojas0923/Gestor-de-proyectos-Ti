import React from 'react';
import { Routes, Route } from 'react-router-dom';
import NominaDashboard from './NominaDashboard';
import NominaUploadView from './NominaUploadView';
import NominaPreviewView from './NominaPreviewView';
import NominaSummaryView from './NominaSummaryView';
import NominaHistorialView from './NominaHistorialView';
import GrancoopPreview from './GrancoopPreview';
import BeneficiarPreview from './BeneficiarPreview';
import HdiPreview from './HdiPreview';
import BogotaLibranzaPreview from './BogotaLibranzaPreview';
import DaviviendaLibranzaPreview from './DaviviendaLibranzaPreview';
import OccidenteLibranzaPreview from './OccidenteLibranzaPreview';
import CamposantoPreview from './CamposantoPreview';
import RecordarPreview from './RecordarPreview';
import PolizasVehiculosPreview from './PolizasVehiculosPreview';
import MedicinaPrepagadaPreview from './MedicinaPrepagadaPreview';
import OtrosGerenciaPreview from './OtrosGerenciaPreview';
import ControlDescuentosPreview from './ControlDescuentosPreview';
import ControlDescuentosDashboard from './ControlDescuentosDashboard';
import ControlDescuentosTabla from './ControlDescuentosTabla';
import ControlDescuentosConceptos from './ControlDescuentosConceptos';
import ControlDescuentosRegistro from './ControlDescuentosRegistro';
import CelularesPreview from './CelularesPreview';
import RetencionesPreview from './RetencionesPreview';
import EmbargosPreview from './EmbargosPreview';
import ExcepcionesPreview from './ExcepcionesPreview';
import PlanillasRegionales1QPreview from './PlanillasRegionales1QPreview';
import PlanillasRegionales2QPreview from './PlanillasRegionales2QPreview';
import TablaMaestraView from './TablaMaestraView';

const NominaRoutes = () => (
    <Routes>
        <Route index element={<NominaDashboard />} />
        <Route path="LIBRANZAS/BOGOTA LIBRANZA" element={<BogotaLibranzaPreview />} />
        <Route path="LIBRANZAS/DAVIVIENDA LIBRANZA" element={<DaviviendaLibranzaPreview />} />
        <Route path="LIBRANZAS/OCCIDENTE LIBRANZA" element={<OccidenteLibranzaPreview />} />
        <Route path="COOPERATIVAS/GRANCOOP" element={<GrancoopPreview />} />
        <Route path="COOPERATIVAS/BENEFICIAR" element={<BeneficiarPreview />} />
        <Route path="OTROS/SEGUROS HDI" element={<HdiPreview />} />
        <Route path="FUNEBRES/CAMPOSANTO" element={<CamposantoPreview />} />
        <Route path="FUNEBRES/RECORDAR" element={<RecordarPreview />} />
        <Route path="OTROS/POLIZAS VEHICULOS" element={<PolizasVehiculosPreview />} />
        <Route path="OTROS/MEDICINA PREPAGADA" element={<MedicinaPrepagadaPreview />} />
        <Route path="OTROS/OTROS GERENCIA" element={<OtrosGerenciaPreview />} />
        <Route path="OTROS/GESTION EXCEPCIONES" element={<ExcepcionesPreview />} />
        <Route path="NOVEDADES/PLANILLAS REGIONALES 1Q" element={<PlanillasRegionales1QPreview />} />
        <Route path="NOVEDADES/PLANILLAS REGIONALES 2Q" element={<PlanillasRegionales2QPreview />} />
        <Route path="DESCUENTOS/CONTROL DE DESCUENTOS" element={<ControlDescuentosTabla />} />
        <Route path="DESCUENTOS/CONTROL DE DESCUENTOS/preview" element={<ControlDescuentosPreview />} />
        <Route path="DESCUENTOS/CONTROL DE DESCUENTOS/tabla" element={<ControlDescuentosTabla />} />
        <Route path="DESCUENTOS/CONTROL DE DESCUENTOS/conceptos" element={<ControlDescuentosConceptos />} />
        <Route path="DESCUENTOS/CONTROL DE DESCUENTOS/registro" element={<ControlDescuentosRegistro />} />
        <Route path="DESCUENTOS/CELULARES" element={<CelularesPreview />} />
        <Route path="DESCUENTOS/RETENCIONES" element={<RetencionesPreview />} />
        <Route path="DESCUENTOS/EMBARGOS" element={<EmbargosPreview />} />
        <Route path=":category/:subcategory" element={<NominaUploadView />} />
        <Route path="preview/:archivoId" element={<NominaPreviewView />} />
        <Route path="resumen" element={<NominaSummaryView />} />
        <Route path="tabla-maestra" element={<TablaMaestraView />} />
        <Route path="historial" element={<NominaHistorialView />} />
    </Routes>
);

export default NominaRoutes;
