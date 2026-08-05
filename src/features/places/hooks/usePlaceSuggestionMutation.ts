import { useMutation } from '@tanstack/react-query';
import {
  suggestPlacesFromImage,
  type PlaceSuggestionResponse,
} from '../api/suggestPlacesFromImage';

export function usePlaceSuggestionMutation() {
  return useMutation<PlaceSuggestionResponse, Error, File>({
    mutationFn: suggestPlacesFromImage,
  });
}
