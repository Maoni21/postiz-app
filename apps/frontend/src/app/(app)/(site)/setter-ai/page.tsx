export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { SetterAiPage } from '@gitroom/frontend/components/setter-ai/SetterAiPage';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Setter IA`,
  description: 'Configure votre assistant IA pour qualifier automatiquement vos leads',
};

export default async function Page() {
  return <SetterAiPage />;
}