import { useContext } from 'react';
import { SettingsTriggerContext, type SettingsTriggerValue } from './SettingsTriggerContext';

export function useSettingsTrigger(): SettingsTriggerValue {
  return useContext(SettingsTriggerContext);
}
