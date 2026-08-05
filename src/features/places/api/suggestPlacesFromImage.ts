import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

const extractedPlaceSchema = z.object({
  placeName: z.string(),
  regionHints: z.array(z.string()),
  branchHint: z.string().nullable(),
  evidence: z.array(z.string()),
  contextSuggestion: z.string().nullable(),
});

const suggestedKakaoPlaceSchema = z.object({
  kakaoPlaceId: z.string(),
  name: z.string(),
  categoryName: z.string().nullable(),
  address: z.string(),
  roadAddress: z.string().nullable(),
  phone: z.string().nullable(),
  placeUrl: z.string().nullable(),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
});

const kakaoSearchSchema = z.object({
  status: z.enum(['SUCCESS', 'NO_RESULTS', 'FAILED']),
  query: z.string(),
  items: z.array(suggestedKakaoPlaceSchema),
});

const placeSuggestionCandidateSchema = z.object({
  candidateId: z.string(),
  extracted: extractedPlaceSchema,
  kakaoSearch: kakaoSearchSchema,
});

const suggestionWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
  candidateId: z.string().nullable(),
});

const placeSuggestionResponseSchema = z.object({
  requestId: z.string(),
  candidates: z.array(placeSuggestionCandidateSchema),
  warnings: z.array(suggestionWarningSchema),
});

export type SuggestedKakaoPlace = z.infer<typeof suggestedKakaoPlaceSchema>;
export type PlaceSuggestionCandidate = z.infer<typeof placeSuggestionCandidateSchema>;
export type PlaceSuggestionResponse = z.infer<typeof placeSuggestionResponseSchema>;

export async function suggestPlacesFromImage(image: File): Promise<PlaceSuggestionResponse> {
  const formData = new FormData();
  formData.append('image', image, image.name);

  const { data } = await httpClient.post('/places/suggestions', formData, {
    headers: {
      'Content-Type': undefined,
    },
  });

  return placeSuggestionResponseSchema.parse(data);
}
