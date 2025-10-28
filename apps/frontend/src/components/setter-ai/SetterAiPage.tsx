'use client';

import { useEffect, useState } from 'react';
import { SetterOnboarding } from './SetterOnboarding';
import { SetterDashboard } from './SetterDashboard';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

interface SetterConfig {
  id: string;
  name: string;
  persona: string;
  systemPrompt: string;
  qualificationCriteria: any;
  calendarType?: string;
  calendarCredentials?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const SetterAiPage = () => {
  const fetch = useFetch();
  const [isLoading, setIsLoading] = useState(true);

  // Charger les configurations du Setter
  const { data: configs, error, mutate } = useSWR<SetterConfig[]>(
    '/setter-ai/configs',
    async (url) => {
      const response = await fetch(url);
      return response.json();
    }
  );

  useEffect(() => {
    if (configs !== undefined || error) {
      setIsLoading(false);
    }
  }, [configs, error]);

  // État de chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-customColor6/20 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-customColor6 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <p className="text-textColor/60 text-sm">Chargement du Setter IA...</p>
        </div>
      </div>
    );
  }

  // Erreur
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">❌</div>
          <p className="text-textColor">Erreur lors du chargement</p>
          <button
            onClick={() => mutate()}
            className="mt-4 px-4 py-2 bg-customColor6 text-white rounded-lg hover:bg-customColor6/90"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Vérifier si un Setter existe
  const hasSetter = configs && configs.length > 0;
  const setter = hasSetter ? configs[0] : null;

  // Afficher l'onboarding ou le dashboard
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {!hasSetter ? (
        <SetterOnboarding onSetterCreated={() => mutate()} />
      ) : (
        <SetterDashboard setter={setter!} onUpdate={() => mutate()} />
      )}
    </div>
  );
};