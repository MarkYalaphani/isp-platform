'use client';

import { use } from 'react';
import ScoutCardBody from '../../../components/ScoutCardBody';

export default function ScoutCardPage({params}:{params:Promise<{playerId:string}>}){
  const {playerId}=use(params);
  return <ScoutCardBody playerId={playerId} linkHref={`/athlete/${playerId}`} linkLabel="Full Report"/>;
}
