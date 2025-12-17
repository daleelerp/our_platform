# PowerShell script to set environment variables and run the scraping scripts
# Usage: 
#   .\scripts\set_env_and_run.ps1 --provider oracle          (for ERP tools)
#   .\scripts\set_env_and_run.ps1 --certifications --all     (for certifications)

# Set environment variables for this PowerShell session
$env:NEXT_PUBLIC_SUPABASE_URL = "https://jzdkwjryjiwfldzicicu.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6ZGt3anJ5aml3ZmxkemljaWN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE2NTU5NywiZXhwIjoyMDc5NzQxNTk3fQ.4tW0V5mvyzn3tqqqZ5qoUXcPZKw1u_jLf_vA01aqGXI"

# Get the script arguments (everything after the script name)
$scriptArgs = $args

# Check if user wants to run certifications script
if ($scriptArgs -contains "--certifications") {
    # Remove --certifications from args and pass the rest
    $remainingArgs = $scriptArgs | Where-Object { $_ -ne "--certifications" }
    python scripts/scrape_certifications.py $remainingArgs
} else {
    # Default to ERP tools script
    python scripts/scrape_erp_tools.py $scriptArgs
}

