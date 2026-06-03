package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/sourikduttanyu/privacap/server/store"
)

func GetTopAds(pg *store.PGStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cohortID := chi.URLParam(r, "cohort_id")

		ads, err := pg.GetTopAds(r.Context(), cohortID)
		if err != nil {
			http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
			return
		}
		if ads == nil {
			ads = []store.AdStats{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ads)
	}
}
