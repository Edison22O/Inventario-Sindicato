import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inventory_api.settings')
os.environ['DB_HOST'] = 'localhost'
django.setup()

from api.models.learning import Student, LearningPhase, PhaseActivity, GradeTemplate

def seed():
    print('Seeding Students...')
    sample_students = [
        ('0401829384', 'Carlos Andrés', 'Mendoza Ramos', 'C', '0991234567', 'carlos.mendoza@email.com'),
        ('0401928374', 'María Fernanda', 'López Castro', 'E_CONVALIDADA', '0987654321', 'maria.lopez@email.com'),
        ('0401239876', 'Juan Pablo', 'Benavides Revelo', 'E_REGULAR', '0978901234', 'juan.benavides@email.com'),
        ('0401567890', 'Ana Lucía', 'Chávez Villota', 'C', '0965432109', 'ana.chavez@email.com'),
        ('0401678901', 'Diego Fernando', 'Guerrero Ortega', 'E_REGULAR', '0954321098', 'diego.guerrero@email.com'),
        ('0401789012', 'Roberto Carlos', 'Espinosa Yépez', 'D_REGULAR', '0943210987', 'roberto.espinosa@email.com'),
        ('0401890123', 'Patricia Elena', 'Salazar Terán', 'D_CONVALIDADA', '0932109876', 'patricia.salazar@email.com'),
    ]
    for ced, nom, ape, lic, tel, email in sample_students:
        Student.objects.update_or_create(
            cedula=ced,
            defaults={
                'nombres': nom,
                'apellidos': ape,
                'tipo_licencia': lic,
                'telefono': tel,
                'email': email,
                'activo': True
            }
        )

    print('Seeding GradeTemplates...')
    grade_templates = [
        (5, 'El estudiante ejecuta la actividad de forma fluida, segura, eficiente y con total confianza.', 'Demuestra un dominio completo de la habilidad.'),
        (4, 'El estudiante ejecuta la actividad de forma consistente y segura, con pocos errores.', 'Demuestra confianza y buena técnica.'),
        (3, 'El estudiante ejecuta la actividad correctamente la mayoría de las veces, pero aún puede cometer errores menores o dudar.', 'Requiere práctica continua para consolidar.'),
        (2, 'El estudiante intenta ejecutar la actividad, pero comete errores frecuentes o demuestra inseguridad.', 'Necesita mejorar significativamente y recibir instrucción adicional.'),
        (1, 'El estudiante no comprende o no puede ejecutar la actividad de forma segura o correcta.', 'Requiere instrucción y práctica intensiva.'),
        (0, 'La actividad no se realizó o no fue evaluada en esta sesión.', 'Programar realización y evaluación en la siguiente sesión.')
    ]

    for score, obs, rec in grade_templates:
        GradeTemplate.objects.update_or_create(
            puntuacion=score,
            defaults={
                'observacion_predeterminada': obs,
                'recomendacion_predeterminada': rec
            }
        )

    print('Seeding LearningPhases and PhaseActivities...')
    phases_data = [
        {
            'numero': 1,
            'nombre': 'Aprendizaje a Motor Parado',
            'duracion': '2 Semanas',
            'actividades': [
                (1, 'Mantenimiento básico del vehículo', 'Identificación de niveles de líquidos (aceite, refrigerante, líquido de frenos), presión de neumáticos y revisión de luces.', 'El instructor muestra al estudiante dónde verificar el nivel de aceite con la varilla, el nivel del refrigerante y cómo revisar la presión de los neumáticos, las luces.'),
                (2, 'Familiarización con el puesto de conducción', 'Ajuste del asiento, espejos, volante y cinturón de seguridad para una ergonomía y visibilidad óptimas.', 'El instructor guía al estudiante para ajustar el asiento hasta que los pedales sean cómodos y los espejos ofrezcan una visión clara de la parte trasera y lateral del vehículo.'),
                (3, 'Identificación y uso de los mandos del vehículo', 'Reconocimiento y manipulación de pedales (acelerador, freno, embrague), palanca de cambios, freno de mano, luces, limpiaparabrisas, etc.', 'El estudiante, con el motor apagado, practica pisar el embrague y el freno, mover la palanca de cambios a todas las marchas y activar las luces direccionales.'),
                (4, 'Funcionamiento del panel de instrumentos', 'Comprensión de los indicadores (velocímetro, tacómetro, nivel de combustible, temperatura, testigos luminosos) y su significado.', 'El instructor explica cada testigo luminoso del tablero, como el de presión de aceite o el de batería, y qué acción debe tomar el estudiante si se encienden.'),
                (5, 'Arranque y apagado del motor', 'Procedimiento correcto para encender y apagar el motor de forma segura y eficiente.', 'El estudiante practica arrancar el motor con el embrague pisado y la palanca en punto muerto, y luego apagarlo correctamente.'),
                (6, 'Uso del embrague', 'Sensibilización sobre el punto de fricción del embrague y su manejo suave para evitar tirones o caladas.', 'El estudiante pisa y suelta el embrague repetidamente, sintiendo el punto donde el motor empieza a transmitir potencia, sin arrancar el vehículo.'),
                (7, 'Manejo del volante', 'Práctica de giros del volante en parado para desarrollar la memoria muscular y la coordinación.', 'El estudiante gira el volante de tope a tope varias veces, observando cómo las ruedas delanteras responden y manteniendo una postura correcta de las manos.'),
                (8, 'Uso de los espejos', 'Ajuste y uso correcto de los espejos retrovisores para una visión periférica adecuada.', 'El estudiante ajusta los espejos laterales para ver una pequeña porción del lateral del vehículo y el resto del carril adyacente, y el espejo central para ver la luneta trasera.'),
                (9, 'Activación de sistemas de seguridad', 'Conocimiento y uso de luces de emergencia, claxon, y otros elementos de seguridad pasiva y activa.', 'El instructor pide al estudiante que active las luces de emergencia y el claxon, explicando cuándo y por qué se utilizan.'),
                (10, 'Procedimientos de estacionamiento básico', 'Simulación de estacionamiento en paralelo y batería sin movimiento del vehículo, enfocándose en la secuencia de movimientos y el uso de espejos.', 'El estudiante practica la secuencia de giro de volante y cambio de marchas para un estacionamiento simulado, utilizando referencias visuales imaginarias.'),
            ]
        },
        {
            'numero': 2,
            'nombre': 'Automatismo Básico en la Conducción',
            'duracion': '3 Semanas',
            'actividades': [
                (1, 'Arranque y detención suave', 'Práctica de arrancar el vehículo sin  detiener el motor bruscamente y detenerlo de forma progresiva y sin brusquedad.', 'El estudiante arranca el vehículo en primera marcha, avanza unos metros y se detiene suavemente usando el freno y el embrague.'),
                (2, 'Conducción en línea recta', 'Mantenimiento de una trayectoria recta y constante, controlando la velocidad y la dirección.', 'El estudiante conduce en un tramo recto de un circuito, manteniendo el vehículo centrado en el carril y a una velocidad constante de 20 km/h.'),
                (3, 'Giros y curvas suaves', 'Ejecución de giros y curvas a baja velocidad, coordinando el volante, el acelerador y el freno.', 'El estudiante realiza giros a la derecha y a la izquierda en un circuito, aprendiendo a anticipar la curva y a girar el volante de forma fluida.'),
                (4, 'Cambio de marchas ascendente y descendente', 'Práctica de cambiar de marchas de forma suave y eficiente, tanto para acelerar como para reducir la velocidad.', 'El estudiante acelera en primera, cambia a segunda, luego a tercera, y después reduce a segunda y primera, todo sin tirones.'),
                (5, 'Frenado de emergencia controlado', 'Reacción rápida y segura ante una situación de frenado inesperado, manteniendo el control del vehículo.', 'El instructor da una señal inesperada y el estudiante debe frenar a fondo, pisando embrague y freno simultáneamente, manteniendo el control direccional.'),
                (6, 'Maniobras de reversa', 'Conducción hacia atrás en línea recta y con giros, utilizando los espejos y la visión directa.', 'El estudiante practica retroceder en línea recta entre dos conos y luego realiza una curva en reversa, mirando por los espejos y girando la cabeza.'),
                (7, 'Estacionamiento en batería', 'Práctica de estacionar el vehículo en espacios designados, tanto de frente como de reversa.', 'El estudiante estaciona el vehículo en un espacio delimitado por conos, primero de frente y luego en reversa, ajustando la trayectoria.'),
                (8, 'Control de velocidad constante', 'Mantenimiento de una velocidad específica durante un período prolongado, utilizando el acelerador de forma precisa.', 'El estudiante conduce a 30 km/h durante un minuto, prestando atención a la presión sobre el acelerador para mantener la velocidad.'),
                (9, 'Uso combinado de pedales', 'Coordinación simultánea del acelerador, freno y embrague en diferentes situaciones de conducción.', 'El estudiante practica arrancar en una ligera pendiente simulada, utilizando el freno de mano y la coordinación de embrague y acelerador.'),
                (10, 'Observación y anticipación', 'Desarrollo de la capacidad de observar el entorno y anticipar posibles situaciones de riesgo.', 'El instructor señala objetos o situaciones en el circuito (por ejemplo, un cono)'),
            ]
        },
        {
            'numero': 3,
            'nombre': 'Incorporación a la Circulación Urbana',
            'duracion': '4 a 6 Semanas',
            'actividades': [
                (1, 'Aplicación de la técnica de seguridad PVO', 'Aplicación (PVO),  ajustando estratégicamente su Posición, Velocidad y Observación de forma proactiva según las condiciones del entorno', 'Al aproximarse a una zona escolar, el estudiante  observa la presencia de niños (O), reduce preventivamente la velocidad (V) y se posiciona alejado de la acera (P).'),
                (2, 'Incorporación a la circulación aplicando la técnica de seguridad RSM', 'La técnica RSM consiste en observar por los Retrovisores para verificar el espacio, activar la Señal luminosa para comunicar la intención y ejecutar la Maniobra de forma suave y progresiva una vez confirmada la seguridad.', 'Al salir de un estacionamiento en línea, el estudiante observa el tráfico que viene por detrás (R), indica su salida con el intermitente izquierdo (S) y se incorpora al carril  (M).'),
                (3, 'Circulación en vías urbanas', 'Adaptación de la velocidad y la posición del vehículo a las condiciones del tráfico, respetando las normas de circulación.', 'El estudiante conduce por calles de la ciudad, manteniendo la distancia de seguridad, usando los intermitentes y adaptando la velocidad a los límites y al flujo de tráfico.'),
                (4, 'Arrancada en pendiente', 'Práctica de arrancar el vehículo en una pendiente ascendente sin que se vaya hacia atrás, utilizando el freno de mano o la coordinación de pedales.', 'El estudiante arranca en una calle con pendiente, controlando el embrague y el acelerador para evitar que el vehículo retroceda.'),
                (5, 'Intersecciones y rotondas', 'Aproximación, entrada y salida segura de intersecciones y rotondas, cediendo el paso y señalizando correctamente.', 'El estudiante negocia una rotonda, observando el tráfico, cediendo el paso a los vehículos que ya están dentro y saliendo por el carril adecuado.'),
                (6, 'Cambios de carril utilizando la técnica de RSM', 'Realización de cambios de carril de forma segura, utilizando los espejos, señalizando y comprobando los ángulos muertos.', 'El estudiante cambia de carril en una avenida de varios carriles, mirando por el espejo, señalizando y girando la cabeza para comprobar el ángulo muerto.'),
                (7, '5. Estacionamiento en línea y batería', 'Práctica de estacionamiento en diferentes tipos de espacios urbanos, incluyendo estacionamiento en paralelo y en batería.', 'El estudiante estaciona el vehículo en paralelo entre dos coches en una calle concurrida, utilizando las referencias y los espejos.'),
                (8, '6. Conducción con semáforos y señales', 'Obediencia a las señales de tráfico verticales y horizontales, y a las indicaciones de los semáforos.', 'El estudiante se detiene ante un semáforo en rojo, arranca cuando se pone en verde y respeta las señales de stop y ceda el paso.'),
                (9, '7. Gestión del tráfico y atascos', 'Desarrollo de estrategias para circular en tráfico denso, manteniendo la calma y la seguridad.', 'El instructor guía al estudiante a través de una zona con tráfico lento, enseñándole a mantener la distancia y a anticipar los movimientos de otros vehículos.'),
                (10, 'Uso de la señalización luminosa y acústica', 'Aplicación correcta de intermitentes, luces de freno y claxon para comunicarse con otros usuarios de la vía.', 'El estudiante utiliza los intermitentes para indicar cambios de dirección o de carril, y el claxon en situaciones de advertencia necesarias.'),
            ]
        },
        {
            'numero': 4,
            'nombre': 'Incorporación a la Circulación Rural',
            'duracion': '4 Semanas',
            'actividades': [
                (1, 'Conducción en carretera convencional aplicando la obcervación lejana, directa,  e indirecta', 'Mantenimiento de la velocidad adecuada, distancia de seguridad y posición en el carril en vías de doble sentido.', 'El estudiante conduce por una carretera secundaria, manteniendo una velocidad constante de 80 km/h y prestando atención a las curvas y los cruces.'),
                (2, 'Fases de adelantaminto Antes-Durante y despues', 'Realización de adelantamientos a otros vehículos de forma segura y legal, evaluando la distancia y la velocidad.', 'El instructor guía al estudiante en un adelantamiento a un vehículo lento en una zona permitida, asegurándose de que haya suficiente espacio y visibilidad.'),
                (3, 'Conducción en autovías y autopistas', 'Incorporación, circulación y salida de vías rápidas, manteniendo velocidades elevadas y observando el tráfico.', 'El estudiante se incorpora a una autovía, acelera para igualar la velocidad del tráfico y se mantiene en el carril derecho, utilizando los espejos para observar.'),
                (4, 'Gestión de curvas y pendientes', 'Adaptación de la velocidad y la marcha a las características de la vía, especialmente en curvas pronunciadas y descensos.', 'El estudiante negocia una serie de curvas en una carretera de montaña, reduciendo la velocidad antes de la curva y acelerando suavemente a la salida.'),
                (5, 'Reacción ante condiciones adversas', 'Conducción segura bajo lluvia, niebla o viento, ajustando la velocidad y aumentando la distancia de seguridad.', 'El instructor simula condiciones de lluvia (por ejemplo, con un pulverizador de agua en el parabrisas) y el estudiante debe reducir la velocidad y encender las luces.'),
                (6, 'Distancia de seguimiento Regla de los 3 segundos', 'Distancia de seguimiento adecuada, que consiste en tomar un punto de referencia fijo en la vía  y contar tres segundos desde que el vehículo de adelante lo sobrepasa hasta que el propio vehículo llega a ese mismo punto', 'En condiciones normales de conducción, el estudiante utiliza este margen de tiempo para garantizar un espacio de reacción suficiente ante frenadas bruscas.'),
                (7, 'Intersecciones y Redondeles  interurbanas', 'Aproximación y paso seguro por intersecciones y redondeles de mayor tamaño y velocidad, con señalización adecuada.', 'El estudiante se aproxima a un  glorieta grande en una carretera, evaluando el tráfico y seleccionando el carril correcto para su salida.'),
                (8, 'Conducción eficiente en carretera', 'Optimización del consumo de combustible mediante una conducción suave y anticipada, evitando aceleraciones y frenadas bruscas.', 'El instructor enseña al estudiante a mantener una velocidad constante y a utilizar la inercia del vehículo para ahorrar combustible en trayectos largos.'),
                (9, 'Paradas de emergencia en arcén o cuneta', 'Procedimiento de detención segura fuera de la calzada con luces de advertencia.', 'El estudiante simula una avería, detiene el vehículo en el arcén, enciende las luces de emergencia y coloca señalización.'),
                (10, 'Paradas de emergencia en arcén', 'Práctica de detener el vehículo de forma segura en el arcén en caso de avería o emergencia, señalizando correctamente.', 'El estudiante simula una avería, detiene el vehículo en el arcén, enciende las luces de emergencia y coloca el triángulo de preseñalización.'),
            ]
        },
        {
            'numero': 5,
            'nombre': 'Evaluación de Aprendizaje de Fases 1, 2, 3 y 4',
            'duracion': '1 Semana',
            'actividades': [
                (1, 'Revisión pre-conducción (Fase 1)', 'Verificación de los elementos de seguridad y funcionamiento del vehículo antes de iniciar la marcha.', 'El estudiante realiza una revisión visual del vehículo, comprueba luces, neumáticos, niveles de líquidos y ajusta el puesto de conducción antes de arrancar.'),
                (2, 'Conducción en circuito cerrado (Fase 2)', 'Demostración de las habilidades básicas de control del vehículo (arranque, detención, giros, reversa, estacionamiento) en un entorno controlado.', 'El estudiante ejecuta una serie de maniobras en un circuito cerrado, como estacionamiento en paralelo, reversa en línea recta y giros cerrados, sin cometer errores.'),
                (3, 'Conducción urbana evaluada (Fase 3)', 'Navegación por un recorrido urbano con tráfico real, aplicando todas las normas de circulación, señalización y anticipación.', 'El instructor evalúa al estudiante en un recorrido urbano que incluye intersecciones, rotondas, cambios de carril y estacionamiento, observando su fluidez y seguridad.'),
                (4, 'Conducción rural evaluada (Fase 4)', 'Demostración de habilidades en carretera convencional y autovía, incluyendo adelantamientos, gestión de curvas y adaptación a la velocidad.', 'El estudiante conduce por una ruta que combina carretera rural y autovía, realizando adelantamientos seguros y manteniendo el control en curvas y pendientes.'),
                (5, 'Reacción ante situaciones de riesgo simuladas', 'Respuesta adecuada a escenarios inesperados que requieren una acción rápida y segura (frenado de emergencia, esquiva de obstáculos).', 'El instructor simula una situación de emergencia (por ejemplo, un objeto en la vía) y el estudiante debe reaccionar de forma controlada y segura.'),
                (6, 'Uso correcto de la señalización', 'Aplicación precisa de intermitentes, luces y claxon en todas las situaciones de conducción.', 'El estudiante utiliza la señalización luminosa y acústica de forma correcta y oportuna durante todo el recorrido de evaluación.'),
                (7, 'Mantenimiento de la distancia de seguridad', 'Observación constante y ajuste de la distancia con otros vehículos en diferentes velocidades y condiciones.', 'El instructor evalúa la capacidad del estudiante para mantener una distancia de seguridad adecuada en tráfico denso y en carretera abierta.'),
                (8, 'Respeto a las normas de tráfico', 'Cumplimiento estricto de límites de velocidad, señales, semáforos y prioridades de paso.', 'El estudiante demuestra un conocimiento y respeto absoluto por todas las normas de tráfico durante la evaluación.'),
                (9, 'Conducción eficiente y ecológica', 'Demostración de una conducción suave, anticipada y con bajo consumo de combustible.', 'El instructor observa la fluidez de la conducción del estudiante, la anticipación y el uso adecuado de las marchas para una conducción eficiente.'),
                (10, 'Actitud y seguridad al volante', 'Evaluación de la confianza, calma, concentración y toma de decisiones seguras del estudiante durante toda la prueba.', 'El instructor valora la actitud general del estudiante, su capacidad para mantener la calma bajo presión y su enfoque en la seguridad en todo momento.'),
            ]
        },
    ]

    for pdata in phases_data:
        phase_obj, _ = LearningPhase.objects.update_or_create(
            numero=pdata['numero'],
            defaults={
                'nombre': pdata['nombre'],
                'duracion_semanas': pdata['duracion'],
                'nota_minima_aprobacion': 4.00
            }
        )
        for act_tuple in pdata['actividades']:
            act_num, act_nom, act_desc, act_ej = act_tuple
            PhaseActivity.objects.update_or_create(
                phase=phase_obj,
                numero=act_num,
                defaults={
                    'nombre': act_nom,
                    'descripcion': act_desc,
                    'ejemplo_practico': act_ej
                }
            )

    print('Phases and activities seeded successfully.')

if __name__ == '__main__':
    seed()