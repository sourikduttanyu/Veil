package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/sourikduttanyu/privacap/server/store"
)

func GetCampaigns(pg *store.PGStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ids, err := pg.GetCampaigns(r.Context())
		if err != nil {
			http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
			return
		}
		if ids == nil {
			ids = []string{}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ids)
	}
}
