# 🚕 TaxiMitla

### Plataforma de transporte local para Villa de Mitla, Oaxaca

TaxiMitla es una aplicación móvil y web diseñada para modernizar el servicio de taxis locales mediante geolocalización en tiempo real, asignación inteligente de conductores y seguimiento de viajes. El proyecto combina una **Progressive Web App (PWA)** y una **aplicación Android** con un backend escalable basado en APIs y WebSockets.

---

## 📸 Vista General

> Sistema de transporte local que conecta pasajeros y conductores mediante geolocalización, asignación inteligente y tracking en tiempo real.

---

## ✨ Características Principales

- 📍 Geolocalización automática mediante GPS.
- 🗺️ Autocompletado de direcciones con Google Maps.
- 🚖 Asignación automática del conductor más cercano.
- 📡 Tracking en tiempo real con WebSockets.
- 💰 Sistema de tarifas dinámicas.
- 🏆 Sistema de badges para conductores.
- 📱 Compatible como PWA y APK Android.
- 🌐 Arquitectura Full Stack escalable.

---

## 🛠️ Stack Tecnológico

<p align="left">
  <img src="https://skillicons.dev/icons?i=react,ts,vite,tailwind,nodejs,python,fastapi,mongodb,docker,git,androidstudio" />
</p>

### Tecnologías utilizadas

| Categoría | Tecnologías |
|------------|------------|
| Frontend | React, TypeScript, Vite, TailwindCSS |
| Mobile | Capacitor, Android Studio |
| Backend | Python, FastAPI |
| Base de Datos | MongoDB |
| Tiempo Real | WebSockets |
| DevOps | Docker, Git |
| APIs Externas | Google Maps API |

---

## 🏗️ Arquitectura

```text
┌─────────────────┐
│  Usuario App    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ React + Vite    │
│ PWA / Android   │
└────────┬────────┘
         │ REST API
         ▼
┌─────────────────┐
│ FastAPI Backend │
└────────┬────────┘
         │
 ┌───────┴────────┐
 │                │
 ▼                ▼
MongoDB      WebSockets
(Base de     Tiempo Real
 datos)
```

---

## 🚀 Funcionalidades Técnicas

### 📍 Geolocalización Inteligente

Obtención automática de la ubicación del pasajero para reducir errores y agilizar la solicitud de viajes.

### 🚖 Asignación por Cercanía

Algoritmo que identifica al conductor disponible más próximo para optimizar tiempos de espera.

### 📡 Tracking en Tiempo Real

Comunicación mediante WebSockets para actualizar la ubicación del conductor durante el viaje.

### 💰 Tarifas Dinámicas

Cálculo automático considerando:

- Zona de servicio.
- Horario nocturno.
- Días especiales.
- Distancia recorrida.

### 🏆 Gamificación

Sistema de niveles para conductores:

- 🌱 Principiante
- ⭐ Regular
- 🔥 Experto
- 👑 Élite

---

## 📂 Estructura del Proyecto

```text
taxi-mitla/
│
├── frontend/
│   ├── pages/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── context/
│
└── backend/
    ├── routers/
    ├── services/
    ├── schemas/
    └── database/
```

---

## 🎯 Lo que demuestra este proyecto

- Desarrollo Full Stack.
- Diseño de APIs REST.
- Integración con Google Maps.
- Geolocalización avanzada.
- Comunicación en tiempo real.
- Desarrollo móvil híbrido.
- Arquitectura escalable.
- Gestión de bases de datos NoSQL.

---

## 👨‍💻 Mi Rol

**Desarrollador Full Stack**

Responsable de:

- Arquitectura de software.
- Desarrollo Frontend con React.
- Desarrollo Backend con FastAPI.
- Integración de Google Maps.
- Implementación de WebSockets.
- Gestión de MongoDB.
- Desarrollo de APK Android mediante Capacitor.
- Configuración de despliegue y producción.

---

## 📄 Estado del Proyecto

- ✅ Frontend completado
- ✅ Backend funcional
- ✅ Integración GPS
- ✅ Tracking en tiempo real
- ✅ PWA operativa
- ✅ APK Android
- 🚀 Listo para despliegue

---

## 📫 Contacto

**Julio César Ríos García**

[![Portfolio](https://img.shields.io/badge/Portfolio-000?style=for-the-badge&logo=vercel&logoColor=white)](https://tu-portafolio.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/tuusuario)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/tuusuario)

---

### 🚕 Desarrollado para la digitalización del transporte local en Villa de Mitla, Oaxaca.
