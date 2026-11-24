import React, { useState, useEffect } from 'react';
import {
    Camera,
    Zap,
    Monitor,
    Printer,
    DoorClosed,
    Code2,
    Wifi,
    Cpu,
    Wrench,
    Sun,
    Moon,
    Menu,
    X,
    ArrowRight,
    ArrowLeft,
    MapPin,
    Phone,
    Clock,
    CheckCircle2,
    ShieldCheck,
    ExternalLink,
    ChevronRight,
    ChevronDown,
    FileText,
    Send,
    Building2,
    Award,
    Mail,
    User,
    Shield,
    Home,
    Globe,
    Users,
    HeartHandshake,
    Lightbulb,
    Search,
    ClipboardCheck,
    PenTool,
    Headphones,
    Loader2,
    MessageSquare
} from 'lucide-react';
import QuoteWizardModal from './QuoteWizardModal';
import TurnstileWidget from './TurnstileWidget';
import BrandLogos from './BrandLogos';
import { sanitizeInput, isSuspiciousPayload, validatePhoneNumber, validateEmailAddress } from '../utils/security';

const WhatsAppBadgeIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
);

const CATEGORY_PAGES = [
    {
        slug: 'cctv',
        quoteDefaultId: 'instalacion-cctv',
        title: 'CCTV y videovigilancia',
        heroTitleMain: 'CCTV y',
        heroTitleAccent: 'videovigilancia',
        cardSubtitle: 'Instalación y configuración de cámaras de seguridad.',
        heroTag: 'SEGURIDAD ELECTRÓNICA / CCTV',
        heroSubtitle: 'Sistemas IP y análogos para proteger tu hogar o negocio, con monitoreo remoto y soluciones adaptadas a cada espacio.',
        sectionTitlePrefix: 'Soluciones de',
        sectionTitleAccent: 'videovigilancia',
        sectionSubtitle: 'Protege lo que más te importa con tecnología confiable y soporte profesional.',
        icon: Camera,
        image: '/images/cctv-hero-cam.jpg',
        heroImage: '/images/cctv-hero-cam.jpg',
        fallbackImage: '/images/srv-cctv.jpg',
        idealFor: ['Casas y residencias', 'Comercios y tiendas', 'Bodegas y patios', 'Oficinas y consultorios'],
        brands: ['Dahua', 'Hikvision', 'HiLook', 'EZVIZ', 'Imou', 'Epcom', 'Western Digital', 'Seagate', 'HIKSEMI'],
        brandLogos: ['dahua', 'hikvision', 'hilook', 'ezviz', 'imou', 'epcom', 'westerndigital', 'seagate', 'hiksemi'],
        services: [
            {
                id: 'instalacion-cctv',
                title: 'Instalación de cámaras de seguridad',
                image: '/images/cctv-instalacion.jpg',
                desc: 'Diseño e instalación profesional de sistemas CCTV con equipos de alta calidad para hogares, negocios y comercios.',
                actionLabel: 'Conocer esta solución',
                shortFeatures: [
                    'Cámaras IP, Análogas, PTZ.',
                    'Grabadores DVR / NVR',
                    'Acceso remoto desde celular'
                ],
                features: [
                    'Cámaras Full HD, 2K (4MP) y 4K Ultra HD con lente gran angular',
                    'Tecnología ColorVu / Full-Color para visión nocturna a color 24/7',
                    'Monitoreo en vivo y reproducción desde app móvil en Android, iOS y PC sin rentas mensuales',
                    'Discos duros especializados de videovigilancia (WD Purple / Seagate SkyHawk)'
                ]
            },
            {
                id: 'servicio-cctv',
                title: 'Mantenimiento y reparación',
                image: '/images/cctv-mantenimiento.jpg',
                desc: 'Mantén tu sistema siempre en óptimas condiciones con nuestro servicio técnico especializado.',
                actionLabel: 'Solicitar diagnóstico',
                shortFeatures: [
                    'Diagnóstico de fallas',
                    'Revisión de cableado y alimentación',
                    'Recuperación de visualización y grabación'
                ],
                features: [
                    'Revisión y reemplazo de transceptores (baluns), conectores y fuentes de poder',
                    'Saneamiento y peinado de cableado deteriorado por sol o humedad',
                    'Ampliación de canales o actualización de disco duro de grabación',
                    'Reconfiguración de enlace P2P en celulares y limpieza óptica de domos y lentes'
                ]
            }
        ],
        deliverables: [
            'Canalización protegida con tubería conduit o canaleta según la superficie',
            'Cajas de registro herméticas para proteger conectores de la lluvia y sulfatación',
            'Capacitación práctica para consultar grabaciones y descargar clips de evidencia',
            'Garantía por escrito en equipos e instalación'
        ],
        closingBanner: {
            title: '¿Ya tienes cámaras instaladas?',
            desc: 'Revisamos tu sistema y te ayudamos a recuperar su funcionamiento.',
            primaryButtonLabel: 'Solicitar revisión',
            primaryQuoteId: 'servicio-cctv',
            whatsappText: 'Hola CUBI Servicios, ya tengo cámaras instaladas y me gustaría solicitar una revisión.'
        }
    },
    {
        slug: 'cercos-electricos',
        quoteDefaultId: 'cerco-electrico',
        title: 'Cercos eléctricos',
        heroTitleMain: 'Cercos',
        heroTitleAccent: 'eléctricos',
        cardSubtitle: 'Protección perimetral confiable.',
        heroTag: 'SEGURIDAD PERIMETRAL / ALTA TENSIÓN',
        heroSubtitle: 'Resguardo activo para bardas y perímetros con energizadores certificados, detección inmediata de corte de línea, sirena de alta potencia y respaldo de batería.',
        sectionTitlePrefix: 'Soluciones en',
        sectionTitleAccent: 'cercos eléctricos',
        sectionSubtitle: 'Disuasión activa las 24 horas para proteger los límites de tu casa, negocio o terreno.',
        icon: Zap,
        image: '/images/srv-cerco.jpg',
        heroImage: '/images/srv-cerco.jpg',
        fallbackImage: '/images/hero-cctv.jpg',
        idealFor: ['Bardas residenciales', 'Bodegas y terrenos', 'Escuelas e instituciones', 'Negocios y comercios'],
        brands: ['Yonusa', 'SEG', 'Epcom'],
        brandLogos: ['yonusa', 'seg', 'epcom'],
        services: [
            {
                id: 'cerco-electrico',
                title: 'Instalación de cercos eléctricos perimetrales',
                image: '/images/srv-cerco.jpg',
                desc: 'Diseño e instalación de líneas electrificadas sobre barda con postes galvanizados, aisladores resistentes a rayos UV y señalética preventiva normada.',
                actionLabel: 'Conocer esta solución',
                shortFeatures: [
                    'Energizadores certificados con batería de respaldo.',
                    'Sirena exterior de alta potencia ante corte o intrusión',
                    'Control desde llavero inalámbrico o app móvil Wi-Fi'
                ],
                features: [
                    'Energizadores certificados de alto voltaje disuasivo no letal',
                    'Batería de respaldo integrada para operar aun durante cortes de energía eléctrica',
                    'Sirena exterior de alta potencia que se activa al corte o aterrizaje del alambre',
                    'Opción de encendido, apagado y notificaciones desde control remoto o aplicación móvil Wi-Fi'
                ]
            },
            {
                id: 'cerco-electrico',
                title: 'Mantenimiento preventivo y correctivo',
                image: 'https://cdn.tvc.mx/media/2583604/YON6500004_principal_.png',
                imageContain: true,
                desc: 'Diagnóstico y puesta a punto de cercos eléctricos instalados que presentan falsas alarmas, líneas destensadas, aisladores dañados o batería agotada.',
                actionLabel: 'Solicitar diagnóstico',
                shortFeatures: [
                    'Retensado y cambio de alambre de aluminio o galvanizado',
                    'Sustitución de aisladores de paso y esquina deteriorados',
                    'Reemplazo de batería 12V y prueba de descarga y sirena'
                ],
                features: [
                    'Retensado de líneas de alambre de aluminio o acero galvanizado',
                    'Sustitución de aisladores de paso y esquina cristalizados por el sol',
                    'Cambio de batería de respaldo 12V y prueba de descarga y sirena',
                    'Podado y liberación de vegetación que provoque arqueo eléctrico'
                ]
            }
        ],
        deliverables: [
            'Tierra física dedicada con varilla Copperweld para máxima eficiencia de descarga',
            'Cable bujía de doble aislamiento para las líneas de alimentación de alta tensión',
            'Señalética de advertencia visible instalada a lo largo del perímetro',
            'Garantía por escrito en energizador, materiales y mano de obra'
        ],
        closingBanner: {
            title: 'Protege el perímetro de tu propiedad.',
            desc: 'Cotiza la instalación de un cerco nuevo o solicita el mantenimiento de tu sistema actual.',
            primaryButtonLabel: 'Cotizar cerco eléctrico',
            primaryQuoteId: 'cerco-electrico',
            whatsappText: 'Hola CUBI Servicios, me interesa cotizar un servicio de cerco eléctrico.'
        }
    },
    {
        slug: 'computo',
        quoteDefaultId: 'reparacion-pc',
        title: 'Computadoras y soporte',
        heroTitleMain: 'Computadoras y',
        heroTitleAccent: 'soporte técnico',
        cardSubtitle: 'Reparación, ensamble y mantenimiento.',
        heroTag: 'CÓMPUTO / HARDWARE / SOFTWARE',
        heroSubtitle: 'Diagnóstico preciso en taller y a domicilio, reparación de laptops y equipos de escritorio, optimización con unidades SSD, ensamble a medida e instalación de software.',
        sectionTitlePrefix: 'Soluciones de',
        sectionTitleAccent: 'cómputo y soporte',
        sectionSubtitle: 'Mantenemos tus equipos rápidos, seguros y listos para el trabajo diario, estudio o negocio.',
        icon: Monitor,
        image: 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=1400&q=85',
        heroImage: 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=1400&q=85',
        fallbackImage: '/images/hero-cctv.jpg',
        idealFor: ['Hogar y estudiantes', 'Oficinas y despachos', 'Puntos de venta (POS)', 'Arquitectura, diseño y gaming'],
        brands: ['Intel', 'AMD', 'ASUS', 'Lenovo', 'Microsoft', 'HP', 'Kingston', 'Western Digital', 'Seagate', 'HIKSEMI'],
        brandLogos: ['intel', 'amd', 'asus', 'lenovo', 'microsoft', 'hp', 'kingston', 'westerndigital', 'seagate', 'hiksemi'],
        services: [
            {
                id: 'reparacion-pc',
                title: 'Reparación y mantenimiento de computadoras',
                image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&q=85',
                desc: 'Atención profesional a laptops y PCs de escritorio lentas, con sobrecalentamiento, fallas de encendido, pantallas dañadas o errores de sistema.',
                actionLabel: 'Solicitar diagnóstico',
                shortFeatures: [
                    'Limpieza interna profunda y cambio de pasta térmica.',
                    'Actualización a unidades SSD / NVMe y memoria RAM',
                    'Formateo con respaldo seguro y eliminación de virus'
                ],
                features: [
                    'Mantenimiento físico interno, limpieza de disipadores y pasta térmica de alto desempeño',
                    'Actualización a unidades de estado sólido (SSD / NVMe) y ampliación de memoria RAM',
                    'Formateo con respaldo seguro de información, eliminación de malware y optimización',
                    'Reemplazo de pantallas, teclados, baterías, bisagras y centros de carga en laptops'
                ]
            },
            {
                id: 'ensamble-pc',
                title: 'Ensamble de computadoras a medida',
                image: 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=1200&q=85',
                desc: 'Armado profesional de equipos de escritorio seleccionando componentes compatibles y balanceados para oficina, punto de venta, arquitectura o alto rendimiento.',
                actionLabel: 'Cotizar ensamble',
                shortFeatures: [
                    'Configuración con procesadores Intel y AMD Ryzen.',
                    'Gestión limpia de cableado y flujo de aire óptimo',
                    'Pruebas de estabilidad y garantía directa en piezas'
                ],
                features: [
                    'Equipos optimizados para administración, diseño gráfico, ingeniería, edición o gaming',
                    'Gestión limpia de cableado interno y configuración de flujo de aire',
                    'Pruebas de estrés térmico y estabilidad antes de la entrega',
                    'Componentes 100% nuevos y originales con garantía directa'
                ]
            },
            {
                id: 'instalacion-software',
                title: 'Instalación de software y sistemas',
                image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&h=675&q=85',
                desc: 'Puesta en marcha de sistemas operativos, paquetería de oficina, sistemas de Punto de Venta (POS) y herramientas digitales para negocios.',
                actionLabel: 'Conocer esta solución',
                shortFeatures: [
                    'Sistemas operativos, ofimática y software especializado.',
                    'Configuración de Punto de Venta (POS) e inventarios',
                    'Antivirus y Respaldo de datos.'
                ],
                features: [
                    'Instalación y configuración de Windows, suite de ofimática y utilidades técnicas',
                    'Configuración de software de Punto de Venta (POS), lectores de código e impresoras de tickets',
                    'Antivirus y Respaldo de datos.',
                    'Soporte técnico presencial o remoto'
                ]
            }
        ],
        deliverables: [
            'Orden de servicio con folio de rastreo en línea para consultar avances en tiempo real',
            'Diagnóstico claro y presupuesto previo antes de cualquier reparación',
            'Respaldo cuidadoso de documentos y archivos del cliente',
            'Garantía por escrito en refacciones y servicio técnico'
        ],
        closingBanner: {
            title: '¿Tu equipo necesita mantenimiento o reparación?',
            desc: 'Revisamos tu laptop o computadora de escritorio y te entregamos un diagnóstico claro y garantizado.',
            primaryButtonLabel: 'Solicitar revisión',
            primaryQuoteId: 'reparacion-pc',
            whatsappText: 'Hola CUBI Servicios, mi computadora necesita revisión o mantenimiento.'
        }
    },
    {
        slug: 'redes',
        quoteDefaultId: 'redes-wifi',
        title: 'Redes y conectividad',
        heroTitleMain: 'Redes y',
        heroTitleAccent: 'conectividad',
        cardSubtitle: 'Wi-Fi, routers y soluciones de red.',
        heroTag: 'INFRAESTRUCTURA DE RED / WI-FI Y CABLEADO',
        heroSubtitle: 'Eliminamos las zonas sin señal y las desconexiones constantes mediante redes Wi-Fi Mesh, puntos de acceso empresariales y cableado estructurado Ethernet.',
        sectionTitlePrefix: 'Soluciones de',
        sectionTitleAccent: 'redes y conectividad',
        sectionSubtitle: 'Cobertura inalámbrica estable y cableado organizado para hogares, oficinas, hoteles y comercios.',
        icon: Wifi,
        image: 'https://images.unsplash.com/photo-1750711731797-25c3f2551ff8?auto=format&fit=crop&w=1400&q=85',
        heroImage: 'https://images.unsplash.com/photo-1750711731797-25c3f2551ff8?auto=format&fit=crop&w=1400&q=85',
        fallbackImage: '/images/hero-cctv.jpg',
        idealFor: ['Casas de 2 o más plantas', 'Hoteles y restaurantes', 'Oficinas y clínicas', 'Escuelas y comercios'],
        brands: ['Ubiquiti', 'Ruijie', 'TP-Link', 'LinkedPro', 'Belden', 'Epcom'],
        brandLogos: ['ubiquiti', 'ruijie', 'tplink', 'linkedpro', 'belden', 'epcom'],
        services: [
            {
                id: 'redes-wifi',
                title: 'Cobertura Wi-Fi Mesh y puntos de acceso',
                image: 'https://images.unsplash.com/photo-1750711731797-25c3f2551ff8?auto=format&fit=crop&w=1200&q=85',
                desc: 'Diseño e instalación de sistemas Wi-Fi Mesh y Access Points en techo o pared para lograr señal continua y máxima velocidad en cada área de tu propiedad.',
                actionLabel: 'Conocer esta solución',
                shortFeatures: [
                    'Access Points PoE empresariales (Ubiquiti, Ruijie, TP-Link).',
                    'Sistemas Wi-Fi Mesh sin cortes entre habitaciones o pisos',
                    'Red separada para invitados y control de ancho de banda'
                ],
                features: [
                    'Instalación de Access Points en techo o pared alimentados por PoE (un solo cable para datos y energía)',
                    'Sistemas Wi-Fi Mesh de doble banda para residencias amplias sin pérdida de velocidad',
                    'Configuración de red separada para invitados y clientes con control de ancho de banda',
                    'Enlaces inalámbricos punto a punto para llevar internet entre edificios o bodegas'
                ]
            },
            {
                id: 'redes-wifi',
                title: 'Cableado estructurado, switches y racks',
                image: '/images/tecnico-cubi.jpg',
                desc: 'Tendido y conectorización de nodos de red Ethernet Cat6 en cobre 100%, organización de gabinetes de telecomunicaciones y configuración de switches Gigabit y PoE.',
                actionLabel: 'Solicitar diagnóstico',
                shortFeatures: [
                    'Nodos de red Ethernet Cat6 100% cobre (Belden / LinkedPro).',
                    'Instalación y peinado de racks, patch panels y switches PoE',
                    'Configuración de routers y balanceadores de carga'
                ],
                features: [
                    'Instalación y organización de gabinetes, racks, patch panels y switches Gigabit / PoE',
                    'Conectorización RJ45 y jacks de pared con identificación y etiquetado de nodos',
                    'Peinado y saneamiento de racks de comunicaciones desordenados',
                    'Configuración de routers balanceadores de carga para negocios con múltiples proveedores de internet'
                ]
            }
        ],
        deliverables: [
            'Cableado UTP 100% cobre (Belden / LinkedPro) para máxima velocidad y durabilidad',
            'Pruebas de continuidad y velocidad en cada nodo instalado',
            'Entrega de credenciales administrativas y mapa básico de la red',
            'Garantía por escrito en equipos activos e instalación'
        ],
        closingBanner: {
            title: 'Mejora la conectividad de tu hogar o negocio.',
            desc: 'Diseñamos tu red inalámbrica o cableada para que trabajes sin caídas ni zonas sin cobertura.',
            primaryButtonLabel: 'Solicitar cotización',
            primaryQuoteId: 'redes-wifi',
            whatsappText: 'Hola CUBI Servicios, me interesa mejorar la red Wi-Fi o cableado de mi inmueble.'
        }
    },
    {
        slug: 'control-acceso',
        quoteDefaultId: 'videoporteros',
        title: 'Videoporteros y control de acceso',
        heroTitleMain: 'Videoporteros y',
        heroTitleAccent: 'control de acceso',
        cardSubtitle: 'Mayor control y seguridad.',
        heroTag: 'SEGURIDAD ELECTRÓNICA / ACCESO E INTERCOMUNICACIÓN',
        heroSubtitle: 'Visualiza, habla y autoriza el ingreso a tu propiedad desde un monitor interior o desde tu smartphone, con chapas eléctricas y terminales biométricas.',
        sectionTitlePrefix: 'Soluciones de',
        sectionTitleAccent: 'control de acceso',
        sectionSubtitle: 'Identifica a tus visitas antes de abrir y controla el ingreso a casas, consultorios y empresas.',
        icon: DoorClosed,
        image: 'https://images.unsplash.com/photo-1697382608786-bcf4c113b86e?auto=format&fit=crop&w=1400&q=85',
        heroImage: 'https://images.unsplash.com/photo-1697382608786-bcf4c113b86e?auto=format&fit=crop&w=1400&q=85',
        fallbackImage: '/images/hero-cctv.jpg',
        idealFor: ['Entradas residenciales', 'Consultorios y clínicas', 'Oficinas corporativas', 'Accesos peatonales'],
        brands: ['ZKTeco', 'Hikvision', 'Dahua', 'EZVIZ', 'Epcom'],
        brandLogos: ['zkteco', 'hikvision', 'dahua', 'ezviz', 'epcom'],
        services: [
            {
                id: 'videoporteros',
                title: 'Instalación de videoporteros IP y análogos',
                image: 'https://images.unsplash.com/photo-1697382608786-bcf4c113b86e?auto=format&fit=crop&w=1200&q=85',
                desc: 'Frentes de calle antivandálicos con cámara HD y visión nocturna conectados a monitores interiores a color y aplicación en tu celular.',
                actionLabel: 'Conocer esta solución',
                shortFeatures: [
                    'Pantallas interiores HD con audio bidireccional.',
                    'Apertura de chapa eléctrica desde monitor o smartphone',
                    'Notificación de timbrado directo en tu celular'
                ],
                features: [
                    'Audio bidireccional claro y video en alta definición para identificar visitas antes de abrir',
                    'Liberación remota de chapa eléctrica o contrachapa desde la pantalla o el celular',
                    'Timbrado directo al smartphone aun cuando no te encuentres en casa',
                    'Posibilidad de agregar monitores adicionales en planta alta o recepción'
                ]
            },
            {
                id: 'videoporteros',
                title: 'Control de acceso biométrico, RFID y chapas',
                image: 'https://images.unsplash.com/photo-1748027869634-fc2e545cfb0c?auto=format&fit=crop&w=1200&q=85',
                desc: 'Restricción y automatización de puertas para personal autorizado mediante huella digital, reconocimiento facial, tarjetas de proximidad RFID o código PIN.',
                actionLabel: 'Solicitar cotización',
                shortFeatures: [
                    'Terminales biométricas y lectores RFID (ZKTeco, Hikvision).',
                    'Chapas eléctricas, electroimanes y botones sin contacto',
                    'Fuente de alimentación con batería de respaldo integrada'
                ],
                features: [
                    'Instalación de chapas eléctricas, electroimanes de alta sujeción y botones de salida sin contacto',
                    'Terminales biométricas de control de acceso y asistencia para empresas',
                    'Fuentes de alimentación con batería de respaldo para mantener la seguridad ante apagones',
                    'Mantenimiento y ajuste de cierrapuertas hidráulicos y cerraduras electrónicas'
                ]
            }
        ],
        deliverables: [
            'Instalación oculta y protegida del cableado hacia la puerta o portón',
            'Configuración de usuarios, tarjetas RFID y aplicación móvil en los teléfonos autorizados',
            'Pruebas de apertura mecánica de emergencia y respaldo eléctrico',
            'Garantía por escrito en equipos e instalación'
        ],
        closingBanner: {
            title: 'Controla quién entra a tu hogar o negocio.',
            desc: 'Instalamos videoporteros y cerraduras eléctricas con apertura desde pantalla interior o celular.',
            primaryButtonLabel: 'Cotizar control de acceso',
            primaryQuoteId: 'videoporteros',
            whatsappText: 'Hola CUBI Servicios, me interesa cotizar un videoportero o sistema de control de acceso.'
        }
    },
    {
        slug: 'impresoras',
        quoteDefaultId: 'reparacion-impresoras',
        title: 'Impresoras y periféricos',
        heroTitleMain: 'Impresoras y',
        heroTitleAccent: 'periféricos',
        cardSubtitle: 'Diagnóstico y mantenimiento.',
        heroTag: 'SERVICIO TÉCNICO / IMPRESIÓN Y CONSUMIBLES',
        heroSubtitle: 'Mantenimiento preventivo y correctivo para impresoras de tinta continua y láser, solución de atascos, limpieza de cabezales y venta de periféricos.',
        sectionTitlePrefix: 'Soluciones en',
        sectionTitleAccent: 'impresoras y periféricos',
        sectionSubtitle: 'Servicio especializado para que tus equipos de impresión trabajen con calidad y sin interrupciones.',
        icon: Printer,
        image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=1400&q=85',
        heroImage: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=1400&q=85',
        fallbackImage: '/images/hero-cctv.jpg',
        idealFor: ['Oficinas y comercios', 'Escuelas y papelerías', 'Consultorios y despachos', 'Usuarios domésticos'],
        brands: ['Epson', 'HP', 'Canon'],
        brandLogos: ['epson', 'hp', 'canon'],
        services: [
            {
                id: 'reparacion-impresoras',
                title: 'Mantenimiento y reparación de impresoras',
                image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=1200&q=85',
                desc: 'Diagnóstico y servicio en taller para impresoras Epson EcoTank, HP Smart Tank, Canon y Brother con fallas de impresión, atascos de papel o bloqueo por almohadillas.',
                actionLabel: 'Solicitar diagnóstico',
                shortFeatures: [
                    'Destape ultrasónico y purgado de cabezales y sistema de tinta.',
                    'Cambio, limpieza y reseteo de almohadillas de tinta',
                    'Reparación de tren de arrastre, rodillos y sensores de papel'
                ],
                features: [
                    'Limpieza ultrasónica, destape y purgado de cabezales e inyectores sin aire en mangueras',
                    'Cambio, lavado y reseteo de almohadillas de tinta al final de su vida útil',
                    'Sustitución de gomas de arrastre, rodillos, sensores de papel y reparación de atascos',
                    'Configuración de impresión inalámbrica Wi-Fi y escáner en red para múltiples computadoras'
                ]
            }
        ],
        deliverables: [
            'Folio de recepción con rastreo en línea para verificar el estado de tu impresora',
            'Hoja de prueba de inyectores y alineación de calidad al entregar el equipo',
            'Recomendaciones técnicas para prolongar la vida útil del cabezal',
            'Garantía por escrito en la reparación realizada'
        ],
        closingBanner: {
            title: '¿Tu impresora imprime con rayas o marca error?',
            desc: 'Trae tu equipo a revisión o agenda un diagnóstico para recuperar su calidad de impresión.',
            primaryButtonLabel: 'Solicitar revisión',
            primaryQuoteId: 'reparacion-impresoras',
            whatsappText: 'Hola CUBI Servicios, mi impresora necesita revisión o mantenimiento.'
        }
    }
];

const parseRouteFromUrl = () => {
    const path = (window.location.pathname || '').toLowerCase();
    const hash = (window.location.hash || '').toLowerCase();
    const combined = `${path} ${hash}`;

    for (const cat of CATEGORY_PAGES) {
        if (
            combined.includes(`/servicios/${cat.slug}`) ||
            combined.includes(`/categoria/${cat.slug}`) ||
            combined.includes(`#/servicios/${cat.slug}`) ||
            combined.includes(`#/categoria/${cat.slug}`)
        ) {
            return { page: 'categoria', categorySlug: cat.slug };
        }
    }

    if (path.includes('/servicios') || hash.includes('#/servicios') || hash === '#servicios') {
        return { page: 'servicios', categorySlug: null };
    }
    if (path.includes('/contacto') || hash.includes('#/contacto') || hash === '#contacto') {
        return { page: 'contacto', categorySlug: null };
    }
    if (path.includes('/nosotros') || hash.includes('#/nosotros') || hash === '#nosotros') {
        return { page: 'nosotros', categorySlug: null };
    }
    return { page: 'inicio', categorySlug: null };
};

const PublicLandingPage = () => {
    const initialRoute = parseRouteFromUrl();
    const [currentPage, setCurrentPage] = useState(initialRoute.page);
    const [activeCategorySlug, setActiveCategorySlug] = useState(initialRoute.categorySlug);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Quote Wizard Modal state
    const [quoteModalOpen, setQuoteModalOpen] = useState(false);
    const [quotePreselectId, setQuotePreselectId] = useState(null);

    // Contact form state
    const [contactForm, setContactForm] = useState({
        nombre: '',
        correo: '',
        telefono: '',
        asunto: 'CCTV y videovigilancia',
        tipo_inmueble: 'Casa / Residencia',
        mensaje: ''
    });
    const [contactSent, setContactSent] = useState(false);
    const [contactFolio, setContactFolio] = useState('');
    const [contactLoading, setContactLoading] = useState(false);
    const [contactError, setContactError] = useState('');
    const [contactHp, setContactHp] = useState('');
    const [contactTurnstileToken, setContactTurnstileToken] = useState('');

    useEffect(() => {
        const handleRouteSync = () => {
            const parsed = parseRouteFromUrl();
            setCurrentPage(parsed.page);
            setActiveCategorySlug(parsed.categorySlug);
        };
        window.addEventListener('popstate', handleRouteSync);
        window.addEventListener('hashchange', handleRouteSync);
        return () => {
            window.removeEventListener('popstate', handleRouteSync);
            window.removeEventListener('hashchange', handleRouteSync);
        };
    }, []);

    const navigateTo = (page, e, categorySlug = null) => {
        if (e && e.preventDefault) e.preventDefault();
        setCurrentPage(page);
        setActiveCategorySlug(categorySlug);
        setMobileMenuOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        const searchParams = new URLSearchParams(window.location.search);
        const hasLandingParam = searchParams.get('landing') === 'true';

        let targetPath = '/';
        if (page === 'categoria' && categorySlug) {
            targetPath = `/servicios/${categorySlug}`;
        } else if (page !== 'inicio') {
            targetPath = `/${page}`;
        }

        if (hasLandingParam) {
            targetPath += '?landing=true';
        }

        try {
            window.history.pushState({ page, categorySlug }, '', targetPath);
        } catch {
            if (page === 'categoria' && categorySlug) {
                window.location.hash = `#/servicios/${categorySlug}`;
            } else {
                window.location.hash = page === 'inicio' ? '' : `#/${page}`;
            }
        }
    };

    const openCategoryPage = (slug, e) => {
        navigateTo('categoria', e, slug);
    };

    const scrollToSectionOrNavigate = (sectionId, fallbackPage, e) => {
        if (e && e.preventDefault) e.preventDefault();
        setMobileMenuOpen(false);
        if (currentPage === 'inicio') {
            const el = document.getElementById(sectionId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
                return;
            }
        }
        navigateTo(fallbackPage);
    };

    const openQuoteWizard = (serviceId = null) => {
        setQuotePreselectId(serviceId);
        setQuoteModalOpen(true);
        setMobileMenuOpen(false);
    };

    const handleContactSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setContactError('');

        // 1. Verificación Honeypot anti-bot
        if (contactHp) {
            setContactSent(true);
            setContactFolio('MSJ-OK');
            return;
        }

        // 2. Validación de Nombre
        if (!contactForm.nombre.trim() || contactForm.nombre.trim().length < 2) {
            setContactError('Por favor ingresa tu nombre completo (mínimo 2 caracteres).');
            return;
        }

        if (isSuspiciousPayload(contactForm.nombre) || isSuspiciousPayload(contactForm.mensaje)) {
            setContactError('Por motivos de seguridad, el mensaje contiene caracteres o enlaces no permitidos.');
            return;
        }

        // 3. Validación de Teléfono (mínimo 10 dígitos)
        if (!validatePhoneNumber(contactForm.telefono)) {
            setContactError('Por favor ingresa un número de teléfono o WhatsApp válido de al menos 10 dígitos.');
            return;
        }

        // 4. Validación de Correo (si se proporcionó)
        if (contactForm.correo.trim() && !validateEmailAddress(contactForm.correo)) {
            setContactError('Por favor ingresa un formato de correo electrónico válido.');
            return;
        }

        // 5. Validación de Mensaje
        if (!contactForm.mensaje.trim() || contactForm.mensaje.trim().length < 4) {
            setContactError('Por favor escribe tu mensaje o los detalles de lo que necesitas.');
            return;
        }

        const cleanNombre = sanitizeInput(contactForm.nombre, 100);
        const cleanTelefono = contactForm.telefono.replace(/\D/g, '').slice(0, 15);
        const cleanCorreo = contactForm.correo.trim() ? sanitizeInput(contactForm.correo, 100) : '';
        const cleanAsunto = sanitizeInput(contactForm.asunto, 120);
        const cleanInmueble = sanitizeInput(contactForm.tipo_inmueble, 80);
        const cleanMensaje = sanitizeInput(contactForm.mensaje, 1500);

        setContactLoading(true);

        const payload = {
            tipo: 'contacto',
            asunto: cleanAsunto,
            servicios: [cleanAsunto],
            tipo_inmueble: cleanInmueble || 'Particular / Negocio',
            direccion: 'Acayucan, Ver. y región',
            nombre: cleanNombre,
            telefono: cleanTelefono,
            correo: cleanCorreo || undefined,
            nota: `[MENSAJE DE CONTACTO - WEB]\nAsunto: ${cleanAsunto}\nTipo de Inmueble: ${cleanInmueble}\n\n${cleanMensaje}`,
            hp_check: contactHp || undefined,
            cf_token: contactTurnstileToken || undefined
        };

        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            let responseData = null;

            if (supabaseUrl && supabaseAnonKey) {
                const res = await fetch(`${supabaseUrl}/functions/v1/solicitar-cotizacion`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseAnonKey,
                        'Authorization': `Bearer ${supabaseAnonKey}`
                    },
                    body: JSON.stringify(payload)
                });
                responseData = await res.json();
                if (!res.ok) {
                    throw new Error(responseData?.error || 'Error en el servidor al enviar el mensaje.');
                }
            } else {
                throw new Error('Configuración de servidor no disponible.');
            }

            if (!responseData || !responseData.success) {
                throw new Error(responseData?.error || 'No se pudo completar el envío del mensaje.');
            }

            const assignedFolio = responseData?.data?.folio || 'MSJ-REGISTRADO';
            setContactFolio(assignedFolio);
            setContactSent(true);
        } catch (err) {
            console.error('Error al enviar mensaje de contacto:', err);
            setContactError(err.message || 'Ocurrió un error al enviar tu mensaje. También puedes comunicarte directamente por WhatsApp al 924 104 0806.');
        } finally {
            setContactLoading(false);
        }
    };

    const activeCategory = CATEGORY_PAGES.find(c => c.slug === activeCategorySlug) || CATEGORY_PAGES[0];

    const renderQuickQuoteCard = () => (
        <div className="bg-white rounded-xl p-5 sm:p-6 shadow-2xl text-[#111C2B] max-w-md ml-auto">
            <h3 className="font-display text-base sm:text-lg font-extrabold text-[#111C2B] mb-3.5">
                Solicita una cotización
            </h3>

            {contactSent && (
                <div className="mb-3.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Se abrió WhatsApp con tu solicitud lista para enviar.</span>
                </div>
            )}

            {contactError && (
                <div className="mb-3.5 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{contactError}</span>
                </div>
            )}

            <form onSubmit={handleContactSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                        type="text"
                        required
                        aria-label="Nombre"
                        value={contactForm.nombre}
                        onChange={(e) => setContactForm({ ...contactForm, nombre: e.target.value })}
                        placeholder="Nombre"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-[#F8FAFC] text-[#111C2B] placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#168BCC] focus:bg-white transition-colors"
                    />
                    <input
                        type="email"
                        aria-label="Correo electrónico"
                        value={contactForm.correo}
                        onChange={(e) => setContactForm({ ...contactForm, correo: e.target.value })}
                        placeholder="Correo electrónico"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-[#F8FAFC] text-[#111C2B] placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#168BCC] focus:bg-white transition-colors"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                        type="tel"
                        required
                        aria-label="Teléfono"
                        value={contactForm.telefono}
                        onChange={(e) => setContactForm({ ...contactForm, telefono: e.target.value })}
                        placeholder="Teléfono"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-[#F8FAFC] text-[#111C2B] placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#168BCC] focus:bg-white transition-colors"
                    />
                    <input
                        type="text"
                        aria-label="Mensaje (opcional)"
                        value={contactForm.mensaje}
                        onChange={(e) => setContactForm({ ...contactForm, mensaje: e.target.value })}
                        placeholder="Mensaje (opcional)"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-[#F8FAFC] text-[#111C2B] placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#168BCC] focus:bg-white transition-colors"
                    />
                </div>

                {/* Honeypot anti-bot trap */}
                <input
                    type="text"
                    name="contact_sec_trap"
                    tabIndex={-1}
                    autoComplete="off"
                    value={contactHp}
                    onChange={(e) => setContactHp(e.target.value)}
                    className="hidden opacity-0 pointer-events-none absolute -left-[9999px]"
                    aria-hidden="true"
                />

                {/* Cloudflare Turnstile */}
                <div className="hidden">
                    <TurnstileWidget
                        onVerify={(token) => setContactTurnstileToken(token)}
                        onExpire={() => setContactTurnstileToken('')}
                    />
                </div>

                <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg font-display font-bold text-sm text-white bg-[#168BCC] hover:bg-[#1377B0] transition-colors shadow-sm cursor-pointer"
                >
                    <Send className="w-4 h-4" />
                    <span>Enviar solicitud</span>
                </button>
            </form>
        </div>
    );

    return (
        <div className="min-h-screen font-sans antialiased flex flex-col bg-white text-[#111C2B]">

            {/* ========================================================
                BARRA SUPERIOR DISCRETA (#0F1926)
            ======================================================== */}
            <div className="bg-[#0F1926] text-slate-300 text-xs border-b border-white/10 shrink-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 truncate">
                        <span className="inline-flex items-center gap-1.5 text-slate-200 shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-[#38A8E8]" />
                            <span>Acayucan, Veracruz</span>
                        </span>
                        <span className="hidden md:inline text-slate-600">|</span>
                        <span className="hidden md:inline-flex items-center gap-1.5 text-slate-300 truncate">
                            <Clock className="w-3.5 h-3.5 text-[#38A8E8]" />
                            <span>Lun - Vie 9:00 AM – 6:00 PM | Sáb 9:00 AM – 2:00 PM</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 font-medium shrink-0">
                        <a
                            href="/facturacion"
                            className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                        >
                            <FileText className="w-3.5 h-3.5 text-[#38A8E8]" />
                            <span>Facturación CFDI 4.0</span>
                        </a>
                        <span className="text-slate-600">|</span>
                        <a
                            href="#/track/"
                            className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                        >
                            <User className="w-3.5 h-3.5 text-[#38A8E8]" />
                            <span>Rastrear Servicio</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* ========================================================
                ENCABEZADO PRINCIPAL BLANCO
            ======================================================== */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs shrink-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[74px] flex items-center justify-between gap-6">

                    {/* Logotipo CUBI Servicios a la izquierda */}
                    <button
                        type="button"
                        onClick={(e) => navigateTo('inicio', e)}
                        className="flex items-center shrink-0 cursor-pointer focus:outline-none"
                    >
                        <img
                            src="/LogoEmpresa.png"
                            alt="CUBI Servicios"
                            className="h-11 sm:h-12 w-auto object-contain"
                        />
                    </button>

                    {/* Navegación centrada con subrayado azul en el elemento activo */}
                    <nav className="hidden md:flex items-center gap-8 text-sm font-display font-bold">
                        {[
                            { id: 'inicio', label: 'Inicio' },
                            { id: 'servicios', label: 'Servicios' },
                            { id: 'nosotros', label: 'Nosotros' },
                            { id: 'contacto', label: 'Contacto' }
                        ].map((item) => {
                            const isActive = currentPage === item.id || (item.id === 'servicios' && currentPage === 'categoria');
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={(e) => navigateTo(item.id, e)}
                                    className={`relative py-2 transition-colors cursor-pointer ${isActive
                                            ? 'text-[#168BCC]'
                                            : 'text-[#111C2B] hover:text-[#168BCC]'
                                        }`}
                                >
                                    <span>{item.label}</span>
                                    {isActive && (
                                        <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#168BCC] rounded-full" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Botón destacado Solicitar Cotización a la derecha */}
                    <div className="hidden md:flex items-center">
                        <button
                            type="button"
                            onClick={() => openQuoteWizard(null)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-display font-bold text-sm text-white bg-[#168BCC] hover:bg-[#1377B0] shadow-sm transition-all cursor-pointer"
                        >
                            <WhatsAppBadgeIcon className="w-4 h-4" />
                            <span>Solicitar Cotización</span>
                        </button>
                    </div>

                    {/* Botón Menú Móvil */}
                    <div className="flex md:hidden items-center">
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(prev => !prev)}
                            aria-label="Abrir menú"
                            className="p-2 text-[#111C2B] rounded-lg hover:bg-slate-100"
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Menú Móvil Desplegable */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-1.5 shadow-lg">
                        <div className="pb-2 mb-2 border-b border-slate-100 text-xs text-[#64748B]">
                            Lun - Vie 9:00 AM – 6:00 PM | Sáb 9:00 AM – 2:00 PM
                        </div>
                        {[
                            { id: 'inicio', label: 'Inicio' },
                            { id: 'servicios', label: 'Servicios' },
                            { id: 'nosotros', label: 'Nosotros' },
                            { id: 'contacto', label: 'Contacto' }
                        ].map((item) => {
                            const isActive = currentPage === item.id || (item.id === 'servicios' && currentPage === 'categoria');
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={(e) => navigateTo(item.id, e)}
                                    className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-display font-bold transition-colors ${isActive
                                            ? 'text-[#168BCC] bg-[#F2F5F8]'
                                            : 'text-[#111C2B] hover:bg-slate-50'
                                        }`}
                                >
                                    {item.label}
                                </button>
                            );
                        })}
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => openQuoteWizard(null)}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-display font-bold text-sm text-white bg-[#168BCC] hover:bg-[#1377B0]"
                            >
                                <WhatsAppBadgeIcon className="w-4 h-4" />
                                <span>Solicitar Cotización</span>
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* CONTENIDO PRINCIPAL */}
            <main className="flex-1">

                {/* ========================================================
                    VISTA 1: PÁGINA PRINCIPAL (FIEL AL MOCKUP)
                ======================================================== */}
                {currentPage === 'inicio' && (
                    <div>
                        {/* 4. HERO PRINCIPAL - Composición idéntica al mockup */}
                        <section className="relative bg-[#111C2B] text-white overflow-hidden">
                            {/* Fondo arquitectónico con cámara Dahua a la derecha y gradiente azul marino a la izquierda */}
                            <div className="absolute inset-0 z-0 bg-[#0A1829]">
                                <div className="absolute inset-y-0 right-0 w-full lg:w-[58%]">
                                    <img
                                        src="/images/cctv-hero-cam.jpg"
                                        alt="Cámara de seguridad Dahua instalada en fachada corporativa"
                                        className="w-full h-full object-cover object-right opacity-95"
                                    />
                                    <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#0A1829] via-[#0A1829]/85 to-transparent pointer-events-none" />
                                </div>
                                <div className="lg:hidden absolute inset-0 bg-[#0A1829]/75 pointer-events-none" />
                            </div>

                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 relative z-10">
                                <div className="max-w-2xl space-y-5">
                                    {/* Etiqueta con línea vertical azul a la izquierda */}
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-[3px] h-4 bg-[#299FE3] rounded-full" />
                                        <p className="font-sans text-xs sm:text-[13px] font-semibold uppercase tracking-[0.15em] text-slate-200">
                                            TECNOLOGÍA • SEGURIDAD • SERVICIO TÉCNICO
                                        </p>
                                    </div>

                                    {/* Título en dos líneas: Blanco + Azul */}
                                    <h1 className="font-display text-3xl sm:text-5xl lg:text-[52px] font-extrabold tracking-tight leading-[1.12]">
                                        <span className="block text-white">Tecnología que protege.</span>
                                        <span className="block text-[#299FE3] mt-1">Soluciones que conectan.</span>
                                    </h1>

                                    {/* Descripción */}
                                    <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-xl font-normal">
                                        Instalación, mantenimiento y soporte tecnológico para hogares y empresas en Acayucan y la región.
                                    </p>

                                    {/* Botones del Hero */}
                                    <div className="flex flex-wrap items-center gap-4 pt-3">
                                        <button
                                            type="button"
                                            onClick={() => openQuoteWizard(null)}
                                            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg font-display font-bold text-sm sm:text-base text-white bg-[#168BCC] hover:bg-[#1377B0] shadow-lg shadow-[#168BCC]/25 transition-all cursor-pointer"
                                        >
                                            <WhatsAppBadgeIcon className="w-4 h-4" />
                                            <span>Solicitar cotización</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => scrollToSectionOrNavigate('soluciones-cubi', 'servicios', e)}
                                            className="inline-flex items-center justify-center px-6 py-3.5 rounded-lg font-display font-semibold text-sm sm:text-base text-white bg-white/5 hover:bg-white/15 border border-white/30 backdrop-blur-xs transition-all cursor-pointer"
                                        >
                                            <span>Conocer nuestros servicios</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 5. SECCIÓN DE SERVICIOS - "Soluciones para tu hogar y negocio" (Tarjetas fotográficas con overlay oscuro e icono) */}
                        <section id="soluciones-cubi" className="py-16 lg:py-20 bg-white">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                                {/* Encabezado con línea superior azul y texto bicolor */}
                                <div className="mb-10">
                                    <div className="w-12 h-1 bg-[#168BCC] rounded-full mb-3" />
                                    <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#111C2B] tracking-tight">
                                        Soluciones para tu <span className="text-[#168BCC]">hogar y negocio</span>
                                    </h2>
                                    <p className="text-sm sm:text-base text-[#64748B] mt-1.5">
                                        Servicios profesionales con calidad, respaldo y atención personalizada.
                                    </p>
                                </div>

                                {/* Grid 3x2 de Tarjetas Fotográficas con Overlay Oscuro (Click abre la página de cada categoría) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {CATEGORY_PAGES.map((cat) => {
                                        const Icon = cat.icon;
                                        return (
                                            <div
                                                key={cat.slug}
                                                onClick={(e) => openCategoryPage(cat.slug, e)}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        openCategoryPage(cat.slug, e);
                                                    }
                                                }}
                                                className="group relative h-56 sm:h-60 rounded-xl overflow-hidden shadow-md hover:shadow-xl border border-slate-200/80 cursor-pointer transition-all duration-300"
                                            >
                                                <img
                                                    src={cat.image}
                                                    alt={cat.title}
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        if (e.currentTarget.src !== cat.fallbackImage) {
                                                            e.currentTarget.src = cat.fallbackImage;
                                                        }
                                                    }}
                                                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                                                />
                                                {/* Gradiente oscuro inferior idéntico al mockup */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1320]/95 via-[#0E1B2D]/55 to-transparent" />

                                                {/* Contenido superpuesto en la parte inferior */}
                                                <div className="absolute inset-x-0 bottom-0 p-5 flex items-start gap-3.5 text-white">
                                                    <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#168BCC] group-hover:border-[#168BCC] transition-colors">
                                                        <Icon className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-display text-base sm:text-lg font-extrabold text-white flex items-center gap-1.5 leading-snug">
                                                            <span className="truncate">{cat.title}</span>
                                                            <ArrowRight className="w-4 h-4 text-[#38A8E8] shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
                                                        </h3>
                                                        <p className="text-xs sm:text-[13px] text-slate-300 mt-0.5 leading-snug line-clamp-2">
                                                            {cat.cardSubtitle}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                            </div>
                        </section>

                        {/* 6. SECCIÓN DE CONFIANZA - Franja horizontal azul marino con divisores verticales */}
                        <section className="bg-[#111C2B] text-white py-12 lg:py-14 border-y border-[#1C2C40]">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">

                                    {/* Título a la izquierda con línea azul superior y "más allá" en azul */}
                                    <div className="lg:col-span-4">
                                        <div className="w-10 h-1 bg-[#299FE3] rounded-full mb-3" />
                                        <h2 className="font-display text-2xl sm:text-[28px] font-extrabold leading-tight">
                                            Un servicio bien hecho va <span className="text-[#299FE3]">más allá</span> de la instalación.
                                        </h2>
                                    </div>

                                    {/* 4 Compromisos con iconos delineados y separadores verticales */}
                                    <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/15 border-t sm:border-t-0 lg:border-l border-white/15 pt-4 sm:pt-0">
                                        <div className="px-4 py-3 flex flex-col items-center text-center">
                                            <ShieldCheck className="w-8 h-8 text-[#299FE3] stroke-[1.75] mb-2.5" />
                                            <span className="font-display font-bold text-sm text-white leading-snug">
                                                Garantía<br />por escrito
                                            </span>
                                        </div>

                                        <div className="px-4 py-3 flex flex-col items-center text-center">
                                            <Wrench className="w-8 h-8 text-[#299FE3] stroke-[1.75] mb-2.5" />
                                            <span className="font-display font-bold text-sm text-white leading-snug">
                                                Instalaciones<br />cuidadas
                                            </span>
                                        </div>

                                        <div className="px-4 py-3 flex flex-col items-center text-center">
                                            <FileText className="w-8 h-8 text-[#299FE3] stroke-[1.75] mb-2.5" />
                                            <span className="font-display font-bold text-sm text-white leading-snug">
                                                Facturación<br />disponible
                                            </span>
                                        </div>

                                        <div className="px-4 py-3 flex flex-col items-center text-center">
                                            <Home className="w-8 h-8 text-[#299FE3] stroke-[1.75] mb-2.5" />
                                            <span className="font-display font-bold text-sm text-white leading-snug">
                                                Atención<br />a domicilio
                                            </span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </section>

                        {/* 7. SECCIÓN DE MARCAS - Todos los 26 logotipos originales extraídos */}
                        <section className="py-12 lg:py-14 bg-white border-b border-slate-200/80">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                                <div className="flex items-center gap-3 mb-8">
                                    <span className="w-8 h-1 bg-[#168BCC] rounded-full" />
                                    <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#111C2B]">
                                        Marcas con las que trabajamos
                                    </h2>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-x-6 gap-y-7 items-center justify-items-center">
                                    {[
                                        { src: '/images/brands/dahua.png', alt: 'Dahua Technology', h: 'h-7 sm:h-8' },
                                        { src: '/images/brands/hikvision.png', alt: 'Hikvision', h: 'h-5 sm:h-6' },
                                        { src: '/images/brands/hilook.png', alt: 'HiLook by Hikvision', h: 'h-7 sm:h-8' },
                                        { src: '/images/brands/ezviz.png', alt: 'EZVIZ', h: 'h-7 sm:h-8' },
                                        { src: '/images/brands/imou.png', alt: 'Imou', h: 'h-6 sm:h-7' },
                                        { src: '/images/brands/yonusa.png', alt: 'Yonusa', h: 'h-7 sm:h-8' },
                                        { src: '/images/brands/seg.png', alt: 'SEG México', h: 'h-7 sm:h-8' },
                                        { src: '/images/brands/epcom.png', alt: 'Epcom', h: 'h-5 sm:h-6' },
                                        { src: '/images/brands/zkteco.png', alt: 'ZKTeco', h: 'h-5 sm:h-6' },
                                        { src: '/images/brands/ubiquiti.png', alt: 'Ubiquiti', h: 'h-8 sm:h-9' },
                                        { src: '/images/brands/ruijie.png', alt: 'Ruijie', h: 'h-7 sm:h-8' },
                                        { src: '/images/brands/tplink.png', alt: 'TP-Link', h: 'h-7 sm:h-8' },
                                        { src: '/images/brands/linkedpro.png', alt: 'LinkedPro', h: 'h-8 sm:h-9' },
                                        { src: '/images/brands/belden.png', alt: 'Belden', h: 'h-7 sm:h-8' },
                                        { src: '/images/brands/intel.png', alt: 'Intel', h: 'h-8 sm:h-9' },
                                        { src: '/images/brands/amd.png', alt: 'AMD', h: 'h-6 sm:h-7' },
                                        { src: '/images/brands/asus.png', alt: 'ASUS', h: 'h-6 sm:h-7' },
                                        { src: '/images/brands/lenovo.png', alt: 'Lenovo', h: 'h-6 sm:h-7' },
                                    ].map((brand) => (
                                        <div key={brand.alt} className="flex items-center justify-center px-1">
                                            <img
                                                src={brand.src}
                                                alt={brand.alt}
                                                title={brand.alt}
                                                loading="lazy"
                                                className={`${brand.h} w-auto max-w-[115px] object-contain select-none transition-transform duration-200 hover:scale-105`}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-7 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-8 sm:gap-x-10 gap-y-6">
                                    {[
                                        { src: '/images/brands/microsoft.png', alt: 'Microsoft', h: 'h-6 sm:h-7' },
                                        { src: '/images/brands/hp.png', alt: 'HP', h: 'h-8 sm:h-9' },
                                        { src: '/images/brands/epson.png', alt: 'Epson', h: 'h-5 sm:h-6' },
                                        { src: '/images/brands/canon.png', alt: 'Canon', h: 'h-5 sm:h-6' },
                                        { src: '/images/brands/seagate.png', alt: 'Seagate', h: 'h-6 sm:h-7' },
                                        { src: '/images/brands/westerndigital.png', alt: 'Western Digital', h: 'h-6 sm:h-7' },
                                        { src: '/images/brands/kingston.png', alt: 'Kingston Technology', h: 'h-7 sm:h-8' },
                                        { src: '/images/brands/hiksemi.png', alt: 'HIKSEMI', h: 'h-5 sm:h-6' },
                                    ].map((brand) => (
                                        <div key={brand.alt} className="flex items-center justify-center px-1">
                                            <img
                                                src={brand.src}
                                                alt={brand.alt}
                                                title={brand.alt}
                                                loading="lazy"
                                                className={`${brand.h} w-auto max-w-[130px] object-contain select-none transition-transform duration-200 hover:scale-105`}
                                            />
                                        </div>
                                    ))}
                                </div>

                            </div>
                        </section>

                        {/* 8. SECCIÓN DE CONTACTO FINAL - Idéntica a la imagen adjunta con el técnico CUBI a la izquierda */}
                        <section id="contacto-cubi" className="relative bg-gradient-to-r from-[#071A30] via-[#0A2542] to-[#081F38] text-white overflow-hidden">
                            {/* Onda diagonal decorativa sutil en el fondo derecho */}
                            <div
                                className="hidden lg:block absolute inset-y-0 right-0 w-1/2 bg-gradient-to-tl from-[#0E3156]/60 via-transparent to-transparent pointer-events-none"
                                style={{ clipPath: 'polygon(35% 100%, 100% 0%, 100% 100%)' }}
                            />

                            <div className="max-w-7xl mx-auto">
                                <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">

                                    {/* Columna Izquierda: Fotografía exacta del Técnico CUBI Servicios */}
                                    <div className="lg:col-span-3 relative min-h-[260px] sm:min-h-[300px]">
                                        <img
                                            src="/images/tecnico-cubi.jpg"
                                            alt="Técnico CUBI Servicios instalando rack de telecomunicaciones"
                                            loading="lazy"
                                            className="w-full h-full object-cover object-top block"
                                        />
                                    </div>

                                    {/* Columna Central + Derecha: Texto de Contacto y Tarjeta Blanca de Cotización */}
                                    <div className="lg:col-span-9 px-6 sm:px-10 lg:px-12 py-10 lg:py-8 flex items-center relative z-10">
                                        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">

                                            {/* Centro: "¿Listo para mejorar tu seguridad y tu tecnología?" */}
                                            <div className="lg:col-span-6 space-y-3.5">
                                                <div className="w-11 h-1 bg-[#299FE3] rounded-full" />

                                                <h2 className="font-display text-2xl sm:text-[28px] font-extrabold text-white leading-[1.2]">
                                                    ¿Listo para mejorar tu seguridad<br className="hidden sm:inline" /> y tu tecnología?
                                                </h2>

                                                <p className="text-sm sm:text-base text-slate-300">
                                                    Contáctanos, estamos para ayudarte.
                                                </p>

                                                <div className="pt-2 space-y-2.5 text-sm">
                                                    <div className="flex items-center gap-3">
                                                        <MapPin className="w-5 h-5 text-white shrink-0" />
                                                        <span className="font-medium text-white">Acayucan, Veracruz</span>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <span className="w-5 h-5 rounded-full bg-white text-[#0A2542] flex items-center justify-center shrink-0">
                                                            <Phone className="w-3 h-3 fill-current" />
                                                        </span>
                                                        <a
                                                            href="https://wa.me/529241040806"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-display font-bold text-base text-[#38A8E8] hover:underline transition-colors"
                                                        >
                                                            924 104 0806
                                                        </a>
                                                    </div>

                                                    <div className="flex items-start gap-3">
                                                        <Clock className="w-5 h-5 text-white shrink-0 mt-0.5" />
                                                        <div className="text-xs sm:text-sm text-slate-200 leading-snug space-y-0.5">
                                                            <p>Lun - Vie 9:00 AM – 6:00 PM</p>
                                                            <p>Sáb 9:00 AM – 2:00 PM</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Derecha: Tarjeta blanca "Solicita una cotización" */}
                                            <div className="lg:col-span-6">
                                                {renderQuickQuoteCard()}
                                            </div>

                                        </div>
                                    </div>

                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {/* ========================================================
                    VISTA 2: PÁGINA DEDICADA POR CATEGORÍA (/servicios/:slug)
                ======================================================== */}
                {currentPage === 'categoria' && (
                    <div className="bg-white">
                        {/* 1. HERO PRINCIPAL DE LA ESPECIALIDAD */}
                        <section className="relative bg-[#0E1E32] text-white overflow-hidden">
                            {/* Fotografía representativa posicionada en el costado derecho del banner con transición diagonal */}
                            <div className="absolute inset-0 z-0 bg-[#0A1829]">
                                <div className="absolute inset-y-0 right-0 w-full lg:w-[56%]">
                                    <img
                                        src={activeCategory.heroImage || activeCategory.image}
                                        alt={activeCategory.title}
                                        onError={(e) => {
                                            e.currentTarget.src = activeCategory.fallbackImage;
                                        }}
                                        className="w-full h-full object-cover object-right"
                                    />
                                    {/* Difuminado suave únicamente en la unión izquierda de la foto */}
                                    <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#0A1829] via-[#0A1829]/85 to-transparent pointer-events-none" />
                                </div>
                                {/* Corte diagonal decorativo del lado izquierdo sin tapar el sujeto principal */}
                                <div
                                    className="hidden lg:block absolute inset-y-0 left-0 w-[52%] bg-gradient-to-r from-[#0A1829] via-[#0E2238] to-[#132C47]/80 pointer-events-none"
                                    style={{ clipPath: 'polygon(0 0, 100% 0, 84% 100%, 0% 100%)' }}
                                />
                                {/* Overlay en móvil para legibilidad del texto */}
                                <div className="lg:hidden absolute inset-0 bg-[#0A1829]/75 pointer-events-none" />
                            </div>

                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 relative z-10">
                                <div className="max-w-xl space-y-4">
                                    {/* Etiqueta superior con línea vertical azul */}
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-[3px] h-4 bg-[#299FE3] rounded-full" />
                                        <p className="font-sans text-xs sm:text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                                            {activeCategory.heroTag}
                                        </p>
                                    </div>

                                    {/* Título en dos líneas: Blanco + Azul */}
                                    <h1 className="font-display text-3xl sm:text-5xl lg:text-[52px] font-extrabold tracking-tight leading-[1.08]">
                                        <span className="block text-white">{activeCategory.heroTitleMain}</span>
                                        <span className="block text-[#299FE3] mt-1">{activeCategory.heroTitleAccent}</span>
                                    </h1>

                                    {/* Descripción comercial */}
                                    <p className="text-sm sm:text-base lg:text-[17px] text-slate-200 leading-relaxed pt-1">
                                        {activeCategory.heroSubtitle}
                                    </p>

                                    {/* Botones: Cotizar + Consultar por WhatsApp */}
                                    <div className="flex flex-wrap items-center gap-3.5 pt-3">
                                        <button
                                            type="button"
                                            onClick={() => openQuoteWizard(activeCategory.quoteDefaultId)}
                                            className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-lg font-display font-bold text-xs sm:text-sm text-white bg-[#168BCC] hover:bg-[#1377B0] shadow-lg shadow-[#168BCC]/25 transition-all cursor-pointer"
                                        >
                                            <FileText className="w-4 h-4" />
                                            <span>Cotizar {activeCategory.title}</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                        <a
                                            href={`https://wa.me/529241040806?text=${encodeURIComponent(`Hola CUBI Servicios, me interesa información sobre ${activeCategory.title}.`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-display font-semibold text-xs sm:text-sm text-white bg-[#0E1E32]/60 hover:bg-white/15 border border-white/35 backdrop-blur-xs transition-all"
                                        >
                                            <WhatsAppBadgeIcon className="w-4 h-4 text-white" />
                                            <span>Consultar por WhatsApp</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 2. SECCIÓN PRINCIPAL DE SOLUCIONES DE LA ESPECIALIDAD (TARJETAS HORIZONTALES) */}
                        <section className="py-12 sm:py-16 bg-gradient-to-b from-white via-[#F8FAFC] to-white">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                                {/* Encabezado de sección con línea azul arriba */}
                                <div className="mb-8 sm:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                                    <div>
                                        <div className="w-11 h-1 bg-[#168BCC] rounded-full mb-3" />
                                        <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#111C2B] tracking-tight">
                                            {activeCategory.sectionTitlePrefix}{' '}
                                            <span className="text-[#168BCC]">{activeCategory.sectionTitleAccent}</span>
                                        </h2>
                                        <p className="text-sm sm:text-base text-[#64748B] mt-1">
                                            {activeCategory.sectionSubtitle}
                                        </p>
                                    </div>

                                    {/* Selector discreto para cambiar entre las 6 especialidades */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {CATEGORY_PAGES.map((cat) => {
                                            const isCurrent = cat.slug === activeCategory.slug;
                                            return (
                                                <button
                                                    key={cat.slug}
                                                    type="button"
                                                    onClick={(e) => openCategoryPage(cat.slug, e)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold transition-colors cursor-pointer ${isCurrent
                                                            ? 'bg-[#168BCC] text-white'
                                                            : 'bg-[#F2F5F8] text-[#111C2B] hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {cat.title}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Lista de bloques horizontales con fotografía a la izquierda, contenido al centro y acción a la derecha */}
                                <div className="space-y-6">
                                    {activeCategory.services.map((srv, idx) => (
                                        <article
                                            key={`${srv.id}-${idx}`}
                                            className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_rgba(17,28,43,0.05)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch"
                                        >
                                            {/* Fotografía izquierda (5 columnas en desktop, altura uniforme con las demás tarjetas) */}
                                            <div className={`lg:col-span-5 relative h-[220px] sm:h-[235px] lg:h-[245px] overflow-hidden ${srv.imageContain ? 'bg-gradient-to-br from-[#F2F5F8] to-[#E2E8F0] p-4 flex items-center justify-center' : 'bg-[#111C2B]'}`}>
                                                <img
                                                    src={srv.image}
                                                    alt={srv.title}
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        e.currentTarget.src = activeCategory.fallbackImage;
                                                    }}
                                                    className={`w-full h-full ${srv.imageContain ? 'max-h-[195px] object-contain drop-shadow-md' : 'object-cover'} object-center block`}
                                                />
                                            </div>

                                            {/* Contenido central + Enlace derecho con divisor vertical (7 columnas en desktop) */}
                                            <div className="lg:col-span-7 p-6 sm:p-7 lg:px-8 lg:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                                <div className="flex-1 space-y-2.5 pr-2">
                                                    <h3 className="font-display text-xl sm:text-2xl font-extrabold text-[#111C2B]">
                                                        {srv.title}
                                                    </h3>
                                                    <p className="text-sm text-[#64748B] leading-relaxed max-w-xl">
                                                        {srv.desc}
                                                    </p>
                                                    <ul className="pt-1 space-y-1.5">
                                                        {(srv.shortFeatures || srv.features).map((feat, fIdx) => (
                                                            <li key={fIdx} className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[#111C2B]">
                                                                <CheckCircle2 className="w-4 h-4 text-[#168BCC] shrink-0" />
                                                                <span>{feat}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Columna derecha con línea divisoria vertical y acción en azul */}
                                                <div className="sm:pl-6 lg:pl-8 sm:border-l sm:border-slate-200 flex items-center sm:justify-center shrink-0 sm:self-stretch">
                                                    <button
                                                        type="button"
                                                        onClick={() => openQuoteWizard(srv.id)}
                                                        className="inline-flex items-center gap-1.5 font-display font-bold text-xs sm:text-sm text-[#168BCC] hover:text-[#111C2B] transition-colors cursor-pointer whitespace-nowrap group"
                                                    >
                                                        <span>{srv.actionLabel || 'Solicitar cotización'}</span>
                                                        <ArrowRight className="w-4 h-4 text-[#168BCC] transition-transform duration-200 group-hover:translate-x-1" />
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>

                            </div>
                        </section>

                        {/* 3. FRANJA DE CIERRE INFERIOR PERSONALIZADA POR ESPECIALIDAD */}
                        {activeCategory.closingBanner && (
                            <section className="relative bg-[#0B1D33] text-white overflow-hidden border-t border-[#1C2C40]">
                                {/* Franjas diagonales decorativas en el extremo derecho */}
                                <div
                                    className="hidden lg:block absolute inset-y-0 right-0 w-72 bg-[#112A48]/60 pointer-events-none"
                                    style={{ clipPath: 'polygon(35% 0, 55% 0, 20% 100%, 0% 100%)' }}
                                />
                                <div
                                    className="hidden lg:block absolute inset-y-0 right-0 w-56 bg-[#112A48]/80 pointer-events-none"
                                    style={{ clipPath: 'polygon(40% 0, 100% 0, 100% 100%, 5% 100%)' }}
                                />

                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 relative z-10">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">

                                        {/* Izquierda: Escudo con el icono de la especialidad + Divisor vertical + Título y descripción */}
                                        <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-5 sm:gap-7">
                                            <div className="relative w-14 h-14 flex items-center justify-center shrink-0 text-[#168BCC]">
                                                <Shield className="w-14 h-14 stroke-[1.5]" />
                                                {(() => {
                                                    const CatIcon = activeCategory.icon || Camera;
                                                    return <CatIcon className="w-6 h-6 absolute stroke-[2]" />;
                                                })()}
                                            </div>

                                            <span className="hidden sm:block h-12 w-px bg-white/20" />

                                            <div>
                                                <h2 className="font-display text-xl sm:text-2xl lg:text-[26px] font-extrabold text-white leading-snug">
                                                    {activeCategory.closingBanner.title}
                                                </h2>
                                                <p className="text-sm sm:text-base text-slate-300 mt-0.5">
                                                    {activeCategory.closingBanner.desc}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Derecha: Botón redondeado azul */}
                                        <div className="shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => openQuoteWizard(activeCategory.closingBanner.primaryQuoteId)}
                                                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full font-display font-bold text-sm text-white bg-[#168BCC] hover:bg-[#1377B0] shadow-lg shadow-[#168BCC]/30 transition-all cursor-pointer"
                                            >
                                                <span>{activeCategory.closingBanner.primaryButtonLabel}</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>

                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {/* ========================================================
                    VISTA 3: CATÁLOGO GENERAL DE SERVICIOS (/servicios)
                ======================================================== */}
                {currentPage === 'servicios' && (
                    <div className="py-14 sm:py-18 bg-[#F2F5F8]">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                            <div className="mb-10">
                                <div className="w-12 h-1 bg-[#168BCC] rounded-full mb-3" />
                                <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#111C2B]">
                                    Nuestras Categorías de <span className="text-[#168BCC]">Servicios</span>
                                </h1>
                                <p className="text-sm sm:text-base text-[#64748B] mt-1.5 max-w-2xl">
                                    Explora cada especialidad para conocer a detalle los alcances técnicos, marcas que integramos y opciones de cotización para tu hogar o empresa.
                                </p>
                            </div>

                            {/* Tarjetas de Categorías con acceso a cada página de categoría y botón de cotización */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                                {CATEGORY_PAGES.map((cat) => {
                                    const Icon = cat.icon;
                                    return (
                                        <article
                                            key={cat.slug}
                                            className="bg-white rounded-xl overflow-hidden border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col"
                                        >
                                            <div
                                                onClick={(e) => openCategoryPage(cat.slug, e)}
                                                className="relative h-48 overflow-hidden cursor-pointer group"
                                            >
                                                <img
                                                    src={cat.image}
                                                    alt={cat.title}
                                                    onError={(e) => {
                                                        e.currentTarget.src = cat.fallbackImage;
                                                    }}
                                                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#111C2B]/90 via-[#111C2B]/30 to-transparent" />
                                                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 text-white">
                                                    <div className="w-9 h-9 rounded-lg bg-[#168BCC] flex items-center justify-center shrink-0">
                                                        <Icon className="w-5 h-5 text-white" />
                                                    </div>
                                                    <h2 className="font-display text-lg font-extrabold leading-snug">
                                                        {cat.title}
                                                    </h2>
                                                </div>
                                            </div>

                                            <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                                                <div>
                                                    <p className="text-sm text-[#64748B] leading-relaxed mb-4">
                                                        {cat.heroSubtitle}
                                                    </p>
                                                    <ul className="space-y-1.5 border-t border-slate-100 pt-3">
                                                        {cat.services.map((s, idx) => (
                                                            <li key={idx} className="flex items-center gap-2 text-xs font-display font-bold text-[#111C2B]">
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-[#168BCC] shrink-0" />
                                                                <span>{s.title}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div className="pt-2 flex items-center gap-2.5">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => openCategoryPage(cat.slug, e)}
                                                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg font-display font-bold text-xs text-[#111C2B] bg-[#F2F5F8] hover:bg-slate-200 transition-colors cursor-pointer"
                                                    >
                                                        <span>Ver información</span>
                                                        <ArrowRight className="w-3.5 h-3.5 text-[#168BCC]" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openQuoteWizard(cat.quoteDefaultId)}
                                                        className="inline-flex items-center justify-center py-2.5 px-4 rounded-lg font-display font-bold text-xs text-white bg-[#168BCC] hover:bg-[#1377B0] transition-colors cursor-pointer"
                                                    >
                                                        Cotizar
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>

                        </div>
                    </div>
                )}

                {/* ========================================================
                    VISTA 4: NOSOTROS (/nosotros) - Rediseño Corporativo Editorial
                ======================================================== */}
                {currentPage === 'nosotros' && (
                    <div className="bg-white">

                        {/* 1. PRIMERA SECCIÓN: PRESENTACIÓN DE LA EMPRESA */}
                        <section className="pt-12 pb-12 sm:pt-16 sm:pb-16 bg-white border-b border-slate-200/80">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <div className="max-w-3xl mb-8 sm:mb-10">
                                    <div className="flex items-center gap-2 mb-3.5">
                                        <span className="w-8 h-1 bg-[#168BCC] rounded-full" />
                                        <span className="text-xs sm:text-sm font-display font-bold uppercase tracking-wider text-[#168BCC]">
                                            CONÓCENOS · CUBI SERVICIOS
                                        </span>
                                    </div>
                                    <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111C2B] tracking-tight leading-[1.15]">
                                        Integración tecnológica y seguridad en <span className="text-[#168BCC]">Acayucan</span>
                                    </h1>
                                    <p className="mt-4 text-base sm:text-lg text-[#64748B] leading-relaxed">
                                        Soluciones profesionales diseñadas para proteger tu patrimonio y mantener conectados tu hogar o negocio.
                                    </p>
                                </div>

                                {/* Pequeño banner de experiencia y clientes satisfechos */}
                                <div className="bg-[#F2F5F8] rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center divide-y md:divide-y-0 md:divide-x divide-slate-200/90">

                                        {/* Stat 1: Experiencia */}
                                        <div className="flex items-center gap-4 sm:gap-5 pb-5 md:pb-0">
                                            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0 text-[#168BCC]">
                                                <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
                                            </div>
                                            <div>
                                                <div className="font-display text-3xl sm:text-4xl font-extrabold text-[#111C2B] tracking-tight">
                                                    +5 Años
                                                </div>
                                                <p className="text-sm sm:text-base font-bold text-[#168BCC] mt-0.5">
                                                    de experiencia en seguridad electrónica
                                                </p>
                                                <p className="text-xs text-[#64748B] mt-0.5">
                                                    Instalaciones profesionales y criterio técnico en Acayucan y la región.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Stat 2: Clientes Satisfechos */}
                                        <div className="flex items-center gap-4 sm:gap-5 pt-5 md:pt-0 md:pl-10">
                                            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0 text-[#168BCC]">
                                                <Users className="w-7 h-7 sm:w-8 sm:h-8" />
                                            </div>
                                            <div>
                                                <div className="font-display text-3xl sm:text-4xl font-extrabold text-[#111C2B] tracking-tight">
                                                    +100
                                                </div>
                                                <p className="text-sm sm:text-base font-bold text-[#168BCC] mt-0.5">
                                                    Clientes Satisfechos
                                                </p>
                                                <p className="text-xs text-[#64748B] mt-0.5">
                                                    Proyectos concluidos en hogares, comercios, bodegas y empresas.
                                                </p>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 2. SEGUNDA SECCIÓN: QUIÉNES SOMOS (Editorial de 2 columnas) */}
                        <section className="py-16 sm:py-24 bg-[#F2F5F8] border-b border-slate-200/80">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

                                    {/* Columna Izquierda: Fotografía técnica */}
                                    <div className="lg:col-span-6">
                                        <div className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-200/90 bg-white">
                                            <img
                                                src="/images/cctv-instalacion.jpg"
                                                alt="Técnico de CUBI Servicios realizando instalación profesional"
                                                className="w-full h-[380px] sm:h-[460px] lg:h-[520px] object-cover object-center"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#111C2B]/60 via-transparent to-transparent pointer-events-none" />
                                            <div className="absolute bottom-5 left-5 right-5 text-white pointer-events-none">
                                                <div className="inline-flex items-center gap-2 bg-[#111C2B]/85 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white/10 text-xs font-display font-medium text-slate-200">
                                                    <ShieldCheck className="w-4 h-4 text-[#299FE3]" />
                                                    <span>Instalaciones cuidadas y canalización profesional</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Columna Derecha: Contenido editorial */}
                                    <div className="lg:col-span-6 space-y-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="w-6 h-1 bg-[#168BCC] rounded-full" />
                                                <span className="text-xs sm:text-sm font-display font-bold uppercase tracking-wider text-[#168BCC]">
                                                    QUIÉNES SOMOS
                                                </span>
                                            </div>
                                            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#111C2B] tracking-tight leading-snug">
                                                Tecnología bien implementada, atención en la que puedes confiar.
                                            </h2>
                                        </div>

                                        <div className="space-y-4 text-base sm:text-lg text-[#475569] leading-relaxed">
                                            <p>
                                                En <strong>CUBI Servicios</strong> nos especializamos en soluciones de tecnología, seguridad electrónica y soporte técnico para hogares y empresas.
                                            </p>
                                            <p>
                                                Trabajamos en la instalación, configuración, mantenimiento y reparación de sistemas que facilitan la vida diaria, protegen los espacios y mejoran la conectividad.
                                            </p>
                                            <p>
                                                Nuestro enfoque es ofrecer soluciones adecuadas a cada necesidad, cuidando los detalles técnicos, los materiales utilizados y la calidad de cada trabajo.
                                            </p>
                                        </div>

                                        <div className="pt-4 border-t border-slate-300/80">
                                            <p className="text-base sm:text-lg font-medium text-[#111C2B] leading-relaxed">
                                                Creemos que un buen servicio no termina cuando se instala un equipo. También implica explicar su funcionamiento, ofrecer orientación y brindar respaldo cuando nuestros clientes lo necesitan.
                                            </p>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </section>

                        {/* SECCIONES: PROPUESTA DE VALOR Y NUESTRO PROCESO (Fondo Azul Marino Corporativo #111C2B) */}
                        <section className="py-20 lg:py-24 bg-[#111C2B] text-white relative overflow-hidden border-b border-[#1C2C40]">
                            {/* Ambient background light */}
                            <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#168BCC]/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute bottom-1/4 left-10 w-96 h-96 bg-[#EF4444]/5 rounded-full blur-3xl pointer-events-none" />

                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

                                {/* 1. PROPUESTA DE VALOR: ¿QUÉ NOS DEFINE? */}
                                <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
                                    <div className="inline-flex items-center gap-2 mb-3">
                                        <span className="w-2.5 h-2.5 bg-[#EF4444] rounded-xs shrink-0" />
                                        <span className="text-xs sm:text-sm font-display font-bold uppercase tracking-wider text-[#EF4444]">
                                            PROPUESTA DE VALOR
                                        </span>
                                    </div>
                                    <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                                        ¿Qué nos Define?
                                    </h2>
                                    <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
                                        Principios y valores que guían cada asesoría, instalación y proyecto que realizamos.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
                                    {[
                                        { name: 'Responsabilidad', icon: ShieldCheck, desc: 'Compromiso total con cada proyecto' },
                                        { name: 'Servicio', icon: HeartHandshake, desc: 'Atención cercana, clara y oportuna' },
                                        { name: 'Honestidad', icon: CheckCircle2, desc: 'Diagnósticos y costos transparentes' },
                                        { name: 'Trabajo en Equipo', icon: Users, desc: 'Coordinación y criterio técnico' },
                                        { name: 'Innovación', icon: Lightbulb, desc: 'Tecnología actual y probada' },
                                        { name: 'Calidad', icon: Award, desc: 'Materiales y estándares superiores' },
                                    ].map((item, idx) => {
                                        const Icon = item.icon;
                                        return (
                                            <div
                                                key={idx}
                                                className="group bg-[#1C2C40]/60 hover:bg-[#1C2C40] rounded-xl p-5 sm:p-6 border border-white/10 hover:border-[#168BCC]/50 transition-all duration-300 flex flex-col items-center text-center shadow-md hover:shadow-xl"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-[#111C2B] text-[#299FE3] group-hover:bg-[#168BCC] group-hover:text-white flex items-center justify-center transition-colors duration-200 mb-4 border border-white/10 shadow-inner">
                                                    <Icon className="w-6 h-6 transition-transform duration-200 group-hover:scale-110" />
                                                </div>
                                                <h3 className="font-display font-bold text-sm sm:text-base text-white tracking-tight leading-snug">
                                                    {item.name}
                                                </h3>
                                                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                                                    {item.desc}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Divisor sutil entre secciones */}
                                <div className="my-16 sm:my-20 border-t border-white/10" />

                                {/* 2. NUESTRO PROCESO: DEL DIAGNÓSTICO A LA SATISFACCIÓN */}
                                <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
                                    <div className="inline-flex items-center gap-2 mb-3">
                                        <span className="w-2.5 h-2.5 bg-[#EF4444] rounded-xs shrink-0" />
                                        <span className="text-xs sm:text-sm font-display font-bold uppercase tracking-wider text-[#EF4444]">
                                            NUESTRO PROCESO
                                        </span>
                                    </div>
                                    <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                                        Del Diagnóstico a la Satisfacción
                                    </h2>
                                    <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
                                        Metodología estructurada para garantizar resultados óptimos desde el primer contacto hasta el soporte post-entrega.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5">
                                    {[
                                        {
                                            step: '01',
                                            title: 'Consultoría',
                                            subtitle: 'Análisis de necesidades',
                                            icon: Search,
                                            desc: 'Evaluamos las áreas a proteger y escuchamos tus requerimientos específicos.'
                                        },
                                        {
                                            step: '02',
                                            title: 'Diseño',
                                            subtitle: 'Soluciones a medida',
                                            icon: PenTool,
                                            desc: 'Seleccionamos los equipos, rutas de cableado y especificaciones ideales.'
                                        },
                                        {
                                            step: '03',
                                            title: 'Evaluación',
                                            subtitle: 'Costos y tiempos',
                                            icon: ClipboardCheck,
                                            desc: 'Presupuestos claros y desglosados, materiales requeridos y agenda de trabajo.'
                                        },
                                        {
                                            step: '04',
                                            title: 'Propuesta',
                                            subtitle: 'Acuerdos comerciales',
                                            icon: FileText,
                                            desc: 'Condiciones claras, tiempos de entrega y garantía formal por escrito.'
                                        },
                                        {
                                            step: '05',
                                            title: 'Implementación',
                                            subtitle: 'Ejecución y capacitación',
                                            icon: Wrench,
                                            desc: 'Instalación ordenada, pruebas operativas y explicación detallada de uso.'
                                        },
                                        {
                                            step: '06',
                                            title: 'Soporte',
                                            subtitle: 'Apoyo continuo',
                                            icon: Headphones,
                                            desc: 'Acompañamiento post-instalación, mantenimientos y atención constante.'
                                        }
                                    ].map((item, idx) => {
                                        const Icon = item.icon;
                                        return (
                                            <div
                                                key={idx}
                                                className="group bg-[#1C2C40]/60 hover:bg-[#1C2C40] rounded-xl p-5 sm:p-6 border border-white/10 hover:border-[#168BCC]/50 transition-all duration-300 flex flex-col justify-between relative overflow-hidden shadow-md hover:shadow-xl"
                                            >
                                                {/* Top Accent bar on hover */}
                                                <div className="absolute top-0 left-0 right-0 h-1 bg-transparent group-hover:bg-[#168BCC] transition-colors duration-300" />

                                                <div>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <span className="font-mono text-xs font-bold text-[#EF4444] bg-[#EF4444]/15 px-2.5 py-0.5 rounded border border-[#EF4444]/20">
                                                            {item.step}
                                                        </span>
                                                        <div className="w-8 h-8 rounded-lg bg-[#111C2B] text-[#299FE3] group-hover:bg-[#168BCC] group-hover:text-white flex items-center justify-center transition-colors duration-200 border border-white/10">
                                                            <Icon className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                    <h3 className="font-display font-bold text-base text-white leading-snug">
                                                        {item.title}
                                                    </h3>
                                                    <p className="text-xs font-semibold text-[#299FE3] mt-0.5">
                                                        {item.subtitle}
                                                    </p>
                                                    <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                                                        {item.desc}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                            </div>
                        </section>

                        {/* 4. CUARTA SECCIÓN: NUESTRAS ESPECIALIDADES */}
                        <section className="py-20 lg:py-24 bg-[#F2F5F8]">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <div className="max-w-3xl mb-12 sm:mb-14">
                                    <div className="flex items-center gap-2 mb-3.5">
                                        <span className="w-8 h-1 bg-[#168BCC] rounded-full" />
                                        <span className="text-xs sm:text-sm font-display font-bold uppercase tracking-wider text-[#168BCC]">
                                            SERVICIOS INTEGRALES
                                        </span>
                                    </div>
                                    <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#111C2B] tracking-tight">
                                        Un solo equipo de trabajo, diferentes soluciones tecnológicas.
                                    </h2>
                                    <p className="mt-3 text-base sm:text-lg text-[#64748B] leading-relaxed">
                                        Atendemos distintas necesidades de tecnología y seguridad desde una misma empresa.
                                    </p>
                                </div>

                                {/* Composición visual elegante con fotografías representativas enlazando a cada página */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
                                    {[
                                        {
                                            slug: 'cctv',
                                            title: 'CCTV y videovigilancia',
                                            icon: Camera,
                                            image: '/images/cctv-hero-cam.jpg',
                                            tag: 'Seguridad Electrónica'
                                        },
                                        {
                                            slug: 'cercos-electricos',
                                            title: 'Cercos eléctricos',
                                            icon: Zap,
                                            image: '/images/srv-cerco.jpg',
                                            tag: 'Protección Perimetral'
                                        },
                                        {
                                            slug: 'computo',
                                            title: 'Computadoras y soporte técnico',
                                            icon: Monitor,
                                            image: 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=1200&q=85',
                                            tag: 'Hardware & Mantenimiento'
                                        },
                                        {
                                            slug: 'redes',
                                            title: 'Redes y conectividad',
                                            icon: Wifi,
                                            image: 'https://images.unsplash.com/photo-1750711731797-25c3f2551ff8?auto=format&fit=crop&w=1200&q=85',
                                            tag: 'Wi-Fi & Cableado Cat6'
                                        },
                                        {
                                            slug: 'control-acceso',
                                            title: 'Videoporteros y control de acceso',
                                            icon: DoorClosed,
                                            image: 'https://images.unsplash.com/photo-1697382608786-bcf4c113b86e?auto=format&fit=crop&w=1200&q=85',
                                            tag: 'Acceso Peatonal & Biometría'
                                        },
                                        {
                                            slug: 'impresoras',
                                            title: 'Impresoras y periféricos',
                                            icon: Printer,
                                            image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=1200&q=85',
                                            tag: 'Mantenimiento en Taller'
                                        }
                                    ].map((esp) => {
                                        const Icon = esp.icon;
                                        return (
                                            <div
                                                key={esp.slug}
                                                onClick={(e) => openCategoryPage(esp.slug, e)}
                                                className="group bg-white rounded-xl overflow-hidden border border-slate-200/90 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer"
                                            >
                                                <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-900">
                                                    <img
                                                        src={esp.image}
                                                        alt={esp.title}
                                                        loading="lazy"
                                                        className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#111C2B]/80 via-[#111C2B]/20 to-transparent" />
                                                    <div className="absolute top-3.5 left-3.5">
                                                        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-mono font-medium tracking-wide uppercase bg-[#111C2B]/80 text-white backdrop-blur-xs border border-white/10">
                                                            {esp.tag}
                                                        </span>
                                                    </div>
                                                    <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-center gap-2.5 text-white">
                                                        <div className="w-8 h-8 rounded-lg bg-[#168BCC] flex items-center justify-center shrink-0">
                                                            <Icon className="w-4 h-4 text-white" />
                                                        </div>
                                                        <h3 className="font-display text-base font-bold leading-snug">
                                                            {esp.title}
                                                        </h3>
                                                    </div>
                                                </div>
                                                <div className="p-4 sm:p-5 flex items-center justify-between bg-white border-t border-slate-100">
                                                    <span className="text-xs font-display font-semibold text-[#64748B] group-hover:text-[#168BCC] transition-colors">
                                                        Ver servicios y especificaciones
                                                    </span>
                                                    <div className="w-7 h-7 rounded-full bg-[#F2F5F8] group-hover:bg-[#168BCC] text-[#111C2B] group-hover:text-white flex items-center justify-center transition-colors">
                                                        <ChevronRight className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>

                        {/* 5. QUINTA SECCIÓN: MARCAS Y TECNOLOGÍA */}
                        <section className="py-16 lg:py-20 bg-white border-t border-slate-200/80">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <div className="max-w-3xl mb-12">
                                    <div className="flex items-center gap-2 mb-3.5">
                                        <span className="w-8 h-1 bg-[#168BCC] rounded-full" />
                                        <span className="text-xs sm:text-sm font-display font-bold uppercase tracking-wider text-[#168BCC]">
                                            COMPONENTES Y FABRICANTES
                                        </span>
                                    </div>
                                    <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#111C2B] tracking-tight">
                                        Trabajamos con tecnología de marcas reconocidas.
                                    </h2>
                                    <p className="mt-3 text-base sm:text-lg text-[#64748B] leading-relaxed">
                                        Seleccionamos equipos y componentes de fabricantes especializados para ofrecer soluciones adecuadas a cada proyecto.
                                    </p>
                                </div>

                                {/* Logotipos originales de las marcas reales */}
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-x-6 gap-y-8 items-center justify-items-center">
                                    {[
                                        { src: '/images/brands/dahua.png', alt: 'Dahua Technology', h: 'h-7 sm:h-8' },
                                        { src: '/images/brands/hikvision.png', alt: 'Hikvision', h: 'h-5 sm:h-6' },
                                        { src: '/images/brands/hilook.png', alt: 'HiLook by Hikvision', h: 'h-7 sm:h-8' },
                                        { src: '/images/brands/ezviz.png', alt: 'EZVIZ', h: 'h-7 sm:h-8' },
                                        { src: '/images/brands/imou.png', alt: 'Imou', h: 'h-6 sm:h-7' },
                                        { src: '/images/brands/yonusa.png', alt: 'Yonusa', h: 'h-7 sm:h-8' },
                                        { src: '/images/brands/seg.png', alt: 'SEG México', h: 'h-7 sm:h-8' },
                                        { src: '/images/brands/epcom.png', alt: 'Epcom', h: 'h-5 sm:h-6' },
                                        { src: '/images/brands/zkteco.png', alt: 'ZKTeco', h: 'h-5 sm:h-6' },
                                        { src: '/images/brands/ubiquiti.png', alt: 'Ubiquiti', h: 'h-8 sm:h-9' },
                                        { src: '/images/brands/ruijie.png', alt: 'Ruijie', h: 'h-7 sm:h-8' },
                                        { src: '/images/brands/tplink.png', alt: 'TP-Link', h: 'h-7 sm:h-8' },
                                        { src: '/images/brands/linkedpro.png', alt: 'LinkedPro', h: 'h-8 sm:h-9' },
                                        { src: '/images/brands/belden.png', alt: 'Belden', h: 'h-7 sm:h-8' },
                                        { src: '/images/brands/intel.png', alt: 'Intel', h: 'h-8 sm:h-9' },
                                        { src: '/images/brands/amd.png', alt: 'AMD', h: 'h-6 sm:h-7' },
                                        { src: '/images/brands/asus.png', alt: 'ASUS', h: 'h-6 sm:h-7' },
                                        { src: '/images/brands/lenovo.png', alt: 'Lenovo', h: 'h-6 sm:h-7' },
                                    ].map((brand) => (
                                        <div key={brand.alt} className="flex items-center justify-center px-1">
                                            <img
                                                src={brand.src}
                                                alt={brand.alt}
                                                title={brand.alt}
                                                loading="lazy"
                                                className={`${brand.h} w-auto max-w-[115px] object-contain select-none transition-transform duration-200 hover:scale-105`}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-8 sm:gap-x-10 gap-y-6">
                                    {[
                                        { src: '/images/brands/microsoft.png', alt: 'Microsoft', h: 'h-6 sm:h-7' },
                                        { src: '/images/brands/hp.png', alt: 'HP', h: 'h-8 sm:h-9' },
                                        { src: '/images/brands/epson.png', alt: 'Epson', h: 'h-5 sm:h-6' },
                                        { src: '/images/brands/canon.png', alt: 'Canon', h: 'h-5 sm:h-6' },
                                        { src: '/images/brands/seagate.png', alt: 'Seagate', h: 'h-6 sm:h-7' },
                                        { src: '/images/brands/westerndigital.png', alt: 'Western Digital', h: 'h-6 sm:h-7' },
                                        { src: '/images/brands/kingston.png', alt: 'Kingston Technology', h: 'h-7 sm:h-8' },
                                        { src: '/images/brands/hiksemi.png', alt: 'HIKSEMI', h: 'h-5 sm:h-6' },
                                    ].map((brand) => (
                                        <div key={brand.alt} className="flex items-center justify-center px-1">
                                            <img
                                                src={brand.src}
                                                alt={brand.alt}
                                                title={brand.alt}
                                                loading="lazy"
                                                className={`${brand.h} w-auto max-w-[115px] object-contain select-none transition-transform duration-200 hover:scale-105`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* 6. SEXTA SECCIÓN: CIERRE COMERCIAL */}
                        <section className="py-16 sm:py-20 bg-[#111C2B] text-white relative overflow-hidden">
                            {/* Background Image Overlay with deep navy tint */}
                            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                                <img
                                    src="/images/hero-cctv.jpg"
                                    alt=""
                                    aria-hidden="true"
                                    className="w-full h-full object-cover object-center filter grayscale"
                                />
                                <div className="absolute inset-0 bg-[#111C2B]/90" />
                            </div>

                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                                <div className="max-w-3xl mx-auto text-center">
                                    <div className="inline-flex items-center gap-2 mb-4 px-3.5 py-1.5 rounded-full bg-[#1C2C40] border border-white/10 text-xs font-display font-bold text-[#299FE3] uppercase tracking-wider">
                                        <span>ATENCIÓN EN ACAYUCAN Y LA REGIÓN</span>
                                    </div>

                                    <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                                        ¿Tienes un proyecto en mente?
                                    </h2>

                                    <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
                                        Cuéntanos qué necesitas. En CUBI Servicios te ayudamos a encontrar una solución tecnológica adecuada para tu hogar o negocio.
                                    </p>

                                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => openQuoteWizard(null)}
                                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-display font-bold text-sm text-white bg-[#168BCC] hover:bg-[#1377B0] shadow-lg shadow-[#168BCC]/25 transition-all cursor-pointer"
                                        >
                                            <span>Solicitar cotización</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </button>

                                        <a
                                            href="https://wa.me/529241040806?text=Hola%20CUBI%20Servicios,%20tengo%20un%20proyecto%20en%20mente%20y%20me%20gustar%C3%ADa%20recibir%20asesor%C3%ADa."
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-display font-bold text-sm text-white bg-[#1C2C40] hover:bg-[#253852] border border-white/15 transition-all cursor-pointer"
                                        >
                                            <WhatsAppBadgeIcon className="w-4 h-4 text-[#25D366]" />
                                            <span>Contactar por WhatsApp</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </section>

                    </div>
                )}

                {/* ========================================================
                    VISTA 5: CONTACTO (/contacto) - Rediseño Corporativo Premium
                ======================================================== */}
                {currentPage === 'contacto' && (
                    <div className="bg-white">

                        {/* 1. ENCABEZADO DE CONTACTO */}
                        <section className="pt-12 pb-12 sm:pt-16 sm:pb-16 bg-white border-b border-slate-200/80">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <div className="max-w-3xl">
                                    <div className="flex items-center gap-2 mb-3.5">
                                        <span className="w-8 h-1 bg-[#168BCC] rounded-full" />
                                        <span className="text-xs sm:text-sm font-display font-bold uppercase tracking-wider text-[#168BCC]">
                                            CONTACTO · CUBI SERVICIOS
                                        </span>
                                    </div>
                                    <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111C2B] tracking-tight leading-[1.15]">
                                        Estamos listos para atender tu <span className="text-[#168BCC]">proyecto</span>
                                    </h1>
                                    <p className="mt-4 text-base sm:text-lg text-[#64748B] leading-relaxed">
                                        Ponte en contacto con nuestro equipo técnico para cotizaciones, diagnósticos, visitas en sitio o resolución de dudas sobre tus sistemas en Acayucan y la región.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* 2. CUERPO PRINCIPAL: CANALES DIRECTOS + FORMULARIO GRANDE */}
                        <section className="py-14 sm:py-20 bg-[#F2F5F8] border-b border-slate-200/80">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">

                                    {/* COLUMNA IZQUIERDA: INFORMACIÓN Y CANALES DIRECTOS */}
                                    <div className="lg:col-span-5 space-y-5">

                                        {/* Card 1: Teléfono y WhatsApp */}
                                        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0">
                                                    <WhatsAppBadgeIcon className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-display font-bold uppercase tracking-wider text-[#64748B]">
                                                        Teléfono y WhatsApp Directo
                                                    </p>
                                                    <a
                                                        href="https://wa.me/529241040806"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-mono text-2xl font-bold text-[#111C2B] hover:text-[#168BCC] transition-colors block mt-1"
                                                    >
                                                        924 104 0806
                                                    </a>
                                                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                                                        Atención de lunes a sábado para asesoría, cotizaciones y seguimiento de servicios.
                                                    </p>
                                                    <div className="mt-3.5">
                                                        <a
                                                            href="https://wa.me/529241040806?text=Hola%20CUBI%20Servicios,%20me%20gustar%C3%ADa%20recibir%20informaci%C3%B3n%20sobre%20sus%20servicios."
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white font-display font-bold text-xs shadow-xs transition-colors"
                                                        >
                                                            <WhatsAppBadgeIcon className="w-4 h-4" />
                                                            <span>Escribir por WhatsApp</span>
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 2: Correo Electrónico */}
                                        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-[#F2F5F8] border border-slate-200 text-[#168BCC] flex items-center justify-center shrink-0">
                                                    <Mail className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-display font-bold uppercase tracking-wider text-[#64748B]">
                                                        Correo de Atención
                                                    </p>
                                                    <a
                                                        href="mailto:contacto@cubiservicios.lat"
                                                        className="font-display text-base sm:text-lg font-bold text-[#111C2B] hover:text-[#168BCC] transition-colors block mt-1"
                                                    >
                                                        contacto@cubiservicios.lat
                                                    </a>
                                                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                                                        Envíanos requerimientos, planos o solicitudes formales de cotización empresarial.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 3: Ubicación y Cobertura */}
                                        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-[#F2F5F8] border border-slate-200 text-[#168BCC] flex items-center justify-center shrink-0">
                                                    <MapPin className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-display font-bold uppercase tracking-wider text-[#64748B]">
                                                        Ubicación y Cobertura
                                                    </p>
                                                    <p className="font-display text-base font-bold text-[#111C2B] mt-1">
                                                        Acayucan, Veracruz
                                                    </p>
                                                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                                                        Benito Barriovero #601. Cobertura con atención a domicilio e instalaciones en Acayucan, Oluta, Sayula, Soconusco y municipios de la región.
                                                    </p>
                                                    <a
                                                        href="https://maps.google.com/?q=Benito+Barriovero+601,+Acayucan,+Veracruz"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-xs font-display font-bold text-[#168BCC] hover:underline mt-2.5"
                                                    >
                                                        <span>Abrir en Google Maps</span>
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 4: Horarios y Respaldo */}
                                        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-[#F2F5F8] border border-slate-200 text-[#168BCC] flex items-center justify-center shrink-0">
                                                    <Clock className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-display font-bold uppercase tracking-wider text-[#64748B]">
                                                        Horarios de Atención
                                                    </p>
                                                    <div className="text-xs text-[#111C2B] mt-1.5 space-y-0.5">
                                                        <p><strong>Lunes a Viernes:</strong> 9:00 AM – 6:00 PM</p>
                                                        <p><strong>Sábados:</strong> 9:00 AM – 2:00 PM</p>
                                                        <p className="text-[#64748B] pt-1">Facturación fiscal CFDI 4.0 y garantía por escrito.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>

                                    {/* COLUMNA DERECHA: FORMULARIO DE CONTACTO GRANDE */}
                                    <div className="lg:col-span-7">
                                        <div className="bg-white rounded-2xl p-7 sm:p-10 border border-slate-200/90 shadow-xl">

                                            <div className="mb-7">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-0.5 bg-[#168BCC] rounded-full" />
                                                    <span className="text-xs font-display font-bold uppercase tracking-wider text-[#168BCC]">
                                                        FORMULARIO DE CONTACTO
                                                    </span>
                                                </div>
                                                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#111C2B] tracking-tight">
                                                    Envíanos un mensaje directo
                                                </h2>
                                                <p className="text-sm text-[#64748B] mt-1.5 leading-relaxed">
                                                    Recibiremos tu solicitud por correo electrónico a través de Resend para responderte formalmente a la brevedad.
                                                </p>
                                            </div>

                                            {/* Notificación de Éxito con Folio */}
                                            {contactSent && (
                                                <div className="mb-7 p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                                                    <div className="flex items-start gap-3.5">
                                                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                                                        <div className="flex-1">
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <h3 className="font-display font-bold text-base text-emerald-900">
                                                                    ¡Mensaje enviado con éxito a nuestro correo!
                                                                </h3>
                                                                {contactFolio && (
                                                                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-200/70 text-emerald-900">
                                                                        FOLIO: {contactFolio}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs sm:text-sm text-emerald-800 mt-1.5 leading-relaxed">
                                                                Tu mensaje fue entregado a nuestro equipo mediante Resend. Revisaremos tus requerimientos y nos comunicaremos contigo al teléfono o WhatsApp proporcionado.
                                                            </p>
                                                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                                                <a
                                                                    href={`https://wa.me/529241040806?text=${encodeURIComponent(`Hola CUBI Servicios, envié un mensaje de contacto a través de la página web con el folio ${contactFolio || ''}.`)}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white font-display font-bold text-xs transition-colors"
                                                                >
                                                                    <WhatsAppBadgeIcon className="w-4 h-4" />
                                                                    <span>Avisar también por WhatsApp</span>
                                                                </a>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setContactSent(false);
                                                                        setContactFolio('');
                                                                    }}
                                                                    className="text-xs font-display font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                                                                >
                                                                    Enviar otro mensaje
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Notificación de Error */}
                                            {contactError && (
                                                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
                                                    <Shield className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                                    <div className="flex-1">
                                                        <p className="font-semibold">{contactError}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {!contactSent && (
                                                <form onSubmit={handleContactSubmit} className="space-y-5">

                                                    {/* Campo 1: Nombre */}
                                                    <div>
                                                        <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#111C2B] mb-2">
                                                            Nombre completo <span className="text-[#168BCC]">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                required
                                                                value={contactForm.nombre}
                                                                onChange={(e) => setContactForm({ ...contactForm, nombre: e.target.value })}
                                                                placeholder="Ej. Roberto Gómez López"
                                                                className="w-full px-4 py-3.5 rounded-xl border border-slate-300 bg-[#F8FAFC] text-[#111C2B] placeholder-slate-400 text-sm sm:text-base font-medium focus:outline-none focus:border-[#168BCC] focus:bg-white focus:ring-2 focus:ring-[#168BCC]/15 transition-all"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Campos 2 y 3: Teléfono y Correo */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                                                        <div>
                                                            <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#111C2B] mb-2">
                                                                Teléfono o WhatsApp <span className="text-[#168BCC]">*</span>
                                                            </label>
                                                            <input
                                                                type="tel"
                                                                required
                                                                value={contactForm.telefono}
                                                                onChange={(e) => setContactForm({ ...contactForm, telefono: e.target.value })}
                                                                placeholder="10 dígitos (ej. 924 123 4567)"
                                                                className="w-full px-4 py-3.5 rounded-xl border border-slate-300 bg-[#F8FAFC] text-[#111C2B] placeholder-slate-400 text-sm sm:text-base font-medium focus:outline-none focus:border-[#168BCC] focus:bg-white focus:ring-2 focus:ring-[#168BCC]/15 transition-all"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#111C2B] mb-2">
                                                                Correo electrónico <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                                                            </label>
                                                            <input
                                                                type="email"
                                                                value={contactForm.correo}
                                                                onChange={(e) => setContactForm({ ...contactForm, correo: e.target.value })}
                                                                placeholder="cliente@ejemplo.com"
                                                                className="w-full px-4 py-3.5 rounded-xl border border-slate-300 bg-[#F8FAFC] text-[#111C2B] placeholder-slate-400 text-sm sm:text-base font-medium focus:outline-none focus:border-[#168BCC] focus:bg-white focus:ring-2 focus:ring-[#168BCC]/15 transition-all"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Campos 4 y 5: Asunto / Especialidad y Tipo de Inmueble */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                                                        <div>
                                                            <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#111C2B] mb-2">
                                                                Servicio o Asunto de Interés
                                                            </label>
                                                            <select
                                                                value={contactForm.asunto}
                                                                onChange={(e) => setContactForm({ ...contactForm, asunto: e.target.value })}
                                                                className="w-full px-4 py-3.5 rounded-xl border border-slate-300 bg-[#F8FAFC] text-[#111C2B] text-sm sm:text-base font-medium focus:outline-none focus:border-[#168BCC] focus:bg-white focus:ring-2 focus:ring-[#168BCC]/15 transition-all cursor-pointer"
                                                            >
                                                                <option value="CCTV y videovigilancia">CCTV y videovigilancia</option>
                                                                <option value="Cercos eléctricos">Cercos eléctricos</option>
                                                                <option value="Computadoras y soporte técnico">Computadoras y soporte técnico</option>
                                                                <option value="Redes y conectividad Wi-Fi">Redes y conectividad Wi-Fi</option>
                                                                <option value="Videoporteros y control de acceso">Videoporteros y control de acceso</option>
                                                                <option value="Impresoras y periféricos">Impresoras y periféricos</option>
                                                                <option value="Mantenimiento preventivo o correctivo">Mantenimiento preventivo / correctivo</option>
                                                                <option value="Consulta general o cotización">Consulta general / Otro asunto</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#111C2B] mb-2">
                                                                Tipo de Inmueble
                                                            </label>
                                                            <select
                                                                value={contactForm.tipo_inmueble}
                                                                onChange={(e) => setContactForm({ ...contactForm, tipo_inmueble: e.target.value })}
                                                                className="w-full px-4 py-3.5 rounded-xl border border-slate-300 bg-[#F8FAFC] text-[#111C2B] text-sm sm:text-base font-medium focus:outline-none focus:border-[#168BCC] focus:bg-white focus:ring-2 focus:ring-[#168BCC]/15 transition-all cursor-pointer"
                                                            >
                                                                <option value="Casa / Residencia">Casa / Residencia</option>
                                                                <option value="Comercio / Tienda">Comercio / Tienda</option>
                                                                <option value="Oficina / Despacho">Oficina / Despacho</option>
                                                                <option value="Bodega / Terreno">Bodega / Terreno</option>
                                                                <option value="Escuela / Institución">Escuela / Institución</option>
                                                                <option value="Otro">Otro</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Campo 6: Mensaje detallado */}
                                                    <div>
                                                        <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#111C2B] mb-2">
                                                            Mensaje o detalles de tu proyecto <span className="text-[#168BCC]">*</span>
                                                        </label>
                                                        <textarea
                                                            required
                                                            rows={4}
                                                            value={contactForm.mensaje}
                                                            onChange={(e) => setContactForm({ ...contactForm, mensaje: e.target.value })}
                                                            placeholder="Cuéntanos brevemente qué necesitas, si es instalación nueva o reparación, equipos que tienes o cualquier duda técnica..."
                                                            className="w-full px-4 py-3.5 rounded-xl border border-slate-300 bg-[#F8FAFC] text-[#111C2B] placeholder-slate-400 text-sm sm:text-base font-medium focus:outline-none focus:border-[#168BCC] focus:bg-white focus:ring-2 focus:ring-[#168BCC]/15 transition-all resize-y"
                                                        />
                                                    </div>

                                                    {/* Honeypot trap invisible */}
                                                    <input
                                                        type="text"
                                                        name="contact_sec_trap"
                                                        tabIndex={-1}
                                                        autoComplete="off"
                                                        value={contactHp}
                                                        onChange={(e) => setContactHp(e.target.value)}
                                                        className="hidden opacity-0 pointer-events-none absolute -left-[9999px]"
                                                        aria-hidden="true"
                                                    />

                                                    {/* Cloudflare Turnstile */}
                                                    <div className="hidden">
                                                        <TurnstileWidget onVerify={(token) => setContactTurnstileToken(token)} />
                                                    </div>

                                                    {/* Botón de Enviar Formulario */}
                                                    <div className="pt-2">
                                                        <button
                                                            type="submit"
                                                            disabled={contactLoading}
                                                            className="w-full py-4 px-8 rounded-xl font-display font-bold text-base text-white bg-[#168BCC] hover:bg-[#1377B0] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#168BCC]/25 flex items-center justify-center gap-3 transition-all cursor-pointer"
                                                        >
                                                            {contactLoading ? (
                                                                <>
                                                                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                                                                    <span>Enviando mensaje a CUBI Servicios...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Send className="w-5 h-5 text-white" />
                                                                    <span>Enviar mensaje</span>
                                                                </>
                                                            )}
                                                        </button>
                                                        <p className="text-center text-xs text-[#64748B] mt-3">
                                                            Tus datos se procesan de forma segura para responder a tu solicitud técnica o comercial.
                                                        </p>
                                                    </div>

                                                </form>
                                            )}

                                        </div>
                                    </div>

                                </div>
                            </div>
                        </section>

                        {/* 3. CIERRE COMERCIAL DE CONTACTO */}
                        <section className="py-16 sm:py-20 bg-[#111C2B] text-white relative overflow-hidden">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                                <div className="max-w-2xl mx-auto">
                                    <span className="inline-block px-3.5 py-1.5 rounded-full text-xs font-mono font-bold tracking-widest uppercase bg-[#1C2C40] text-[#299FE3] border border-white/10 mb-4">
                                        ATENCIÓN RÁPIDA EN ACAYUCAN
                                    </span>
                                    <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                                        ¿Necesitas una cotización formal detallada?
                                    </h2>
                                    <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
                                        También puedes usar nuestro asistente de cotización guiado para seleccionar exactamente qué equipos requieres para tu propiedad.
                                    </p>
                                    <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => openQuoteWizard(null)}
                                            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-display font-bold text-sm text-white bg-[#168BCC] hover:bg-[#1377B0] shadow-lg shadow-[#168BCC]/25 transition-all cursor-pointer"
                                        >
                                            <Wrench className="w-4 h-4" />
                                            <span>Abrir Asistente de Cotización</span>
                                        </button>
                                        <a
                                            href="https://wa.me/529241040806"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-display font-bold text-sm text-white bg-[#1C2C40] hover:bg-[#253852] border border-white/15 transition-all cursor-pointer"
                                        >
                                            <WhatsAppBadgeIcon className="w-4 h-4 text-[#25D366]" />
                                            <span>WhatsApp: 924 104 0806</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </section>

                    </div>
                )}

            </main>

            {/* ========================================================
                BARRA INFERIOR DE PIE DE PÁGINA (IDÉNTICA AL MOCKUP)
            ======================================================== */}
            <footer className="bg-[#0C1520] text-slate-300 border-t border-white/10 shrink-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">

                        {/* Izquierda: Logotipo CUBI Servicios */}
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={(e) => navigateTo('inicio', e)}
                                className="bg-white px-3.5 py-1.5 rounded-lg shadow-xs cursor-pointer"
                            >
                                <img
                                    src="/LogoEmpresa.png"
                                    alt="CUBI Servicios"
                                    className="h-9 sm:h-10 w-auto object-contain"
                                />
                            </button>
                        </div>

                        {/* Centro: Enlaces Inicio · Servicios · Nosotros · Contacto + Portales */}
                        <div className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-display font-medium">
                            {[
                                { id: 'inicio', label: 'Inicio' },
                                { id: 'servicios', label: 'Servicios' },
                                { id: 'nosotros', label: 'Nosotros' },
                                { id: 'contacto', label: 'Contacto' }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={(e) => navigateTo(item.id, e)}
                                    className={`transition-colors cursor-pointer ${currentPage === item.id ? 'text-white font-bold' : 'text-slate-300 hover:text-white'
                                        }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                            <span className="hidden sm:inline text-slate-700">|</span>
                            <a href="/facturacion" className="text-slate-400 hover:text-white transition-colors">
                                Facturación CFDI 4.0
                            </a>
                            <a href="#/track/" className="text-slate-400 hover:text-white transition-colors">
                                Rastrear Servicio
                            </a>
                        </div>

                        {/* Derecha: Iconos circulares Facebook + WhatsApp + cubiservicios.lat */}
                        <div className="flex items-center gap-3">
                            <a
                                href="https://www.facebook.com/search/top?q=CUBI%20Servicios"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Facebook CUBI Servicios"
                                className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#168BCC] text-white flex items-center justify-center transition-colors"
                            >
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                    <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
                                </svg>
                            </a>
                            <a
                                href="https://wa.me/529241040806"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="WhatsApp CUBI Servicios"
                                className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#25D366] text-white flex items-center justify-center transition-colors"
                            >
                                <WhatsAppBadgeIcon className="w-4 h-4" />
                            </a>
                            <span className="h-5 w-px bg-white/15 mx-1" />
                            <a
                                href="https://cubiservicios.lat"
                                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-display font-semibold text-slate-200 hover:text-white transition-colors"
                            >
                                <Globe className="w-4 h-4 text-[#299FE3]" />
                                <span>cubiservicios.lat</span>
                            </a>
                        </div>

                    </div>
                </div>
            </footer>

            {/* Modal Cotizador Paso a Paso (Intacto) */}
            <QuoteWizardModal
                isOpen={quoteModalOpen}
                onClose={() => setQuoteModalOpen(false)}
                initialServiceId={quotePreselectId}
            />

        </div>
    );
};

export default PublicLandingPage;
