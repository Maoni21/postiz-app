'use client';

import { useState, useCallback } from 'react';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { SetterStatsCard } from './SetterStatsCard';
import { SetterSettings } from './SetterSettings';
import useSWR from 'swr';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';

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

interface SetterDashboardProps {
  setter: SetterConfig;
  onUpdate: () => void;
}

export const SetterDashboard = ({ setter, onUpdate }: SetterDashboardProps) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fetch = useFetch();
  const toaster = useToaster();

  // Charger les stats
  const { data: stats } = useSWR(`/setter-ai/configs/${setter.id}/stats`, async (url) => {
    const response = await fetch(url);
    return response.json();
  }, { refreshInterval: 5000 });

  // Charger les conversations
  const { data: conversations } = useSWR(`/setter-ai/configs/${setter.id}/conversations`, async (url) => {
    const response = await fetch(url);
    return response.json();
  });

  // Charger les leads
  const { data: leads } = useSWR(`/setter-ai/configs/${setter.id}/leads`, async (url) => {
    const response = await fetch(url);
    return response.json();
  });

  // Toggle actif/inactif
  const toggleActive = useCallback(async () => {
    try {
      await fetch(`/setter-ai/configs/${setter.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !setter.isActive }),
      });
      toaster.show(`Setter ${!setter.isActive ? 'activé' : 'désactivé'}`, 'success');
      onUpdate();
    } catch (error) {
      toaster.show('Erreur lors de la modification', 'error');
    }
  }, [setter.id, setter.isActive, onUpdate]);

  // Supprimer le Setter
  const deleteSetter = useCallback(async () => {
    if (await deleteDialog(`Êtes-vous sûr de vouloir supprimer ${setter.name} ?`)) {
      try {
        await fetch(`/setter-ai/configs/${setter.id}`, { method: 'DELETE' });
        toaster.show('Setter supprimé', 'success');
        onUpdate();
      } catch (error) {
        toaster.show('Erreur lors de la suppression', 'error');
      }
    }
  }, [setter.id, setter.name, onUpdate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-bgColorInner border border-tableBorder rounded-xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-textColor mb-1">
              🤖 {setter.name}
            </h1>
            <p className="text-textColor/60">
              Actif depuis le {new Date(setter.createdAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleActive}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                setter.isActive
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              }`}
            >
              {setter.isActive ? '✓ Actif' : '✕ Inactif'}
            </button>
            <Button onClick={() => setIsSettingsOpen(true)} secondary>
              ⚙️ Paramètres
            </Button>
            <Button onClick={deleteSetter} secondary>
              🗑️ Supprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SetterStatsCard
          title="Total conversations"
          value={stats?.totalConversations || 0}
          icon="💬"
          color="text-textColor"
        />
        <SetterStatsCard
          title="Conversations actives"
          value={stats?.activeConversations || 0}
          icon="🔥"
          color="text-textColor"
        />
        <SetterStatsCard
          title="Leads qualifiés"
          value={stats?.qualifiedLeads || 0}
          icon="🎯"
          color="text-customColor6"
        />
        <SetterStatsCard
          title="RDV obtenus"
          value={stats?.bookedMeetings || 0}
          icon="📅"
          color="text-green-400"
        />
      </div>

      {/* Taux de conversion */}
      {stats && (
        <div className="bg-bgColorInner border border-tableBorder rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-textColor/60 text-sm mb-1">Taux de conversion</div>
              <div className="text-2xl font-bold text-textColor">
                {stats.conversionRate || '0'}%
              </div>
            </div>
            <div className="text-4xl">📈</div>
          </div>
        </div>
      )}

      {/* Conversations récentes */}
      <div className="bg-bgColorInner border border-tableBorder rounded-xl p-6">
        <h2 className="text-xl font-bold text-textColor mb-4">💬 Conversations récentes</h2>
        {conversations && conversations.length > 0 ? (
          <div className="space-y-3">
            {conversations.slice(0, 5).map((conv: any) => (
              <div
                key={conv.id}
                className="flex items-center justify-between p-4 bg-bgColor border border-tableBorder rounded-lg hover:border-customColor6/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium text-textColor">
                    Conversation #{conv.externalUserId.slice(0, 8)}
                  </div>
                  <div className="text-sm text-textColor/60">
                    {conv.platform} • {conv.status} • {new Date(conv.updatedAt).toLocaleString('fr-FR')}
                  </div>
                </div>
                <div className="text-textColor/40">
                  {JSON.parse(conv.messages || '[]').length} messages
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-textColor/40">
            Aucune conversation pour le moment
          </div>
        )}
      </div>

      {/* Leads qualifiés */}
      <div className="bg-bgColorInner border border-tableBorder rounded-xl p-6">
        <h2 className="text-xl font-bold text-textColor mb-4">🎯 Leads qualifiés</h2>
        {leads && leads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
              <tr className="border-b border-tableBorder">
                <th className="text-left py-3 px-4 text-textColor/60 font-medium">Contact</th>
                <th className="text-left py-3 px-4 text-textColor/60 font-medium">Score</th>
                <th className="text-left py-3 px-4 text-textColor/60 font-medium">Raison</th>
                <th className="text-left py-3 px-4 text-textColor/60 font-medium">RDV</th>
                <th className="text-left py-3 px-4 text-textColor/60 font-medium">Date</th>
              </tr>
              </thead>
              <tbody>
              {leads.map((lead: any) => (
                <tr key={lead.id} className="border-b border-tableBorder/50 hover:bg-bgColor/50">
                  <td className="py-3 px-4">
                    <div className="text-textColor font-medium">
                      {lead.contactInfo?.name || 'N/A'}
                    </div>
                    <div className="text-sm text-textColor/60">
                      {lead.contactInfo?.email || lead.contactInfo?.phone || ''}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        lead.qualificationScore >= 8
                          ? 'bg-green-500/20 text-green-400'
                          : lead.qualificationScore >= 6
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                      }`}>
                        {lead.qualificationScore}/10
                      </span>
                  </td>
                  <td className="py-3 px-4 text-textColor/60 max-w-xs truncate">
                    {lead.qualificationReason || 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    {lead.bookedAt ? (
                      <span className="text-green-400">✓ Pris</span>
                    ) : (
                      <span className="text-textColor/40">- En attente</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-textColor/60">
                    {new Date(lead.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-textColor/40">
            Aucun lead qualifié pour le moment
          </div>
        )}
      </div>

      {/* Modal Settings */}
      <SetterSettings
        setterId={setter.id}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdate={onUpdate}
      />
    </div>
  );
};