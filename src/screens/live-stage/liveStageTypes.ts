import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

export type ViewMode = 'chord' | 'sheet';

export type LiveStageNavigation = NativeStackScreenProps<RootStackParamList, 'LiveStage'>['navigation'];
