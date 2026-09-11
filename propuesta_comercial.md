---
title: Propuesta de Desarrollo e Implementación Tecnológica
author: Sistema Centralizado de Inventario y Control de Flota Vehicular
---

# PROPUESTA DE DESARROLLO E IMPLEMENTACIÓN TECNOLÓGICA
**Cliente:** Sindicato de Choferes Profesionales  
**Proyecto:** Sistema Centralizado de Inventario y Control de Flota Vehicular  
**Modalidad:** Software como Servicio (SaaS) - Entrega por Enlace Web  

---

## 1. Resumen del Proyecto y Modalidad de Entrega
El presente documento detalla la propuesta para la implementación del sistema de información de nivel empresarial. 

**Modalidad de Despliegue Cloud (SaaS):**
El sistema será alojado por el desarrollador en infraestructura de nube de alta velocidad. El Sindicato **no requiere realizar instalaciones físicas de software** en sus computadoras o teléfonos. La entrega se realiza mediante un **Enlace Web (Link)** privado y seguro al que el personal accederá desde cualquier navegador web en PCs, laptops, tablets o teléfonos móviles.

---

## 2. Descripción Detallada de Módulos, Valor Tecnológico y Justificación de Inversión

### Módulo 1: Control de Flota Vehicular y Garita en Tiempo Real (Módulo CORE - Principal Inversión Tecnológica)
*   **¿Qué hace?:** Registro operativo de entradas y salidas de vehículos en garita, captura de kilometraje inicial/final, nivel de combustible, chofer o custodio asignado, novedad mecánica y notificación inmediata al tablero central de administración.
*   **Justificación de Valor Tecnológico (Por qué es el componente principal):** Representa el núcleo operativo y de mayor complejidad dentro de la propuesta. Implementa comunicación bidireccional asíncrona mediante **WebSockets en tiempo real**, lo que permite a la directiva y administradores ver alertas al instante sin necesidad de recargar la página. Además, incluye lógica de validación para evitar inconsistencias en kilometrajes y un diseño adaptado para uso en smartphones por parte de los guardias.

### Módulo 2: Captura y Compresión Inteligente de Evidencia Fotográfica
*   **¿Qué hace?:** Toma de fotografías directamente desde la cámara del celular en el punto de inspección (garita) para documentar el estado físico de los vehículos, rayones o comprobantes.
*   **Justificación de Valor Tecnológico:** Integra un motor algorítmico de compresión del lado del cliente que reduce el peso de las imágenes en un **90%** previo a la transmisión. Esto permite subir evidencias fotográficas en milisegundos en redes móviles 3G/4G y ahorra gigabytes de almacenamiento en servidor.

### Módulo 3: Gestión Integral de Inventario (Bienes, Muebles y Equipos)
*   **¿Qué hace?:** Control centralizado de activos fijos institucionales, asignación oficial a custodios por departamento, registro de ubicaciones físicas, estados de conservación, bajas y transferencias.
*   **Justificación de Valor Tecnológico:** Automatiza el control patrimonial del Sindicato, garantizando trazabilidad completa de cada bien y eliminando pérdidas o extravíos de inventario.

### Módulo 4: Reportes PDF & Actas Automatizadas
*   **¿Qué hace?:** Generación instantánea en formato PDF de actas oficiales de entrega-recepción de vehículos y actas de baja de inventario.
*   **Justificación de Valor Tecnológico:** Incorpora un motor de renderizado de PDF dinámico para la emisión de documentos y actas oficiales, permitiendo respaldar legalmente la entrega de vehículos y activos, y sustituyendo el papeleo físico.

### Módulo 5: Capacitación y Documentación del Sistema
*   **¿Qué hace?:** Sesiones de entrenamiento práctico presencial/virtual para guardias de garita y personal administrativo, junto con la entrega del Manual de Usuario e instructivo operativo digital.
*   **Justificación de Valor Tecnológico:** Asegura la adopción efectiva del software por parte del personal sin curva de aprendizaje prolongada ni interrupción de las operaciones diarias.

### Módulo 6: Bitácora de Auditoría e Historial de Alta Seguridad
*   **¿Qué hace?:** Registro inmutable de cada acción ejecutada en el sistema (usuario, fecha, hora exacta, dirección IP y datos modificados/previos).
*   **Justificación de Valor Tecnológico:** Proporciona un estándar de seguridad de nivel bancario, asegurando transparencia total ante auditorías internas y directivas.

---

### 2.1 Cláusula de Desarrollos Futuros y Módulos Adicionales
*   **Incorporación de Nuevos Módulos:** Si en el futuro el Sindicato requiere módulos o funcionalidades adicionales que no formen parte del alcance inicial (por ejemplo: *Módulo de Mantenimientos Preventivos Avanzados*, *Módulo de Control de Combustible/Gasolineras*, *Módulo de Sanciones o Multas*, etc.), cada nuevo módulo se cotizará e implementará con un valor estimado **a partir de $200.00 USD en adelante**, según su complejidad técnica, número de pantallas y reglas de negocio requeridas.
*   **Exclusividad:** Todo desarrollo adicional será contratado e implementado exclusivamente con el desarrollador original durante la vigencia de la licencia.

---

## 3. Opciones de Inversión y Modelos de Contratación

### OPCIÓN A: Licencia de Uso Empresarial (Opción Recomendada)
El Sindicato adquiere el derecho de uso exclusivo del sistema y el acceso mediante su enlace web privado, delegando el alojamiento, el mantenimiento continuo, los respaldos y el soporte técnico exclusivamente en el desarrollador.

#### 1. Inversión Inicial (Pago Único): **$2,300.00 USD**
*   **Despliegue y Puesta a Punto Cloud:** Configuración del servidor en la nube y generación del Enlace Web (Link) de acceso directo.
*   **Parametrización y Carga Inicial:** Carga de vehículos, inventarios iniciales, áreas y cuentas de usuario.
*   **Capacitación del Personal:** Sesiones de capacitación práctica a guardias de garita y administradores.
*   **Documentación Oficial:** Entrega del Manual de Usuario e Instructivo Técnico del Sistema.

#### 2. Póliza Mensual de Alojamiento, Mantenimiento y Respaldos: **$135.00 USD / mes**
*   **Alojamiento Cloud (Hosting 24/7):** Servidor de alta velocidad con certificado SSL encriptado de grado bancario.
*   **Mantenimiento Semanal:** Monitoreo del servidor, verificación de recursos y optimización de memoria.
*   **Mantenimiento Quincenal / Mensual:** Mantenimiento preventivo de la base de datos PostgreSQL, depuración de logs, optimización de índices y parches de seguridad.
*   **Respaldos Semanales Automáticos:** Copias de seguridad de la base de datos y evidencias fotográficas guardadas fuera del servidor principal.
*   **Respaldos Mensuales Históricos:** Archivo acumulativo mensual de resguardo para restauración ante contingencias.

#### 3. Plazo Mínimo de Contratación:
*   **Contrato obligatorio por un período mínimo de UN (1) AÑO (12 meses).**

#### 4. Cláusula de Exclusividad Técnica y Desarrollos Futuros:
*   Durante la vigencia de la licencia, el soporte, mantenimiento y cualquier modificación es de **exclusividad absoluta del desarrollador original**.
*   Ninguna otra persona o empresa tercera podrá intervenir ni alterar el código fuente.
*   Cualquier solicitud de nuevos módulos, mejoras o cambios futuros será llamada y contratada **exclusivamente con el desarrollador original**.

---

### OPCIÓN B: Transferencia de Propiedad Intelectual (Código Fuente)
El Sindicato adquiere el 100% de los derechos del software (archivos de programación originales).

*   **Costo Total de Transferencia:** **$4,500.00 USD** *(Pago Único)*.
*   **Incluye:** Entrega formal de los repositorios con el código fuente y capacitación inicial. El Sindicato tendrá la libertad de contratar a otros programadores.
*   **No incluye:** Alojamiento/servidor mensual, respaldos semanales, mantenimientos preventivos a futuro, ni cláusula de exclusividad. El Sindicato asume su propia infraestructura.

---
*Propuesta válida por 30 días calendario desde su emisión.*
