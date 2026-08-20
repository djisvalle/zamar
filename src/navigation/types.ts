export type RootStackParamList = {
  LiveStage: { songId?: string; setlistContext?: boolean } | undefined;
  AddSong: { mode: 'create' } | { mode: 'edit'; songId: string };
  SetlistDetails: { setlistId: string };
};
