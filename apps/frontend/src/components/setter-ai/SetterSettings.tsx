'use client';

import { useState, useMemo, useCallback } from 'react';
import { FormProvider, useForm, SubmitHandler } from 'react-hook-form';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { yupResolver } from '@hookform/resolvers/yup';
import { object, string } from 'yup';
import useSWR from 'swr';

interface SetterSettingsProps {
  setterId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface FormInputs {
  name: string;
  persona: string;
  qualificationCriteria: string;
  calendarType: string;
  calendarCredentials: string;
}

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

export const SetterSettings = ({
                                 setterId,
                                 isOpen,
                                 onClose,
                                 onUpdate
                               }: SetterSettingsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const fetch = useFetch();
  const toaster = useToaster();

  // Charger les données du Setter
  const { data: setter } = useSWR(
    isOpen ? `/setter-ai/configs/${setterId}` : null,
    async (url) => {
      const response = await fetch(url);
      return response.json();
    }
  );

  const resolver = useMemo(() => yupResolver(validationSchema), []);

  const form = useForm<FormInputs>({
    resolver,
    mode: 'onChange',
    values: setter ? {
      name: setter.name || '',
      persona: setter.persona || '',
      qualificationCriteria: typeof setter.qualificationCriteria === 'string'
        ? setter.qualificationCriteria
        : setter.qualificationCriteria?.description || '',
      calendarType: setter.calendarType || '',
      calendarCredentials: setter.calendarCredentials || '',
    } : undefined,
  });

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    try {
      setIsLoading(true);

      await fetch(`/setter-ai/configs/${setterId}`, {
        method: 'PUT',
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
        }),
      });

      toaster.show('✅ Setter mis à jour avec succès !', 'success');
      onUpdate();
      onClose();
    } catch (error: any) {
      toaster.show(error.message || 'Une erreur est survenue', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bgColorInner border border-tableBorder rounded-xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-textColor">⚙️ Paramètres du Setter</h2>
          <button
            onClick={onClose}
            className="text-textColor/60 hover:text-textColor transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {!setter ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-customColor6/20 rounded-full"></div>
                <div className="w-12 h-12 border-4 border-customColor6 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
              </div>
              <p className="text-textColor/60 text-sm">Chargement...</p>
            </div>
          </div>
        ) : (
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Input
                label="Nom du Setter"
                placeholder="Ex: Mon Setter Commercial"
                {...form.register('name')}
              />

              <div>
                <label className="block text-sm font-medium text-textColor mb-2">
                  Persona du Setter
                </label>
                <textarea
                  {...form.register('persona')}
                  className="w-full p-4 bg-bgColor border border-tableBorder rounded-lg text-textColor placeholder-textColor/40 focus:outline-none focus:ring-2 focus:ring-customColor6 min-h-[120px]"
                  placeholder="Décrivez la personnalité de votre Setter..."
                />
                {form.formState.errors.persona && (
                  <p className="text-red-400 text-sm mt-1">
                    {form.formState.errors.persona.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-textColor mb-2">
                  Critères de qualification
                </label>
                <textarea
                  {...form.register('qualificationCriteria')}
                  className="w-full p-4 bg-bgColor border border-tableBorder rounded-lg text-textColor placeholder-textColor/40 focus:outline-none focus:ring-2 focus:ring-customColor6 min-h-[120px]"
                  placeholder="Budget minimum, objectifs, disponibilité..."
                />
                {form.formState.errors.qualificationCriteria && (
                  <p className="text-red-400 text-sm mt-1">
                    {form.formState.errors.qualificationCriteria.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-textColor mb-2">
                  Type de calendrier
                </label>
                <select
                  {...form.register('calendarType')}
                  className="w-full p-3 bg-bgColor border border-tableBorder rounded-lg text-textColor focus:outline-none focus:ring-2 focus:ring-customColor6"
                >
                  <option value="">Aucun</option>
                  <option value="cal.com">Cal.com</option>
                  <option value="calendly">Calendly</option>
                </select>
              </div>

              {form.watch('calendarType') && (
                <Input
                  label="Lien de calendrier"
                  placeholder="https://cal.com/votre-nom"
                  {...form.register('calendarCredentials')}
                />
              )}

              <div className="flex gap-3 pt-4">
                <Button type="submit" loading={isLoading} className="flex-1">
                  💾 Enregistrer les modifications
                </Button>
                <Button type="button" onClick={onClose} secondary>
                  Annuler
                </Button>
              </div>
            </form>
          </FormProvider>
        )}
      </div>
    </div>
  );
};