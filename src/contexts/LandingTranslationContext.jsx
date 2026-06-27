// LandingTranslationContext.jsx - Comprehensive i18n for Landing Page
// Location: src/contexts/LandingTranslationContext.jsx
//
// NOTE: Portuguese translations use European Portuguese (pt-PT)

import { createContext, useState, useCallback, useEffect } from 'react'

export const LandingTranslationContext = createContext()

// ============================================
// TRANSLATIONS - English & Portuguese
// ============================================

const translations = {
    en: {
        // ========== NAVIGATION ==========
        nav: {
            items: [
                { label: 'Features', href: 'features' },
                { label: 'For Whom', href: 'audience' }
            ],
            partnership: 'Partnership',
            joinWaitlist: 'Join Waitlist'
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
            globalAccess: 'Global Access',
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

        // ========== PRODUCT PREVIEW SECTION ==========
        productPreview: {
            badge: 'See It In Action',
            title: 'Your dashboard,',
            titleHighlight: ' reimagined',
            subtitle: 'A glimpse into how LocAppoint transforms the way you manage appointments and grow your business.',
            caption: 'Live preview of the business dashboard',
            dashboard: {
                greeting: 'Good morning, Maria',
                todayLabel: 'Tuesday, December 12',
                bookings: 'Today',
                clients: 'Clients',
                showRate: 'Show rate',
                upcomingTitle: 'Upcoming Today',
                nav: {
                    dashboard: 'Dashboard',
                    appointments: 'Appointments',
                    clients: 'Clients'
                },
                appointments: [
                    { time: '9:00', name: 'Ana Silva', service: 'Haircut & Styling' },
                    { time: '10:30', name: 'João Santos', service: 'Beard Trim' },
                    { time: '14:00', name: 'Maria Costa', service: 'Color Treatment' }
                ],
                toast: {
                    title: 'New Booking!',
                    text: 'Pedro confirmed for 16:00'
                },
                aiLabel: 'AI Insight',
                aiInsight: '3 clients typically book on Fridays. Consider sending a reminder campaign.'
            }
        },

        // ========== AUDIENCE SECTION ==========
        audience: {
            badge: 'Built For',
            title: 'Made for',
            titleHighlight: ' service businesses',
            subtitle: 'If you book appointments, LocAppoint was made for you.',
            categories: [
                { title: 'Salons & Barbershops', description: 'Hair stylists, barbers, and beauty professionals' },
                { title: 'Spas & Wellness', description: 'Massage therapists, aestheticians, wellness centers' },
                { title: 'Fitness & Training', description: 'Personal trainers, yoga instructors, studios' },
                { title: 'Health & Medical', description: 'Dentists, physiotherapists, clinics' },
                { title: 'Pet Services', description: 'Groomers, veterinarians, pet care' },
                { title: 'Creative Services', description: 'Photographers, makeup artists, event services' }
            ],
            marquee: [
                'Lash Specialists',
                'Auto Detailing',
                'Tutors & Coaches',
                'Life Coaches',
                'Music Teachers',
                'Personal Chefs',
                'Nail Artists',
                'Estheticians'
            ],
            marqueeLabel: 'And many more...',
            ctaText: "Don't see your industry?",
            ctaLink: 'Join waitlist and tell us'
        },

        // ========== CLIENT VALUE SECTION ==========
        clientValue: {
            badge: 'For Clients',
            title: 'Finding services just got',
            titleHighlight: ' easier',
            subtitle: 'Discover top-rated local professionals, book instantly, and enjoy a seamless experience from start to finish.',
            benefits: {
                discover: {
                    title: 'Discover Professionals',
                    description: 'Find verified local professionals in your area with real reviews.'
                },
                book: {
                    title: 'Book Instantly',
                    description: 'See real-time availability and book in seconds, 24/7.'
                },
                time: {
                    title: 'Save Time',
                    description: 'No more phone calls or waiting for replies. Book when it suits you.'
                },
                reviews: {
                    title: 'Trusted Reviews',
                    description: 'Make confident decisions based on real client feedback.'
                },
                secure: {
                    title: 'Secure Payments',
                    description: 'Pay safely online or at the venue. Your data is always protected.'
                },
                mobile: {
                    title: 'Book Anywhere',
                    description: 'Use any device to manage your appointments on the go.'
                }
            },
            ctaText: "Join the waitlist to be notified when we launch in your area."
        },

        // ========== WHATSAPP CTA SECTION ==========
        whatsappCta: {
            title: 'Join Our WhatsApp Channel',
            subtitle: 'Stay updated with the latest news, feature releases, and exclusive early access opportunities.',
            button: 'Join Channel',
            features: {
                updates: 'Launch updates',
                community: 'Join 100+ followers',
                early: 'Early access'
            }
        },

        // ========== BENEFITS SECTION ==========
        benefits: {
            badge: 'Why LocAppoint',
            title: 'Results that',
            titleHighlight: ' speak for themselves',
            subtitle: 'Join business owners who are saving time, reducing stress, and growing revenue.',
            items: [
                {
                    title: 'Save 10+ Hours Weekly',
                    description: 'Stop playing phone tag. Automatic bookings, reminders, and scheduling free up your time.',
                    statLabel: 'hours saved per week'
                },
                {
                    title: 'Grow Your Client Base',
                    description: 'Get discovered by thousands searching for local services. Turn visitors into loyal clients.',
                    statLabel: 'more visibility'
                },
                {
                    title: 'Reduce No-Shows',
                    description: 'Automatic SMS and email reminders ensure clients remember their appointments.',
                    statLabel: 'fewer no-shows'
                },
                {
                    title: 'Boost Revenue',
                    description: 'Accept bookings 24/7, even while you sleep. Never miss an opportunity.',
                    statLabel: 'revenue increase'
                }
            ]
        },

        // ========== SOCIAL PROOF SECTION ==========
        socialProof: {
            badge: 'Trusted by Businesses',
            title: "See what early",
            titleHighlight: ' supporters say',
            subtitle: 'Business owners are already excited about what LocAppoint will bring to their operations.',
            stats: {
                businesses: 'Businesses on waitlist',
                waitlist: 'People interested',
                industries: 'Industries served'
            },
            testimonials: [
                {
                    quote: "I spend hours every week managing appointments over the phone. A system like LocAppoint would free me to focus on what I love - my clients.",
                    name: "Sofia Mendes",
                    role: "Salon Owner, Lisbon"
                },
                {
                    quote: "My clients always ask if they can book online. I've been waiting for an affordable solution that understands local businesses.",
                    name: "Carlos Okonkwo",
                    role: "Barbershop Owner, Lagos"
                },
                {
                    quote: "No-shows cost me money every month. The automatic reminders alone would be worth it for my spa.",
                    name: "Ana Costa",
                    role: "Spa Manager, Porto"
                },
                {
                    quote: "Love that it's built for businesses like mine - not complicated enterprise software. Can't wait to try it.",
                    name: "Tunde Adeyemi",
                    role: "Personal Trainer, Lagos"
                }
            ],
            trustText: 'Real feedback from business owners on our waitlist'
        },

        // ========== HOW IT WORKS ==========
        howItWorks: {
            badge: 'Getting Started',
            title: 'Ready in',
            titleHighlight: ' minutes',
            subtitle: 'Getting started is simple. No complicated setup, no hidden fees.',
            steps: [
                {
                    title: 'Create Your Profile',
                    description: 'Sign up in minutes. Add your services, pricing, and availability. No technical skills required.'
                },
                {
                    title: 'Get Discovered',
                    description: 'Your business appears on our marketplace. Share your booking link on social media and WhatsApp.'
                },
                {
                    title: 'Accept Bookings',
                    description: 'Clients book directly into your calendar. Confirmations and reminders are sent automatically.'
                },
                {
                    title: 'Grow Your Business',
                    description: 'Focus on your craft. Let LocAppoint handle scheduling, reminders, and client management.'
                }
            ],
            cta: 'Ready to get started?'
        },

        // ========== FAQ SECTION ==========
        faq: {
            badge: 'FAQ',
            title: 'Questions?',
            titleHighlight: ' We have answers',
            subtitle: 'Everything you need to know about getting started with LocAppoint.',
            items: [
                {
                    question: 'Is LocAppoint really free to start?',
                    answer: "Yes! You can create your profile, list services, and accept bookings completely free. We only charge a small transaction fee when you receive payments through our platform. No hidden fees, no mandatory monthly subscriptions."
                },
                {
                    question: 'Do I need technical skills to use LocAppoint?',
                    answer: "Not at all. LocAppoint was built for busy business owners, not tech experts. If you can use WhatsApp, you can use LocAppoint. Our setup assistant guides you through every step."
                },
                {
                    question: 'How do clients find my business?',
                    answer: "Your business appears in the LocAppoint marketplace where clients search for local services. You also get a unique booking link to share on social media, WhatsApp, Instagram, and anywhere else. Clients book directly without needing to call or message."
                },
                {
                    question: 'What if a client needs to cancel or reschedule?',
                    answer: "Clients can easily reschedule or cancel through their booking confirmation. You set your own cancellation policy and we enforce it automatically. No awkward conversations needed."
                },
                {
                    question: 'How do automatic reminders work?',
                    answer: "We send SMS and email reminders to your clients before their appointments. You choose when reminders are sent. This alone reduces no-shows by up to 90% for most businesses."
                },
                {
                    question: 'Can I accept payments through LocAppoint?',
                    answer: "Yes! You can require deposits, full payment upfront, or let clients pay at your venue. We support multiple payment methods including cards and local options. Funds transfer directly to your account."
                },
                {
                    question: 'What happens when I go on vacation?',
                    answer: "Simply block off dates in your calendar. No bookings will be accepted during that time. You can also set specific working hours for each day of the week."
                },
                {
                    question: 'Is my data and client information secure?',
                    answer: "Absolutely. We use bank-level encryption and are fully GDPR compliant. Your data is yours - we never sell it to third parties or use it for advertising."
                }
            ],
            ctaTitle: 'Still have questions?',
            ctaSubtitle: "We're here to help",
            ctaBtn: 'Contact Us'
        },

        // ========== FINAL CTA ==========
        finalCta: {
            title: 'Ready to grow your business?',
            subtitle: 'Join 100+ businesses already on the waitlist. Be among the first when we launch.',
            btnPrimary: 'Join the Waitlist',
            btnSecondary: 'Become a Partner',
            trustFree: 'Free to join',
            trustNoCard: 'No credit card',
            trustLaunch: 'Launching early 2025',
            note: 'Free • No credit card • Launching early 2025'
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
            subtitle: 'Be the first to know when we launch. Get early access and exclusive updates.',
            fullName: 'Full Name',
            fullNamePlaceholder: 'Enter your full name',
            email: 'Email Address',
            emailPlaceholder: 'your@email.com',
            phone: 'Phone Number',
            phonePlaceholder: '+351 912 345 678',
            country: 'Country',
            countryPlaceholder: 'Select your country',
            userType: 'I want to...',
            userTypePlaceholder: 'Select an option',
            userTypeClient: 'Book services',
            userTypeBusiness: 'List my business',
            businessType: 'Business Type',
            businessTypePlaceholder: 'Select your business type',
            businessTypes: {
                salon: 'Hair Salon',
                barbershop: 'Barbershop',
                spa: 'Spa & Wellness',
                fitness: 'Fitness & Training',
                health: 'Healthcare',
                dental: 'Dental Clinic',
                pet: 'Pet Services',
                beauty: 'Beauty & Aesthetics',
                photography: 'Photography',
                consulting: 'Consulting',
                tutoring: 'Tutoring & Education',
                auto: 'Auto Services',
                other: 'Other'
            },
            comments: 'Anything else?',
            commentsPlaceholder: 'Tell us about your business or features you\'d like...',
            submit: 'Join Waitlist',
            submitting: 'Joining...',
            privacy: 'We respect your privacy. No spam, ever.',
            successTitle: "You're on the list!",
            successMessage: 'Thanks for joining! We\'ll notify you as soon as LocAppoint launches.',
            successBtn: 'Got it!',
            errorRequired: 'Please fill in all required fields.',
            errorEmail: 'Please enter a valid email address.',
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
            countryPlaceholder: 'Select country...',
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
            optional: 'optional',
            close: 'Close',
            loading: 'Loading...'
        }
    },

    // ============================================
    // PORTUGUESE TRANSLATIONS (pt-PT - European)
    // ============================================
    pt: {
        // ========== NAVIGATION ==========
        nav: {
            items: [
                { label: 'Funcionalidades', href: 'features' },
                { label: 'Para Quem', href: 'audience' }
            ],
            partnership: 'Parceria',
            joinWaitlist: 'Entrar na Lista'
        },

        // ========== HERO SECTION ==========
        hero: {
            badge: 'Em Breve',
            titleLine1: 'Seja Descoberto.',
            titleLine2: 'Receba Reservas.',
            titleLine3: 'Faça Crescer o Seu Negócio.',
            subtitle: 'A plataforma de marcações completa para negócios locais. Aceite reservas 24/7 e aumente a sua receita automaticamente.',
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
            bookedFor: 'Sofia M. reservou para as 18:00',
            notifConfirmed: 'Nova reserva confirmada',
            notifReminder: 'Lembrete enviado para Maria',
            days: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
        },

        // ========== STATS SECTION ==========
        stats: {
            intro: 'Os números falam',
            businessesWaiting: 'Negócios em Espera',
            serviceCategories: 'Categorias de Serviços',
            globalAccess: 'Acesso Global',
            setupCost: 'Custo de Configuração'
        },

        // ========== PROBLEM SOLUTION ==========
        problem: {
            badge: 'A Realidade',
            title: 'Gerir um negócio local já é',
            titleHighlight: ' difícil o suficiente',
            subtitle: 'Começou o seu negócio para fazer o que ama, não para passar horas a gerir marcações.',
            without: 'Sem LocAppoint',
            with: 'Com LocAppoint',
            problems: [
                'Perder clientes por chamadas e mensagens não atendidas',
                'Desperdiçar horas em agendamentos e lembretes',
                'Marcações duplicadas e caos no calendário',
                'Sem forma de novos clientes o encontrarem'
            ],
            solutions: [
                'Clientes marcam 24/7, mesmo enquanto dorme',
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
            subtitle: 'Tudo o que precisa para gerir marcações profissionalmente, sem complicações.',
            onlineBooking: {
                title: 'Marcações Online 24/7',
                description: 'Permita que clientes marquem a qualquer hora, em qualquer lugar. O seu calendário atualiza automaticamente enquanto se foca no que importa.',
                month: 'Dezembro 2025'
            },
            reminders: {
                title: 'Lembretes Automáticos',
                description: 'Reduza faltas em até 70% com lembretes por SMS e email enviados automaticamente.',
                notif1: 'Lembrete: Amanhã 10:00',
                notif2: 'Marcação confirmada!'
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
                description: 'Compreenda o seu negócio com informações sobre marcações, receita, horários de pico e retenção de clientes.'
            },
            mobile: {
                title: 'Mobile First',
                description: 'Funciona perfeitamente em qualquer dispositivo.'
            },
            language: {
                title: 'Multilingue',
                description: 'Inglês e Português disponíveis.'
            },
            days: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
        },

        // ========== AI CAPABILITIES ==========
        ai: {
            badge: 'Potenciado por IA',
            title: 'Inteligência que trabalha',
            titleHighlight: ' para si',
            subtitle: 'O LocAppoint utiliza IA avançada para automatizar o tedioso, otimizar o complexo e dar-lhe superpoderes para competir com os grandes.',
            footer: 'Todas as funcionalidades de IA incluídas. Sem custos extra. Sem configuração complicada.',
            capabilities: [
                {
                    title: 'Motor de Visibilidade IA',
                    description: 'A nossa IA analisa padrões de pesquisa e comportamento de clientes para aumentar a sua visibilidade. Seja encontrado por clientes que procuram os seus serviços.',
                    features: ['Ranking de pesquisa inteligente', 'Recomendações personalizadas', 'Otimização SEO local']
                },
                {
                    title: 'Sistema de Marcações Inteligente',
                    description: 'Agendamento inteligente que aprende as suas preferências. Preenche lacunas, previne conflitos e otimiza o calendário para máxima eficiência.',
                    features: ['Agendamento preditivo', 'Preenchimento inteligente', 'Prevenção de conflitos']
                },
                {
                    title: 'Assistente de Conformidade',
                    description: 'Mantenha-se em conformidade sem dores de cabeça. A IA monitoriza requisitos regulatórios e gere automaticamente RGPD, proteção de dados e consentimentos.',
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

        // ========== PRODUCT PREVIEW SECTION ==========
        productPreview: {
            badge: 'Veja em Ação',
            title: 'O seu painel,',
            titleHighlight: ' reimaginado',
            subtitle: 'Uma antevisão de como o LocAppoint transforma a forma como gere marcações e faz crescer o seu negócio.',
            caption: 'Antevisão ao vivo do painel do negócio',
            dashboard: {
                greeting: 'Bom dia, Maria',
                todayLabel: 'Terça-feira, 12 de Dezembro',
                bookings: 'Hoje',
                clients: 'Clientes',
                showRate: 'Taxa de presença',
                upcomingTitle: 'Próximos Hoje',
                nav: {
                    dashboard: 'Painel',
                    appointments: 'Marcações',
                    clients: 'Clientes'
                },
                appointments: [
                    { time: '9:00', name: 'Ana Silva', service: 'Corte e Brushing' },
                    { time: '10:30', name: 'João Santos', service: 'Barba' },
                    { time: '14:00', name: 'Maria Costa', service: 'Coloração' }
                ],
                toast: {
                    title: 'Nova Reserva!',
                    text: 'Pedro confirmou para as 16:00'
                },
                aiLabel: 'Insight IA',
                aiInsight: '3 clientes costumam marcar às sextas. Considere enviar uma campanha de lembrete.'
            }
        },

        // ========== AUDIENCE SECTION ==========
        audience: {
            badge: 'Para Quem',
            title: 'Feito para',
            titleHighlight: ' negócios de serviços',
            subtitle: 'Se marca consultas, o LocAppoint foi feito para si.',
            categories: [
                { title: 'Salões e Barbearias', description: 'Cabeleireiros, barbeiros e profissionais de beleza' },
                { title: 'Spas e Bem-estar', description: 'Massagistas, esteticistas, centros de bem-estar' },
                { title: 'Fitness e Treino', description: 'Personal trainers, instrutores de yoga, estúdios' },
                { title: 'Saúde e Medicina', description: 'Dentistas, fisioterapeutas, clínicas' },
                { title: 'Serviços para Animais', description: 'Tosquias, veterinários, pet care' },
                { title: 'Serviços Criativos', description: 'Fotógrafos, maquilhadores, eventos' }
            ],
            marquee: [
                'Especialistas em Pestanas',
                'Estética Automóvel',
                'Tutores e Coaches',
                'Life Coaches',
                'Professores de Música',
                'Chefs Pessoais',
                'Manicures',
                'Esteticistas'
            ],
            marqueeLabel: 'E muito mais...',
            ctaText: 'Não vê o seu setor?',
            ctaLink: 'Entre na lista e diga-nos'
        },

        // ========== CLIENT VALUE SECTION ==========
        clientValue: {
            badge: 'Para Clientes',
            title: 'Encontrar serviços ficou',
            titleHighlight: ' mais fácil',
            subtitle: 'Descubra profissionais locais bem avaliados, marque instantaneamente e desfrute de uma experiência perfeita do início ao fim.',
            benefits: {
                discover: {
                    title: 'Descubra Profissionais',
                    description: 'Encontre profissionais verificados na sua zona com avaliações reais.'
                },
                book: {
                    title: 'Marque Instantaneamente',
                    description: 'Veja disponibilidade em tempo real e marque em segundos, 24/7.'
                },
                time: {
                    title: 'Poupe Tempo',
                    description: 'Sem telefonemas ou espera por respostas. Marque quando quiser.'
                },
                reviews: {
                    title: 'Avaliações de Confiança',
                    description: 'Tome decisões com confiança baseadas em avaliações de clientes reais.'
                },
                secure: {
                    title: 'Pagamentos Seguros',
                    description: 'Pague online com segurança ou no local. Os seus dados sempre protegidos.'
                },
                mobile: {
                    title: 'Marque de Qualquer Lugar',
                    description: 'Use qualquer dispositivo para gerir as suas marcações.'
                }
            },
            ctaText: 'Entre na lista de espera para ser notificado quando lançarmos na sua zona.'
        },

        // ========== WHATSAPP CTA SECTION ==========
        whatsappCta: {
            title: 'Entre no Nosso Canal do WhatsApp',
            subtitle: 'Fique a par das novidades, lançamentos de funcionalidades e oportunidades exclusivas de acesso antecipado.',
            button: 'Entrar no Canal',
            features: {
                updates: 'Novidades de lançamento',
                community: 'Junte-se a mais de 100 seguidores',
                early: 'Acesso antecipado'
            }
        },

        // ========== BENEFITS SECTION ==========
        benefits: {
            badge: 'Porquê LocAppoint',
            title: 'Resultados que',
            titleHighlight: ' falam por si',
            subtitle: 'Junte-se a empresários que estão a poupar tempo, reduzir stress e aumentar receita.',
            items: [
                {
                    title: 'Poupe 10+ Horas Semanais',
                    description: 'Pare de jogar ao telefone. Reservas automáticas, lembretes e agendamento libertam o seu tempo.',
                    statLabel: 'horas poupadas por semana'
                },
                {
                    title: 'Aumente a Sua Base de Clientes',
                    description: 'Seja descoberto por milhares que procuram serviços locais. Converta visitantes em clientes.',
                    statLabel: 'mais visibilidade'
                },
                {
                    title: 'Reduza Faltas',
                    description: 'Lembretes automáticos por SMS e email garantem que os clientes se lembram das marcações.',
                    statLabel: 'menos faltas'
                },
                {
                    title: 'Aumente a Receita',
                    description: 'Aceite reservas 24/7, mesmo enquanto dorme. Nunca perca uma oportunidade.',
                    statLabel: 'aumento de receita'
                }
            ]
        },

        // ========== SOCIAL PROOF SECTION ==========
        socialProof: {
            badge: 'Confiado por Empresas',
            title: 'Veja o que dizem quem',
            titleHighlight: ' já entrou na lista',
            subtitle: 'Empresários já estão entusiasmados com o que o LocAppoint trará para as suas operações.',
            stats: {
                businesses: 'Negócios na lista de espera',
                waitlist: 'Pessoas interessadas',
                industries: 'Setores atendidos'
            },
            testimonials: [
                {
                    quote: "Passo horas todas as semanas a gerir marcações por telefone. Um sistema como o LocAppoint libertar-me-ia para me focar no que adoro - os meus clientes.",
                    name: "Sofia Mendes",
                    role: "Dona de Salão, Lisboa"
                },
                {
                    quote: "Os meus clientes perguntam sempre se podem marcar online. Estava à espera de uma solução acessível que compreenda negócios locais.",
                    name: "Carlos Okonkwo",
                    role: "Dono de Barbearia, Lagos"
                },
                {
                    quote: "As faltas custam-me dinheiro todos os meses. Só os lembretes automáticos já valeriam a pena para o meu spa.",
                    name: "Ana Costa",
                    role: "Gestora de Spa, Porto"
                },
                {
                    quote: "Adoro que tenha sido feito para negócios como o meu - não é software empresarial complicado. Mal posso esperar para testar.",
                    name: "Tunde Adeyemi",
                    role: "Personal Trainer, Lagos"
                }
            ],
            trustText: 'Feedback real de empresários na nossa lista de espera'
        },

        // ========== HOW IT WORKS ==========
        howItWorks: {
            badge: 'Como Funciona',
            title: 'Pronto em',
            titleHighlight: ' minutos',
            subtitle: 'Começar é simples. Sem configuração complicada, sem taxas escondidas.',
            steps: [
                {
                    title: 'Crie o Seu Perfil',
                    description: 'Registe-se em minutos. Adicione serviços, preços e disponibilidade. Sem conhecimentos técnicos.'
                },
                {
                    title: 'Seja Descoberto',
                    description: 'O seu negócio aparece no nosso marketplace. Partilhe o link de marcações nas redes sociais e WhatsApp.'
                },
                {
                    title: 'Aceite Reservas',
                    description: 'Os clientes reservam diretamente no seu calendário. Confirmações e lembretes são enviados automaticamente.'
                },
                {
                    title: 'Faça Crescer o Negócio',
                    description: 'Foque-se na sua arte. Deixe o LocAppoint tratar do agendamento, lembretes e gestão de clientes.'
                }
            ],
            cta: 'Pronto para começar?'
        },

        // ========== FAQ SECTION ==========
        faq: {
            badge: 'FAQ',
            title: 'Perguntas?',
            titleHighlight: ' Temos respostas',
            subtitle: 'Tudo o que precisa de saber para começar com o LocAppoint.',
            items: [
                {
                    question: 'O LocAppoint é mesmo gratuito para começar?',
                    answer: 'Sim! Pode criar o perfil, listar serviços e aceitar reservas totalmente grátis. Só cobramos uma pequena taxa de transação quando recebe pagamentos pela plataforma. Sem taxas escondidas, sem subscrições mensais obrigatórias.'
                },
                {
                    question: 'Preciso de conhecimentos técnicos para usar o LocAppoint?',
                    answer: 'De maneira nenhuma. O LocAppoint foi feito para empresários ocupados, não especialistas em tecnologia. Se consegue usar o WhatsApp, consegue usar o LocAppoint. O nosso assistente guia-o em cada passo.'
                },
                {
                    question: 'Como é que os clientes encontram o meu negócio?',
                    answer: 'O seu negócio aparece no marketplace LocAppoint onde os clientes procuram serviços locais. Também recebe um link único de marcações para partilhar nas redes sociais, WhatsApp, Instagram e onde quiser. Os clientes marcam diretamente sem precisar de telefonar ou enviar mensagem.'
                },
                {
                    question: 'E se um cliente precisar de cancelar ou remarcar?',
                    answer: 'Os clientes podem facilmente remarcar ou cancelar através da confirmação de reserva. Define a sua própria política de cancelamento e nós aplicamo-la automaticamente. Sem conversas constrangedoras.'
                },
                {
                    question: 'Como funcionam os lembretes automáticos?',
                    answer: 'Enviamos lembretes por SMS e email aos seus clientes antes das marcações. Escolhe quando os lembretes são enviados. Só isto reduz as faltas em até 90% para a maioria dos negócios.'
                },
                {
                    question: 'Posso aceitar pagamentos pelo LocAppoint?',
                    answer: 'Sim! Pode exigir depósitos, pagamento total antecipado, ou deixar os clientes pagar no local. Suportamos múltiplos métodos de pagamento incluindo cartões, MB Way e Multibanco. Os fundos são transferidos diretamente para a sua conta.'
                },
                {
                    question: 'O que acontece quando vou de férias?',
                    answer: 'Simplesmente bloqueie as datas no calendário. Nenhuma reserva será aceite nesses períodos. Também pode definir horários específicos de trabalho para cada dia da semana.'
                },
                {
                    question: 'Os meus dados e dos clientes estão seguros?',
                    answer: 'Absolutamente. Usamos encriptação de nível bancário e estamos totalmente em conformidade com o RGPD. Os seus dados são seus, nunca os vendemos a terceiros nem os usamos para publicidade.'
                }
            ],
            ctaTitle: 'Ainda tem perguntas?',
            ctaSubtitle: 'Estamos aqui para ajudar',
            ctaBtn: 'Contacte-nos'
        },

        // ========== FINAL CTA ==========
        finalCta: {
            title: 'Pronto para fazer crescer o seu negócio?',
            subtitle: 'Junte-se a mais de 100 negócios já na lista de espera. Seja dos primeiros quando lançarmos.',
            btnPrimary: 'Entrar na Lista',
            btnSecondary: 'Tornar-se Parceiro',
            trustFree: 'Gratuito para entrar',
            trustNoCard: 'Sem cartão de crédito',
            trustLaunch: 'Lançamento início 2025',
            note: 'Gratuito • Sem cartão de crédito • Lançamento início 2025'
        },

        // ========== FOOTER ==========
        footer: {
            tagline: 'Seja descoberto. Receba reservas. Faça crescer o seu negócio.',
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
            subtitle: 'Seja o primeiro a saber quando lançarmos. Acesso antecipado e atualizações exclusivas.',
            fullName: 'Nome Completo',
            fullNamePlaceholder: 'Introduza o seu nome completo',
            email: 'Endereço de Email',
            emailPlaceholder: 'seu@email.com',
            phone: 'Telefone',
            phonePlaceholder: '+351 912 345 678',
            country: 'País',
            countryPlaceholder: 'Selecione o seu país',
            userType: 'Eu quero...',
            userTypePlaceholder: 'Selecione uma opção',
            userTypeClient: 'Marcar serviços',
            userTypeBusiness: 'Registar o meu negócio',
            businessType: 'Tipo de Negócio',
            businessTypePlaceholder: 'Selecione o tipo do seu negócio',
            businessTypes: {
                salon: 'Salão de Cabeleireiro',
                barbershop: 'Barbearia',
                spa: 'Spa e Bem-estar',
                fitness: 'Fitness e Treino',
                health: 'Saúde',
                dental: 'Clínica Dentária',
                pet: 'Serviços para Animais',
                beauty: 'Beleza e Estética',
                photography: 'Fotografia',
                consulting: 'Consultoria',
                tutoring: 'Explicações e Educação',
                auto: 'Serviços Automóveis',
                other: 'Outro'
            },
            comments: 'Algo mais?',
            commentsPlaceholder: 'Conte-nos sobre o seu negócio ou funcionalidades que gostaria...',
            submit: 'Entrar na Lista',
            submitting: 'A entrar...',
            privacy: 'Respeitamos a sua privacidade. Sem spam, nunca.',
            successTitle: 'Está na lista!',
            successMessage: 'Obrigado por se juntar! Vamos notificá-lo assim que o LocAppoint lançar.',
            successBtn: 'Entendido!',
            errorRequired: 'Por favor preencha todos os campos obrigatórios.',
            errorEmail: 'Por favor introduza um endereço de email válido.',
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
            orgTypePlaceholder: 'Selecione o tipo...',
            orgTypes: [
                'Eventos e Entretenimento',
                'Serviços de Saúde',
                'Beleza e Bem-estar',
                'Serviços Jurídicos',
                'Serviços Domésticos',
                'Serviços Automóveis',
                'Educação e Explicações',
                'Fitness e Desporto',
                'Restauração e Alimentação',
                'Outro'
            ],
            orgName: 'Nome da Organização',
            orgNamePlaceholder: 'Nome do seu negócio',
            city: 'Cidade',
            cityPlaceholder: 'Lisboa, Porto, Faro...',
            country: 'País',
            countryPlaceholder: 'Selecione o país...',
            interest: 'Porquê ser nosso parceiro?',
            interestPlaceholder: 'Partilhe os seus objetivos ou como gostaria de colaborar...',
            submit: 'Enviar Pedido de Parceria',
            submitting: 'A enviar...',
            privacy: 'Vamos analisar a sua candidatura e contactá-lo em 48 horas.',
            successTitle: 'Candidatura Recebida!',
            successMessage: 'Obrigado pelo interesse em ser parceiro do LocAppoint. Vamos analisar a sua candidatura e responder em 48 horas.',
            successBtn: 'Feito',
            errorRequired: 'Por favor preencha todos os campos obrigatórios',
            errorEmail: 'Por favor introduza um endereço de email válido',
            errorGeneric: 'Algo correu mal. Por favor tente novamente.',
            required: '*',
            optional: '(opcional)'
        },

        // ========== FLOATING BUTTONS ==========
        floating: {
            whatsappTooltip: 'Conversar no WhatsApp',
            locaTooltip: 'Perguntar ao Loca AI',
            locaTitle: 'Loca AI',
            locaStatus: 'A Aprender e a Melhorar',
            locaNotice: 'A IA está em treino para o servir melhor',
            locaGreeting: 'Olá! 👋 Eu sou o',
            locaName: 'Loca',
            locaIntro: ', o seu assistente de IA.',
            locaMessage: 'Ainda estou a aprender, mas adoraria ajudar! O que gostaria de saber sobre o LocAppoint?',
            locaSuggestions: [
                'Como funciona?',
                'Informação de preços',
                'Data de lançamento',
                'Funcionalidades'
            ],
            locaPlaceholder: 'Pergunte o que quiser...',
            locaPowered: 'Powered by LocAppoint AI',
            whatsappMessage: 'Olá LocAppoint! Tenho uma pergunta.'
        },

        // ========== COMMON ==========
        common: {
            required: '*',
            optional: 'opcional',
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
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('locappoint-landing-lang')
            if (saved && (saved === 'en' || saved === 'pt')) {
                return saved
            }
        }
        return 'en'
    })
    
    const [isDetecting, setIsDetecting] = useState(true)

    useEffect(() => {
        const detectCountry = async () => {
            const saved = localStorage.getItem('locappoint-landing-lang')
            if (saved) {
                setIsDetecting(false)
                return
            }

            try {
                const response = await fetch('https://api.country.is/', { 
                    signal: AbortSignal.timeout(3000)
                })
                const data = await response.json()
                
                // Auto-detect Portuguese for Portugal, Brazil, and other Portuguese-speaking countries
                if (data.country === 'PT' || data.country === 'BR' || data.country === 'AO' || data.country === 'MZ') {
                    setLanguage('pt')
                }
            } catch (error) {
                const browserLang = navigator.language?.toLowerCase()
                if (browserLang?.startsWith('pt')) {
                    setLanguage('pt')
                }
            } finally {
                setIsDetecting(false)
            }
        }

        detectCountry()
    }, [])

    useEffect(() => {
        if (!isDetecting) {
            localStorage.setItem('locappoint-landing-lang', language)
        }
        // Set document language to European Portuguese
        document.documentElement.lang = language === 'pt' ? 'pt-PT' : 'en'
    }, [language, isDetecting])

    const toggleLanguage = useCallback(() => {
        setLanguage(prev => prev === 'en' ? 'pt' : 'en')
    }, [])

    const setLang = useCallback((lang) => {
        if (lang === 'en' || lang === 'pt') {
            setLanguage(lang)
        }
    }, [])

    const t = useCallback((key, replacements = {}) => {
        const keys = key.split('.')
        let value = translations[language]
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k]
            } else {
                value = translations.en
                for (const fallbackKey of keys) {
                    if (value && typeof value === 'object' && fallbackKey in value) {
                        value = value[fallbackKey]
                    } else {
                        return key
                    }
                }
                break
            }
        }

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