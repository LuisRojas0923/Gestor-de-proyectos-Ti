import os
import csv
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Dict, Tuple

try:
    import requests
except ImportError:
    requests = None

from PySide6.QtCore import Qt, QAbstractTableModel, QModelIndex, QSortFilterProxyModel
from PySide6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QPushButton,
    QFileDialog, QTableView, QMessageBox
)


@dataclass
class DevelopmentRecord:
    remedy_id: str
    name: str
    state: str


@dataclass
class PlannedAction:
    action_type: str  # 'move' | 'create' | 'noop'
    remedy_id: str
    development_name: str
    source_path: Optional[str]
    target_path: str
    note: str


class SimpleTableModel(QAbstractTableModel):
    def __init__(self, headers: List[str], rows: List[List[str]]):
        super().__init__()
        self.headers = headers
        self.rows = rows

    def rowCount(self, parent=QModelIndex()) -> int:
        return len(self.rows)

    def columnCount(self, parent=QModelIndex()) -> int:
        return len(self.headers)

    def data(self, index: QModelIndex, role=Qt.DisplayRole):
        if not index.isValid():
            return None
        if role == Qt.DisplayRole:
            return self.rows[index.row()][index.column()]
        return None

    def headerData(self, section: int, orientation: Qt.Orientation, role=Qt.DisplayRole):
        if role == Qt.DisplayRole and orientation == Qt.Horizontal:
            return self.headers[section]
        return super().headerData(section, orientation, role)

    def update(self, rows: List[List[str]]):
        self.beginResetModel()
        self.rows = rows
        self.endResetModel()


class DocBotQt(QWidget):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("Bot de Gestión Documental - Qt")
        self.resize(1100, 700)

        self.api_base = QLineEdit("http://localhost:8000/api/v1")
        self.auth_header = QLineEdit("")
        self.base_path = QLineEdit(r"C:\\Users\\lerv8093\\OneDrive - Grupo Coomeva\\PROYECTOS DESARROLLOS\\Desarrollos")

        self.developments: List[DevelopmentRecord] = []
        self.planned: List[PlannedAction] = []

        self._build_ui()

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)

        # Config top bar
        row1 = QHBoxLayout()
        row1.addWidget(QLabel("API Base URL:"))
        row1.addWidget(self.api_base)
        row1.addWidget(QLabel("Authorization (opcional):"))
        row1.addWidget(self.auth_header)
        layout.addLayout(row1)

        row2 = QHBoxLayout()
        row2.addWidget(QLabel("Ruta base local:"))
        row2.addWidget(self.base_path)
        choose_btn = QPushButton("Elegir...")
        choose_btn.clicked.connect(self._choose_folder)
        row2.addWidget(choose_btn)
        layout.addLayout(row2)

        row3 = QHBoxLayout()
        load_btn = QPushButton("Cargar desarrollos")
        load_btn.clicked.connect(self._load_developments)
        analyze_btn = QPushButton("Analizar carpeta local")
        analyze_btn.clicked.connect(self._analyze)
        exec_btn = QPushButton("Ejecutar acciones")
        exec_btn.clicked.connect(self._execute)
        row3.addWidget(load_btn)
        row3.addWidget(analyze_btn)
        row3.addWidget(exec_btn)
        layout.addLayout(row3)

        # Filter bar
        filt_row = QHBoxLayout()
        filt_row.addWidget(QLabel("Filtrar desarrollos:"))
        self.filter_edit = QLineEdit()
        self.filter_edit.textChanged.connect(self._apply_filter)
        filt_row.addWidget(self.filter_edit)
        layout.addLayout(filt_row)

        # Developments table
        self.dev_model = SimpleTableModel(["Remedy", "Nombre", "Estado"], [])
        self.dev_proxy = QSortFilterProxyModel(self)
        self.dev_proxy.setSourceModel(self.dev_model)
        self.dev_proxy.setFilterCaseSensitivity(Qt.CaseInsensitive)
        self.dev_proxy.setFilterKeyColumn(-1)  # todas
        self.dev_table = QTableView()
        self.dev_table.setModel(self.dev_proxy)
        self.dev_table.setSortingEnabled(True)
        self.dev_table.setSelectionBehavior(QTableView.SelectRows)
        self.dev_table.setAlternatingRowColors(True)
        self.dev_table.horizontalHeader().setStretchLastSection(True)
        layout.addWidget(QLabel("Desarrollos (desde API)"))
        layout.addWidget(self.dev_table)

        # Planned actions table
        self.act_model = SimpleTableModel(["Acción", "Remedy", "Nombre", "Origen", "Destino", "Nota"], [])
        self.act_proxy = QSortFilterProxyModel(self)
        self.act_proxy.setSourceModel(self.act_model)
        self.act_proxy.setFilterCaseSensitivity(Qt.CaseInsensitive)
        self.act_proxy.setFilterKeyColumn(-1)
        self.act_table = QTableView()
        self.act_table.setModel(self.act_proxy)
        self.act_table.setSortingEnabled(True)
        self.act_table.setSelectionBehavior(QTableView.SelectRows)
        self.act_table.setAlternatingRowColors(True)
        self.act_table.horizontalHeader().setStretchLastSection(True)
        layout.addWidget(QLabel("Acciones planificadas"))
        layout.addWidget(self.act_table)

        # Status
        self.status = QLabel("Listo")
        layout.addWidget(self.status)

    def _choose_folder(self) -> None:
        chosen = QFileDialog.getExistingDirectory(self, "Elegir carpeta base", self.base_path.text())
        if chosen:
            self.base_path.setText(chosen)

    def _set_status(self, text: str) -> None:
        self.status.setText(text)

    def _apply_filter(self, text: str) -> None:
        self.dev_proxy.setFilterFixedString(text)

    def _load_developments(self) -> None:
        if requests is None:
            QMessageBox.critical(self, "Dependencia faltante", "Instale 'requests': pip install requests")
            return
        try:
            self._set_status("Cargando desarrollos del API...")
            base = self.api_base.text().rstrip('/')
            url = f"{base}/developments/"
            headers: Dict[str, str] = {}
            if self.auth_header.text().strip():
                headers["Authorization"] = self.auth_header.text().strip()
            resp = requests.get(url, headers=headers, timeout=20)
            resp.raise_for_status()
            data = resp.json()

            parsed: List[DevelopmentRecord] = []
            for item in data:
                remedy = str(item.get("id") or item.get("incident_id") or item.get("remedy_id") or "").strip()
                name = str(item.get("name") or item.get("title") or "").strip()
                state = str(item.get("general_status") or item.get("status") or "Pendiente").strip()
                if not remedy or not name:
                    continue
                parsed.append(DevelopmentRecord(remedy_id=remedy, name=name, state=state))

            self.developments = parsed
            self.dev_model.update([[d.remedy_id, d.name, d.state] for d in self.developments])
            self._set_status(f"Cargados {len(self.developments)} desarrollos")
        except Exception as e:
            QMessageBox.critical(self, "Error API", f"No se pudo cargar desarrollos: {e}")
            self._set_status("Error al cargar desarrollos")

    def _analyze(self) -> None:
        base = self.base_path.text().strip()
        if not base or not os.path.isdir(base):
            QMessageBox.warning(self, "Ruta inválida", "Ingrese una ruta base válida")
            return
        if not self.developments:
            QMessageBox.information(self, "Sin desarrollos", "Cargue los desarrollos desde el API primero")
            return

        self._set_status("Analizando estructura local...")
        all_folders: List[Tuple[str, str]] = []
        for current_dir, subdirs, _files in os.walk(base):
            for sd in subdirs:
                all_folders.append((sd, os.path.join(current_dir, sd)))

        planned: List[PlannedAction] = []
        for dev in self.developments:
            target_state_dir = os.path.join(base, dev.state)
            desired_name = f"{dev.remedy_id}_{dev.name}"
            found_path = None
            rid = dev.remedy_id.strip().lower()
            for folder_name, folder_path in all_folders:
                if rid and rid in folder_name.lower():
                    if (found_path is None) or (len(folder_path) > len(found_path)):
                        found_path = folder_path

            if found_path:
                current_parent = os.path.dirname(found_path)
                if os.path.normcase(current_parent) != os.path.normcase(target_state_dir):
                    target_path = os.path.join(target_state_dir, os.path.basename(found_path))
                    planned.append(PlannedAction("move", dev.remedy_id, dev.name, found_path, target_path, f"Mover a estado '{dev.state}'"))
                else:
                    planned.append(PlannedAction("noop", dev.remedy_id, dev.name, found_path, found_path, "Sin cambios"))
            else:
                target_path = os.path.join(target_state_dir, desired_name)
                planned.append(PlannedAction("create", dev.remedy_id, dev.name, None, target_path, f"Crear en '{dev.state}'"))

        self.planned = planned
        self.act_model.update([[p.action_type, p.remedy_id, p.development_name, p.source_path or "-", p.target_path, p.note] for p in self.planned])
        self._set_status(f"Análisis completado. Acciones: {len(self.planned)}")

    def _execute(self) -> None:
        if not self.planned:
            QMessageBox.information(self, "Sin acciones", "No hay acciones planificadas para ejecutar")
            return
        if QMessageBox.question(self, "Confirmar", "¿Ejecutar acciones planificadas?", QMessageBox.Yes | QMessageBox.No) != QMessageBox.Yes:
            return

        log_rows: List[Tuple[str, str, str, str, str]] = []
        for action in self.planned:
            try:
                if action.action_type == "noop":
                    log_rows.append((self._now(), "NOOP", action.remedy_id, action.target_path, action.note))
                    continue

                target_parent = os.path.dirname(action.target_path)
                os.makedirs(target_parent, exist_ok=True)

                if action.action_type == "move":
                    if action.source_path and os.path.isdir(action.source_path):
                        os.replace(action.source_path, action.target_path)
                        log_rows.append((self._now(), "MOVE", action.remedy_id, action.target_path, action.note))
                    else:
                        log_rows.append((self._now(), "SKIP", action.remedy_id, action.target_path, "Origen no existe"))
                elif action.action_type == "create":
                    if not os.path.isdir(action.target_path):
                        os.makedirs(action.target_path, exist_ok=True)
                        for sub in ("Correos", "Formatos", "Documentos"):
                            os.makedirs(os.path.join(action.target_path, sub), exist_ok=True)
                        log_rows.append((self._now(), "CREATE", action.remedy_id, action.target_path, action.note))
                    else:
                        log_rows.append((self._now(), "SKIP", action.remedy_id, action.target_path, "Ya existía"))
            except Exception as e:
                log_rows.append((self._now(), "ERROR", action.remedy_id, action.target_path, str(e)))

        try:
            log_dir = os.path.join(os.path.dirname(__file__), "logs")
            os.makedirs(log_dir, exist_ok=True)
            log_path = os.path.join(log_dir, f"bot_qt_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
            with open(log_path, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(["fecha", "accion", "remedy", "ruta", "detalle"])
                for row in log_rows:
                    writer.writerow(row)
            QMessageBox.information(self, "Completado", f"Acciones ejecutadas. Log: {log_path}")
        except Exception as e:
            QMessageBox.warning(self, "Log no guardado", f"No se pudo guardar el log: {e}")

    @staticmethod
    def _now() -> str:
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def main():
    app = QApplication([])
    w = DocBotQt()
    w.show()
    app.exec()


if __name__ == "__main__":
    main()


