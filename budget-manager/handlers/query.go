package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/sourikduttanyu/privacap/budget-manager/store"
)

type BudgetResponse struct {
	CohortID        string  `json:"cohort_id"`
	CampaignID      string  `json:"campaign_id"`
	Remaining       float64 `json:"remaining"`
	Spent           float64 `json:"spent"`
	MaxBudget       float64 `json:"max_budget"`
	WindowExpiresAt string  `json:"window_expires_at"`
}

func GetBudget(s *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cohortID := chi.URLParam(r, "cohort_id")
		if cohortID == "" {
			http.Error(w, `{"error":"missing_cohort_id"}`, http.StatusBadRequest)
			return
		}

		rows, err := s.GetBudget(r.Context(), cohortID)
		if err != nil {
			http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
			return
		}

		resp := make([]BudgetResponse, 0, len(rows))
		for _, row := range rows {
			resp = append(resp, BudgetResponse{
				CohortID:        row.CohortID,
				CampaignID:      row.CampaignID,
				Remaining:       row.Remaining,
				Spent:           row.Spent,
				MaxBudget:       row.MaxBudget,
				WindowExpiresAt: row.WindowExpiresAt.Format("2006-01-02T15:04:05Z"),
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}
}
