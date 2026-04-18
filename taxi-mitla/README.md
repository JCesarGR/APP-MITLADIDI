# 🚕 TaxiMitla - App de Transporte Local

**PWA + APK nativo** para servicio de taxi en Villa de Mitla, Oaxaca.

![TaxiMitla](public/taxi-icon.svg)

## 📱 Descripción

TaxiMitla es una aplicación de transporte local que conecta pasajeros con choferes de taxi en Villa de Mitla. Características principales:

- 📍 **GPS Automático** - Detección de ubicación sin escribir direcciones
- 🔍 **Autocompletado de Direcciones** - Google Maps Places con restricción geográfica a Mitla
- 🗺️ **Selector de Zonas** - Centro, Ruinas, Periferia, Foráneo
- 💰 **Taxímetro Digital** - Tarifas automáticas con recargos (nocturno 20%, día de plaza 50%)
- 🚗 **Asignación por Cercanía** - El chofer más cercano recibe el viaje
- 📊 **Tracking en Tiempo Real** - Mapa con posición del chofer actualizada cada 3 segundos via WebSocket
- 🏆 **Sistema de Badges** - Principiante → Regular → Experto → ÉLITE

## 🏗️ Estructura del Proyecto

```
/0w0orkspace/
├── taxi-mitla/              # Frontend PWA (React + Vite + Tailwind + Capacitor)
│   ├── src/
│   │   │   ├── pages/           # HomePage, ConfirmacionPage, TrackingPage, ChoferPage
│   │   ├── components/      # AddressAutocomplete, MapTracking
│   │   ├── hooks/           # useGeolocation, useAddressAutocomplete
│   │   ├── services/        # API y WebSocket
│   │   └── context/         # AppContext (estado global)
│   ├── android/             # Proyecto Android (generado por Capacitor)
│   └── dist/                # Build de producción
│
└── taxi-mitla-backend/     # Backend (FastAPI + MongoDB)
    ├── app/
    │   ├── routers/        # auth, choferes, viajes, tarifas
    │   ├── services/        # asignación, tarifas, badges
    │   └── schemas/         # Pydantic models
    └── main.py              # FastAPI app
```

---

## 📦 DESPLIEGUE DEL APK (PLAY STORE)

Esta sección contiene las instrucciones completas para generar el APK y publicarlo en Google Play Store.

### Opción 1: Generar APK para Distribución Directa (Recomendado para Mitla)

Esta opción genera un APK que puedes compartir directamente o subir a tiendas alternativas.

#### Paso 1: Requisitos Previos

```bash
# Instalar Node.js 18+ (si no lo tienes)
# https://nodejs.org/

# Instalar Java JDK 17 (requerido para Android)
# Ubuntu/Debian:
sudo apt install openjdk-17-jdk

# Windows: Descargar de https://adoptium.net/
```

#### Paso 2: Configurar Variables de Entorno Android

```bash
# Agregar a tu ~/.bashrc o ~/.zshrc (Linux/Mac)
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Windows: Agregar a Variables de Entorno del Sistema
# ANDROID_HOME = C:\Users\TuUsuario\AppData\Local\Android\Sdk
```

#### Paso 3: Instalar Dependencias del Frontend

```bash
cd taxi-mitla
npm install
```

#### Paso 4: Inicializar Capacitor

```bash
# Generar el build de producción
npm run build

# Inicializar Capacitor (solo la primera vez)
npx cap init TaxiMitla com.taximitla.app --web-dir=dist

# Agregar plataforma Android
npx cap add android
```

#### Paso 5: Sincronizar y Construir APK

```bash
# Sincronizar cambios web → Android
npx cap sync android

# Abrir proyecto en Android Studio (opcional, para ver/configurar)
npx cap open android

# O construir APK directamente desde línea de comandos:
cd android
./gradlew assembleDebug

# El APK estará en:
# android/app/build/outputs/apk/debug/app-debug.apk
```

#### Paso 6: Firmar el APK para Producción

```bash
# 1. Generar keystore (solo una vez)
keytool -genkey -v -keystore my-release-key.keystore -alias taximitla -keyalg RSA -keysize 2048 -validity 10000

# 2. Firmar el APK
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore my-release-key.keystore app-release-unsigned.apk taximitla

# 3. Optimizar APK
zipalign -v 4 app-release-unsigned.apk app-release.apk

# 4. Verificar firma
jarsigner -verify -verbose -certs app-release.apk
```

---

### Opción 2: Publicar en Google Play Store

#### Requisitos

1. **Cuenta de Google Play Developer** - $25 una vez (https://play.google.com/console)
2. **Logo e iconos** - Ver sección de Assets
3. **Política de privacidad** - Obligatoria
4. **Capturas de pantalla** - Mínimo 2

#### Paso 1: Preparar Assets

```bash
# Crear directorio de assets
mkdir -p taxi-mitla/android/app/src/main/res/mipmap-*

# Iconos requeridos (generar con https://icon.kitchen/):
# - launcher-icon-36.png (36x36)
# - launcher-icon-48.png (48x48)
# - launcher-icon-72.png (72x72)
# - launcher-icon-96.png (96x96)
# - launcher-icon-144.png (144x144)
# - launcher-icon-192.png (192x192)
```

#### Paso 2: Configurar AndroidManifest

Editar `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.taximitla.app">

    <!-- Permisos necesarios -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/launcher-icon"
        android:label="TaxiMitla"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">
        <!-- ... resto de configuración -->
    </application>
</manifest>
```

#### Paso 3: Configurar build.gradle para Release

Editar `android/app/build.gradle`:

```gradle
android {
    // ...
    signingConfigs {
        release {
            storeFile file('my-release-key.keystore')
            storePassword 'tu-contraseña'
            keyAlias 'taximitla'
            keyPassword 'tu-contraseña-key'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### Paso 4: Generar AAB para Play Store

```bash
cd android
./gradlew bundleRelease

# El AAB estará en:
# android/app/build/outputs/bundle/release/app-release.aab
```

#### Paso 5: Subir a Play Store

1. Ve a https://play.google.com/console/developers
2. Crea una nueva aplicación
3. Completa la información de la tienda:
   - Título: **TaxiMitla**
   - Descripción corta: **Taxi local en Villa de Mitla**
   - Descripción completa: Ver `STORE_DESCRIPTION.md`
4. Sube las capturas de pantalla
5. Sube el archivo `.aab`
6. Completa la clasificación de contenido
7. Configura precios y distribución
8. Envía a revisión

---

## 🖥️ DESPLIEGUE DEL BACKEND

### Requisitos

- Python 3.10+
- MongoDB (local o Atlas)
- Docker (opcional)

### Instalación Local

```bash
cd taxi-mitla-backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar MongoDB
# Opción A: MongoDB Local
# Editar database.py con tu conexión

# Opción B: MongoDB Atlas (recomendado)
# Usar string de conexión de Atlas
```

### Variables de Entorno

```bash
# Crear archivo .env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=taximitla
SECRET_KEY=tu-secret-key-super-seguro
```

### Ejecutar Servidor

```bash
# Desarrollo
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Producción (con Gunicorn)
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

### Docker (Opcional)

```bash
# Crear Dockerfile
cat > taxi-mitla-backend/Dockerfile << 'EOF'
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

# Construir imagen
docker build -t taximitla-backend:latest .

# Ejecutar
docker run -d -p 8000:8000 \
  -e MONGODB_URL=mongodb://host.docker.internal:27017 \
  taximitla-backend:latest
```

---

## 🔧 CONFIGURACIÓN AVANZADA

### Google Maps Places Autocomplete

Para activar el autocompletado con Google Maps:

1. Obtén una API Key en https://console.cloud.google.com/
2. Habilita "Places API" y "Maps JavaScript API"
3. Agrega restricción de dominio/IP

Configura en `src/hooks/useAddressAutocomplete.ts`:

```typescript
const MITLA_CENTER = { lat: 16.9548, lng: -96.5122 };
const MITLA_BOUNDS = {
  north: 16.98, south: 16.92,
  east: -96.48, west: -96.55,
};
const SEARCH_RADIUS_KM = 15; // Radio de búsqueda en km
```

### WebSocket para Tracking en Tiempo Real

El tracking usa WebSocket con polling como fallback:

- **WebSocket**: Actualizaciones instantáneas de ubicación del chofer
- **Polling**: Cada 5 segundos como backup
- **Puerto Backend**: 8000 (configurable en `src/services/api.ts`)

```typescript
// Configuración en src/services/websocket.ts
const UPDATE_INTERVAL = 10000; // 10 segundos (chofer → servidor)
const POLLING_INTERVAL = 5000;  // 5 segundos (pasajero → servidor)
```

---

## 🔧 CONFIGURACIÓN DE CARACTERÍSTICAS

### Tarifas

Editar `taxi-mitla-backend/app/services/tarifa_service.py`:

```python
# Tarifas base por zona
TARIFAS_BASE = {
    ZonaEnum.CENTRO: 25.0,    # MXN
    ZonaEnum.RUINAS: 35.0,    # MXN
    ZonaEnum.PERIFERIA: 45.0, # MXN
    ZonaEnum.FORANEO: 60.0,   # MXN
}

# Recargos
RECARGO_NOCTURNO_PORCENTAJE = 0.20  # 20% (22:00 - 06:00)
RECARGO_PLAZA_PORCENTAJE = 0.50     # 50% (lunes y jueves)
```

### Badges

```python
# Editar BadgeService en tarifa_service.py
def calcular_badge(viajes_completados):
    if viajes_completados >= 100:
        return BadgeEnum.ELITE      # 👑 ÉLITE
    elif viajes_completados >= 50:
        return BadgeEnum.EXPERTO     # 🔥 Experto
    elif viajes_completados >= 20:
        return BadgeEnum.REGULAR     # ⭐ Regular
    else:
        return BadgeEnum.PRINCIPIANTE # 🌱 Principiante
```

### Badges Visuales en Frontend

Editar `taxi-mitla/src/types/index.ts`:

```typescript
export const BADGES_INFO = {
  principe: { nombre: 'Principiante', color: '#9CA3AF', icono: '🌱' },
  regular: { nombre: 'Regular', color: '#3B82F6', icono: '⭐' },
  experto: { nombre: 'Experto', color: '#F59E0B', icono: '🔥' },
  elite: { nombre: 'ÉLITE', color: '#EF4444', icono: '👑' },
};
```

---

## 📁 ASSETS REQUERIDOS

### Iconos de App

```
public/
├── icon-192.png   # 192x192 PNG
├── icon-512.png   # 512x512 PNG
├── splash.png     # Pantalla de carga (obscuro)
└── taxi-icon.svg  # Logo SVG
```

Generar iconos: https://icon.kitchen/

### Capturas de Pantalla para Play Store

- Phone (1080x1920): 8 capturas mínimo
- Tablet 7" (1200x1920): 7 capturas
- Tablet 10" (1600x2560): 7 capturas

---

## 📋 CHECKLIST DE PUBLICACIÓN

### ✅ Pre-lanzamiento

- [ ] APK generado y probado en dispositivo real
- [ ] Backend desplegado y funcionando
- [ ] Iconos y splash screen configurados
- [ ] Permisos de Android correctos
- [ ] Versión APK incrementada (build.gradle)

### ✅ Cuenta Play Store

- [ ] Cuenta de desarrollador creada ($25)
- [ ] Información de la app completa
- [ ] Descripción optimizada para SEO
- [ ] Capturas de pantalla de alta calidad
- [ ] Clasificación de contenido completada
- [ ] Política de privacidad publicada (URL)

### ✅ Legal

- [ ] Política de privacidad (ejemplo en `/docs/privacy-policy.md`)
- [ ] Términos y condiciones
- [ ] Consentimiento de cookies
- [ ] Licencia de conductor verificada (para tu zona)

---

## 🚀 ACTUALIZACIONES

### Actualizar Frontend

```bash
cd taxi-mitla
npm run build
npx cap sync android
cd android
./gradlew assembleRelease
```

### Actualizar Backend

```bash
cd taxi-mitla-backend
git pull origin main
pip install -r requirements.txt
# Reiniciar servicio
```

---

## 📞 SOPORTE

Para Mitla y región:
- WhatsApp: [Agregar número]
- Email: [Agregar email]

---

## 📄 LICENCIA

MIT License - Libre para uso comercial y personal.

---

**Desarrollado con ❤️ para Villa de Mitla, Oaxaca**
