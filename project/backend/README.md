# GRS Backend

Python/FastAPI backend that turns topology JSON into a deployable Docker Compose environment.

## Setup

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/generate` | Returns docker-compose.yml as plain text |
| POST | `/generate/download` | Returns a .zip with compose + all device contexts |
| GET | `/templates` | Lists available device types |
| GET | `/health` | Health check |

## Adding a new device type

1. Create `templates/<type>/Dockerfile`
2. Create `templates/<type>/init.sh` (use `{{config_key}}` placeholders)
3. Done — the generator picks it up automatically from the JSON `"type"` field.

## Output structure

After `/generate`, the `output/` folder contains:

```
output/
├── docker-compose.yml
├── <device_id>/          # rendered build context per device
│   ├── Dockerfile
│   └── init.sh
└── ...
```

Run with:

```bash
cd output
docker compose up --build
```

## Template placeholders

In any `.sh`, `.conf`, `.env`, `.yml` inside a template:

- `{{key}}` — replaced with the value of `config.key` for that device
- `{{#key}}...{{/key}}` — block rendered only if `config.key` is truthy

# TODO
- Improve templates and test them out to make sure they do what they are suppose to (Simply copied them from past labs)