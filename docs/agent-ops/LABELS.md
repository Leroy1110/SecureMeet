# Labels

`bootstrap_labels.sh` manages the baseline taxonomy below via `gh label create --force`.

## Type labels

- `type/bug`
- `type/feature`
- `type/refactor`
- `type/security`
- `type/ci`
- `type/opportunity`

## Area labels

- `area/backend`
- `area/frontend`
- `area/full-stack`
- `area/infra`

## Source labels

- `source/nightly`

## Report labels

- `report/morning-summary`

## Status labels

- `status/waiting-for-user`
- `status/ready`

## Priority labels

- `priority/p0`
- `priority/p1`
- `priority/p2`
- `priority/p3`

## Notes

- Labels are idempotent and safe to re-run.
- Existing labels with the same name are updated in place.
- Manual issue intake remains supported; nightly patrol is primary.
