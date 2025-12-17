# ERP Web Scraping Scripts

These scripts scrape tools/products and certifications from ERP provider websites and update the database.

## Prerequisites

1. **Python 3.8+** installed
2. **Required Python packages**:
   ```bash
   pip install requests beautifulsoup4 supabase
   ```

3. **Environment Variables**:
   
   **Option 1: PowerShell (Windows) - Set for current session:**
   ```powershell
   $env:NEXT_PUBLIC_SUPABASE_URL = "https://jzdkwjryjiwfldzicicu.supabase.co"
   $env:SUPABASE_SERVICE_ROLE_KEY = "your_service_role_key"
   ```
   
   **Option 2: Use the helper script:**
   ```powershell
   # For ERP tools:
   .\scripts\set_env_and_run.ps1 --provider oracle
   
   # For certifications:
   .\scripts\set_env_and_run.ps1 --certifications --all
   ```
   
   **Option 3: Create a `.env` file** (requires python-dotenv package):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

   **Important**: Use the **Service Role Key** (not the anon key) for admin operations. You can find it in your Supabase dashboard under Settings > API.

## Running the Scripts

### ERP Tools Scraping

#### Scrape a specific provider:
```bash
python scripts/scrape_erp_tools.py --provider oracle
python scripts/scrape_erp_tools.py --provider sap
python scripts/scrape_erp_tools.py --provider erpnext
python scripts/scrape_erp_tools.py --provider odoo
```

#### Scrape all providers:
```bash
python scripts/scrape_erp_tools.py --all
```

### Certifications Scraping

#### Scrape certifications for a specific provider:
```bash
python scripts/scrape_certifications.py --provider oracle
python scripts/scrape_certifications.py --provider sap
python scripts/scrape_certifications.py --provider dynamics
```

#### Scrape all certifications:
```bash
python scripts/scrape_certifications.py --all
```

## Available Providers

- `oracle` - Oracle Corporation
- `sap` - SAP SE
- `erpnext` - ERPNext
- `odoo` - Odoo

## Notes

- The scripts use BeautifulSoup to parse HTML from provider websites
- Actual scraping logic needs to be customized based on each provider's website structure
- The scripts include fallback "known tools/certifications" for each provider
- Tools are upserted (inserted or updated if they already exist) based on `provider_id` and `slug`
- Certifications are filtered by `career_focus` (technical/business_functional) and only shown if user selects "Get certified" in learning goals

## Troubleshooting

1. **"Provider not found"**: Make sure you've run `docs/sql/erp_providers_schema.sql` first to create the providers table
2. **"Connection error"**: Check your internet connection and that the provider website is accessible
3. **"Authentication error"**: Verify your Supabase credentials are correct

