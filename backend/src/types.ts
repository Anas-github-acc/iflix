export interface RecommendationRequest {
  userId: number;
}

export interface ActionRequest {
  userId: number;
  action: 'view' | 'like' | 'rate';
  movieId: number;
  rating?: number;
}

export interface RecommendationResponse {
  reqId: string;
  recommendations: string[];
}

export interface ActionResponse {
  message: string;
  reqId: string;
}