package store

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Bucket struct {
	NoisyValue int     `json:"count"`
	Frequency  float64 `json:"frequency"`
}

type PGStore struct {
	db *pgxpool.Pool
}

func NewPG(db *pgxpool.Pool) *PGStore {
	return &PGStore{db: db}
}

// WriteImpressionAsync fires a goroutine INSERT — not in hot path.
func (s *PGStore) WriteImpressionAsync(cohortID string, noisyValue int, epsilon float64) {
	go func() {
		_, err := s.db.Exec(context.Background(),
			`INSERT INTO impression_log (cohort_id, noisy_value, epsilon) VALUES ($1, $2, $3)`,
			cohortID, noisyValue, epsilon,
		)
		if err != nil {
			log.Printf("impression_log write failed: %v", err)
		}
	}()
}

// WriteEnforcementAsync fires a goroutine INSERT — not in hot path.
func (s *PGStore) WriteEnforcementAsync(cohortID, campaignID string, cap int, action string) {
	go func() {
		_, err := s.db.Exec(context.Background(),
			`INSERT INTO cap_enforcement_log (cohort_id, campaign_id, cap_threshold, action) VALUES ($1, $2, $3, $4)`,
			cohortID, campaignID, cap, action,
		)
		if err != nil {
			log.Printf("cap_enforcement_log write failed: %v", err)
		}
	}()
}

type AdStats struct {
	CampaignID string `json:"campaign_id"`
	Served     int    `json:"served"`
	Suppressed int    `json:"suppressed"`
	Total      int    `json:"total"`
}

// GetTopAds returns per-campaign served/suppressed counts for a cohort, top 10 by volume.
func (s *PGStore) GetTopAds(ctx context.Context, cohortID string) ([]AdStats, error) {
	rows, err := s.db.Query(ctx, `
		SELECT campaign_id,
			SUM(CASE WHEN action='serve' THEN 1 ELSE 0 END)::int,
			SUM(CASE WHEN action='suppress' THEN 1 ELSE 0 END)::int,
			COUNT(*)::int
		FROM cap_enforcement_log
		WHERE cohort_id=$1
		GROUP BY campaign_id
		ORDER BY COUNT(*) DESC
		LIMIT 10
	`, cohortID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []AdStats
	for rows.Next() {
		var a AdStats
		if err := rows.Scan(&a.CampaignID, &a.Served, &a.Suppressed, &a.Total); err != nil {
			return nil, err
		}
		result = append(result, a)
	}
	return result, rows.Err()
}

type EnforcementSummary struct {
	Served     int `json:"served"`
	Suppressed int `json:"suppressed"`
}

// GetEnforcementSummary returns serve/suppress counts for a campaign.
func (s *PGStore) GetEnforcementSummary(ctx context.Context, campaignID string) (EnforcementSummary, error) {
	rows, err := s.db.Query(ctx,
		`SELECT action, COUNT(*) FROM cap_enforcement_log WHERE campaign_id=$1 GROUP BY action`,
		campaignID,
	)
	if err != nil {
		return EnforcementSummary{}, err
	}
	defer rows.Close()

	var summary EnforcementSummary
	for rows.Next() {
		var action string
		var count int
		if err := rows.Scan(&action, &count); err != nil {
			return EnforcementSummary{}, err
		}
		if action == "serve" {
			summary.Served = count
		} else {
			summary.Suppressed = count
		}
	}
	return summary, rows.Err()
}

// GetEnforcementTotal returns serve/suppress counts across all campaigns.
func (s *PGStore) GetEnforcementTotal(ctx context.Context) (EnforcementSummary, error) {
	rows, err := s.db.Query(ctx,
		`SELECT action, COUNT(*) FROM cap_enforcement_log GROUP BY action`,
	)
	if err != nil {
		return EnforcementSummary{}, err
	}
	defer rows.Close()

	var summary EnforcementSummary
	for rows.Next() {
		var action string
		var count int
		if err := rows.Scan(&action, &count); err != nil {
			return EnforcementSummary{}, err
		}
		if action == "serve" {
			summary.Served = count
		} else {
			summary.Suppressed = count
		}
	}
	return summary, rows.Err()
}

// GetDistribution aggregates impression_log by noisy_value for a campaign.
func (s *PGStore) GetDistribution(ctx context.Context, campaignID string) ([]Bucket, error) {
	rows, err := s.db.Query(ctx,
		`SELECT noisy_value, COUNT(*)::float / NULLIF(SUM(COUNT(*)) OVER (), 0) AS frequency
		 FROM impression_log
		 WHERE cohort_id LIKE '%'
		 GROUP BY noisy_value
		 ORDER BY noisy_value`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var buckets []Bucket
	for rows.Next() {
		var b Bucket
		if err := rows.Scan(&b.NoisyValue, &b.Frequency); err != nil {
			return nil, err
		}
		buckets = append(buckets, b)
	}
	return buckets, rows.Err()
}
