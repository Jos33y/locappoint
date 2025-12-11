// LandingTranslationContext.jsx - Comprehensive i18n for Landing Page
// Location: src/contexts/LandingTranslationContext.jsx

import { createContext, useState, useCallback, useEffect } from 'react'

export const LandingTranslationContext = createContext()

// ============================================
// TRANSLATIONS - English & Portuguese
// ============================================

const translations = {
    en: {
        // ========== NAVIGATION ==========
        nav: {
            features: 'Features',
            forWhom: 'For Whom',
            whyLocAppoint: 'Why LocAppoint',
            partnership: 'Partnership',
            joinWaitlist: 'Join the Waitlist'
        },

        // ========== HERO SECTION ==========
        hero: {
            badge: 'Launching Soon',
            titleLine1: 'Get Discovered.',
            titleLine2: 'Get Booked.',
            titleLine3: 'Grow Your Business.',
            subtitle: 'The all-in-one booking platform for local businesses. Accept bookings 24/7 and grow your revenue on autopilot.',
            btnPrimary: 'Join the Waitlist',
            btnSecondary: 'Early Partnership',
            trust1: 'Free to start',
            trust2: 'No technical skills needed',
            trust3: 'GDPR compliant'
        },

        // ========== HERO DASHBOARD ==========
        heroDashboard: {
            businessName: 'Beauty Studio',
            location: 'Lisbon, PT',
            today: 'Today',
            revenue: 'Revenue',
            rating: 'Rating',
            todaysSchedule: "Today's Schedule",
            activity: 'Activity',
            thisWeek: 'This Week',
            available: 'Available',
            newBooking: 'New Booking!',
            bookedFor: 'Sofia M. booked for 18:00',
            notifConfirmed: 'New booking confirmed',
            notifReminder: 'Reminder sent to Maria',
            days: ['M', 'T', 'W', 'T', 'F', 'S', 'S']
        },

        // ========== STATS SECTION ==========
        stats: {
            intro: 'The numbers speak',
            businessesWaiting: 'Businesses Waiting',
            serviceCategories: 'Service Categories',
            citiesLaunching: 'Cities Launching',
            setupCost: 'Setup Cost'
        },

        // ========== PROBLEM SOLUTION ==========
        problem: {
            badge: 'The Reality',
            title: 'Running a local business is',
            titleHighlight: ' hard enough',
            subtitle: "You started your business to do what you love, not to spend hours managing bookings.",
            without: 'Without LocAppoint',
            with: 'With LocAppoint',
            problems: [
                'Losing clients to missed calls and messages',
                'Wasting hours on scheduling and reminders',
                'Double bookings and calendar chaos',
                'No way for new clients to find you'
            ],
            solutions: [
                'Clients book 24/7, even when you sleep',
                'Smart scheduling with automatic reminders',
                'Get discovered by thousands of local clients',
                'Build loyalty with seamless rebooking'
            ],
            transform: 'Transform your business operations today'
        },

        // ========== FEATURES SECTION ==========
        features: {
            badge: 'Core Features',
            title: 'The essentials,',
            titleHighlight: ' done right',
            subtitle: 'Everything you need to manage bookings professionally, without the complexity.',
            onlineBooking: {
                title: '24/7 Online Booking',
                description: 'Let clients book appointments anytime, anywhere. Your calendar stays updated automatically while you focus on what matters.',
                month: 'December 2025'
            },
            reminders: {
                title: 'Automatic Reminders',
                description: 'Reduce no-shows by up to 70% with SMS and email reminders sent automatically.',
                notif1: 'Reminder: Tomorrow 10:00',
                notif2: 'Booking confirmed!'
            },
            payments: {
                title: 'Easy Payments',
                description: 'Accept deposits and full payments online.'
            },
            clients: {
                title: 'Client Management',
                description: 'Track history, preferences, and notes.'
            },
            analytics: {
                title: 'Real-time Analytics',
                description: 'Understand your business with insights on bookings, revenue, peak hours, and client retention.'
            },
            mobile: {
                title: 'Mobile First',
                description: 'Works perfectly on any device.'
            },
            language: {
                title: 'Multi-Language',
                description: 'English & Portuguese supported.'
            },
            days: ['M', 'T', 'W', 'T', 'F', 'S', 'S']
        },

        // ========== AI CAPABILITIES ==========
        ai: {
            badge: 'Powered by AI',
            title: 'Intelligence that works',
            titleHighlight: ' for you',
            subtitle: 'LocAppoint uses advanced AI to automate the tedious, optimize the complex, and give you superpowers to compete with the big players.',
            footer: 'All AI features included. No extra cost. No complicated setup.',
            capabilities: [
                {
                    title: 'AI Visibility Engine',
                    description: 'Our AI analyzes search patterns and client behavior to boost your visibility. Get matched with clients actively searching for your services.',
                    features: ['Smart search ranking', 'Personalized recommendations', 'Local SEO optimization']
                },
                {
                    title: 'Smart Booking System',
                    description: 'Intelligent scheduling that learns your preferences. Auto-fills gaps, prevents conflicts, and optimizes your calendar for maximum efficiency.',
                    features: ['Predictive scheduling', 'Smart gap filling', 'Conflict prevention']
                },
                {
                    title: 'Compliance Assistant',
                    description: 'Stay compliant without the headache. AI monitors regulatory requirements and automatically handles GDPR, data protection, and consent management.',
                    features: ['Auto GDPR compliance', 'Consent tracking', 'Data protection alerts']
                },
                {
                    title: 'Reputation Builder',
                    description: 'AI-powered review management that identifies happy clients and encourages reviews at the perfect moment. Build trust on autopilot.',
                    features: ['Smart review timing', 'Sentiment analysis', 'Response suggestions']
                },
                {
                    title: 'Insight Dashboard',
                    description: 'Transform data into action. AI analyzes your business patterns, predicts trends, and delivers personalized recommendations to grow revenue.',
                    features: ['Revenue predictions', 'Client insights', 'Growth recommendations']
                }
            ]
        },

        // ========== AUDIENCE SECTION ==========
        audience: {
            badge: 'For Whom',
            title: 'Built for',
            titleHighlight: ' service businesses',
            subtitle: 'If you book appointments, LocAppoint is built for you.',
            categories: [
                { title: 'Salons & Barbershops', description: 'Hair stylists, barbers, and beauty professionals' },
                { title: 'Spas & Wellness', description: 'Massage therapists, estheticians, wellness centers' },
                { title: 'Fitness & Training', description: 'Personal trainers, yoga instructors, studios' },
                { title: 'Health & Medical', description: 'Dentists, physiotherapists, healthcare' },
                { title: 'Pet Services', description: 'Groomers, veterinarians, pet care' },
                { title: 'Creative Services', description: 'Photographers, makeup artists, events' }
            ],
            marquee: [
                'Lash & Brow Artists',
                'Auto Detailing',
                'Tutors & Coaches',
                'Life Coaches',
                'Music Teachers',
                'Personal Chefs',
                'Nail Technicians',
                'Aestheticians'
            ],
            marqueeLabel: 'And many more...',
            ctaText: "Don't see your industry?",
            ctaLink: 'Join waitlist & let us know'
        },

        // ========== BENEFITS SECTION ==========
        benefits: {
            badge: 'Why LocAppoint',
            title: 'Results that',
            titleHighlight: ' speak for themselves',
            subtitle: 'Join business owners who are saving time, reducing stress, and growing their revenue.',
            items: [
                {
                    title: 'Save 10+ Hours Weekly',
                    description: 'Stop playing phone tag. Automated booking, reminders, and scheduling free up your time.',
                    statLabel: 'hours saved weekly'
                },
                {
                    title: 'Grow Your Client Base',
                    description: 'Get discovered by thousands searching for local services. Turn browsers into clients.',
                    statLabel: 'more visibility'
                },
                {
                    title: 'Reduce No-Shows',
                    description: 'Automatic SMS and email reminders ensure clients remember appointments.',
                    statLabel: 'fewer no-shows'
                },
                {
                    title: 'Increase Revenue',
                    description: 'Accept bookings 24/7, even while you sleep. Never miss an opportunity.',
                    statLabel: 'revenue increase'
                }
            ]
        },

        // ========== HOW IT WORKS ==========
        howItWorks: {
            badge: 'How It Works',
            title: 'Up and running',
            titleHighlight: ' in minutes',
            subtitle: 'Getting started is simple. No complicated setup, no hidden fees.',
            steps: [
                {
                    title: 'Create Your Profile',
                    description: 'Sign up in minutes. Add your services, pricing, and availability. No technical skills needed.'
                },
                {
                    title: 'Get Discovered',
                    description: 'Your business appears in our marketplace. Share your booking link on social media and WhatsApp.'
                },
                {
                    title: 'Accept Bookings',
                    description: 'Clients book directly into your calendar. Automatic confirmations and reminders are sent.'
                },
                {
                    title: 'Grow Your Business',
                    description: 'Focus on your craft. Let LocAppoint handle scheduling, reminders, and client management.'
                }
            ],
            cta: 'Ready to start?'
        },

        // ========== FAQ SECTION ==========
        faq: {
            badge: 'FAQ',
            title: 'Questions?',
            titleHighlight: " We've got answers",
            subtitle: 'Everything you need to know about getting started with LocAppoint.',
            items: [
                {
                    question: 'Is LocAppoint really free to start?',
                    answer: "Yes! You can create your profile, list your services, and start accepting bookings completely free. We only charge a small transaction fee when you get paid through our platform. No hidden fees, no monthly subscriptions required to get started."
                },
                {
                    question: 'Do I need technical skills to use LocAppoint?',
                    answer: "Not at all. LocAppoint is designed for busy business owners, not tech experts. If you can use WhatsApp, you can use LocAppoint. Our setup wizard guides you through everything step by step."
                },
                {
                    question: 'How do clients find my business?',
                    answer: "Your business appears in the LocAppoint marketplace where clients search for local services. You also get a unique booking link to share on social media, WhatsApp, Instagram, and anywhere else. Clients can book directly without needing to call or message."
                },
                {
                    question: 'What if a client needs to cancel or reschedule?',
                    answer: "Clients can easily reschedule or cancel through their booking confirmation. You set your own cancellation policy, and we enforce it automatically. No awkward conversations needed."
                },
                {
                    question: 'How do automatic reminders work?',
                    answer: "We send SMS and email reminders to your clients before their appointments. You choose when reminders go out. This alone reduces no-shows by up to 90% for most businesses."
                },
                {
                    question: 'Can I accept payments through LocAppoint?',
                    answer: "Yes! You can require deposits, full prepayment, or let clients pay at the venue. We support multiple payment methods including cards and mobile money. Funds are transferred directly to your account."
                },
                {
                    question: 'What happens when I go on holiday?',
                    answer: "Simply block out dates in your calendar. No bookings will be accepted for those times. You can also set specific working hours for each day of the week."
                },
                {
                    question: "Is my data and my clients' data secure?",
                    answer: "Absolutely. We use bank-level encryption and are fully GDPR compliant. Your data is yours, we never sell it to third parties or use it for advertising."
                }
            ],
            ctaTitle: 'Still have questions?',
            ctaSubtitle: "We're here to help you get started",
            ctaBtn: 'Contact Us'
        },

        // ========== FINAL CTA ==========
        finalCta: {
            title: 'Ready to grow your business?',
            subtitle: 'Join 100+ businesses already on the waitlist. Be among the first to launch when we go live.',
            btnPrimary: 'Join the Waitlist',
            btnSecondary: 'Become a Partner',
            note: 'Free to join • No credit card required • Launch early 2025'
        },

        // ========== FOOTER ==========
        footer: {
            tagline: 'Get discovered. Get booked. Grow your business.',
            navigate: 'Navigate',
            legal: 'Legal',
            followUs: 'Follow Us',
            terms: 'Terms of Service',
            privacy: 'Privacy Policy',
            copyright: '© {year} LocAppoint. A FlowleXx Group initiative.',
            craftedWith: 'Crafted with',
            by: 'by'
        },

        // ========== WAITLIST MODAL ==========
        waitlistModal: {
            title: 'Join the Waitlist',
            subtitle: 'Be the first to know when LocAppoint launches in your city',
            fullName: 'Full Name',
            email: 'Email Address',
            cityService: 'City & Service Type',
            cityServicePlaceholder: 'e.g., Lisbon — Hair Salon',
            comments: 'Comments',
            commentsPlaceholder: 'Tell us about your business...',
            submit: 'Join the Waitlist',
            submitting: 'Joining...',
            privacy: "We'll only contact you about the launch. No spam, ever.",
            successTitle: "You're on the list!",
            successMessage: "Thanks for joining! We'll notify you as soon as LocAppoint launches in your area.",
            successBtn: 'Done',
            errorRequired: 'Please fill in all required fields',
            errorEmail: 'Please enter a valid email address',
            errorGeneric: 'Something went wrong. Please try again.'
        },

        // ========== PARTNERSHIP MODAL ==========
        partnershipModal: {
            title: 'Become a Partner',
            subtitle: "Let's grow together. Early partners get exclusive benefits and priority access.",
            firstName: 'First Name',
            lastName: 'Last Name',
            email: 'Email',
            phone: 'Phone',
            phonePlaceholder: '+351 912 345 678',
            orgType: 'Organization Type',
            orgTypePlaceholder: 'Select type...',
            orgTypes: [
                'Events & Entertainment',
                'Healthcare Services',
                'Beauty & Wellness',
                'Legal Services',
                'Home Services',
                'Auto Services',
                'Education & Tutoring',
                'Fitness & Sports',
                'Restaurant & Food',
                'Other'
            ],
            orgName: 'Organization Name',
            orgNamePlaceholder: 'Your business name',
            city: 'City',
            cityPlaceholder: 'Lisbon, Porto, Lagos...',
            country: 'Country',
            countryPlaceholder: 'Portugal, Nigeria...',
            interest: 'Why partner with us?',
            interestPlaceholder: "Share your goals or how you'd like to collaborate...",
            submit: 'Submit Partnership Request',
            submitting: 'Submitting...',
            privacy: "We'll review your application and contact you within 48 hours.",
            successTitle: 'Application Received!',
            successMessage: "Thanks for your interest in partnering with LocAppoint. We'll review your application and get back to you within 48 hours.",
            successBtn: 'Done',
            errorRequired: 'Please fill in all required fields',
            errorEmail: 'Please enter a valid email address',
            errorGeneric: 'Something went wrong. Please try again.',
            required: '*',
            optional: '(optional)'
        },

        // ========== FLOATING BUTTONS ==========
        floating: {
            whatsappTooltip: 'Chat on WhatsApp',
            locaTooltip: 'Ask Loca AI',
            locaTitle: 'Loca AI',
            locaStatus: 'Learning & Improving',
            locaNotice: 'AI is currently undergoing training to serve you better',
            locaGreeting: "Hi there! 👋 I'm",
            locaName: 'Loca',
            locaIntro: ", your AI assistant.",
            locaMessage: "I'm still learning, but I'd love to help! What would you like to know about LocAppoint?",
            locaSuggestions: [
                'How does it work?',
                'Pricing info',
                'Launch date',
                'Features'
            ],
            locaPlaceholder: 'Ask me anything...',
            locaPowered: 'Powered by LocAppoint AI',
            whatsappMessage: 'Hello LocAppoint! I have a question.'
        },

        // ========== COMMON ==========
        common: {
            required: '*',
            optional: '(optional)',
            close: 'Close',
            loading: 'Loading...'
        }
    },

    // ============================================
    // PORTUGUESE TRANSLATIONS
    // ============================================
    pt: {
        // ========== NAVIGATION ==========
        nav: {
            features: 'Funcionalidades',
            forWhom: 'Para Quem',
            whyLocAppoint: 'Porquê LocAppoint',
            partnership: 'Parceria',
            joinWaitlist: 'Entrar na Lista'
        },

        // ========== HERO SECTION ==========
        hero: {
            badge: 'Em Breve',
            titleLine1: 'Seja Descoberto.',
            titleLine2: 'Seja Reservado.',
            titleLine3: 'Faça Crescer o Seu Negócio.',
            subtitle: 'A plataforma de reservas completa para negócios locais. Aceite reservas 24/7 e aumente a sua receita automaticamente.',
            btnPrimary: 'Entrar na Lista',
            btnSecondary: 'Parceria Antecipada',
            trust1: 'Gratuito para começar',
            trust2: 'Sem conhecimentos técnicos',
            trust3: 'Conforme RGPD'
        },

        // ========== HERO DASHBOARD ==========
        heroDashboard: {
            businessName: 'Estúdio de Beleza',
            location: 'Lisboa, PT',
            today: 'Hoje',
            revenue: 'Receita',
            rating: 'Avaliação',
            todaysSchedule: 'Agenda de Hoje',
            activity: 'Atividade',
            thisWeek: 'Esta Semana',
            available: 'Disponível',
            newBooking: 'Nova Reserva!',
            bookedFor: 'Sofia M. reservou para 18:00',
            notifConfirmed: 'Nova reserva confirmada',
            notifReminder: 'Lembrete enviado para Maria',
            days: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
        },

        // ========== STATS SECTION ==========
        stats: {
            intro: 'Os números falam',
            businessesWaiting: 'Negócios em Espera',
            serviceCategories: 'Categorias de Serviços',
            citiesLaunching: 'Cidades de Lançamento',
            setupCost: 'Custo de Configuração'
        },

        // ========== PROBLEM SOLUTION ==========
        problem: {
            badge: 'A Realidade',
            title: 'Gerir um negócio local já é',
            titleHighlight: ' difícil o suficiente',
            subtitle: 'Começou o seu negócio para fazer o que ama, não para passar horas a gerir reservas.',
            without: 'Sem LocAppoint',
            with: 'Com LocAppoint',
            problems: [
                'Perder clientes por chamadas e mensagens não atendidas',
                'Desperdiçar horas em agendamentos e lembretes',
                'Reservas duplicadas e caos no calendário',
                'Sem forma de novos clientes o encontrarem'
            ],
            solutions: [
                'Clientes reservam 24/7, mesmo enquanto dorme',
                'Agendamento inteligente com lembretes automáticos',
                'Seja descoberto por milhares de clientes locais',
                'Fidelize clientes com remarcações simples'
            ],
            transform: 'Transforme as operações do seu negócio hoje'
        },

        // ========== FEATURES SECTION ==========
        features: {
            badge: 'Funcionalidades Principais',
            title: 'O essencial,',
            titleHighlight: ' bem feito',
            subtitle: 'Tudo o que precisa para gerir reservas profissionalmente, sem complicações.',
            onlineBooking: {
                title: 'Reservas Online 24/7',
                description: 'Permita que clientes marquem a qualquer hora, em qualquer lugar. O seu calendário atualiza-se automaticamente enquanto se foca no que importa.',
                month: 'Dezembro 2025'
            },
            reminders: {
                title: 'Lembretes Automáticos',
                description: 'Reduza faltas até 70% com lembretes por SMS e email enviados automaticamente.',
                notif1: 'Lembrete: Amanhã 10:00',
                notif2: 'Reserva confirmada!'
            },
            payments: {
                title: 'Pagamentos Fáceis',
                description: 'Aceite depósitos e pagamentos completos online.'
            },
            clients: {
                title: 'Gestão de Clientes',
                description: 'Registe histórico, preferências e notas.'
            },
            analytics: {
                title: 'Análises em Tempo Real',
                description: 'Compreenda o seu negócio com dados sobre reservas, receita, horários de pico e retenção de clientes.'
            },
            mobile: {
                title: 'Mobile First',
                description: 'Funciona perfeitamente em qualquer dispositivo.'
            },
            language: {
                title: 'Multi-Idioma',
                description: 'Inglês e Português suportados.'
            },
            days: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
        },

        // ========== AI CAPABILITIES ==========
        ai: {
            badge: 'Powered by AI',
            title: 'Inteligência que trabalha',
            titleHighlight: ' para si',
            subtitle: 'LocAppoint usa IA avançada para automatizar o tedioso, otimizar o complexo e dar-lhe superpoderes para competir com os grandes.',
            footer: 'Todas as funcionalidades de IA incluídas. Sem custos extra. Sem configuração complicada.',
            capabilities: [
                {
                    title: 'Motor de Visibilidade IA',
                    description: 'A nossa IA analisa padrões de pesquisa e comportamento de clientes para aumentar a sua visibilidade. Seja encontrado por clientes que procuram os seus serviços.',
                    features: ['Ranking de pesquisa inteligente', 'Recomendações personalizadas', 'Otimização SEO local']
                },
                {
                    title: 'Sistema de Reservas Inteligente',
                    description: 'Agendamento inteligente que aprende as suas preferências. Preenche lacunas, previne conflitos e otimiza o calendário para máxima eficiência.',
                    features: ['Agendamento preditivo', 'Preenchimento inteligente', 'Prevenção de conflitos']
                },
                {
                    title: 'Assistente de Conformidade',
                    description: 'Mantenha-se em conformidade sem dores de cabeça. A IA monitoriza requisitos regulamentares e gere automaticamente RGPD, proteção de dados e consentimentos.',
                    features: ['Conformidade RGPD automática', 'Rastreio de consentimentos', 'Alertas de proteção de dados']
                },
                {
                    title: 'Construtor de Reputação',
                    description: 'Gestão de avaliações com IA que identifica clientes satisfeitos e solicita avaliações no momento perfeito. Construa confiança automaticamente.',
                    features: ['Timing inteligente de avaliações', 'Análise de sentimento', 'Sugestões de resposta']
                },
                {
                    title: 'Painel de Insights',
                    description: 'Transforme dados em ação. A IA analisa padrões do seu negócio, prevê tendências e entrega recomendações personalizadas para aumentar receita.',
                    features: ['Previsões de receita', 'Insights de clientes', 'Recomendações de crescimento']
                }
            ]
        },

        // ========== AUDIENCE SECTION ==========
        audience: {
            badge: 'Para Quem',
            title: 'Feito para',
            titleHighlight: ' negócios de serviços',
            subtitle: 'Se marca consultas, LocAppoint foi feito para si.',
            categories: [
                { title: 'Salões & Barbearias', description: 'Cabeleireiros, barbeiros e profissionais de beleza' },
                { title: 'Spas & Bem-estar', description: 'Massagistas, esteticistas, centros de bem-estar' },
                { title: 'Fitness & Treino', description: 'Personal trainers, instrutores de yoga, estúdios' },
                { title: 'Saúde & Medicina', description: 'Dentistas, fisioterapeutas, clínicas' },
                { title: 'Serviços para Animais', description: 'Tosquiadores, veterinários, pet care' },
                { title: 'Serviços Criativos', description: 'Fotógrafos, maquilhadores, eventos' }
            ],
            marquee: [
                'Especialistas em Pestanas',
                'Detailing Auto',
                'Tutores & Coaches',
                'Life Coaches',
                'Professores de Música',
                'Chefs Pessoais',
                'Manicures',
                'Esteticistas'
            ],
            marqueeLabel: 'E muito mais...',
            ctaText: 'Não vê a sua indústria?',
            ctaLink: 'Entre na lista e conte-nos'
        },

        // ========== BENEFITS SECTION ==========
        benefits: {
            badge: 'Porquê LocAppoint',
            title: 'Resultados que',
            titleHighlight: ' falam por si',
            subtitle: 'Junte-se a empresários que estão a poupar tempo, reduzir stress e aumentar receitas.',
            items: [
                {
                    title: 'Poupe 10+ Horas Semanais',
                    description: 'Pare de jogar telefone. Reservas automáticas, lembretes e agendamento libertam o seu tempo.',
                    statLabel: 'horas poupadas semanais'
                },
                {
                    title: 'Aumente a Base de Clientes',
                    description: 'Seja descoberto por milhares que procuram serviços locais. Transforme visitantes em clientes.',
                    statLabel: 'mais visibilidade'
                },
                {
                    title: 'Reduza Faltas',
                    description: 'Lembretes automáticos por SMS e email garantem que clientes não esquecem marcações.',
                    statLabel: 'menos faltas'
                },
                {
                    title: 'Aumente a Receita',
                    description: 'Aceite reservas 24/7, mesmo enquanto dorme. Nunca perca uma oportunidade.',
                    statLabel: 'aumento de receita'
                }
            ]
        },

        // ========== HOW IT WORKS ==========
        howItWorks: {
            badge: 'Como Funciona',
            title: 'A funcionar',
            titleHighlight: ' em minutos',
            subtitle: 'Começar é simples. Sem configuração complicada, sem taxas escondidas.',
            steps: [
                {
                    title: 'Crie o Seu Perfil',
                    description: 'Registe-se em minutos. Adicione serviços, preços e disponibilidade. Sem conhecimentos técnicos necessários.'
                },
                {
                    title: 'Seja Descoberto',
                    description: 'O seu negócio aparece no nosso marketplace. Partilhe o link de reservas nas redes sociais e WhatsApp.'
                },
                {
                    title: 'Aceite Reservas',
                    description: 'Clientes reservam diretamente no seu calendário. Confirmações e lembretes são enviados automaticamente.'
                },
                {
                    title: 'Faça Crescer o Negócio',
                    description: 'Foque-se no seu trabalho. Deixe o LocAppoint tratar do agendamento, lembretes e gestão de clientes.'
                }
            ],
            cta: 'Pronto para começar?'
        },

        // ========== FAQ SECTION ==========
        faq: {
            badge: 'FAQ',
            title: 'Perguntas?',
            titleHighlight: ' Temos respostas',
            subtitle: 'Tudo o que precisa saber para começar com LocAppoint.',
            items: [
                {
                    question: 'O LocAppoint é mesmo gratuito para começar?',
                    answer: 'Sim! Pode criar o seu perfil, listar serviços e começar a aceitar reservas gratuitamente. Apenas cobramos uma pequena taxa de transação quando recebe pagamentos pela plataforma. Sem taxas escondidas, sem subscrições mensais obrigatórias.'
                },
                {
                    question: 'Preciso de conhecimentos técnicos para usar o LocAppoint?',
                    answer: 'De todo. O LocAppoint foi desenhado para empresários ocupados, não para especialistas em tecnologia. Se sabe usar WhatsApp, sabe usar LocAppoint. O nosso assistente guia-o passo a passo.'
                },
                {
                    question: 'Como é que clientes encontram o meu negócio?',
                    answer: 'O seu negócio aparece no marketplace LocAppoint onde clientes procuram serviços locais. Também recebe um link único de reservas para partilhar nas redes sociais, WhatsApp, Instagram e onde quiser. Clientes podem reservar diretamente sem precisar ligar ou enviar mensagem.'
                },
                {
                    question: 'E se um cliente precisar de cancelar ou remarcar?',
                    answer: 'Clientes podem facilmente remarcar ou cancelar através da confirmação de reserva. Define a sua própria política de cancelamento e nós aplicamo-la automaticamente. Sem conversas constrangedoras.'
                },
                {
                    question: 'Como funcionam os lembretes automáticos?',
                    answer: 'Enviamos lembretes por SMS e email aos seus clientes antes das marcações. Escolhe quando os lembretes são enviados. Só isto reduz faltas até 90% para a maioria dos negócios.'
                },
                {
                    question: 'Posso aceitar pagamentos através do LocAppoint?',
                    answer: 'Sim! Pode exigir depósitos, pagamento total antecipado, ou deixar clientes pagar no local. Suportamos múltiplos métodos de pagamento incluindo cartões e dinheiro móvel. Os fundos são transferidos diretamente para a sua conta.'
                },
                {
                    question: 'O que acontece quando vou de férias?',
                    answer: 'Simplesmente bloqueie as datas no calendário. Nenhuma reserva será aceite nesses períodos. Pode também definir horários específicos de trabalho para cada dia da semana.'
                },
                {
                    question: 'Os meus dados e dos clientes estão seguros?',
                    answer: 'Absolutamente. Usamos encriptação de nível bancário e estamos totalmente em conformidade com o RGPD. Os seus dados são seus, nunca os vendemos a terceiros nem usamos para publicidade.'
                }
            ],
            ctaTitle: 'Ainda tem perguntas?',
            ctaSubtitle: 'Estamos aqui para ajudar',
            ctaBtn: 'Contacte-nos'
        },

        // ========== FINAL CTA ==========
        finalCta: {
            title: 'Pronto para fazer crescer o seu negócio?',
            subtitle: 'Junte-se a 100+ negócios já na lista de espera. Seja dos primeiros quando lançarmos.',
            btnPrimary: 'Entrar na Lista',
            btnSecondary: 'Tornar-se Parceiro',
            note: 'Gratuito • Sem cartão de crédito • Lançamento início 2025'
        },

        // ========== FOOTER ==========
        footer: {
            tagline: 'Seja descoberto. Seja reservado. Faça crescer o seu negócio.',
            navigate: 'Navegar',
            legal: 'Legal',
            followUs: 'Siga-nos',
            terms: 'Termos de Serviço',
            privacy: 'Política de Privacidade',
            copyright: '© {year} LocAppoint. Uma iniciativa FlowleXx Group.',
            craftedWith: 'Criado com',
            by: 'por'
        },

        // ========== WAITLIST MODAL ==========
        waitlistModal: {
            title: 'Entrar na Lista de Espera',
            subtitle: 'Seja o primeiro a saber quando o LocAppoint lançar na sua cidade',
            fullName: 'Nome Completo',
            email: 'Endereço de Email',
            cityService: 'Cidade e Tipo de Serviço',
            cityServicePlaceholder: 'ex: Lisboa — Salão de Cabeleireiro',
            comments: 'Comentários',
            commentsPlaceholder: 'Conte-nos sobre o seu negócio...',
            submit: 'Entrar na Lista',
            submitting: 'A entrar...',
            privacy: 'Só o contactaremos sobre o lançamento. Sem spam, nunca.',
            successTitle: 'Está na lista!',
            successMessage: 'Obrigado por se juntar! Notificá-lo-emos assim que o LocAppoint lançar na sua área.',
            successBtn: 'Feito',
            errorRequired: 'Por favor preencha todos os campos obrigatórios',
            errorEmail: 'Por favor insira um endereço de email válido',
            errorGeneric: 'Algo correu mal. Por favor tente novamente.'
        },

        // ========== PARTNERSHIP MODAL ==========
        partnershipModal: {
            title: 'Tornar-se Parceiro',
            subtitle: 'Vamos crescer juntos. Parceiros iniciais têm benefícios exclusivos e acesso prioritário.',
            firstName: 'Primeiro Nome',
            lastName: 'Apelido',
            email: 'Email',
            phone: 'Telefone',
            phonePlaceholder: '+351 912 345 678',
            orgType: 'Tipo de Organização',
            orgTypePlaceholder: 'Selecione tipo...',
            orgTypes: [
                'Eventos e Entretenimento',
                'Serviços de Saúde',
                'Beleza e Bem-estar',
                'Serviços Jurídicos',
                'Serviços Domésticos',
                'Serviços Auto',
                'Educação e Tutoria',
                'Fitness e Desporto',
                'Restauração e Alimentação',
                'Outro'
            ],
            orgName: 'Nome da Organização',
            orgNamePlaceholder: 'Nome do seu negócio',
            city: 'Cidade',
            cityPlaceholder: 'Lisboa, Porto, Lagos...',
            country: 'País',
            countryPlaceholder: 'Portugal, Nigéria...',
            interest: 'Porquê ser nosso parceiro?',
            interestPlaceholder: 'Partilhe os seus objetivos ou como gostaria de colaborar...',
            submit: 'Submeter Pedido de Parceria',
            submitting: 'A submeter...',
            privacy: 'Analisaremos a sua candidatura e contactá-lo-emos em 48 horas.',
            successTitle: 'Candidatura Recebida!',
            successMessage: 'Obrigado pelo interesse em ser parceiro do LocAppoint. Analisaremos a sua candidatura e responderemos em 48 horas.',
            successBtn: 'Feito',
            errorRequired: 'Por favor preencha todos os campos obrigatórios',
            errorEmail: 'Por favor insira um endereço de email válido',
            errorGeneric: 'Algo correu mal. Por favor tente novamente.',
            required: '*',
            optional: '(opcional)'
        },

        // ========== FLOATING BUTTONS ==========
        floating: {
            whatsappTooltip: 'Conversar no WhatsApp',
            locaTooltip: 'Perguntar ao Loca AI',
            locaTitle: 'Loca AI',
            locaStatus: 'A Aprender e Melhorar',
            locaNotice: 'A IA está em treino para o servir melhor',
            locaGreeting: 'Olá! 👋 Sou o',
            locaName: 'Loca',
            locaIntro: ', o seu assistente de IA.',
            locaMessage: 'Ainda estou a aprender, mas adoraria ajudar! O que gostaria de saber sobre o LocAppoint?',
            locaSuggestions: [
                'Como funciona?',
                'Informação de preços',
                'Data de lançamento',
                'Funcionalidades'
            ],
            locaPlaceholder: 'Pergunte-me o que quiser...',
            locaPowered: 'Powered by LocAppoint AI',
            whatsappMessage: 'Olá LocAppoint! Tenho uma pergunta.'
        },

        // ========== COMMON ==========
        common: {
            required: '*',
            optional: '(opcional)',
            close: 'Fechar',
            loading: 'A carregar...'
        }
    }
}

// ============================================
// PROVIDER COMPONENT
// ============================================

export const LandingTranslationProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        // Check localStorage first
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('locappoint-landing-lang')
            if (saved && (saved === 'en' || saved === 'pt')) {
                return saved
            }
            // Check browser language
            const browserLang = navigator.language?.toLowerCase()
            if (browserLang?.startsWith('pt')) {
                return 'pt'
            }
        }
        return 'en'
    })

    // Save language preference
    useEffect(() => {
        localStorage.setItem('locappoint-landing-lang', language)
        document.documentElement.lang = language
    }, [language])

    // Toggle between languages
    const toggleLanguage = useCallback(() => {
        setLanguage(prev => prev === 'en' ? 'pt' : 'en')
    }, [])

    // Set specific language
    const setLang = useCallback((lang) => {
        if (lang === 'en' || lang === 'pt') {
            setLanguage(lang)
        }
    }, [])

    // Translation function with nested key support
    const t = useCallback((key, replacements = {}) => {
        const keys = key.split('.')
        let value = translations[language]
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k]
            } else {
                // Fallback to English if key not found
                value = translations.en
                for (const fallbackKey of keys) {
                    if (value && typeof value === 'object' && fallbackKey in value) {
                        value = value[fallbackKey]
                    } else {
                        return key // Return the key if not found
                    }
                }
                break
            }
        }

        // Handle string replacements like {year}
        if (typeof value === 'string') {
            return Object.entries(replacements).reduce(
                (str, [k, v]) => str.replace(`{${k}}`, v),
                value
            )
        }

        return value
    }, [language])

    const value = {
        language,
        toggleLanguage,
        setLanguage: setLang,
        t,
        translations: translations[language]
    }

    return (
        <LandingTranslationContext.Provider value={value}>
            {children}
        </LandingTranslationContext.Provider>
    )
}

export default LandingTranslationProvider