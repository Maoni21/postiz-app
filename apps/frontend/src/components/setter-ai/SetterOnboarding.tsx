'use client';

import { useState, useCallback, useMemo } from 'react';
import { FormProvider, useForm, SubmitHandler } from 'react-hook-form';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { yupResolver } from '@hookform/resolvers/yup';
import { object, string } from 'yup';

interface SetterOnboardingProps {
  onSetterCreated: () => void;
}

interface FormInputs {
  name: string;
  persona: string;
  qualificationCriteria: string;
  calendarType: string;
  calendarCredentials: string;
}

// Schéma de validation avec Yup
const validationSchema = object({
  name: string()
    .required('Le nom du Setter est requis')
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
  persona: string()
    .required('La persona est requise')
    .min(20, 'La persona doit contenir au moins 20 caractères')
    .max(500, 'La persona ne peut pas dépasser 500 caractères'),
  qualificationCriteria: string()
    .required('Les critères de qualification sont requis')
    .min(20, 'Les critères doivent contenir au moins 20 caractères'),
  calendarType: string().optional(),
  calendarCredentials: string().optional(),
});

export const SetterOnboarding = ({ onSetterCreated }: SetterOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const fetch = useFetch();
  const toaster = useToaster();

  const resolver = useMemo(() => yupResolver(validationSchema), []);

  const form = useForm<FormInputs>({
    resolver,
    mode: 'onChange',
    defaultValues: {
      name: '',
      persona: '',
      qualificationCriteria: '',
      calendarType: '',
      calendarCredentials: '',
    },
  });

  // Exemples de personas prédéfinies
  const personaExamples = [
    {
      title: 'Coach Business',
      persona: 'Je suis un coach business passionné qui aide les entrepreneurs à développer leur activité. Je suis chaleureux, à l\'écoute et je pose des questions pertinentes pour comprendre les besoins.',
      criteria: 'Budget minimum: 2000€, Motivé à investir dans son développement, Prêt à s\'engager sur 3-6 mois',
    },
    {
      title: 'Coach Sportif',
      persona: 'Je suis un coach sportif énergique et motivant qui aide les gens à atteindre leurs objectifs fitness. Je suis encourageant et je crée une vraie connexion.',
      criteria: 'Objectif clair (perte de poids, prise de masse, remise en forme), Disponible 2-3 fois par semaine, Budget: 150-300€/mois',
    },
    {
      title: 'Consultant Marketing',
      persona: 'Je suis un expert marketing qui aide les entreprises à développer leur présence digitale. Je suis professionnel, analytique et orienté résultats.',
      criteria: 'Chiffre d\'affaires > 50k€/an, Besoin urgent de leads, Budget marketing dédié',
    },
  ];

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    try {
      setIsLoading(true);

      // Créer le Setter via API
      const response = await fetch('/setter-ai/configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          persona: data.persona,
          systemPrompt: `Tu es ${data.name}. ${data.persona}`,
          qualificationCriteria: {
            description: data.qualificationCriteria,
            minScore: 7,
          },
          calendarType: data.calendarType || null,
          calendarCredentials: data.calendarCredentials || null,
          isActive: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création du Setter');
      }

      toaster.show('🎉 Setter IA créé avec succès !', 'success');
      onSetterCreated();
    } catch (error: any) {
      toaster.show(error.message || 'Une erreur est survenue', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = useCallback(async () => {
    let isValid = false;

    if (currentStep === 1) {
      isValid = await form.trigger(['name', 'persona']);
    } else if (currentStep === 2) {
      isValid = await form.trigger(['qualificationCriteria']);
    }

    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, form]);

  const prevStep = useCallback(() => {
    setCurrentStep(currentStep - 1);
  }, [currentStep]);

  const applyExample = useCallback((example: typeof personaExamples[0]) => {
    form.setValue('persona', example.persona);
    form.setValue('qualificationCriteria', example.criteria);
  }, [form]);

  return (
    <div className="max-w-4xl mx-auto">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="bg-bgColorInner border border-tableBorder rounded-xl p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-textColor mb-2">
                🤖 Créer votre Setter IA
              </h1>
              <p className="text-textColor/60">
                Configurez votre assistant intelligent qui qualifiera automatiquement vos leads via Messenger
              </p>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-between mb-8">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                      step === currentStep
                        ? 'bg-customColor6 text-white'
                        : step < currentStep
                          ? 'bg-green-500 text-white'
                          : 'bg-tableBorder text-textColor/40'
                    }`}
                  >
                    {step < currentStep ? '✓' : step}
                  </div>
                  {step < 3 && (
                    <div
                      className={`flex-1 h-1 mx-2 transition-colors ${
                        step < currentStep ? 'bg-green-500' : 'bg-tableBorder'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Identité du Setter */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-textColor mb-4">
                    Étape 1 : Identité du Setter
                  </h2>
                  <p className="text-textColor/60 mb-6">
                    Donnez un nom à votre Setter et décrivez sa personnalité
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-textColor mb-2">
                    Nom du Setter
                  </label>
                  <input
                    {...form.register('name')}
                    className="w-full p-3 bg-bgColor border border-tableBorder rounded-lg text-textColor placeholder-textColor/40 focus:outline-none focus:ring-2 focus:ring-customColor6"
                    placeholder="Ex: Mon Setter Commercial"
                  />
                  {form.formState.errors.name && (
                    <p className="text-red-400 text-sm mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-textColor mb-2">
                    Persona du Setter
                  </label>
                  <textarea
                    {...form.register('persona')}
                    className="w-full p-4 bg-bgColor border border-tableBorder rounded-lg text-textColor placeholder-textColor/40 focus:outline-none focus:ring-2 focus:ring-customColor6 min-h-[120px]"
                    placeholder="Décrivez la personnalité de votre Setter : ton, style de communication, approche..."
                  />
                  {form.formState.errors.persona && (
                    <p className="text-red-400 text-sm mt-1">
                      {form.formState.errors.persona.message}
                    </p>
                  )}
                </div>

                {/* Exemples prédéfinis */}
                <div>
                  <p className="text-sm text-textColor/60 mb-3">
                    💡 Ou choisissez un exemple :
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {personaExamples.map((example, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => applyExample(example)}
                        className="p-4 bg-bgColor border border-tableBorder rounded-lg hover:border-customColor6 transition-colors text-left"
                      >
                        <div className="font-semibold text-textColor mb-1">
                          {example.title}
                        </div>
                        <div className="text-xs text-textColor/60 line-clamp-2">
                          {example.persona}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Critères de qualification */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-textColor mb-4">
                    Étape 2 : Critères de Qualification
                  </h2>
                  <p className="text-textColor/60 mb-6">
                    Définissez les critères pour identifier un lead qualifié
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-textColor mb-2">
                    Critères de qualification
                  </label>
                  <textarea
                    {...form.register('qualificationCriteria')}
                    className="w-full p-4 bg-bgColor border border-tableBorder rounded-lg text-textColor placeholder-textColor/40 focus:outline-none focus:ring-2 focus:ring-customColor6 min-h-[150px]"
                    placeholder="Ex: Budget minimum de 2000€, Objectif clair, Disponible pour un coaching de 3 mois minimum..."
                  />
                  {form.formState.errors.qualificationCriteria && (
                    <p className="text-red-400 text-sm mt-1">
                      {form.formState.errors.qualificationCriteria.message}
                    </p>
                  )}
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-400 text-sm">
                    💡 <strong>Astuce :</strong> Soyez spécifique sur le budget, la motivation, la disponibilité et tout autre critère important pour vous.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Calendrier (optionnel) */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-textColor mb-4">
                    Étape 3 : Calendrier (Optionnel)
                  </h2>
                  <p className="text-textColor/60 mb-6">
                    Connectez votre calendrier pour proposer automatiquement des RDV
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-textColor mb-2">
                    Type de calendrier
                  </label>
                  <select
                    {...form.register('calendarType')}
                    className="w-full p-3 bg-bgColor border border-tableBorder rounded-lg text-textColor focus:outline-none focus:ring-2 focus:ring-customColor6"
                  >
                    <option value="">Aucun (configurer plus tard)</option>
                    <option value="cal.com">Cal.com</option>
                    <option value="calendly">Calendly</option>
                  </select>
                </div>

                {form.watch('calendarType') && (
                  <div>
                    <label className="block text-sm font-medium text-textColor mb-2">
                      Lien de calendrier
                    </label>
                    <input
                      {...form.register('calendarCredentials')}
                      className="w-full p-3 bg-bgColor border border-tableBorder rounded-lg text-textColor placeholder-textColor/40 focus:outline-none focus:ring-2 focus:ring-customColor6"
                      placeholder="https://cal.com/votre-nom ou https://calendly.com/votre-nom"
                    />
                    {form.formState.errors.calendarCredentials && (
                      <p className="text-red-400 text-sm mt-1">
                        {form.formState.errors.calendarCredentials.message}
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-yellow-400 text-sm">
                    ℹ️ <strong>Information :</strong> Vous pourrez configurer votre calendrier plus tard dans les paramètres.
                  </p>
                </div>
              </div>
            )}

            {/* Boutons de navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-tableBorder">
              {currentStep > 1 && (
                <Button type="button" onClick={prevStep} secondary>
                  ← Précédent
                </Button>
              )}

              <div className="flex-1" />

              {currentStep < 3 ? (
                <Button type="button" onClick={nextStep}>
                  Suivant →
                </Button>
              ) : (
                <Button type="submit" loading={isLoading}>
                  🚀 Créer mon Setter IA
                </Button>
              )}
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};