export type RootStackParamList = {
  Library: undefined;
  LiveStage: { songId: string };
  AddSong: { mode: 'create' } | { mode: 'edit'; songId: string };
};
