# 🚀 Plataforma de Monitoreo y Automatización NAC
<img width="1905" height="1071" alt="Pestaña Bloqueos" src="https://github.com/user-attachments/assets/96654b29-9e0c-4a3e-bdf1-9f0b1c23a79f" />

<img width="1896" height="999" alt="Alerta Moderada" src="https://github.com/user-attachments/assets/ef88dead-79c1-4355-934d-4a4e4ba338e7" />

Plataforma fullstack desarrollada para la centralización, monitoreo y análisis de alertas NAC (Network Access Control) en entornos corporativos.

El sistema automatiza la importación y procesamiento de alertas desde Outlook, permitiendo visualizar métricas operativas, detectar reincidencias y optimizar procesos relacionados con validación de cumplimiento y gestión de incidentes de red.

La solución fue diseñada para reducir tareas manuales y mejorar la trazabilidad de dispositivos mediante análisis de eventos y dashboards interactivos.

---

# 🛠 Tecnologías utilizadas

## Backend

* Python
* FastAPI
* SQLAlchemy
* SQLite

## Frontend

* React
* TypeScript
* Vite
* Material UI

## Automatización

* ETL Outlook
* Scripts Python
* Procesamiento automático de alertas
* Integración con correo corporativo

---

# ⚙️ Funcionalidades

* Dashboard de métricas NAC
* Consulta avanzada de dispositivos
* Gestión de reincidencias
* Análisis de bloqueos
* KPIs operativos
* Importación automática de alertas desde Outlook
* API REST para consulta y análisis de eventos
* Búsqueda por IP, MAC, hostname y usuario
* Trazabilidad de dispositivos
* Centralización de alertas de seguridad

---

# 🧠 Arquitectura

```bash
Outlook → ETL Python → FastAPI → SQLite → Dashboard React
```

---

# 🚀 Instalación

## Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

---

## Frontend

```bash
cd frontend
npm install
npm run dev
```

---

# 📷 Vista previa

> Agregar screenshots del dashboard, métricas y módulos principales.

---

# 📌 Estado del proyecto

Proyecto en desarrollo y mejora continua.

---

# 👨‍💻 Autor

**Milton Sebastian Villalobos Guataquira**
