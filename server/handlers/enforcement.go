package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/sourikduttanyu/privacap/server/store"
)

func GetEnforcementSummary(pg *store.PGStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		campaignID := chi.URLParam(r, "campaign_id")

		summary, err := pg.GetEnforcementSummary(r.Context(), campaignID)
		if err != nil {
			http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(summary)
	}
}

func GetEnforcementTotal(pg *store.PGStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		summary, err := pg.GetEnforcementTotal(r.Context())
		if err != nil {
			http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(summary)
	}
}
