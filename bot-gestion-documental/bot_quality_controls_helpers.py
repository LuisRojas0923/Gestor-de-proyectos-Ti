"""
Bot Quality Controls Helpers - Funciones auxiliares
==================================================

Funciones auxiliares para el módulo de controles de calidad.
"""

from typing import List, Dict, Any, Callable


class QualityControlHelpers:
    """Funciones auxiliares para controles de calidad"""
    
    def __init__(self, logger: Callable[[str], None]):
        self._log = logger
    
    def generate_validation_summary(self, results: List[Dict[str, Any]]):
        """Generar resumen de validación"""
        
        if not results:
            return
        
        total = len(results)
        completo = sum(1 for r in results if r['overall_status'] == 'COMPLETO')
        parcial = sum(1 for r in results if r['overall_status'] == 'PARCIAL')
        pendiente = sum(1 for r in results if r['overall_status'] == 'PENDIENTE')
        no_aplica = sum(1 for r in results if r['overall_status'] == 'NO_APLICA')
        
        self._log(f"\n📊 RESUMEN DE VALIDACIÓN DE CONTROLES:")
        self._log(f"   📋 Total desarrollos: {total}")
        self._log(f"   ✅ Completos: {completo}")
        self._log(f"   ⚠️ Parciales: {parcial}")
        self._log(f"   ⏸️ Pendientes: {pendiente}")
        self._log(f"   ❌ No aplican: {no_aplica}")
        
        # Mostrar desarrollos con problemas
        problematic = [r for r in results if r['overall_status'] in ['PARCIAL', 'PENDIENTE']]
        if problematic:
            self._log(f"\n⚠️ DESARROLLOS CON PROBLEMAS:")
            for result in problematic[:5]:  # Mostrar solo los primeros 5
                self._log(f"   • {result['dev_id']}: {result['dev_name']} - {result['overall_status']}")
        
        self._log("✅ Validación de controles completada")
