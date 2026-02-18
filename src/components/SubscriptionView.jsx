import React, { useState } from 'react';
import { Check, Zap, User, Users } from 'lucide-react';

const SubscriptionView = ({ darkMode }) => {
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'

    const plans = [
        {
            name: 'Personal',
            description: 'El plan perfecto si estás empezando con tu producto.',
            monthlyPrice: 29,
            yearlyPrice: 290,
            features: [
                'Hasta 25 productos',
                'Hasta 1,000 clientes',
                'Seguimiento básico de reparaciones',
                'Generación de cotizaciones PDF',
                'Soporte por correo electrónico',
                'Actualizaciones automáticas'
            ],
            buttonText: 'Iniciar Suscripción',
            highlighted: true,
            icon: User
        },
        {
            name: 'Team',
            description: 'Un plan que escala con el rápido crecimiento de tu negocio.',
            monthlyPrice: 99,
            yearlyPrice: 990,
            features: [
                'Todo lo del plan Personal',
                'Productos ilimitados',
                'Clientes ilimitados',
                'Informes avanzados y analíticas',
                'Integraciones empresariales',
                'Soporte prioritario 24/7'
            ],
            buttonText: 'Iniciar Suscripción',
            highlighted: false,
            icon: Users
        }
    ];

    return (
        <div className={`w-full min-h-full py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            <div className="max-w-7xl mx-auto text-center mb-16">
                <h2 className="text-blue-600 font-bold tracking-wide uppercase text-sm mb-3">Suscripción</h2>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                    Elige el plan adecuado para ti
                </h1>
                <p className={`text-lg max-w-2xl mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Elige un plan asequible que esté repleto de las mejores funciones para atraer a tu audiencia, crear lealtad en los clientes e impulsar las ventas.
                </p>

                {/* Billing Toggle */}
                <div className="mt-10 flex justify-center items-center gap-4">
                    <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-blue-600' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>Mes</span>
                    <button
                        onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                        className="relative w-14 h-7 bg-slate-200 dark:bg-slate-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${billingCycle === 'yearly' ? 'translate-x-7' : ''}`} />
                    </button>
                    <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-blue-600' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>Año</span>
                    {billingCycle === 'yearly' && (
                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Ahorra 20%</span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {plans.map((plan) => (
                    <div
                        key={plan.name}
                        className={`relative p-8 rounded-3xl border transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 flex flex-col h-full
                            ${plan.highlighted
                                ? (darkMode ? 'bg-slate-800 border-blue-500 shadow-blue-900/10' : 'bg-white border-blue-100 shadow-xl shadow-blue-500/5')
                                : (darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100 shadow-lg')
                            }`}
                    >
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-blue-600 font-bold text-lg">{plan.name}</h3>
                                <plan.icon className={`w-6 h-6 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                            </div>
                            <div className="flex items-baseline mb-4">
                                <span className="text-5xl font-extrabold tracking-tight">
                                    ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                                </span>
                                <span className={`ml-1 text-xl font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    /{billingCycle === 'monthly' ? 'mes' : 'año'}
                                </span>
                            </div>
                            <p className={`mb-8 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                {plan.description}
                            </p>
                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <Check className="h-5 w-5 text-blue-500" />
                                        </div>
                                        <p className={`ml-3 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                            {feature}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <button
                            className={`w-full py-4 rounded-xl font-bold transition-all duration-200 
                                ${plan.highlighted
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30'
                                    : (darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-blue-50 text-blue-600 hover:bg-blue-100')
                                }`}
                        >
                            {plan.buttonText}
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-20 text-center">
                <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    ¿Tienes preguntas sobre nuestros planes?{' '}
                    <button className="text-blue-600 font-bold hover:underline">Habla con soporte</button>
                </p>
            </div>
        </div>
    );
};

export default SubscriptionView;
