import { useState, useEffect, useCallback, useMemo } from 'react';

type Voice = {
  name: string;
  gender: string;
  friendlyName: string;
};

// Voice configuration with explicit gender mapping
interface VoiceConfig {
  friendlyName: string;
  gender: string;
  languageCode: string;
  ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
}

// Map of voice names to their configurations
const VOICE_CONFIGS: Record<string, VoiceConfig> = {
  'es-US-Wavenet-A': {
    friendlyName: 'Guadalupe',
    gender: 'FEMALE',
    languageCode: 'es-US',
    ssmlGender: 'FEMALE'
  },
  'es-US-Wavenet-B': {
    friendlyName: 'Fernando',
    gender: 'MALE',
    languageCode: 'es-US',
    ssmlGender: 'MALE'
  },
  'es-US-Wavenet-C': {
    friendlyName: 'Alejandra',
    gender: 'FEMALE',
    languageCode: 'es-US',
    ssmlGender: 'FEMALE'
  }
};

// Get voice configuration by name
const getVoiceConfig = (voiceName: string): VoiceConfig | null => {
  return VOICE_CONFIGS[voiceName] || null;
};

// Get friendly name for display
const getFriendlyName = (voiceName: string): string => {
  return VOICE_CONFIGS[voiceName]?.friendlyName || voiceName;
};

interface VoiceSelectionState {
  voices: Voice[];
  allVoices: Voice[];
  selectedVoice: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useVoiceSelection() {
  const [state, setState] = useState<VoiceSelectionState>({
    voices: [],
    allVoices: [],
    selectedVoice: null,
    isLoading: false,
    error: null,
  });

  const mappedVoices = useMemo(() => {
    // Map all voices to include friendly names
    return state.voices.map(voice => ({
      ...voice,
      friendlyName: getFriendlyName(voice.name)
    }));
  }, [state.voices]);

  // Filter to only include our specific voices and ensure they have the correct configuration
  const filteredVoices = useMemo(() => {
    return mappedVoices
      .filter(voice => {
        const config = getVoiceConfig(voice.name);
        return config !== null; // Only include voices we have configurations for
      })
      .map(voice => {
        const config = getVoiceConfig(voice.name);
        return {
          ...voice,
          gender: config?.gender || voice.gender,
          friendlyName: getFriendlyName(voice.name)
        };
      })
      .sort((a, b) => a.friendlyName.localeCompare(b.friendlyName));
  }, [mappedVoices]);

  // Get a voice by its friendly name
  const getVoiceByName = useCallback((name: string): Voice | undefined => {
    // First try to find by friendly name
    const voice = state.voices.find(voice => voice.friendlyName === name);
    if (voice) return voice;
    
    // If not found by friendly name, try by voice name
    return state.voices.find(voice => voice.name === name);
  }, [state.voices]);

  // Load voices from the API
  const loadVoices = useCallback(async () => {

    setState(prevState => ({ ...prevState, isLoading: true, error: null }));
    
    try {
      const response = await fetch("/api/audio?intent=list_voices");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();

      
      if (result.success && Array.isArray(result.data)) {
        // Get all voices and ensure they have the correct structure
        const allVoices = result.data
          .filter((voice: { name: string }) => getVoiceConfig(voice.name)) // Only include configured voices
          .map((voice: { name: string; gender?: string }) => {
            const config = getVoiceConfig(voice.name);
            return {
              name: voice.name,
              gender: config?.gender || voice.gender || 'UNSPECIFIED',
              friendlyName: getFriendlyName(voice.name)
            };
          });
        

        
        // Get the first available voice with a friendly name as default
        const defaultVoice = allVoices.find((voice: any) => 
          getVoiceConfig(voice.name) !== null
        )?.name || (allVoices.length > 0 ? allVoices[0].name : null);
        
        const newState: VoiceSelectionState = {
          voices: allVoices,
          allVoices: allVoices,
          selectedVoice: defaultVoice,
          isLoading: false,
          error: null
        };
        

        setState(newState);
      } else {
        const error = new Error(result?.error || 'Failed to load voices');
        // Error loading voices
        setState(prevState => ({
          ...prevState,
          error,
          isLoading: false,
        }));
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load voices');
      // Error in loadVoices
      setState(prevState => ({
        ...prevState,
        error,
        isLoading: false,
      }));
    }
  }, [state.selectedVoice]);

  // Set the selected voice by name (either voice name or friendly name)
  const setSelectedVoice = useCallback((voiceName: string) => {
    // Check if the voice exists in our configured voices
    const voiceConfig = getVoiceConfig(voiceName);
    const voice = state.voices.find(v => v.name === voiceName || v.friendlyName === voiceName);
    
    if (voiceConfig || voice) {
      const voiceToSelect = voice?.name || voiceName;

      setState(prev => ({
        ...prev,
        selectedVoice: voiceToSelect
      }));
    } else {
      // Attempted to set invalid voice
    }
  }, [state.voices]);

  // Load voices on mount
  useEffect(() => {
    loadVoices();
  }, [loadVoices]);

  return {
    ...state,
    voices: filteredVoices, // Return filtered voices instead of all voices
    allVoices: mappedVoices, // Keep all voices available if needed
    setSelectedVoice,
    refreshVoices: loadVoices,
    getFriendlyName,
  };
}
