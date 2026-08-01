---
title: Propuesta de Desarrollo Tecnológico
author: Sistema de Gestión de Inventario y Flota Vehicular
---

# PROPUESTA DE DESARROLLO E IMPLEMENTACIÓN TECNOLÓGICA
**Cliente:** Sindicato de Choferes Profesionales  
**Proyecto:** Sistema Centralizado de Inventario y Control de Flota Vehicular  

---

## 1. Resumen del Proyecto
El presente documento detalla la propuesta para la implementación de un sistema de información de nivel empresarial. La plataforma está diseñada para automatizar y tener trazabilidad total sobre los activos del sindicato, control estricto de los viajes de la flota vehicular y gestión de mantenimientos, todo operando en tiempo real y con soporte para dispositivos móviles.

---

## 2. Características y Módulos del Sistema
*   **Control de Flota Vehicular (Entradas y Salidas):** Monitoreo en tiempo real del estado de los vehículos, registro de kilometraje, niveles de combustible y novedades.
*   **Captura de Evidencia Fotográfica Inteligente:** Integración directa con la cámara de teléfonos móviles para subir evidencia in situ, con optimización de imágenes para ahorrar hasta un 90% de ancho de banda y almacenamiento.
*   **Sincronización en Tiempo Real (WebSockets):** Los cambios realizados por los guardias en la puerta se reflejan instantáneamente en las pantallas de administración sin necesidad de recargar la página.
*   **Gestión de Inventario (Bienes, Muebles y Equipos):** Control detallado de altas, bajas, reparaciones y asignaciones a custodios.
*   **Reportes PDF Automatizados:** Generación instantánea de actas de entrega-recepción, reportes de bajas y resúmenes de flota.
*   **Bitácora de Auditoría de Alta Seguridad:** Registro inmutable de cada acción realizada en el sistema (quién, cuándo y desde dónde).

---

## 3. Arquitectura y Stack Tecnológico
El sistema ha sido construido utilizando los estándares más modernos de la industria del desarrollo de software:

*   **Frontend (Interfaz de Usuario):** React.js (v19) y TypeScript. Interfaces dinámicas, rápidas y adaptables a cualquier tamaño de pantalla (computadoras, tablets y celulares) utilizando Tailwind CSS.
*   **Backend (Lógica del Servidor):** Python 3.11 con Django Rest Framework. Una API robusta que maneja la lógica de negocio y la seguridad de las peticiones.
*   **Base de Datos:** PostgreSQL 15. Un motor de base de datos de grado empresarial que garantiza la integridad, seguridad y rapidez en el manejo de altos volúmenes de información.
*   **Infraestructura y Despliegue:** Contenerización con Docker y orquestación de red mediante Nginx. Preparado para despliegue seguro tanto en red local como en la nube.

---

## 4. Opciones de Inversión

A continuación, se presentan dos modelos de adquisición para el Sindicato:

### OPCIÓN A: Adquisición de Licencia de Uso (Recomendada)
El modelo más utilizado por instituciones para garantizar el correcto funcionamiento del software a largo plazo sin riesgos técnicos. El sindicato adquiere el derecho de uso exclusivo del sistema y delega la responsabilidad técnica al desarrollador.

*   **Costo de Implementación, Instalación y Capacitación:** $1,500.00 USD (Pago Único).
*   **Póliza de Soporte, Hosting y Mantenimiento:** $100.00 USD (Mensual).
    *   *Incluye: Alojamiento del sistema, mantenimiento preventivo de la base de datos, copias de seguridad (backups) semanales, solución inmediata de cualquier fallo técnico y soporte a usuarios.*

### OPCIÓN B: Transferencia de Propiedad Intelectual (Código Fuente)
El sindicato adquiere el 100% de los derechos del software, incluyendo todos los archivos de programación originales (código fuente). El Sindicato asume la responsabilidad total del futuro del sistema.

*   **Costo Total de Transferencia:** $4,500.00 USD (Pago Único).
    *   *Incluye: Instalación inicial y entrega de repositorios con el código fuente. El Sindicato tendrá la libertad de contratar a otros programadores para modificarlo o revenderlo. No incluye póliza de mantenimiento, ni servidor, ni soporte técnico a futuro.*

---
*Propuesta válida por 30 días calendario desde su emisión.*
