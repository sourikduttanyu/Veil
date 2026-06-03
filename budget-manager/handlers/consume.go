package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/sourikduttanyu/privacap/budget-manager/store"
)

type ConsumeRequest struct {
	CohortID   string  `json:"cohort_id"`
	CampaignID string  `json:"campaign_id"`
	EpsilonCost float64 `json:"epsilon_cost"`
}

type ConsumeResponse struct {
	Allowed         bool    `json:"allowed"`
	Remaining       float64 `json:"remaining"`
	Spent           float64 `json:"spent"`
	WindowExpiresAt string  `json:"window_expires_at"`
}

func Consume(s *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req ConsumeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid_json"}`, http.StatusBadRequest)
			return
		}
		if req.CohortID == "" || req.CampaignID == "" || req.EpsilonCost <= 0 {
			http.Error(w, `{"error":"missing_fields"}`, http.StatusBadRequest)
			return
		}

		allowed, remaining, expiresAt, err := s.ConsumeEpsilon(r.Context(), req.CohortID, req.CampaignID, req.EpsilonCost)
		if err != nil {
			http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
			return
		}

		resp := ConsumeResponse{
			Allowed:         allowed,
			Remaining:       remaining,
			WindowExpiresAt: expiresAt.Format("2006-01-02T15:04:05Z"),
		}

		status := http.StatusOK
		if !allowed {
			status = http.StatusTooManyRequests
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		json.NewEncoder(w).Encode(resp)
	}
}
