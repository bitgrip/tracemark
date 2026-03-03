# urls/ — URL List Files

## Format

YAML files defining domains and their URLs to analyze. Each file contains an array of domain objects.

```yaml
- name: Shop A
  urls:
    - https://shop-a.com/
    - https://shop-a.com/product/example
    - https://shop-a.com/category/sale
- name: Shop B
  urls:
    - https://shop-b.com/
    - https://shop-b.com/product/example
```

## Fields

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Domain display name. Also used as folder slug for reports (e.g., "Shop A" → `shop-a`) |
| `urls` | Yes | List of full URLs to measure |

## Usage

```bash
# Default file
pnpm run analyze

# Explicit file
pnpm run analyze -- --urls urls/ecommerce.yaml
```

## Multiple Files

You can create separate YAML files for different groups:

```
urls/
├── example.yaml      # Default example
├── ecommerce.yaml    # E-commerce sites
└── media.yaml        # Media/news sites
```

Each file is passed independently via `--urls`. Only one file per run.
