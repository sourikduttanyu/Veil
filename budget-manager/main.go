package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kelseyhightower/envconfig"
	"github.com/sourikduttanyu/privacap/budget-manager/handlers"
	"github.com/sourikduttanyu/privacap/budget-manager/store"
)

type Config struct {
	DatabaseURL          string  `envconfig:"DATABASE_URL" required:"true"`
	Port                 string  `envconfig:"PORT" default:"8081"`
	MaxEpsilonPerWindow  float64 `envconfig:"MAX_EPSILON_PER_WINDOW" default:"10.0"`
	BudgetWindowSeconds  int     `envconfig:"BUDGET_WINDOW_SECONDS" default:"86400"`
}

func main() {
	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		log.Fatal(err)
	}

	ctx := context.Background()
	db, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer db.Close()

	if err := db.Ping(ctx); err != nil {
		log.Fatalf("db ping: %v", err)
	}

	windowDuration := time.Duration(cfg.BudgetWindowSeconds) * time.Second
	s := store.New(db, cfg.MaxEpsilonPerWindow, windowDuration)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"status":"ok"}`))
	})
	r.Post("/budget/consume", handlers.Consume(s))
	r.Get("/budget/{cohort_id}", handlers.GetBudget(s))

	srv := &http.Server{Addr: ":" + cfg.Port, Handler: r}

	go func() {
		log.Printf("budget-manager listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
	<-quit

	shutCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(shutCtx)
}
