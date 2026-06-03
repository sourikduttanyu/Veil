## What this PR does

<!-- One sentence description -->

## Invariant checklist

Every PR must pass all of these. Check the box or explain why it doesn't apply.

- [ ] `grep -r "user_id" --include="*.go" --include="*.py" --include="*.js" --include="*.ts" .` returns **zero results**
- [ ] Noise is applied **before** any network call (not after, not optionally)
- [ ] No new Redis keys encode user identity or session state
- [ ] Budget manager fail-closed behavior is not weakened
- [ ] No custom DP math added without a peer-reviewed citation in the PR description

## Type of change

- [ ] Noise mechanism plugin (Python ABC or HTTP sidecar)
- [ ] Ad slot detection improvement
- [ ] Dashboard / UI
- [ ] Infrastructure / CI
- [ ] Bug fix
- [ ] Documentation
