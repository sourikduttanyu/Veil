package store

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type BudgetRow struct {
	CohortID       string
	CampaignID     string
	Remaining      float64
	Spent          float64
	MaxBudget      float64
	WindowExpiresAt time.Time
}

type Store struct {
	db             *pgxpool.Pool
	maxEpsilon     float64
	windowDuration time.Duration
}

func New(db *pgxpool.Pool, maxEpsilon float64, windowDuration time.Duration) *Store {
	return &Store{db: db, maxEpsilon: maxEpsilon, windowDuration: windowDuration}
}

// ConsumeEpsilon atomically checks and deducts epsilon for a cohort+campaign.
// Uses SELECT FOR UPDATE to prevent races under concurrent requests.
func (s *Store) ConsumeEpsilon(ctx context.Context, cohortID, campaignID string, cost float64) (allowed bool, remaining float64, expiresAt time.Time, err error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return false, 0, time.Time{}, err
	}
	defer tx.Rollback(ctx)

	var spent float64
	var windowExpires time.Time

	err = tx.QueryRow(ctx,
		`SELECT epsilon_spent, window_expires_at FROM cohorts
		 WHERE cohort_id=$1 AND campaign_id=$2
		 FOR UPDATE`,
		cohortID, campaignID,
	).Scan(&spent, &windowExpires)

	now := time.Now().UTC()

	if err != nil {
		// Row doesn't exist yet — insert with initial budget
		windowExpires = now.Add(s.windowDuration)
		_, err = tx.Exec(ctx,
			`INSERT INTO cohorts (cohort_id, demographic_bucket, campaign_id, noisy_impression_count, epsilon_spent, window_expires_at)
			 VALUES ($1, 'unknown', $2, 0, $3, $4)
			 ON CONFLICT (cohort_id, campaign_id) DO NOTHING`,
			cohortID, campaignID, cost, windowExpires,
		)
		if err != nil {
			return false, 0, time.Time{}, err
		}
		if err = tx.Commit(ctx); err != nil {
			return false, 0, time.Time{}, err
		}
		return true, s.maxEpsilon - cost, windowExpires, nil
	}

	// Reset window if expired
	if now.After(windowExpires) {
		spent = 0
		windowExpires = now.Add(s.windowDuration)
	}

	if spent+cost > s.maxEpsilon {
		// Over budget — commit the reset if window expired, reject the request
		if _, updateErr := tx.Exec(ctx,
			`UPDATE cohorts SET epsilon_spent=$1, window_expires_at=$2
			 WHERE cohort_id=$3 AND campaign_id=$4`,
			spent, windowExpires, cohortID, campaignID,
		); updateErr == nil {
			tx.Commit(ctx)
		}
		return false, s.maxEpsilon - spent, windowExpires, nil
	}

	newSpent := spent + cost
	_, err = tx.Exec(ctx,
		`UPDATE cohorts SET epsilon_spent=$1, window_expires_at=$2
		 WHERE cohort_id=$3 AND campaign_id=$4`,
		newSpent, windowExpires, cohortID, campaignID,
	)
	if err != nil {
		return false, 0, time.Time{}, err
	}

	if err = tx.Commit(ctx); err != nil {
		return false, 0, time.Time{}, err
	}

	return true, s.maxEpsilon - newSpent, windowExpires, nil
}

// GetBudget returns all campaign budget rows for a cohort.
func (s *Store) GetBudget(ctx context.Context, cohortID string) ([]BudgetRow, error) {
	rows, err := s.db.Query(ctx,
		`SELECT cohort_id, campaign_id, epsilon_spent, window_expires_at
		 FROM cohorts WHERE cohort_id=$1`,
		cohortID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []BudgetRow
	for rows.Next() {
		var r BudgetRow
		if err := rows.Scan(&r.CohortID, &r.CampaignID, &r.Spent, &r.WindowExpiresAt); err != nil {
			return nil, err
		}
		r.MaxBudget = s.maxEpsilon
		r.Remaining = s.maxEpsilon - r.Spent
		if r.Remaining < 0 {
			r.Remaining = 0
		}
		result = append(result, r)
	}
	return result, rows.Err()
}
